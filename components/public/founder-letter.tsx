import Image from "next/image";

const FounderLetter = () => {
    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                            Built by Founders, for Founders
                        </h2>
                        <p className="text-xl text-muted-foreground">
                            A letter from our founder
                        </p>
                    </div>

                    {/* Letter content */}
                    <div className="relative">
                        {/* Decorative quote mark */}
                        <div className="absolute -top-4 -left-4 text-8xl text-primary/10 font-serif">
                            "
                        </div>

                        <div className="relative bg-card p-8 md:p-12 rounded-3xl shadow-soft border border-border">
                            {/* Pull quote */}
                            <blockquote className="text-2xl md:text-3xl font-display font-semibold text-center mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent italic">
                                "We created the Genius Launch System to help
                                entrepreneurs scale their genius, not their workload."
                            </blockquote>

                            {/* Letter body */}
                            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground leading-relaxed">
                                <p>
                                    When I first began helping founders grow their
                                    companies, I noticed the same heartbreaking pattern:
                                    brilliant, purpose-driven people - spending 80% of
                                    their time wrestling with tools, tech stacks, and
                                    marketing complexity that drained their creative
                                    energy.
                                </p>

                                <p>
                                    It became clear that the biggest barrier to
                                    entrepreneurship in this new age wasn't talent,
                                    vision, or effort - it was go-to-market complexity.
                                </p>

                                <p>
                                    The truth is, we now live in the most abundant time
                                    in human history. With AI, the power to build
                                    something world-changing no longer requires a
                                    10-person marketing team or a million-dollar budget.
                                </p>

                                <p>
                                    But until now, that potential has been locked behind
                                    fragmented systems, tech overwhelm, and the constant
                                    noise of "what to do next."
                                </p>

                                <p className="font-semibold text-foreground">
                                    That's why we created GrowthMastery.ai - and within
                                    it, the Genius Launch System:
                                </p>

                                <p>
                                    A conversational, AI-powered platform that helps you
                                    clarify your offer, launch your funnel, and automate
                                    your customer journey in days - not months.
                                </p>

                                <div className="my-8 p-6 rounded-xl bg-primary/5 border-l-4 border-primary">
                                    <p className="font-semibold text-foreground mb-2">
                                        Our mission is simple:
                                    </p>
                                    <ul className="space-y-2 text-foreground">
                                        <li>
                                            To liberate entrepreneurs from the friction
                                            of complexity,
                                        </li>
                                        <li>So they can fully express their genius,</li>
                                        <li>Scale their impact,</li>
                                        <li>
                                            And participate in building a world of
                                            infinite abundance for all beings.
                                        </li>
                                    </ul>
                                </div>

                                <p>
                                    If you're reading this, you are part of a generation
                                    of creators rewriting what business can mean - a
                                    generation proving that profit and purpose can
                                    coexist, and that intelligent systems can serve the
                                    evolution of humanity, not replace it.
                                </p>

                                <p className="text-foreground font-semibold pt-4">
                                    With gratitude and conviction,
                                </p>
                            </div>

                            {/* Signature */}
                            <div className="mt-8 pt-6 border-t border-border">
                                <div className="flex items-center gap-4">
                                    <Image
                                        src="/assets/joe-headshot.png"
                                        alt="Joe McVeen, Founder & CEO of GrowthMastery.ai"
                                        width={80}
                                        height={80}
                                        className="rounded-full object-cover shadow-soft"
                                    />
                                    <div>
                                        <p className="font-display font-bold text-lg text-foreground">
                                            Joe McVeen
                                        </p>
                                        <p className="text-muted-foreground">
                                            Founder & CEO, GrowthMastery.ai
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FounderLetter;
