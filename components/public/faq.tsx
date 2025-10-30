import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const faqs = [
    {
        question: "Do I have to switch CRMs?",
        answer: "No. GrowthMastery is CRM-agnostic. We plug into your existing CRM via secure webhooks/APIs. We handle lead capture, sales presentations, and conversion follow-up, then push contact + engagement/purchase data into your CRM so you can keep newsletters and long-term nurture exactly how you like. Use HubSpot, Salesforce, GoHighLevel, ActiveCampaign, Klaviyo or whatever platform you already use - no migration required.",
    },
    {
        question: "What if I don't have an offer yet?",
        answer: "No problem - that's exactly what the Genius Launch System helps you create. You'll use our guided AI process to clarify your niche, define your irresistible offer, and design your customer journey - all in one intuitive conversation.",
    },
    {
        question: "How fast can I launch?",
        answer: "Most founders launch in as little as 3 days. Once your offer is defined, our AI builds your entire funnel - registration, webinar, emails, checkout - automatically. You can go from 'idea' to 'income' faster than ever before.",
    },
    {
        question: "What if I already have an existing funnel or offer?",
        answer: "Perfect. You can import your existing assets directly into GrowthMastery.ai. Our system will analyze what's working, upgrade your copy, and optimize everything for automated scaling.",
    },
    {
        question: "Is the $997 deposit really refundable?",
        answer: "Yes - 100%. It simply covers API and setup costs. Once you generate $100K through your funnel, we refund it in full and celebrate your milestone by inviting you to the 6-Figure Creator Circle.",
    },
    {
        question: "How does the 5% performance fee work?",
        answer: "We only earn when you do. Every sale that flows through your funnel is automatically tracked, and 5% is routed to GrowthMastery.ai as a success-based contribution - aligning our incentives with your growth.",
    },
    {
        question: "What if I need support or want help optimizing?",
        answer: "You'll have access to live onboarding calls, AI chat assistance, and expert growth advisors in our private Founder Slack. You're never building alone - we're your partners in scale.",
    },
];

const FAQ = () => {
    return (
        <section className="py-24 gradient-hero">
            <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-xl text-muted-foreground">
                            Everything you need to know about GrowthMastery.ai
                        </p>
                    </div>

                    {/* FAQ Accordion */}
                    <Accordion type="single" collapsible className="space-y-4">
                        {faqs.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="bg-card rounded-xl shadow-soft border border-border overflow-hidden"
                            >
                                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-smooth text-left">
                                    <span className="font-display font-semibold text-lg">
                                        {faq.question}
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-4 text-muted-foreground leading-relaxed">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    {/* Still have questions CTA */}
                    <div className="text-center mt-12 p-8 rounded-2xl bg-card shadow-soft">
                        <h3 className="text-2xl font-display font-bold mb-4">
                            Still have questions?
                        </h3>
                        <p className="text-muted-foreground mb-6">
                            Our team is here to help you get started
                        </p>
                        <Button variant="outline" size="lg" asChild>
                            <a href="mailto:joe@growthmastery.ai?subject=Growth">
                                Contact Support
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FAQ;
