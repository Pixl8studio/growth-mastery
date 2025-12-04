import { describe, it, expect } from "vitest";
import type {
    Slide,
    DeckStructure,
    OfferPathway,
    OfferGeneration,
} from "@/lib/ai/types";

describe("AI Types", () => {
    describe("Slide type", () => {
        it("allows valid slide objects", () => {
            const slide: Slide = {
                slideNumber: 1,
                title: "Test",
                description: "Test description",
                section: "hook",
            };
            expect(slide).toBeDefined();
        });
    });

    describe("DeckStructure type", () => {
        it("allows valid deck structure", () => {
            const deck: DeckStructure = {
                slides: [],
                totalSlides: 0,
                sections: {
                    hook: 0,
                    problem: 0,
                    agitate: 0,
                    solution: 0,
                    offer: 0,
                    close: 0,
                },
            };
            expect(deck).toBeDefined();
        });
    });

    describe("OfferPathway type", () => {
        it("accepts valid pathways", () => {
            const pathway1: OfferPathway = "book_call";
            const pathway2: OfferPathway = "direct_purchase";
            expect(pathway1).toBe("book_call");
            expect(pathway2).toBe("direct_purchase");
        });
    });

    describe("OfferGeneration type", () => {
        it("allows valid offer objects", () => {
            const offer: OfferGeneration = {
                name: "Test Offer",
                tagline: "Test tagline",
                price: 100,
                currency: "USD",
                features: [],
                bonuses: [],
                guarantee: "30-day",
                promise: "Test promise",
                person: "Test person",
                process: "Test process",
                purpose: "Test purpose",
                pathway: "book_call",
            };
            expect(offer).toBeDefined();
        });
    });
});
