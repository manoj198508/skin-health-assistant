import type { ReactNode } from "react";

// Local models tend to reply with light markdown (bold, numbered/bulleted lists).
// This renders just enough of it to avoid showing literal "**" and "* " to the user,
// without pulling in a full markdown library or using dangerouslySetInnerHTML.

export function formatInlineBold(text: string): ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

const BULLET_RE = /^[*-]\s+(.*)/;
const NUMBERED_RE = /^\d+[.)]\s+(.*)/;

export function renderFormattedText(content: string): ReactNode {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  function flushList() {
    if (!listItems.length || !listType) return;
    const ListTag = listType;
    blocks.push(
      <ListTag key={blocks.length} className="list-inside list-disc space-y-1 pl-1">
        {listItems.map((item, i) => (
          <li key={i}>{formatInlineBold(item)}</li>
        ))}
      </ListTag>
    );
    listItems = [];
    listType = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    const bulletMatch = line.match(BULLET_RE);
    const numberedMatch = line.match(NUMBERED_RE);
    if (bulletMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(bulletMatch[1]);
    } else if (numberedMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(numberedMatch[1]);
    } else {
      flushList();
      blocks.push(<p key={blocks.length}>{formatInlineBold(line)}</p>);
    }
  }
  flushList();

  return <div className="space-y-2">{blocks}</div>;
}

// Parses the doctor-handout style structure the chat system prompt asks the model to use
// (Overview / Possible Causes / Recommendations / Precautions / When to See a Doctor), so it
// can be rendered as distinct labeled sections instead of one undifferentiated block of text.

export const SECTION_LABELS: Record<string, string> = {
  overview: "Overview",
  "possible causes": "Possible Causes",
  recommendations: "Recommendations",
  precautions: "Precautions",
  "when to see a doctor": "When to See a Doctor",
};

export interface DoctorSection {
  key: string;
  body: string;
}

export interface ParsedDoctorResponse {
  intro: string;
  sections: DoctorSection[];
}

function normalizeHeaderCandidate(line: string): string {
  // Models often decorate section headers with markdown (**Overview**, ## Overview) even
  // when asked for plain text - strip that decoration before comparing against known labels.
  return line
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/^__|__$/g, "")
    .trim()
    .toLowerCase()
    .replace(/:$/, "");
}

export function parseDoctorSections(content: string): ParsedDoctorResponse | null {
  const lines = content.split("\n");
  const introLines: string[] = [];
  const sections: DoctorSection[] = [];
  let current: DoctorSection | null = null;

  for (const rawLine of lines) {
    const key = normalizeHeaderCandidate(rawLine);
    if (key in SECTION_LABELS) {
      if (current) sections.push({ ...current, body: current.body.trim() });
      current = { key, body: "" };
    } else if (current) {
      current.body += rawLine + "\n";
    } else {
      introLines.push(rawLine);
    }
  }
  if (current) sections.push({ ...current, body: current.body.trim() });

  if (sections.length === 0) return null;
  return { intro: introLines.join("\n").trim(), sections };
}
