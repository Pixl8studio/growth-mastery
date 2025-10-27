/**
 * Header Component
 * Application header with navigation
 */

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, Settings } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

export async function Header() {
    const user = await getCurrentUser();

    return (
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link
                        href={user ? "/funnel-builder" : "/"}
                        className="flex items-center space-x-2"
                    >
                        <span className="text-2xl font-bold text-gray-900">
                            Genie AI
                        </span>
                    </Link>

                    {/* Navigation */}
                    {user ? (
                        <nav className="flex items-center space-x-6">
                            <Link
                                href="/funnel-builder"
                                className="text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                                Funnels
                            </Link>
                            <Link
                                href="/ai-followup"
                                className="text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                                AI Followup
                            </Link>
                            <Link
                                href="/contacts"
                                className="text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                                Contacts
                            </Link>

                            {/* User Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full"
                                    >
                                        <User className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link
                                            href="/settings"
                                            className="cursor-pointer"
                                        >
                                            <Settings className="mr-2 h-4 w-4" />
                                            Settings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                        <LogoutButton />
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </nav>
                    ) : (
                        <nav className="flex items-center space-x-4">
                            <Link href="/login">
                                <Button variant="ghost">Sign in</Button>
                            </Link>
                            <Link href="/signup">
                                <Button>Get started</Button>
                            </Link>
                        </nav>
                    )}
                </div>
            </div>
        </header>
    );
}
