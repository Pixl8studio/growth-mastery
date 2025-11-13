"use client";

/**
 * Mobile Navigation Drawer
 * Slide-out navigation for mobile devices
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, Home, Rocket, FileText, Mail, Users, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    { href: "/funnel-builder", label: "Funnels", icon: Rocket },
    { href: "/pages", label: "Pages", icon: FileText },
    { href: "/ai-followup", label: "AI Followup", icon: Mail },
    { href: "/contacts", label: "Contacts", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNavDrawer({ isOpen, onClose, userEmail }: MobileNavDrawerProps) {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Delay for animation
            setTimeout(() => setIsVisible(true), 10);
            // Prevent body scroll when drawer is open
            document.body.style.overflow = "hidden";
        } else {
            setIsVisible(false);
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
                    isVisible ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed top-0 left-0 h-full w-[280px] bg-card border-r border-border z-50 transition-transform duration-300 ease-in-out safe-area-inset-top safe-area-inset-bottom",
                    isVisible ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <Link href="/funnel-builder" onClick={onClose}>
                            <span className="text-xl font-bold text-foreground">
                                Genie AI
                            </span>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-10 w-10"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* User Info */}
                    {userEmail && (
                        <div className="px-4 py-3 border-b border-border">
                            <p className="text-sm text-muted-foreground truncate">
                                {userEmail}
                            </p>
                        </div>
                    )}

                    {/* Navigation Links */}
                    <nav className="flex-1 overflow-y-auto p-4">
                        <ul className="space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname.startsWith(item.href);

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={onClose}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors touch-feedback min-h-touch",
                                                isActive
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-foreground hover:bg-muted"
                                            )}
                                        >
                                            <Icon className="h-5 w-5 flex-shrink-0" />
                                            <span>{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-border space-y-2">
                        <form action="/api/auth/signout" method="POST">
                            <Button
                                type="submit"
                                variant="ghost"
                                className="w-full justify-start gap-3 min-h-touch"
                            >
                                <LogOut className="h-5 w-5" />
                                <span>Sign Out</span>
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
