"use client";

import { Fragment, type ReactNode } from "react";

/**
 * Minimal Markdown renderer for GitHub release notes.
 *
 * react-markdown is not a dependency, and the release bodies we render are
 * simple GitHub auto-generated notes (headings, bullets, "What's Changed"
 * lists, links). This covers those shapes without pulling in a parser:
 *
 *   ## Heading      -> bold display line
 *   ### Heading     -> smaller display line
 *   - Item  \n * Item -> bullet list
 *   **text**        -> bold
 *   [text](url)     -> link
 *   plain line      -> paragraph
 */

function inline(text: string, key: string | number): ReactNode[] {
  // Split on **bold** first, then links inside the non-bold segments.
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return boldParts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${key}-b${i}`} className="font-display font-black text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Links: [label](url)
    const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
    return linkParts.map((lp, j) => {
      const m = lp.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) {
        return (
          <a
            key={`${key}-l${i}-${j}`}
            href={m[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            {m[1]}
          </a>
        );
      }
      return <Fragment key={`${key}-l${i}-${j}`}>{lp}</Fragment>;
    });
  });
}

function renderLine(line: string, index: number): ReactNode {
  const key = index;
  if (line.startsWith("### ")) {
    return (
      <p key={key} className="mt-3 mb-1 font-display text-sm font-black text-ink">
        {inline(line.slice(4), key)}
      </p>
    );
  }
  if (line.startsWith("## ")) {
    return (
      <p key={key} className="mt-4 mb-1 font-display text-base font-black text-ink">
        {inline(line.slice(3), key)}
      </p>
    );
  }
  if (line.startsWith("- ") || line.startsWith("* ")) {
    return (
      <div key={key} className="flex gap-2 border-b border-rule/40 py-1.5 last:border-0">
        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" />
        <span className="font-reading text-sm text-secondary leading-relaxed">
          {inline(line.slice(2), key)}
        </span>
      </div>
    );
  }
  const trimmed = line.trim();
  if (!trimmed) {
    return <div key={key} className="h-1" />;
  }
  return (
    <p key={key} className="font-reading text-sm text-secondary leading-relaxed">
      {inline(trimmed, key)}
    </p>
  );
}

export default function MarkdownNotes({ notes }: { notes: string | null }) {
  if (!notes) return <p className="font-reading text-sm text-secondary/70">No release notes.</p>;
  return (
    <div>
      {notes.split("\n").map((line, i) => (
        <Fragment key={i}>{renderLine(line, i)}</Fragment>
      ))}
    </div>
  );
}