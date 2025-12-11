/**
 * Utility to export deck structure to Word (.docx) format
 */
import {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    PageBreak,
    BorderStyle,
    AlignmentType,
    Packer,
} from "docx";
import { saveAs } from "file-saver";

interface Slide {
    slideNumber: number;
    title: string;
    description: string;
    section: string;
}

interface DeckStructure {
    title: string;
    slides: Slide[];
}

/**
 * Get human-readable section name with emoji
 */
function getSectionDisplayName(section: string): string {
    const sectionNames: Record<string, string> = {
        connect: "Connect (Build Rapport)",
        teach: "Teach (Deliver Value)",
        invite: "Invite (Present Offer)",
        hook: "Hook",
        problem: "Problem",
        agitate: "Agitate",
        solution: "Solution",
        offer: "Offer",
        close: "Close",
        other: "Other",
    };
    return sectionNames[section] || section;
}

/**
 * Export deck structure to Word document
 */
export async function exportDeckToDocx(deck: DeckStructure): Promise<void> {
    const children: Paragraph[] = [];

    // Title page
    children.push(
        new Paragraph({
            text: deck.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        })
    );

    children.push(
        new Paragraph({
            text: "Presentation Structure",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        })
    );

    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `${deck.slides.length} Slides`,
                    size: 24,
                    color: "666666",
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        })
    );

    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `Generated on ${new Date().toLocaleDateString()}`,
                    size: 20,
                    color: "999999",
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
        })
    );

    // Group slides by section
    const groupedSlides = deck.slides.reduce(
        (acc, slide) => {
            const section = slide.section || "other";
            if (!acc[section]) {
                acc[section] = [];
            }
            acc[section].push(slide);
            return acc;
        },
        {} as Record<string, Slide[]>
    );

    const sectionOrder = [
        "connect",
        "teach",
        "invite",
        "hook",
        "problem",
        "agitate",
        "solution",
        "offer",
        "close",
        "other",
    ];

    // Add table of contents style section overview
    children.push(
        new Paragraph({
            text: "Section Overview",
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
            spacing: { after: 200 },
        })
    );

    for (const sectionKey of sectionOrder) {
        const sectionSlides = groupedSlides[sectionKey];
        if (!sectionSlides || sectionSlides.length === 0) continue;

        const slideRange =
            sectionSlides.length > 1
                ? `Slides ${sectionSlides[0].slideNumber}-${sectionSlides[sectionSlides.length - 1].slideNumber}`
                : `Slide ${sectionSlides[0].slideNumber}`;

        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `${getSectionDisplayName(sectionKey)}`,
                        bold: true,
                        size: 24,
                    }),
                    new TextRun({
                        text: ` - ${sectionSlides.length} slides (${slideRange})`,
                        size: 22,
                        color: "666666",
                    }),
                ],
                spacing: { after: 100 },
            })
        );
    }

    // Add slides content by section
    for (const sectionKey of sectionOrder) {
        const sectionSlides = groupedSlides[sectionKey];
        if (!sectionSlides || sectionSlides.length === 0) continue;

        // Section header
        children.push(
            new Paragraph({
                text: getSectionDisplayName(sectionKey),
                heading: HeadingLevel.HEADING_1,
                pageBreakBefore: true,
                spacing: { after: 300 },
                border: {
                    bottom: {
                        color: "0066CC",
                        space: 1,
                        style: BorderStyle.SINGLE,
                        size: 12,
                    },
                },
            })
        );

        // Slides in this section
        for (const slide of sectionSlides) {
            // Slide number and title
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Slide ${slide.slideNumber}: `,
                            bold: true,
                            color: "0066CC",
                            size: 26,
                        }),
                        new TextRun({
                            text: slide.title,
                            bold: true,
                            size: 26,
                        }),
                    ],
                    spacing: { before: 300, after: 100 },
                })
            );

            // Slide description
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: slide.description,
                            size: 22,
                        }),
                    ],
                    spacing: { after: 200 },
                })
            );

            // Divider line
            children.push(
                new Paragraph({
                    border: {
                        bottom: {
                            color: "DDDDDD",
                            space: 1,
                            style: BorderStyle.SINGLE,
                            size: 4,
                        },
                    },
                    spacing: { after: 100 },
                })
            );
        }
    }

    // Create and save document
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: children,
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `${deck.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
    saveAs(blob, fileName);
}
