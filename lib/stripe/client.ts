/**
 * Stripe Client
 * Main Stripe client initialization with lazy loading
 */

import Stripe from "stripe";
import { env } from "@/lib/env";

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe client instance (lazy initialization)
 * Only initializes when actually needed, preventing build-time errors
 */
export function getStripeClient(): Stripe {
    if (!stripeInstance) {
        if (!env.STRIPE_SECRET_KEY) {
            throw new Error(
                "STRIPE_SECRET_KEY is not configured. Please add it to your environment variables."
            );
        }
        stripeInstance = new Stripe(env.STRIPE_SECRET_KEY, {
            apiVersion: "2025-09-30.clover",
            typescript: true,
        });
    }
    return stripeInstance;
}

// Export as 'stripe' for backward compatibility
export const stripe = new Proxy({} as Stripe, {
    get(_target, prop) {
        return (getStripeClient() as any)[prop];
    },
});
