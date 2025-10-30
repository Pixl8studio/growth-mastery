import { Button } from "@/components/ui/button";
import { BarChart3, Activity, Eye } from "lucide-react";

const DashboardPreview = () => {
    return (
        <section className="py-24 gradient-dark relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent/30 rounded-full blur-3xl animate-float" />
                <div
                    className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-float"
                    style={{ animationDelay: "2s" }}
                />
            </div>

            <div className="container relative mx-auto px-6">
                <div className="max-w-6xl mx-auto text-center">
                    {/* Header */}
                    <div className="mb-12">
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 text-primary-foreground">
                            See Everything.{" "}
                            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-glow">
                                Scale Intelligently.
                            </span>
                        </h2>
                        <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto leading-relaxed">
                            Operate your business with the precision of a pilot —
                            confidently guided by real-time data and adaptive
                            intelligence.
                        </p>
                    </div>

                    {/* Dashboard preview */}
                    <div className="relative mb-12">
                        <div className="relative rounded-3xl bg-card/10 backdrop-blur-xl p-8 shadow-float border border-primary-foreground/10">
                            {/* Mock dashboard grid */}
                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                                {[
                                    {
                                        icon: BarChart3,
                                        label: "Revenue",
                                        value: "$127K",
                                        trend: "+23%",
                                    },
                                    {
                                        icon: Activity,
                                        label: "Active Campaigns",
                                        value: "12",
                                        trend: "+3",
                                    },
                                    {
                                        icon: Eye,
                                        label: "Total Visitors",
                                        value: "45.2K",
                                        trend: "+15%",
                                    },
                                ].map((metric, index) => (
                                    <div
                                        key={index}
                                        className="group p-6 rounded-2xl bg-card/80 backdrop-blur-sm shadow-soft hover:shadow-glow transition-smooth animate-fade-in"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <metric.icon className="w-6 h-6 text-primary" />
                                            <span className="text-accent font-semibold text-sm">
                                                {metric.trend}
                                            </span>
                                        </div>
                                        <p className="text-3xl font-bold text-foreground mb-1">
                                            {metric.value}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {metric.label}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Graph placeholder */}
                            <div className="h-48 rounded-xl bg-card/50 backdrop-blur-sm flex items-end justify-around p-4 gap-2">
                                {[40, 65, 45, 80, 60, 95, 70, 85].map(
                                    (height, index) => (
                                        <div
                                            key={index}
                                            className="flex-1 rounded-t-lg gradient-emerald opacity-80 hover:opacity-100 transition-smooth animate-slide-up"
                                            style={{
                                                height: `${height}%`,
                                                animationDelay: `${index * 0.05}s`,
                                            }}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="max-w-3xl mx-auto mb-8">
                        <p className="text-primary-foreground/80 leading-relaxed mb-6">
                            The GrowthMastery Dashboard gives founders complete
                            visibility into their entire go-to-market system — from
                            offers and ads to funnels, sales, and customer journeys —
                            all in one unified view.
                        </p>
                        <p className="text-primary-foreground/80 leading-relaxed">
                            It continuously learns from every launch, tracking
                            performance signals across your campaigns and surfacing
                            insights that help you improve faster, lower acquisition
                            costs, and scale with clarity.
                        </p>
                    </div>

                    {/* CTA */}
                    <Button variant="premium" size="lg" className="group" asChild>
                        <a href="https://buy.stripe.com/aFa3cu98fdarc4gh2Q0oM0d">
                            Start Now
                            <span className="ml-2 group-hover:translate-x-1 transition-transform">
                                →
                            </span>
                        </a>
                    </Button>
                    <p className="text-sm text-primary-foreground/60 mt-4">
                        Experience total clarity and control — in one view.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default DashboardPreview;
