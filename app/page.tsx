import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Sparkles, Zap, Users, BarChart3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
    const user = await getCurrentUser();

    if (user) {
        redirect("/funnel-builder");
    }

    return (
        <div className="flex min-h-screen flex-col">
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <h1 className="mb-6 text-5xl font-bold text-gray-900">
                                AI-Powered Funnel Builder
                            </h1>
                            <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-700">
                                Create high-converting pitch video funnels in under 45
                                minutes. From AI intake call to published funnel, we
                                handle everything.
                            </p>
                            <div className="flex items-center justify-center gap-4">
                                <Link href="/signup">
                                    <Button size="lg">
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        Get Started Free
                                    </Button>
                                </Link>
                                <Link href="/login">
                                    <Button size="lg" variant="outline">
                                        Sign In
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="text-3xl font-bold text-gray-900">
                                Everything You Need to Convert
                            </h2>
                            <p className="mt-4 text-lg text-gray-600">
                                Complete funnel creation system powered by AI
                            </p>
                        </div>

                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3">
                                        <Sparkles className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                                        AI Content Generation
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        AI writes your sales copy, deck structure, and
                                        talk tracks
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="mb-4 inline-flex rounded-lg bg-green-100 p-3">
                                        <Zap className="h-6 w-6 text-green-600" />
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                                        12-Step Wizard
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Guided process from intake call to published
                                        funnel
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="mb-4 inline-flex rounded-lg bg-purple-100 p-3">
                                        <Users className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                                        Contact Management
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Track leads, video engagement, and funnel
                                        progression
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="mb-4 inline-flex rounded-lg bg-orange-100 p-3">
                                        <BarChart3 className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                                        Analytics & Insights
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        See exactly where leads drop off and optimize
                                        your funnel
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="bg-blue-600 py-16">
                    <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
                        <h2 className="mb-4 text-3xl font-bold text-white">
                            Ready to Build Your First Funnel?
                        </h2>
                        <p className="mb-8 text-xl text-blue-100">
                            Join creators building high-converting funnels with AI
                        </p>
                        <Link href="/signup">
                            <Button
                                size="lg"
                                variant="outline"
                                className="bg-white text-blue-600 hover:bg-blue-50"
                            >
                                <Sparkles className="mr-2 h-5 w-5" />
                                Get Started Now
                            </Button>
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
