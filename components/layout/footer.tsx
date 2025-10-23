/**
 * Footer Component
 * Application footer
 */

import Link from "next/link";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    {/* Product */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-gray-900">
                            Product
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <Link
                                    href="/funnel-builder"
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    Funnel Builder
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/contacts"
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    Contacts
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/dashboard"
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    Dashboard
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-gray-900">
                            Company
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <Link
                                    href="/about"
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/blog"
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    Blog
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/contact"
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-gray-900">
                            Resources
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <Link
                                    href="/docs"
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/support"
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    Support
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/api"
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    API Reference
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-gray-900">
                            Legal
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <Link
                                    href="/privacy"
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/terms"
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 border-t border-gray-200 pt-8">
                    <p className="text-center text-sm text-gray-500">
                        &copy; {currentYear} Genie AI. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
