import { Button } from "@/components/ui/button";
import { Presentation, Users, Briefcase, ShoppingBag } from "lucide-react";

const useCases = [
    { icon: Presentation, text: "Sales Webinars that enroll customers automatically" },
    { icon: Users, text: "Educational Masterclasses that build trust and authority" },
    {
        icon: Briefcase,
        text: "Investor or Partnership Pitches that communicate vision clearly",
    },
    {
        icon: ShoppingBag,
        text: "Product Demos or Brand Stories that convert curiosity into customers",
    },
];

const PresentationBuilder = () => {
    return (
        <section className="py-24 gradient-hero relative overflow-hidden">
            {/* Background gradient orbs */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-20 left-0 w-96 h-96 bg-accent/40 rounded-full blur-3xl animate-float" />
            </div>

            <div className="container relative mx-auto px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Content */}
                        <div className="space-y-6">
                            <h2 className="text-4xl md:text-5xl font-display font-bold">
                                Generate High-Converting Presentations, Masterclasses,
                                or Pitches{" "}
                                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-glow">
                                    In Minutes
                                </span>
                            </h2>

                            <p className="text-muted-foreground leading-relaxed">
                                Skip the writer's block, endless slide revisions, and
                                copy-and-paste templates. Our AI Presentation Engine
                                transforms your business details into a fully-built,
                                conversion-optimized deck.
                            </p>

                            <div className="space-y-3 pt-4">
                                <p className="font-semibold text-foreground">
                                    You can instantly generate:
                                </p>
                                {useCases.map((useCase, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-card/50 transition-smooth"
                                    >
                                        <useCase.icon className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                                        <p className="text-foreground">
                                            {useCase.text}
                                        </p>
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
                                        Create My Presentation
                                        <span className="ml-2 group-hover:translate-x-1 transition-transform">
                                            →
                                        </span>
                                    </a>
                                </Button>
                                <p className="text-sm text-muted-foreground mt-3">
                                    Turn your ideas into a beautifully built,
                                    conversion-ready story.
                                </p>
                            </div>
                        </div>

                        {/* Right: Visual representation */}
                        <div className="relative">
                            <div className="relative rounded-3xl bg-card shadow-float p-8">
                                {/* Stacked slides animation */}
                                <div className="space-y-4">
                                    {[0, 1, 2].map((index) => (
                                        <div
                                            key={index}
                                            className="h-24 rounded-xl bg-gradient-to-r from-muted to-muted/50 shadow-soft flex items-center justify-center animate-fade-in"
                                            style={{
                                                animationDelay: `${index * 0.2}s`,
                                                transform: `translateY(${index * 8}px) scale(${1 - index * 0.05})`,
                                            }}
                                        >
                                            <div className="text-center opacity-50">
                                                <p className="text-sm font-semibold">
                                                    Slide {index + 1}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Glow effect */}
                                <div className="absolute -bottom-4 -right-4 w-32 h-32 gradient-gold rounded-full blur-3xl opacity-50 animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PresentationBuilder;
