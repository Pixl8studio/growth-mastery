import { Button } from "@/components/ui/button";
import { MessageSquare, Zap, TrendingUp } from "lucide-react";

const FollowUpEngine = () => {
    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Visual Dashboard */}
                        <div className="relative order-2 lg:order-1">
                            <div className="relative rounded-3xl bg-secondary p-8 shadow-float">
                                {/* Mock dashboard elements */}
                                <div className="space-y-4">
                                    {/* Message cards */}
                                    {[
                                        {
                                            icon: MessageSquare,
                                            label: "Follow-up sent",
                                            value: "94%",
                                            color: "text-accent",
                                        },
                                        {
                                            icon: Zap,
                                            label: "Response rate",
                                            value: "67%",
                                            color: "text-primary",
                                        },
                                        {
                                            icon: TrendingUp,
                                            label: "Conversions",
                                            value: "+34%",
                                            color: "text-accent",
                                        },
                                    ].map((stat, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-4 p-4 rounded-xl bg-card/90 backdrop-blur-sm shadow-soft animate-fade-in"
                                            style={{
                                                animationDelay: `${index * 0.15}s`,
                                            }}
                                        >
                                            <div className="p-3 rounded-lg gradient-emerald">
                                                <stat.icon className="w-5 h-5 text-primary-foreground" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-muted-foreground">
                                                    {stat.label}
                                                </p>
                                                <p
                                                    className={`text-2xl font-bold ${stat.color}`}
                                                >
                                                    {stat.value}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Pulse effect */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 gradient-emerald rounded-full blur-3xl opacity-20 animate-pulse" />
                            </div>
                        </div>

                        {/* Right: Content */}
                        <div className="space-y-6 order-1 lg:order-2">
                            <h2 className="text-4xl md:text-5xl font-display font-bold">
                                Your 24/7 AI Follow-Up Engine
                            </h2>

                            <p className="text-xl font-semibold">
                                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-glow">
                                    Personalized, Proactive, and Always Learning
                                </span>
                            </p>

                            <p className="text-muted-foreground leading-relaxed">
                                Trained automatically on your brand voice and offer, the
                                engine listens to what prospects do — how long they
                                watch, what they ask, and what they click — then
                                responds like a skilled closer who already knows their
                                story.
                            </p>

                            <p className="text-muted-foreground leading-relaxed">
                                It crafts professional, personal email and SMS sequences
                                that educate, answer objections, and convert — without
                                you writing a word. Each message refines itself using
                                live engagement data, turning your post-webinar or
                                campaign follow-up into a self-optimizing revenue loop.
                            </p>

                            <div className="pt-4">
                                <Button
                                    variant="hero"
                                    size="lg"
                                    className="group"
                                    asChild
                                >
                                    <a href="#pricing" className="scroll-smooth">
                                        See It in Action
                                        <span className="ml-2 group-hover:translate-x-1 transition-transform">
                                            →
                                        </span>
                                    </a>
                                </Button>
                                <p className="text-sm text-muted-foreground mt-3">
                                    Experience the AI engine that never stops selling
                                    for you.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FollowUpEngine;
