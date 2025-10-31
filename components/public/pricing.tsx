import { Button } from "@/components/ui/button";
import { Check, Shield } from "lucide-react";

const features = [
    "Complete funnel and marketing system setup",
    "AI-powered content calendar generation",
    "Adaptive ads engine with performance optimization",
    "Automated follow-up sequences",
    "Real-time analytics dashboard",
    "Priority support and onboarding",
    "Access to the 6-Figure Creator Circle (after $100K milestone)",
];

const Pricing = () => {
    return (
        <section className="py-24 bg-background relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
            </div>

            <div className="container relative mx-auto px-6">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4">
                            Only Pay When You{" "}
                            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-glow">
                                Profit
                            </span>
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
                            We grow when you grow. Your success funds our mission.
                        </p>

                        {/* Pre-Launch Banner */}
                        <div className="max-w-xl mx-auto mt-8">
                            <div className="relative p-5 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 shadow-glow">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-yellow-500 text-black text-sm font-bold">
                                    🎉 PRE-LAUNCH SPECIAL
                                </div>
                                <p className="text-xl font-bold text-foreground mb-1">
                                    Save $2,000 Today!
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Use code{" "}
                                    <span className="font-mono font-bold text-yellow-500 bg-black/30 px-2 py-0.5 rounded">
                                        PRELAUNCH2000
                                    </span>{" "}
                                    at checkout
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Pricing Card */}
                    <div className="relative">
                        <div className="absolute inset-0 gradient-emerald rounded-3xl blur-2xl opacity-20"></div>
                        <div className="relative p-8 md:p-12 rounded-3xl bg-card shadow-float border-2 border-primary/20">
                            {/* Plan Title */}
                            <div className="text-center mb-8">
                                <h3 className="text-3xl font-display font-bold mb-2">
                                    The Growth Partnership Plan
                                </h3>
                                <div className="flex items-baseline justify-center gap-3 mb-2">
                                    <span className="text-2xl text-muted-foreground line-through">
                                        $2,997
                                    </span>
                                    <span className="text-5xl md:text-6xl font-bold text-primary">
                                        $997
                                    </span>
                                </div>
                                <p className="text-xl text-muted-foreground mb-2">
                                    refundable deposit
                                </p>
                                <p className="text-muted-foreground">
                                    Covers the AI & API resources that build your system
                                </p>
                            </div>

                            {/* Key Points */}
                            <div className="space-y-4 mb-8">
                                <div className="p-4 rounded-xl bg-muted/50 border border-primary/10">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg gradient-emerald flex-shrink-0">
                                            <span className="text-2xl">💸</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground mb-1">
                                                5% performance share
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Only on actual sales generated through
                                                the platform
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg gradient-gold flex-shrink-0">
                                            <span className="text-2xl">🚀</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground mb-1">
                                                Refund milestone
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Once you cross $100K in sales, we refund
                                                your entire deposit
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg gradient-emerald flex-shrink-0">
                                            <span className="text-2xl">🌎</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground mb-1">
                                                Legacy Bonus
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Join the 6-Figure Creator Circle with
                                                mastermind sessions, launch
                                                collaborations, and exclusive retreat
                                                invites
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Features List */}
                            <div className="mb-8">
                                <p className="font-semibold text-foreground mb-4">
                                    Everything included:
                                </p>
                                <div className="grid md:grid-cols-2 gap-3">
                                    {features.map((feature, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-2"
                                        >
                                            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-muted-foreground text-sm">
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="text-center mb-6">
                                <Button
                                    variant="hero"
                                    size="lg"
                                    className="w-full md:w-auto text-lg px-12 py-6 group"
                                    asChild
                                >
                                    <a href="https://buy.stripe.com/3cIfZgbgn3zR5FS8wk0oM0e">
                                        Get Started - Save $2,000
                                        <span className="ml-2 group-hover:translate-x-1 transition-transform">
                                            →
                                        </span>
                                    </a>
                                </Button>
                                <p className="text-sm text-muted-foreground mt-3">
                                    No risk. Cancel anytime before launch.
                                </p>
                            </div>

                            {/* Guarantee Badge */}
                            <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-card border border-primary/20">
                                <Shield className="w-6 h-6 text-primary" />
                                <div className="text-left">
                                    <p className="font-semibold text-foreground">
                                        100% Satisfaction Guarantee
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Not thrilled with your launch? We'll refund your
                                        deposit. No questions asked.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
