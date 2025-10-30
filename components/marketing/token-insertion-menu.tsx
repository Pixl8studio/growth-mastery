/**
 * Token Insertion Menu Component
 * Dropdown menu for personalization tokens (matching followup system)
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Code, Search } from "lucide-react";

interface TokenInsertionMenuProps {
    onInsertToken: (token: string) => void;
    position?: "above" | "below";
}

const AVAILABLE_TOKENS = [
    {
        token: "{first_name}",
        description: "Contact's first name",
        category: "Personal",
    },
    { token: "{last_name}", description: "Contact's last name", category: "Personal" },
    { token: "{email}", description: "Contact's email address", category: "Personal" },
    { token: "{company_name}", description: "Contact's company", category: "Personal" },
    { token: "{job_title}", description: "Contact's job title", category: "Personal" },
    { token: "{city}", description: "Contact's city", category: "Location" },
    { token: "{state}", description: "Contact's state/region", category: "Location" },
    { token: "{country}", description: "Contact's country", category: "Location" },
    { token: "{webinar_title}", description: "Name of the webinar", category: "Event" },
    {
        token: "{watch_percentage}",
        description: "% of webinar watched",
        category: "Event",
    },
    {
        token: "{registration_date}",
        description: "When they registered",
        category: "Event",
    },
    { token: "{offer_name}", description: "Name of your offer", category: "Offer" },
    { token: "{offer_price}", description: "Price of the offer", category: "Offer" },
    {
        token: "{discount_amount}",
        description: "Current discount value",
        category: "Offer",
    },
    {
        token: "{discount_percentage}",
        description: "Discount percentage",
        category: "Offer",
    },
    {
        token: "{deadline_date}",
        description: "Offer deadline date",
        category: "Urgency",
    },
    {
        token: "{deadline_time}",
        description: "Time remaining until deadline",
        category: "Urgency",
    },
    {
        token: "{hours_remaining}",
        description: "Hours until deadline",
        category: "Urgency",
    },
    { token: "{sender_name}", description: "Your name/brand name", category: "Sender" },
    { token: "{sender_email}", description: "Your email address", category: "Sender" },
];

export function TokenInsertionMenu({
    onInsertToken,
    position = "below",
}: TokenInsertionMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredTokens = AVAILABLE_TOKENS.filter(
        (token) =>
            token.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
            token.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categories = Array.from(new Set(AVAILABLE_TOKENS.map((t) => t.category)));

    const handleInsert = (token: string) => {
        onInsertToken(token);
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <div className="relative">
            <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="outline"
                size="sm"
                type="button"
            >
                <Code className="h-4 w-4 mr-2" />
                Insert Token
            </Button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown Menu */}
                    <div
                        className={`absolute z-50 w-96 bg-card rounded-lg shadow-2xl border border-border ${
                            position === "below" ? "top-full mt-2" : "bottom-full mb-2"
                        } left-0`}
                    >
                        <div className="p-3 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search tokens..."
                                    className="pl-10 h-9"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto p-2">
                            {categories.map((category) => {
                                const categoryTokens = filteredTokens.filter(
                                    (t) => t.category === category
                                );

                                if (categoryTokens.length === 0) return null;

                                return (
                                    <div key={category} className="mb-3">
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                                            {category}
                                        </div>
                                        <div className="space-y-1">
                                            {categoryTokens.map((token) => (
                                                <button
                                                    key={token.token}
                                                    onClick={() =>
                                                        handleInsert(token.token)
                                                    }
                                                    className="w-full text-left px-3 py-2 rounded hover:bg-primary/5 transition-colors group"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="font-mono text-sm text-primary group-hover:text-primary">
                                                                {token.token}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {token.description}
                                                            </div>
                                                        </div>
                                                        <Code className="h-4 w-4 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredTokens.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Code className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No tokens found</p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t bg-muted/50 rounded-b-lg">
                            <p className="text-xs text-muted-foreground">
                                💡 <strong>Tip:</strong> Tokens are replaced with actual
                                values when content is published
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
