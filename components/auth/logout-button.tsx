"use client";

/**
 * Logout Button Component
 * Client-side button that handles user logout with proper redirect
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        setIsLoading(true);

        try {
            const supabase = createClient();
            await supabase.auth.signOut();

            logger.info({}, "User logged out successfully");

            router.push("/login");
            router.refresh();
        } catch (error) {
            logger.error({ error }, "Logout failed");
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex w-full cursor-pointer items-center"
        >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoading ? "Signing out..." : "Sign out"}
        </button>
    );
}
