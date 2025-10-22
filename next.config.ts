import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,

    // Enable typed routes for better type safety
    typedRoutes: true,

    // Optimize images
    images: {
        formats: ["image/avif", "image/webp"],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.supabase.co",
                pathname: "/storage/v1/object/public/**",
            },
        ],
    },

    // Experimental features
    experimental: {
        // Enable server actions
        serverActions: {
            bodySizeLimit: "2mb",
        },
    },

    // Logging
    logging: {
        fetches: {
            fullUrl: true,
        },
    },
};

export default nextConfig;
