import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const FinalCTA = () => {
    return (
        <section className="py-24 gradient-dark relative overflow-hidden">
            {/* Animated background waves */}
            <div className="absolute inset-0 opacity-40">
                <div className="absolute top-0 left-0 w-full h-full">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/30 rounded-full blur-3xl animate-float" />
                    <div
                        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-float"
                        style={{ animationDelay: "2s" }}
                    />
                </div>
            </div>

            <div className="container relative mx-auto px-6">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    {/* Heading */}
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground animate-fade-in">
                        Step Into{" "}
                        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-glow">
                            Predictable Scale
                        </span>
                    </h2>

                    {/* Subheading */}
                    <p
                        className="text-xl md:text-2xl text-primary-foreground/90 max-w-3xl mx-auto leading-relaxed animate-fade-in"
                        style={{ animationDelay: "0.2s" }}
                    >
                        Build your profitable, AI-powered evergreen funnel that converts
                        cold traffic into customers in 30 days or less.
                    </p>

                    {/* Pre-Launch Special Banner */}
                    <div
                        className="max-w-xl mx-auto animate-fade-in px-4"
                        style={{ animationDelay: "0.3s" }}
                    >
                        <div className="relative p-4 md:p-5 rounded-2xl bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-2 border-yellow-400 shadow-glow backdrop-blur-sm">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 rounded-full bg-yellow-400 text-black text-xs md:text-sm font-bold whitespace-nowrap">
                                🎉 PRE-LAUNCH SPECIAL
                            </div>
                            <p className="text-lg md:text-xl font-bold text-primary-foreground mb-1">
                                Save $2,000 Today!
                            </p>
                            <p className="text-xs md:text-sm text-primary-foreground/80">
                                Use code{" "}
                                <span className="font-mono font-bold text-yellow-400 bg-black/50 px-2 py-0.5 rounded text-xs md:text-sm">
                                    PRELAUNCH2000
                                </span>{" "}
                                at checkout
                            </p>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <div
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 animate-fade-in"
                        style={{ animationDelay: "0.5s" }}
                    >
                        <Button
                            variant="premium"
                            size="lg"
                            className="group text-lg px-12 py-6 shadow-glow"
                            asChild
                        >
                            <a href="https://buy.stripe.com/3cIfZgbgn3zR5FS8wk0oM0e">
                                Start Now - Save $2,000
                                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </Button>
                    </div>

                    {/* Trust indicators */}
                    <div
                        className="pt-8 animate-fade-in"
                        style={{ animationDelay: "0.6s" }}
                    >
                        <div className="flex flex-wrap justify-center items-center gap-6 text-primary-foreground/70">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">⚙️</span>
                                <span className="text-sm">30-Day Setup</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🛡️</span>
                                <span className="text-sm">
                                    100% Money-Back Guarantee
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🚀</span>
                                <span className="text-sm">
                                    Launch in Days, Not Months
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FinalCTA;
