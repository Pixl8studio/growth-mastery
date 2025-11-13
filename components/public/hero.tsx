import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CountdownDealBanner } from "./countdown-deal-banner";

const Hero = () => {
    return (
        <section className="relative min-h-screen gradient-hero overflow-hidden">
            {/* Animated background particles - reduced on mobile */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-20 left-10 w-32 h-32 sm:w-64 sm:h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
                <div
                    className="absolute bottom-20 right-10 w-48 h-48 sm:w-96 sm:h-96 bg-accent/20 rounded-full blur-3xl animate-float"
                    style={{ animationDelay: "2s" }}
                />
            </div>

            <div className="container relative mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
                {/* Logo and Login Button Row */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mb-6 sm:mb-8 animate-fade-in max-w-5xl mx-auto">
                    <div className="flex-1 hidden sm:block" />
                    <Image
                        src="/assets/growth-mastery-logo.png"
                        alt="GrowthMastery.ai"
                        width={60}
                        height={60}
                        className="animate-float sm:w-20 sm:h-20"
                        priority
                    />
                    <div className="flex-1 flex justify-center sm:justify-end">
                        <Button
                            variant="outline"
                            className="backdrop-blur-sm bg-green-600 hover:bg-yellow-500 text-white hover:text-black border-green-700 hover:border-yellow-600 font-semibold shadow-lg transition-all min-h-[44px] px-6"
                            asChild
                        >
                            <Link href="/login">
                                <LogIn className="mr-2 h-4 w-4" />
                                Login
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Hero Content */}
                <div className="max-w-5xl mx-auto text-center space-y-4 sm:space-y-6">
                    <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight animate-fade-in px-2">
                        Launch in a Day.{" "}
                        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-glow">
                            Scale Forever.
                        </span>
                    </h1>

                    <p
                        className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4"
                        style={{ animationDelay: "0.2s" }}
                    >
                        The world's first go-to-market engine that designs, builds, and
                        deploys your entire funnel and marketing assets so you can
                        automate sales in hours, not months.
                    </p>

                    {/* CTA Buttons */}
                    <div
                        className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center animate-fade-in pb-4 sm:pb-6 md:pb-8 px-4"
                        style={{ animationDelay: "0.3s" }}
                    >
                        <Button
                            size="lg"
                            variant="hero"
                            className="group text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto min-h-[56px]"
                            asChild
                        >
                            <a href="https://buy.stripe.com/3cIfZgbgn3zR5FS8wk0oM0e">
                                🚀 Start Now
                                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </Button>
                    </div>

                    {/* Pre-Launch Special Banner with Countdown */}
                    <CountdownDealBanner />

                    {/* Social Proof */}
                    <div
                        className="pt-6 sm:pt-8 animate-fade-in px-4"
                        style={{ animationDelay: "0.6s" }}
                    >
                        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 uppercase tracking-wide">
                            Trusted by Founders Worldwide
                        </p>
                        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-8 opacity-70">
                            <div className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-card/50 backdrop-blur-sm shadow-soft w-full sm:w-auto">
                                <p className="font-semibold text-foreground text-sm sm:text-base text-center">
                                    100s of Founders Served
                                </p>
                            </div>
                            <div className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-card/50 backdrop-blur-sm shadow-soft w-full sm:w-auto">
                                <p className="font-semibold text-foreground text-sm sm:text-base text-center">
                                    $10M+ Generated Online
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll indicator - hidden on mobile */}
            <div className="hidden lg:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <div className="w-6 h-10 rounded-full border-2 border-primary/30 flex items-start justify-center p-2">
                    <div className="w-1.5 h-3 rounded-full bg-primary/50 animate-pulse" />
                </div>
            </div>
        </section>
    );
};

export default Hero;
