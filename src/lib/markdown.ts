/**
 * A small, dependency-free Markdown renderer for the documentation section.
 *
 * It supports only the subset the docs actually use — headings, paragraphs,
 * lists, tables, blockquotes, fenced code blocks, inline code, bold/italic and
 * links — which keeps the renderer small and auditable instead of pulling in a
 * full Markdown + prose-plugin stack.
 *
 * Two deliberate choices:
 *
 * 1. Everything is HTML-escaped before it reaches the DOM, and the only HTML
 *    that ever survives is generated here. Doc pages are repo-authored content,
 *    but escaping anyway means a stray `<` in a code sample can never become a
 *    tag.
 * 2. Class names are emitted here instead of via a prose plugin, so docs follow
 *    exactly the same design tokens as the rest of the site.
 */

export type DocHeading = {
  id: string;
  text: string;
  level: number;
};

export type RenderedDoc = {
  html: string;
  headings: DocHeading[];
};

const C = {
  p: "text-[15px] leading-7 text-on-surface-variant",
  h2: "mt-12 mb-3 scroll-mt-28 border-b border-outline-variant pb-2 text-2xl font-headline font-bold text-on-surface first:mt-0",
  h3: "mt-8 mb-2 scroll-mt-28 text-lg font-semibold text-on-surface",
  h4: "mt-6 mb-1.5 scroll-mt-28 text-base font-semibold text-on-surface",
  ul: "my-4 list-disc space-y-1.5 pl-5 marker:text-primary",
  ol: "my-4 list-decimal space-y-1.5 pl-5 marker:text-primary",
  li: "pl-1 text-[15px] leading-7 text-on-surface-variant",
  inlineCode:
    "rounded-md bg-surface-container px-1.5 py-0.5 font-mono text-[13px] text-on-surface",
  quote:
    "my-5 rounded-r-lg border-l-4 border-primary bg-surface-container-low py-3 pl-4 pr-3 text-[15px] leading-7 text-on-surface-variant",
  tableWrap: "my-6 overflow-x-auto rounded-xl border border-outline-variant",
  table: "w-full border-collapse text-left text-sm",
  th: "bg-surface-container-low px-4 py-2.5 font-semibold whitespace-nowrap text-on-surface",
  td: "border-t border-outline-variant px-4 py-2.5 align-top text-on-surface-variant",
  a: "font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary-light",
  strong: "font-semibold text-on-surface",
  hr: "my-10 border-outline-variant",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders inline markdown. Code spans are lifted out first so that markdown
 * inside a code span (`**not bold**`) stays literal.
 */
function inline(source: string): string {
  const codeSpans: string[] = [];
  let out = source.replace(/`([^`]+)`/g, (_match, code: string) => {
    codeSpans.push(`<code class="${C.inlineCode}">${escapeHtml(code)}</code>`);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  out = escapeHtml(out);

  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_match, label: string, href: string) => {
      const external = /^https?:\/\//i.test(href);
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a class="${C.a}" href="${href}"${attrs}>${label}</a>`;
    },
  );

  out = out.replace(/\*\*([^*]+)\*\*/g, `<strong class="${C.strong}">$1</strong>`);
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  return out.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => codeSpans[Number(index)]);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Plain text of a heading, used for both the anchor id and the page TOC. */
function stripInline(source: string): string {
  return source
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

function isBlockStart(line: string): boolean {
  return (
    /^```/.test(line) ||
    /^#{2,4}\s/.test(line) ||
    /^>\s?/.test(line) ||
    LIST_ITEM.test(line) ||
    /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)
  );
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(header: string[], rows: string[][]): string {
  const head = header.map((cell) => `<th class="${C.th}">${inline(cell)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td class="${C.td}">${inline(cell)}</td>`)
          .join("")}</tr>`
    )
    .join("\n");

  return [
    `<div class="${C.tableWrap}">`,
    `<table class="${C.table}"><thead><tr>${head}</tr></thead>`,
    `<tbody>\n${body}\n</tbody></table>`,
    `</div>`,
  ].join("");
}

function renderCodeBlock(lang: string, body: string): string {
  const language = (lang || "text").toLowerCase();
  return [
    `<div class="my-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">`,
    `<div class="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-2">`,
    `<span class="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">${escapeHtml(language)}</span>`,
    `<button type="button" data-docs-copy class="rounded-md border border-outline-variant px-2 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">Copy</button>`,
    `</div>`,
    `<pre class="overflow-x-auto px-4 py-3.5"><code class="font-mono text-[13px] leading-relaxed text-on-surface">${escapeHtml(body)}</code></pre>`,
    `</div>`,
  ].join("");
}

/** Index of the first line that no longer belongs to the list starting at `start`. */
function listEnd(lines: string[], start: number): number {
  const first = LIST_ITEM.exec(lines[start]);
  if (!first) return start + 1;
  const base = first[1].length;
  let index = start + 1;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") break;
    const item = LIST_ITEM.exec(line);
    if (item) {
      if (item[1].length < base) break;
      index++;
      continue;
    }
    if (line.search(/\S/) > base) {
      index++;
      continue;
    }
    break;
  }

  return index;
}

function renderList(lines: string[], start: number): string {
  const first = LIST_ITEM.exec(lines[start]);
  const baseIndent = first ? first[1].length : 0;
  const ordered = first ? /\d/.test(first[2]) : false;

  const items: string[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index];
    const match = LIST_ITEM.exec(line);

    if (!match) {
      // A wrapped continuation line belongs to the item above it.
      if (items.length && line.trim() !== "" && line.search(/\S/) > baseIndent) {
        items[items.length - 1] += ` ${line.trim()}`;
        index++;
        continue;
      }
      break;
    }

    if (match[1].length > baseIndent) {
      items[items.length - 1] += renderList(lines, index);
      index = listEnd(lines, index);
      continue;
    }

    if (/\d/.test(match[2]) !== ordered) break;

    items.push(match[3]);
    index++;
  }

  const tag = ordered ? "ol" : "ul";
  const listClass = ordered ? C.ol : C.ul;
  const rendered = items
    .map((item) => `<li class="${C.li}">${inline(item)}</li>`)
    .join("\n");

  return `<${tag} class="${listClass}">\n${rendered}\n</${tag}>`;
}

/**
 * Renders a Markdown document to HTML and returns the headings it produced so
 * the page can build an on-page table of contents.
 */
export function renderMarkdown(source: string): RenderedDoc {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  const headings: DocHeading[] = [];
  const usedIds = new Map<string, number>();

  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    const fence = /^```([A-Za-z0-9+#-]*)\s*$/.exec(line);
    if (fence) {
      const body: string[] = [];
      index++;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index]);
        index++;
      }
      index++; // consume the closing fence
      html.push(renderCodeBlock(fence[1], body.join("\n")));
      continue;
    }

    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = stripInline(heading[2]);
      const base = slugify(text) || "section";
      const seen = usedIds.get(base) ?? 0;
      usedIds.set(base, seen + 1);
      const id = seen === 0 ? base : `${base}-${seen}`;

      headings.push({ id, text, level });
      const headingClass = level === 2 ? C.h2 : level === 3 ? C.h3 : C.h4;
      html.push(
        `<h${level} id="${id}" class="${headingClass}">${inline(heading[2])}</h${level}>`
      );
      index++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      html.push(`<hr class="${C.hr}" />`);
      index++;
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const header = splitTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim() !== "") {
        rows.push(splitTableRow(lines[index]));
        index++;
      }
      html.push(renderTable(header, rows));
      continue;
    }

    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^>\s?\s?/, ""));
        index++;
      }
      html.push(
        `<blockquote class="${C.quote}"><p class="${C.li}">${inline(body.join(" "))}</p></blockquote>`
      );
      continue;
    }

    if (LIST_ITEM.test(line)) {
      html.push(renderList(lines, index));
      index = listEnd(lines, index);
      continue;
    }

    if (line.trim() === "") {
      index++;
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() !== "" && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index++;
    }
    if (paragraph.length > 0) {
      html.push(`<p class="${C.p}">${inline(paragraph.join(" "))}</p>`);
    } else {
      index++;
    }
  }

  return { html: html.join("\n"), headings };
}