/**
 * PowerPoint (PPTX) Generator
 * Creates PPTX files using JSZip (PPTX is a ZIP of XML files)
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import JSZip from "jszip";
import { z } from "zod";

import { logger } from "@/lib/logger";

// ============================================================================
// Zod Schemas for Type Safety
// ============================================================================

// Layout types for slides
const SlideLayoutTypeSchema = z.enum([
    "title",
    "section",
    "content_left",
    "content_right",
    "bullets",
    "quote",
    "statistics",
    "comparison",
    "process",
    "cta",
]);

// Zod schema for slide data validation (exported for use in API routes)
export const SlideDataSchema = z.object({
    slideNumber: z.number().int().positive(),
    title: z.string(),
    content: z.array(z.string()),
    speakerNotes: z.string(),
    layoutType: SlideLayoutTypeSchema,
    section: z.string(),
    imagePrompt: z.string().optional(),
    imageUrl: z.string().url().optional(),
    imageGeneratedAt: z.string().optional(),
});

export type SlideData = z.infer<typeof SlideDataSchema>;

export interface BrandColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
}

export interface PresentationOptions {
    title: string;
    slides: SlideData[];
    brandName?: string;
    brandColors?: BrandColors;
}

// ============================================================================
// EMU Constants (English Metric Units)
// PowerPoint uses EMUs for all positioning and sizing
// 914400 EMUs = 1 inch
// ============================================================================

// Base conversion factor
const EMU_PER_INCH = 914400;

// Slide dimensions (standard 16:9 would be different)
const SLIDE_WIDTH_INCHES = 10;
const SLIDE_HEIGHT_INCHES = 7.5;
const SLIDE_WIDTH = SLIDE_WIDTH_INCHES * EMU_PER_INCH; // 9144000
const SLIDE_HEIGHT = SLIDE_HEIGHT_INCHES * EMU_PER_INCH; // 6858000

// Content positioning - Title slide
const TITLE_SLIDE_TITLE_X = 685800; // 0.75 inches
const TITLE_SLIDE_TITLE_Y = 2130425; // ~2.33 inches
const TITLE_SLIDE_TITLE_WIDTH = 7772400; // 8.5 inches
const TITLE_SLIDE_TITLE_HEIGHT = 1470025; // ~1.6 inches
const TITLE_SLIDE_SUBTITLE_Y = 3886200; // ~4.25 inches
const TITLE_SLIDE_SUBTITLE_HEIGHT = 1752600; // ~1.92 inches

// Content positioning - Section slide
const SECTION_SLIDE_TITLE_X = 685800;
const SECTION_SLIDE_TITLE_Y = 2743200; // 3 inches
const SECTION_SLIDE_TITLE_WIDTH = 7772400;
const SECTION_SLIDE_TITLE_HEIGHT = 1371600; // 1.5 inches

// Content positioning - Standard content slide
const CONTENT_SLIDE_MARGIN_X = 457200; // 0.5 inches
const CONTENT_SLIDE_TITLE_Y = 274638; // ~0.3 inches
const CONTENT_SLIDE_TITLE_WIDTH = 8229600; // 9 inches
const CONTENT_SLIDE_TITLE_HEIGHT = 1143000; // 1.25 inches
const CONTENT_SLIDE_BODY_Y = 1600200; // ~1.75 inches
const CONTENT_SLIDE_BODY_HEIGHT = 4525963; // ~4.95 inches

// Footer positioning
const FOOTER_Y = 6400800; // 7 inches
const FOOTER_HEIGHT = 365125; // ~0.4 inches
const SLIDE_NUMBER_X = 6553200; // ~7.17 inches
const SLIDE_NUMBER_WIDTH = 2133600; // ~2.33 inches
const BRAND_WIDTH = 2743200; // 3 inches

// Text formatting
const BULLET_MARGIN_LEFT = 457200; // 0.5 inches
const BULLET_INDENT = -457200; // Hanging indent

// Font sizes (in hundredths of a point)
const FONT_SIZE_TITLE_LARGE = 6000; // 60pt
const FONT_SIZE_TITLE_SECTION = 5400; // 54pt
const FONT_SIZE_TITLE_CONTENT = 4400; // 44pt
const FONT_SIZE_BODY = 2400; // 24pt
const FONT_SIZE_FOOTER = 1200; // 12pt

// ============================================================================
// Helper Functions
// ============================================================================

// Convert hex color to PPTX color format (RRGGBB without #)
function hexToRgb(hex: string): string {
    return hex.replace("#", "").toUpperCase();
}

// Escape XML special characters
function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// ============================================================================
// Slide XML Generators
// ============================================================================

// Generate XML for a single slide
function generateSlideXml(
    slide: SlideData,
    colors: BrandColors,
    brandName: string
): string {
    const titleColor = hexToRgb(colors.primary);
    const textColor = hexToRgb(colors.text);
    const accentColor = hexToRgb(colors.accent);

    // Build bullet points
    const bulletPoints = slide.content
        .map(
            (point) => `
      <a:p>
        <a:pPr marL="${BULLET_MARGIN_LEFT}" indent="${BULLET_INDENT}">
          <a:buFont typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
          <a:buChar char="&#8226;"/>
        </a:pPr>
        <a:r>
          <a:rPr lang="en-US" sz="${FONT_SIZE_BODY}" dirty="0">
            <a:solidFill>
              <a:srgbClr val="${textColor}"/>
            </a:solidFill>
            <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
          </a:rPr>
          <a:t>${escapeXml(point)}</a:t>
        </a:r>
      </a:p>`
        )
        .join("");

    // Different layouts based on slide type
    const isTitleSlide = slide.layoutType === "title";
    const isSectionSlide = slide.layoutType === "section";

    if (isTitleSlide) {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="ctrTitle"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${TITLE_SLIDE_TITLE_X}" y="${TITLE_SLIDE_TITLE_Y}"/>
            <a:ext cx="${TITLE_SLIDE_TITLE_WIDTH}" cy="${TITLE_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_TITLE_LARGE}" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${titleColor}"/>
                </a:solidFill>
                <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Subtitle"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="subTitle" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${TITLE_SLIDE_TITLE_X}" y="${TITLE_SLIDE_SUBTITLE_Y}"/>
            <a:ext cx="${TITLE_SLIDE_TITLE_WIDTH}" cy="${TITLE_SLIDE_SUBTITLE_HEIGHT}"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_BODY}" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColor}"/>
                </a:solidFill>
                <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(slide.content.join(" "))}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Brand"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${FOOTER_Y}"/>
            <a:ext cx="${BRAND_WIDTH}" cy="${FOOTER_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_FOOTER}" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${accentColor}"/>
                </a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(brandName)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
    }

    if (isSectionSlide) {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:solidFill>
          <a:srgbClr val="${titleColor}"/>
        </a:solidFill>
        <a:effectLst/>
      </p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Section Title"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${SECTION_SLIDE_TITLE_X}" y="${SECTION_SLIDE_TITLE_Y}"/>
            <a:ext cx="${SECTION_SLIDE_TITLE_WIDTH}" cy="${SECTION_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_TITLE_SECTION}" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="FFFFFF"/>
                </a:solidFill>
                <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
    }

    // Default content slide
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${CONTENT_SLIDE_TITLE_Y}"/>
            <a:ext cx="${CONTENT_SLIDE_TITLE_WIDTH}" cy="${CONTENT_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_TITLE_CONTENT}" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${titleColor}"/>
                </a:solidFill>
                <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Content"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${CONTENT_SLIDE_BODY_Y}"/>
            <a:ext cx="${CONTENT_SLIDE_TITLE_WIDTH}" cy="${CONTENT_SLIDE_BODY_HEIGHT}"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          ${bulletPoints}
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Slide Number"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${SLIDE_NUMBER_X}" y="${FOOTER_Y}"/>
            <a:ext cx="${SLIDE_NUMBER_WIDTH}" cy="${FOOTER_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="r"/>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_FOOTER}" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${accentColor}"/>
                </a:solidFill>
              </a:rPr>
              <a:t>${slide.slideNumber}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="5" name="Brand"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${FOOTER_Y}"/>
            <a:ext cx="${BRAND_WIDTH}" cy="${FOOTER_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_FOOTER}" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${accentColor}"/>
                </a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(brandName)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

// Generate speaker notes XML
function generateNotesXml(notes: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Notes Placeholder"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US"/>
              <a:t>${escapeXml(notes)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate a PPTX file from presentation data
 */
export async function generatePptx(options: PresentationOptions): Promise<Blob> {
    const { title, slides, brandName = "Presentation", brandColors } = options;

    const colors: BrandColors = brandColors || {
        primary: "#1a365d",
        secondary: "#2b6cb0",
        accent: "#4299e1",
        background: "#ffffff",
        text: "#2d3748",
    };

    logger.info({ title, slideCount: slides.length }, "Starting PPTX generation");

    const zip = new JSZip();

    // Add required PPTX structure files
    // [Content_Types].xml
    const slideTypes = slides
        .map(
            (_, i) =>
                `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
        )
        .join("");

    const notesTypes = slides
        .map(
            (_, i) =>
                `<Override PartName="/ppt/notesSlides/notesSlide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`
        )
        .join("");

    zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${slideTypes}
  ${notesTypes}
</Types>`
    );

    // _rels/.rels
    zip.file(
        "_rels/.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
    );

    // docProps/core.xml
    zip.file(
        "docProps/core.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>${escapeXml(brandName)}</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`
    );

    // docProps/app.xml
    zip.file(
        "docProps/app.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Genie Presentation Generator</Application>
  <Slides>${slides.length}</Slides>
</Properties>`
    );

    // ppt/presentation.xml
    const slideRefs = slides
        .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`)
        .join("");

    const slideSizes = `<p:sldSz cx="${SLIDE_WIDTH}" cy="${SLIDE_HEIGHT}"/>`;

    zip.file(
        "ppt/presentation.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:notesMasterIdLst>
    <p:notesMasterId r:id="rId2"/>
  </p:notesMasterIdLst>
  <p:sldIdLst>
    ${slideRefs}
  </p:sldIdLst>
  ${slideSizes}
  <p:notesSz cx="${SLIDE_HEIGHT}" cy="${SLIDE_WIDTH}"/>
</p:presentation>`
    );

    // ppt/_rels/presentation.xml.rels
    const slideRelRefs = slides
        .map(
            (_, i) =>
                `<Relationship Id="rId${i + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
        )
        .join("");

    zip.file(
        "ppt/_rels/presentation.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="notesMasters/notesMaster1.xml"/>
  ${slideRelRefs}
  <Relationship Id="rId${slides.length + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`
    );

    // ppt/slideMasters/slideMaster1.xml
    zip.file(
        "ppt/slideMasters/slideMaster1.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:solidFill>
          <a:srgbClr val="${hexToRgb(colors.background)}"/>
        </a:solidFill>
        <a:effectLst/>
      </p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`
    );

    // ppt/slideMasters/_rels/slideMaster1.xml.rels
    zip.file(
        "ppt/slideMasters/_rels/slideMaster1.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`
    );

    // ppt/slideLayouts/slideLayout1.xml
    zip.file(
        "ppt/slideLayouts/slideLayout1.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`
    );

    // ppt/slideLayouts/_rels/slideLayout1.xml.rels
    zip.file(
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`
    );

    // ppt/notesMasters/notesMaster1.xml
    zip.file(
        "ppt/notesMasters/notesMaster1.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notesMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
</p:notesMaster>`
    );

    // ppt/notesMasters/_rels/notesMaster1.xml.rels
    zip.file(
        "ppt/notesMasters/_rels/notesMaster1.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`
    );

    // ppt/theme/theme1.xml
    zip.file(
        "ppt/theme/theme1.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Brand Theme">
  <a:themeElements>
    <a:clrScheme name="Brand Colors">
      <a:dk1><a:srgbClr val="${hexToRgb(colors.text)}"/></a:dk1>
      <a:lt1><a:srgbClr val="${hexToRgb(colors.background)}"/></a:lt1>
      <a:dk2><a:srgbClr val="${hexToRgb(colors.primary)}"/></a:dk2>
      <a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
      <a:accent1><a:srgbClr val="${hexToRgb(colors.primary)}"/></a:accent1>
      <a:accent2><a:srgbClr val="${hexToRgb(colors.secondary)}"/></a:accent2>
      <a:accent3><a:srgbClr val="${hexToRgb(colors.accent)}"/></a:accent3>
      <a:accent4><a:srgbClr val="8064A2"/></a:accent4>
      <a:accent5><a:srgbClr val="4BACC6"/></a:accent5>
      <a:accent6><a:srgbClr val="F79646"/></a:accent6>
      <a:hlink><a:srgbClr val="${hexToRgb(colors.accent)}"/></a:hlink>
      <a:folHlink><a:srgbClr val="800080"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        <a:latin typeface="Arial"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Arial"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="25400"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="38100"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`
    );

    // Generate individual slides
    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];

        // Slide XML
        zip.file(
            `ppt/slides/slide${i + 1}.xml`,
            generateSlideXml(slide, colors, brandName)
        );

        // Slide relationships
        zip.file(
            `ppt/slides/_rels/slide${i + 1}.xml.rels`,
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${i + 1}.xml"/>
</Relationships>`
        );

        // Notes slide
        zip.file(
            `ppt/notesSlides/notesSlide${i + 1}.xml`,
            generateNotesXml(slide.speakerNotes)
        );

        // Notes relationships
        zip.file(
            `ppt/notesSlides/_rels/notesSlide${i + 1}.xml.rels`,
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="../notesMasters/notesMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${i + 1}.xml"/>
</Relationships>`
        );
    }

    logger.info({ slideCount: slides.length }, "PPTX generation complete");

    // Generate the zip file as a blob
    return await zip.generateAsync({ type: "blob" });
}
