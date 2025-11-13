/**
 * Footer Component
 * Application footer
 */

import Link from "next/link";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-border bg-card">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    {/* Product */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">
                            Product
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <Link
                                    href="/funnel-builder"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Funnel Builder
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/contacts"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Contacts
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/dashboard"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Dashboard
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">
                            Company
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <Link
                                    href="/about"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/blog"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Blog
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/contact"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">
                            Resources
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <Link
                                    href="/docs"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/support"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Support
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/api"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    API Reference
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">
                            Legal
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <Link
                                    href="/privacy"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/terms"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 border-t border-border pt-8">
                    <p className="text-center text-sm text-muted-foreground">
                        &copy; {currentYear} Growth Mastery AI. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
