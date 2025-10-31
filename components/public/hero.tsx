import { Button } from "@/components/ui/button";
import { ArrowRight, Play, LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const Hero = () => {
    return (
        <section className="relative min-h-screen gradient-hero overflow-hidden">
            {/* Animated background particles */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
                <div
                    className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float"
                    style={{ animationDelay: "2s" }}
                />
            </div>

            {/* Login button in top-right corner */}
            <div className="absolute top-6 right-6 z-10 animate-fade-in">
                <Button
                    variant="outline"
                    className="backdrop-blur-sm bg-green-600 hover:bg-yellow-500 text-white hover:text-black border-green-700 hover:border-yellow-600 font-semibold shadow-lg transition-all"
                    asChild
                >
                    <Link href="/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Login
                    </Link>
                </Button>
            </div>

            <div className="container relative mx-auto px-6 py-20 lg:py-32">
                {/* Logo */}
                <div className="flex justify-center mb-12 animate-fade-in">
                    <Image
                        src="/assets/growth-mastery-logo.png"
                        alt="GrowthMastery.ai"
                        width={80}
                        height={80}
                        className="animate-float"
                    />
                </div>

                {/* Hero Content */}
                <div className="max-w-5xl mx-auto text-center space-y-8">
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight animate-fade-in">
                        Launch in a Day.{" "}
                        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-glow">
                            Scale Forever.
                        </span>
                    </h1>

                    <p
                        className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in"
                        style={{ animationDelay: "0.2s" }}
                    >
                        The world's first go-to-market engine that designs, builds, and
                        deploys your entire funnel and marketing assets so you can
                        automate sales in hours, not months.
                    </p>

                    {/* CTA Buttons */}
                    <div
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in"
                        style={{ animationDelay: "0.4s" }}
                    >
                        <Button
                            size="lg"
                            variant="hero"
                            className="group text-lg px-8 py-6"
                            asChild
                        >
                            <a href="https://buy.stripe.com/aFa3cu98fdarc4gh2Q0oM0d">
                                🚀 Start Now
                                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="text-lg px-8 py-6 group"
                        >
                            <Play className="mr-2 group-hover:scale-110 transition-transform" />
                            Watch Demo
                        </Button>
                    </div>

                    {/* Social Proof */}
                    <div
                        className="pt-12 animate-fade-in"
                        style={{ animationDelay: "0.6s" }}
                    >
                        <p className="text-sm text-muted-foreground mb-6 uppercase tracking-wide">
                            Trusted by Founders Worldwide
                        </p>
                        <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
                            <div className="px-6 py-3 rounded-lg bg-card/50 backdrop-blur-sm shadow-soft">
                                <p className="font-semibold text-foreground">
                                    100s of Founders Served
                                </p>
                            </div>
                            <div className="px-6 py-3 rounded-lg bg-card/50 backdrop-blur-sm shadow-soft">
                                <p className="font-semibold text-foreground">
                                    $10M+ Generated Online
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <div className="w-6 h-10 rounded-full border-2 border-primary/30 flex items-start justify-center p-2">
                    <div className="w-1.5 h-3 rounded-full bg-primary/50 animate-pulse" />
                </div>
            </div>
        </section>
    );
};

export default Hero;
