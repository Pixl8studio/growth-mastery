/**
 * SendGrid Domain Verification Service
 *
 * Handles domain authentication with SendGrid for email sending.
 * Manages DNS record setup, verification status, and domain whitelabeling.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { SendGridDNSRecord } from "@/types/followup";

interface SendGridDomainResponse {
    id: number;
    domain: string;
    subdomain: string;
    username: string;
    user_id: number;
    ips: string[];
    custom_spf: boolean;
    default: boolean;
    legacy: boolean;
    automatic_security: boolean;
    valid: boolean;
    dns: {
        mail_cname: {
            host: string;
            type: string;
            data: string;
            valid: boolean;
        };
        dkim1: {
            host: string;
            type: string;
            data: string;
            valid: boolean;
        };
        dkim2: {
            host: string;
            type: string;
            data: string;
            valid: boolean;
        };
    };
}

/**
 * Extract domain from email address.
 */
function extractDomain(email: string): string {
    const parts = email.split("@");
    if (parts.length !== 2) {
        throw new Error("Invalid email format");
    }
    return parts[1].toLowerCase();
}

/**
 * Initiate domain verification with SendGrid.
 *
 * Creates domain authentication in SendGrid and stores DNS records.
 */
export async function initiateDomainVerification(
    agentConfigId: string,
    senderEmail: string,
    userId: string
): Promise<{
    success: boolean;
    dns_records?: SendGridDNSRecord[];
    domain_id?: string;
    error?: string;
}> {
    const supabase = await createClient();
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
        logger.error({}, "❌ SENDGRID_API_KEY not configured");
        return {
            success: false,
            error: "SendGrid API key not configured. Please contact support.",
        };
    }

    try {
        const domain = extractDomain(senderEmail);

        logger.info(
            { agentConfigId, domain, userId },
            "🔐 Initiating domain verification with SendGrid"
        );

        // Call SendGrid API to create domain authentication
        const response = await fetch("https://api.sendgrid.com/v3/whitelabel/domains", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                domain,
                subdomain: "em", // Standard subdomain for email
                automatic_security: true,
                custom_spf: false,
                default: true,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            logger.error(
                { error, status: response.status, domain },
                "❌ SendGrid domain creation failed"
            );

            if (response.status === 409) {
                return {
                    success: false,
                    error: "Domain already exists in SendGrid. Use check verification instead.",
                };
            }

            return {
                success: false,
                error: `SendGrid API error: ${error}`,
            };
        }

        const data: SendGridDomainResponse = await response.json();

        // Format DNS records for storage and display
        const dnsRecords: SendGridDNSRecord[] = [
            {
                type: data.dns.mail_cname.type,
                host: data.dns.mail_cname.host,
                value: data.dns.mail_cname.data,
                valid: data.dns.mail_cname.valid,
            },
            {
                type: data.dns.dkim1.type,
                host: data.dns.dkim1.host,
                value: data.dns.dkim1.data,
                valid: data.dns.dkim1.valid,
            },
            {
                type: data.dns.dkim2.type,
                host: data.dns.dkim2.host,
                value: data.dns.dkim2.data,
                valid: data.dns.dkim2.valid,
            },
        ];

        // Update agent config with DNS records and domain ID
        const { error: updateError } = await supabase
            .from("followup_agent_configs")
            .update({
                sender_domain: domain,
                sendgrid_domain_id: data.id.toString(),
                sendgrid_dns_records: dnsRecords,
                domain_verification_status: "pending",
                sender_verified: false,
            })
            .eq("id", agentConfigId);

        if (updateError) {
            logger.error(
                { error: updateError, agentConfigId },
                "❌ Failed to update agent config with DNS records"
            );
            return { success: false, error: updateError.message };
        }

        logger.info(
            { agentConfigId, domainId: data.id, recordCount: dnsRecords.length },
            "✅ Domain verification initiated"
        );

        return {
            success: true,
            dns_records: dnsRecords,
            domain_id: data.id.toString(),
        };
    } catch (error) {
        logger.error(
            { error, agentConfigId, senderEmail },
            "❌ Domain verification error"
        );
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Check domain verification status with SendGrid.
 *
 * Polls SendGrid API and updates database with current status.
 */
export async function checkDomainVerificationStatus(agentConfigId: string): Promise<{
    success: boolean;
    verified?: boolean;
    dns_records?: SendGridDNSRecord[];
    error?: string;
}> {
    const supabase = await createClient();
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
        logger.error({}, "❌ SENDGRID_API_KEY not configured");
        return { success: false, error: "SendGrid API key not configured" };
    }

    try {
        // Get agent config with SendGrid domain ID
        const { data: config, error: fetchError } = await supabase
            .from("followup_agent_configs")
            .select("sendgrid_domain_id, sender_domain")
            .eq("id", agentConfigId)
            .single();

        if (fetchError || !config) {
            logger.error(
                { error: fetchError, agentConfigId },
                "❌ Agent config not found"
            );
            return { success: false, error: "Agent config not found" };
        }

        if (!config.sendgrid_domain_id) {
            return {
                success: false,
                error: "Domain verification not initiated. Please set up sender identity first.",
            };
        }

        logger.info(
            { agentConfigId, domainId: config.sendgrid_domain_id },
            "🔍 Checking domain verification status"
        );

        // Validate domain with SendGrid
        const validateResponse = await fetch(
            `https://api.sendgrid.com/v3/whitelabel/domains/${config.sendgrid_domain_id}/validate`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!validateResponse.ok) {
            const error = await validateResponse.text();
            logger.error(
                { error, status: validateResponse.status },
                "❌ SendGrid validation failed"
            );
            return { success: false, error: `SendGrid API error: ${error}` };
        }

        const validationResult: {
            id: number;
            valid: boolean;
            validation_results: {
                mail_cname: { valid: boolean; reason: string | null };
                dkim1: { valid: boolean; reason: string | null };
                dkim2: { valid: boolean; reason: string | null };
            };
        } = await validateResponse.json();

        // Get full domain details with updated DNS status
        const detailsResponse = await fetch(
            `https://api.sendgrid.com/v3/whitelabel/domains/${config.sendgrid_domain_id}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            }
        );

        if (!detailsResponse.ok) {
            logger.error(
                { status: detailsResponse.status },
                "❌ Failed to fetch domain details"
            );
        }

        const domainData: SendGridDomainResponse = await detailsResponse.json();

        // Update DNS records with validation status
        const dnsRecords: SendGridDNSRecord[] = [
            {
                type: domainData.dns.mail_cname.type,
                host: domainData.dns.mail_cname.host,
                value: domainData.dns.mail_cname.data,
                valid: domainData.dns.mail_cname.valid,
            },
            {
                type: domainData.dns.dkim1.type,
                host: domainData.dns.dkim1.host,
                value: domainData.dns.dkim1.data,
                valid: domainData.dns.dkim1.valid,
            },
            {
                type: domainData.dns.dkim2.type,
                host: domainData.dns.dkim2.host,
                value: domainData.dns.dkim2.data,
                valid: domainData.dns.dkim2.valid,
            },
        ];

        const isVerified = validationResult.valid && domainData.valid;
        const status = isVerified ? "verified" : "pending";

        // Update agent config
        const { error: updateError } = await supabase
            .from("followup_agent_configs")
            .update({
                sender_verified: isVerified,
                domain_verification_status: status,
                sendgrid_dns_records: dnsRecords,
            })
            .eq("id", agentConfigId);

        if (updateError) {
            logger.error(
                { error: updateError, agentConfigId },
                "❌ Failed to update verification status"
            );
        }

        logger.info(
            { agentConfigId, verified: isVerified, status },
            isVerified ? "✅ Domain verified" : "⏳ Domain verification pending"
        );

        return {
            success: true,
            verified: isVerified,
            dns_records: dnsRecords,
        };
    } catch (error) {
        logger.error({ error, agentConfigId }, "❌ Error checking verification status");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get DNS records for display in UI.
 *
 * Returns formatted DNS records from database.
 */
export async function getDNSRecordsForDisplay(agentConfigId: string): Promise<{
    success: boolean;
    records?: SendGridDNSRecord[];
    domain?: string;
    status?: string;
    error?: string;
}> {
    const supabase = await createClient();

    try {
        const { data: config, error } = await supabase
            .from("followup_agent_configs")
            .select("sendgrid_dns_records, sender_domain, domain_verification_status")
            .eq("id", agentConfigId)
            .single();

        if (error || !config) {
            logger.error({ error, agentConfigId }, "❌ Failed to fetch DNS records");
            return { success: false, error: "Agent config not found" };
        }

        return {
            success: true,
            records: config.sendgrid_dns_records as SendGridDNSRecord[],
            domain: config.sender_domain || undefined,
            status: config.domain_verification_status || undefined,
        };
    } catch (error) {
        logger.error({ error, agentConfigId }, "❌ Error fetching DNS records");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Update sender information.
 *
 * Updates sender name, email, and SMS sender ID.
 * Extracts and stores domain from email.
 */
export async function updateSenderInfo(
    agentConfigId: string,
    senderData: {
        sender_name?: string;
        sender_email?: string;
        sms_sender_id?: string;
    }
): Promise<{ success: boolean; domain?: string; error?: string }> {
    const supabase = await createClient();

    try {
        const updateData: Record<string, unknown> = {};

        if (senderData.sender_name !== undefined) {
            updateData.sender_name = senderData.sender_name;
        }

        if (senderData.sender_email !== undefined) {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(senderData.sender_email)) {
                return { success: false, error: "Invalid email format" };
            }

            updateData.sender_email = senderData.sender_email;
            updateData.sender_domain = extractDomain(senderData.sender_email);
        }

        if (senderData.sms_sender_id !== undefined) {
            // Validate SMS sender ID (max 11 characters)
            if (senderData.sms_sender_id.length > 11) {
                return {
                    success: false,
                    error: "SMS sender ID must be 11 characters or less",
                };
            }
            updateData.sms_sender_id = senderData.sms_sender_id;
        }

        const { error } = await supabase
            .from("followup_agent_configs")
            .update(updateData)
            .eq("id", agentConfigId);

        if (error) {
            logger.error({ error, agentConfigId }, "❌ Failed to update sender info");
            return { success: false, error: error.message };
        }

        logger.info({ agentConfigId, updateData }, "✅ Sender info updated");

        return {
            success: true,
            domain: updateData.sender_domain as string | undefined,
        };
    } catch (error) {
        logger.error({ error, agentConfigId }, "❌ Error updating sender info");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
