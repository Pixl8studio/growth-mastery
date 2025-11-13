"use client";

/**
 * Mobile Header Component
 * Header optimized for mobile with hamburger menu
 */

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { MobileNavDrawer } from "@/components/mobile/mobile-nav-drawer";
import type { User } from "@supabase/supabase-js";

interface MobileHeaderProps {
    user: User | null;
}

export function MobileHeader({ user }: MobileHeaderProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-border bg-card safe-area-inset-top">
                <div className="flex h-14 items-center justify-between px-4">
                    {/* Hamburger Menu - Only show when logged in */}
                    {user && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsDrawerOpen(true)}
                            className="h-10 w-10 touch-feedback"
                        >
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Open menu</span>
                        </Button>
                    )}

                    {/* Logo - Centered */}
                    <Link
                        href={user ? "/funnel-builder" : "/"}
                        className="flex items-center"
                    >
                        <span className="text-lg font-bold text-foreground">
                            Genie AI
                        </span>
                    </Link>

                    {/* Right Side - Login/Signup or Spacer */}
                    {!user ? (
                        <div className="flex items-center gap-2">
                            <Link href="/login">
                                <Button variant="ghost" size="sm" className="text-sm">
                                    Login
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="w-10" /> // Spacer for visual balance
                    )}
                </div>
            </header>

            {/* Mobile Navigation Drawer */}
            {user && (
                <MobileNavDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    userEmail={user.email}
                />
            )}
        </>
    );
}
