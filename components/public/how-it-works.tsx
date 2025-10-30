import { Lightbulb, Brain, Zap } from "lucide-react";

const steps = [
    {
        icon: Lightbulb,
        step: "Step 1",
        title: "Define Your Offer",
        description:
            "Upload your assets or talk to our AI to define your offer & customer details",
    },
    {
        icon: Brain,
        step: "Step 2",
        title: "Watch It Build",
        description:
            "See your entire funnel - webinar, pages, copy, ads, content calendar - auto-generate in minutes.",
    },
    {
        icon: Zap,
        step: "Step 3",
        title: "Automate & Scale",
        description:
            "Automate all organic & paid marketing that intelligently self-optimizes based on performance",
    },
];

const HowItWorks = () => {
    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                        3 Steps.{" "}
                        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-glow">
                            Infinite Scale.
                        </span>
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {steps.map((step, index) => (
                        <div
                            key={index}
                            className="group relative p-8 rounded-2xl bg-card shadow-soft hover:shadow-float transition-smooth hover:-translate-y-2 border border-border text-center"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Step number indicator */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-soft">
                                {step.step}
                            </div>

                            {/* Icon */}
                            <div className="mb-6 inline-flex p-4 rounded-2xl gradient-emerald shadow-glow group-hover:scale-110 transition-smooth">
                                <step.icon className="w-8 h-8 text-primary-foreground" />
                            </div>

                            {/* Content */}
                            <h3 className="text-2xl font-display font-bold mb-4 text-foreground">
                                {step.title}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
