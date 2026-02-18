export interface SourceLink {
  materialId: string;
  sourceLabel: string;
  displayText: string;
  /** Page number extracted from source_label, or null for non-page sources */
  page: number | null;
}

const SOURCE_REGEX = /\[SOURCE:([^:\]]+):([^\]]+)\]([^\[]*)\[\/SOURCE\]/g;
const PAGE_REGEX = /Page\s+(\d+)/i;

export interface ParsedSourceContent {
  /** Content with SOURCE tags replaced by numbered placeholders like [^1] */
  cleanContent: string;
  sources: SourceLink[];
}

/**
 * Parse [SOURCE:materialId:sourceLabel]text[/SOURCE] tags from LLM output.
 * Replaces them with markdown-style footnote links.
 */
export function parseSourceLinks(content: string): ParsedSourceContent {
  const sources: SourceLink[] = [];
  let index = 0;

  const cleanContent = content.replace(SOURCE_REGEX, (_match, materialId, sourceLabel, displayText) => {
    const pageMatch = sourceLabel.match(PAGE_REGEX);
    const page = pageMatch ? parseInt(pageMatch[1], 10) : null;

    sources.push({
      materialId,
      sourceLabel,
      displayText: displayText.trim() || sourceLabel,
      page,
    });

    index++;
    const href = page !== null
      ? `/api/materials/view?id=${materialId}&page=${page}`
      : `/api/materials/view?id=${materialId}`;

    // Return a markdown link that ReactMarkdown will render as a clickable <a>
    return `[${displayText.trim() || sourceLabel}](${href})`;
  });

  return { cleanContent, sources };
}

/**
 * Detects an incomplete SOURCE tag during streaming,
 * so the client can hide raw tag text until it's complete.
 */
export function hasPartialSourceTag(content: string): boolean {
  // Check for opening tag without matching close
  const openCount = (content.match(/\[SOURCE:/g) || []).length;
  const closeCount = (content.match(/\[\/SOURCE\]/g) || []).length;
  return openCount > closeCount;
}
