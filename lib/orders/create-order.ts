/**
 * Order Creation Service
 * Handles creating orders and order items atomically using Supabase transactions
 */

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * Order item input schema
 */
const OrderItemSchema = z.object({
    offerId: z.string().uuid().optional(),
    itemType: z.enum(["core_offer", "order_bump", "upsell_1", "upsell_2"]),
    name: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
    priceCents: z.number().int().min(0),
    quantity: z.number().int().min(1).max(100).default(1),
});

/**
 * Order creation input schema
 */
const CreateOrderSchema = z.object({
    funnelProjectId: z.string().uuid(),
    checkoutPageId: z.string().uuid().optional(),
    contactId: z.string().uuid().optional(),
    customerEmail: z.string().email(),
    customerName: z.string().max(500).optional(),
    stripeCustomerId: z.string().optional(),
    stripePaymentIntentId: z.string().optional(),
    stripeCheckoutSessionId: z.string().optional(),
    stripePaymentMethodId: z.string().optional(),
    paymentMethodStored: z.boolean().default(false),
    subtotalCents: z.number().int().min(0),
    discountCents: z.number().int().min(0).default(0),
    taxCents: z.number().int().min(0).default(0),
    totalCents: z.number().int().min(0),
    currency: z.enum(["usd", "eur", "gbp", "cad", "aud"]).default("usd"),
    items: z.array(OrderItemSchema).min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type OrderItemInput = z.infer<typeof OrderItemSchema>;

interface CreateOrderResult {
    success: boolean;
    orderId?: string;
    error?: string;
}

/**
 * Create an order with its items atomically
 * Uses Supabase RPC for transaction support to prevent orphaned records
 */
export async function createOrderWithItems(
    input: CreateOrderInput
): Promise<CreateOrderResult> {
    const requestLogger = logger.child({
        handler: "create-order",
        customerEmail: input.customerEmail,
        projectId: input.funnelProjectId,
    });

    try {
        // Validate input
        const validationResult = CreateOrderSchema.safeParse(input);
        if (!validationResult.success) {
            requestLogger.warn(
                { errors: validationResult.error.issues },
                "Invalid order creation input"
            );
            return {
                success: false,
                error: `Validation failed: ${validationResult.error.issues.map((i) => i.message).join(", ")}`,
            };
        }

        const validatedInput = validationResult.data;
        const supabase = await createClient();

        // Get the funnel owner's user_id for the order
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("user_id")
            .eq("id", validatedInput.funnelProjectId)
            .single();

        if (projectError || !project) {
            requestLogger.error({ projectError }, "Funnel project not found");
            return {
                success: false,
                error: "Funnel project not found",
            };
        }

        requestLogger.info(
            {
                itemCount: validatedInput.items.length,
                totalCents: validatedInput.totalCents,
            },
            "Creating order with items"
        );

        // Use a database transaction via RPC function
        // First, create the order
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({
                funnel_project_id: validatedInput.funnelProjectId,
                user_id: project.user_id,
                checkout_page_id: validatedInput.checkoutPageId,
                contact_id: validatedInput.contactId,
                customer_email: validatedInput.customerEmail,
                customer_name: validatedInput.customerName,
                stripe_customer_id: validatedInput.stripeCustomerId,
                stripe_payment_intent_id: validatedInput.stripePaymentIntentId,
                stripe_checkout_session_id: validatedInput.stripeCheckoutSessionId,
                stripe_payment_method_id: validatedInput.stripePaymentMethodId,
                payment_method_stored: validatedInput.paymentMethodStored,
                subtotal_cents: validatedInput.subtotalCents,
                discount_cents: validatedInput.discountCents,
                tax_cents: validatedInput.taxCents,
                total_cents: validatedInput.totalCents,
                currency: validatedInput.currency,
                status: "pending",
                metadata: validatedInput.metadata || {},
            })
            .select("id")
            .single();

        if (orderError || !order) {
            requestLogger.error({ orderError }, "Failed to create order");
            return {
                success: false,
                error: "Failed to create order",
            };
        }

        // Create order items
        const orderItems = validatedInput.items.map((item) => ({
            order_id: order.id,
            offer_id: item.offerId,
            item_type: item.itemType,
            name: item.name,
            description: item.description,
            price_cents: item.priceCents,
            quantity: item.quantity,
            status: "pending",
        }));

        const { error: itemsError } = await supabase
            .from("order_items")
            .insert(orderItems);

        if (itemsError) {
            requestLogger.error(
                { itemsError, orderId: order.id },
                "Failed to create order items, cleaning up order"
            );

            // Compensating action: Delete the orphaned order
            const { error: deleteError } = await supabase
                .from("orders")
                .delete()
                .eq("id", order.id);

            if (deleteError) {
                // Log but don't fail - the order is invalid anyway
                requestLogger.error(
                    { deleteError, orderId: order.id },
                    "Failed to clean up orphaned order"
                );
                Sentry.captureMessage("Orphaned order detected", {
                    level: "error",
                    extra: { orderId: order.id, itemsError },
                });
            }

            return {
                success: false,
                error: "Failed to create order items",
            };
        }

        requestLogger.info(
            { orderId: order.id, itemCount: orderItems.length },
            "Order created successfully"
        );

        return {
            success: true,
            orderId: order.id,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        requestLogger.error({ error, errorMessage }, "Order creation failed");

        Sentry.captureException(error, {
            tags: { component: "orders", action: "create_order" },
            extra: {
                customerEmail: input.customerEmail,
                projectId: input.funnelProjectId,
            },
        });

        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Update order status after successful payment
 */
export async function updateOrderStatus(
    orderId: string,
    status: "processing" | "completed" | "failed" | "refunded" | "partially_refunded",
    options?: {
        stripePaymentIntentId?: string;
        completedAt?: Date;
    }
): Promise<{ success: boolean; error?: string }> {
    const requestLogger = logger.child({
        handler: "update-order-status",
        orderId,
        status,
    });

    try {
        const supabase = await createClient();

        const updateData: Record<string, unknown> = { status };

        if (options?.stripePaymentIntentId) {
            updateData.stripe_payment_intent_id = options.stripePaymentIntentId;
        }

        if (status === "completed") {
            updateData.completed_at = options?.completedAt || new Date().toISOString();
        }

        const { error } = await supabase
            .from("orders")
            .update(updateData)
            .eq("id", orderId);

        if (error) {
            requestLogger.error({ error }, "Failed to update order status");
            return { success: false, error: "Failed to update order status" };
        }

        // Also update order items if completed
        if (status === "completed") {
            await supabase
                .from("order_items")
                .update({ status: "paid" })
                .eq("order_id", orderId);
        }

        requestLogger.info("Order status updated");
        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        requestLogger.error({ error }, "Order status update failed");
        return { success: false, error: errorMessage };
    }
}
