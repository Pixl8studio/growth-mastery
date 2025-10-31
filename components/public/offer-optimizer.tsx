import { Button } from "@/components/ui/button";
import { Sparkles, Target, TrendingUp, CheckCircle } from "lucide-react";

const OfferOptimizer = () => {
    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Visual/Animation placeholder */}
                        <div className="relative">
                            <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-muted to-muted/50 p-8 shadow-float">
                                {/* Animated elements */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative w-full h-full">
                                        <div className="absolute top-1/4 left-1/4 p-4 rounded-xl bg-card shadow-soft animate-float">
                                            <Target className="w-8 h-8 text-primary" />
                                        </div>
                                        <div
                                            className="absolute top-1/2 right-1/4 p-4 rounded-xl bg-card shadow-soft animate-float"
                                            style={{ animationDelay: "1s" }}
                                        >
                                            <TrendingUp className="w-8 h-8 text-accent" />
                                        </div>
                                        <div
                                            className="absolute bottom-1/4 left-1/3 p-4 rounded-xl bg-card shadow-soft animate-float"
                                            style={{ animationDelay: "2s" }}
                                        >
                                            <Sparkles className="w-8 h-8 text-primary" />
                                        </div>
                                        {/* Central glow */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 gradient-emerald rounded-full blur-3xl opacity-50 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Content */}
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                                    Craft an Irresistible{" "}
                                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-glow">
                                        Scalable Offer with AI
                                    </span>
                                </h2>
                                <p className="text-xl text-muted-foreground mb-6">
                                    Never guess what your market wants again.
                                </p>
                            </div>

                            <p className="text-muted-foreground leading-relaxed">
                                Our Offer Intelligence Engine continuously studies your
                                business, your audience, and the entire marketplace —
                                revealing exactly how to evolve your offer for maximum
                                resonance, profitability, and growth.
                            </p>

                            <div className="space-y-4">
                                {[
                                    "Refined positioning language that aligns with your voice and audience",
                                    "Optimized price points for maximum conversion and profit margin",
                                    "Adaptive scripts and value stack built from proven psychological frameworks",
                                    "Clear launch readiness score that ensures every offer you put out is market-fit and scale-ready",
                                ].map((feature, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                                        <p className="text-foreground">{feature}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4">
                                <Button
                                    variant="hero"
                                    size="lg"
                                    className="group"
                                    asChild
                                >
                                    <a href="#pricing" className="scroll-smooth">
                                        Generate Your Offer
                                        <span className="ml-2 group-hover:translate-x-1 transition-transform">
                                            →
                                        </span>
                                    </a>
                                </Button>
                                <p className="text-sm text-muted-foreground mt-3">
                                    Instantly analyze, position, and price your next big
                                    idea.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default OfferOptimizer;
