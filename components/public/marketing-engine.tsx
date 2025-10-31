import { Calendar, Target, TrendingUp, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
    {
        icon: Calendar,
        title: "Automated Content Calendar",
        description:
            "Instantly generate daily, platform-specific social posts, stories, and emails - aligned with your funnel messaging and audience data.",
    },
    {
        icon: Target,
        title: "Adaptive Ads Engine",
        description:
            "Launch meta-optimized ad campaigns trained on real performance data. AI predicts winning angles, headlines, and creatives before you spend.",
    },
    {
        icon: TrendingUp,
        title: "Continuous Optimization",
        description:
            "Every engagement feeds back into your funnel analytics. The system tests, learns, and automatically scales what's working - lowering CAC while increasing ROAS.",
    },
    {
        icon: LayoutDashboard,
        title: "Unified Dashboard",
        description:
            "See your entire growth ecosystem in one place: content, leads, conversions, and sales - beautifully visualized and continuously improving.",
    },
];

const MarketingEngine = () => {
    return (
        <section className="py-24 gradient-hero relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="container relative mx-auto px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <p className="text-accent font-semibold mb-4 uppercase tracking-wide">
                            The Self-Optimizing System That Grows With You
                        </p>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
                            Your Entire Marketing Ecosystem - Automated, Adaptive &{" "}
                            <span className="inline-block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-glow">
                                Always Improving
                            </span>
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                            GrowthMastery.ai doesn't stop at building your funnel - it
                            continuously fuels it. Our AI-powered system creates your
                            content calendar, launches ad campaigns, and learns from
                            every result.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-2 gap-6 mb-12">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="group p-8 rounded-2xl bg-card/80 backdrop-blur-sm shadow-soft hover:shadow-float transition-smooth border border-border"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 p-3 rounded-xl gradient-emerald shadow-glow group-hover:scale-110 transition-smooth">
                                        <feature.icon className="w-6 h-6 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-display font-bold mb-2 text-foreground">
                                            {feature.title}
                                        </h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="text-center">
                        <Button variant="outline" size="lg" className="group" asChild>
                            <a href="#pricing" className="scroll-smooth">
                                See How It Works
                                <span className="ml-2 group-hover:translate-x-1 transition-transform">
                                    →
                                </span>
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MarketingEngine;
