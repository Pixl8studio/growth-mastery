"use client";

import { useState, useEffect, useCallback } from "react";
import { WizardSection } from "./wizard-section";
import { SectionProgress } from "./section-progress";
import type {
    SectionId,
    SectionData,
    BusinessProfile,
    CompletionStatus,
} from "@/types/business-profile";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";

interface ContextWizardProps {
    projectId: string;
    userId: string;
    initialProfile?: BusinessProfile;
    onComplete?: () => void;
    /** Callback when profile is updated (for bidirectional sync with parent) */
    onProfileUpdate?: (profile: BusinessProfile) => void;
}

const SECTION_ORDER: SectionId[] = [
    "section1",
    "section2",
    "section3",
    "section4",
    "section5",
];

export function ContextWizard({
    projectId,
    userId,
    initialProfile,
    onComplete,
    onProfileUpdate,
}: ContextWizardProps) {
    const { toast } = useToast();
    const [currentSection, setCurrentSection] = useState<SectionId>("section1");
    const [profile, setProfile] = useState<Partial<BusinessProfile>>(
        initialProfile || {}
    );
    const [isLoading, setIsLoading] = useState(!initialProfile);

    // Load or create profile on mount
    useEffect(() => {
        const loadProfile = async () => {
            if (initialProfile) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `/api/context/business-profile?projectId=${projectId}`
                );
                const result = await response.json();

                if (response.ok && result.profile) {
                    setProfile(result.profile);

                    // Jump to first incomplete section
                    const completionStatus = result.profile
                        .completion_status as CompletionStatus;
                    if (completionStatus) {
                        const firstIncomplete = SECTION_ORDER.find(
                            (s) =>
                                (completionStatus[s as keyof CompletionStatus] || 0) <
                                100
                        );
                        if (firstIncomplete) {
                            setCurrentSection(firstIncomplete);
                        }
                    }
                }
            } catch (error) {
                logger.error({ error }, "Failed to load business profile");
                toast({
                    title: "Error",
                    description:
                        "Failed to load your business profile. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [projectId, initialProfile, toast]);

    // Save section data
    const handleSaveSection = useCallback(
        async (sectionData: SectionData, aiGeneratedFields?: string[]) => {
            try {
                const response = await fetch("/api/context/business-profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectId,
                        sectionId: currentSection,
                        sectionData,
                        aiGeneratedFields,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Failed to save section");
                }

                // Update local profile state
                setProfile(result.profile);

                // Notify parent of profile update for bidirectional sync
                if (onProfileUpdate && result.profile) {
                    onProfileUpdate(result.profile);
                }

                logger.info(
                    { sectionId: currentSection, projectId },
                    "Section saved successfully"
                );
            } catch (error) {
                logger.error(
                    { error, sectionId: currentSection },
                    "Failed to save section"
                );
                throw error;
            }
        },
        [currentSection, projectId, onProfileUpdate]
    );

    // Navigate to next section
    const handleNext = useCallback(() => {
        const currentIndex = SECTION_ORDER.indexOf(currentSection);
        if (currentIndex < SECTION_ORDER.length - 1) {
            setCurrentSection(SECTION_ORDER[currentIndex + 1]);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (onComplete) {
            // Last section completed
            onComplete();
        }
    }, [currentSection, onComplete]);

    // Navigate to previous section
    const handlePrevious = useCallback(() => {
        const currentIndex = SECTION_ORDER.indexOf(currentSection);
        if (currentIndex > 0) {
            setCurrentSection(SECTION_ORDER[currentIndex - 1]);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [currentSection]);

    // Handle section click from progress bar
    const handleSectionClick = useCallback((sectionId: SectionId) => {
        setCurrentSection(sectionId);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">
                        Loading your business profile...
                    </p>
                </div>
            </div>
        );
    }

    const currentIndex = SECTION_ORDER.indexOf(currentSection);
    const completionStatus: CompletionStatus =
        (profile.completion_status as CompletionStatus) || {
            section1: 0,
            section2: 0,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 0,
        };

    return (
        <div className="space-y-6">
            {/* Progress Indicator */}
            <SectionProgress
                currentSection={currentSection}
                completionStatus={completionStatus}
                onSectionClick={handleSectionClick}
            />

            {/* Current Section */}
            <WizardSection
                key={currentSection}
                sectionId={currentSection}
                profile={profile}
                onSave={handleSaveSection}
                onNext={handleNext}
                onPrevious={handlePrevious}
                isFirstSection={currentIndex === 0}
                isLastSection={currentIndex === SECTION_ORDER.length - 1}
                projectId={projectId}
            />
        </div>
    );
}
