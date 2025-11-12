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
// Using Proxy to lazily load Stripe client
// Dynamic property/method access in Proxy requires type handling
// This is safe because we're forwarding to the actual typed Stripe client
export const stripe = new Proxy({} as Stripe, {
    get(_target, prop: string | symbol) {
        const client = getStripeClient();
        // Proxy handler needs to forward any property/method from Stripe
        // Type assertion needed for dynamic Proxy access pattern
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (client as any)[prop];
    },
});
