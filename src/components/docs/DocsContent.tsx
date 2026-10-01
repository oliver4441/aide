"use client";

import { useEffect } from "react";

/**
 * Renders the HTML produced by `lib/markdown.ts` and wires up the "Copy"
 * buttons that the renderer emits inside code blocks.
 *
 * The markup itself stays a plain string, so hydration only ships the rendered
 * article — the copy buttons are attached imperatively rather than as React
 * elements the renderer would have to understand.
 */
export default function DocsContent({ html }: { html: string }) {
  useEffect(() => {
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-docs-copy]")
    );
    if (buttons.length === 0) return;

    const cleanups: (() => void)[] = [];

    for (const button of buttons) {
      const reset = window.setTimeout(() => {
        button.textContent = "Copy";
        button.dataset.state = "";
      }, 1600);

      const onClick = async () => {
        const code = button.parentElement?.parentElement?.querySelector("code");
        const text = code?.textContent ?? "";
        try {
          await navigator.clipboard.writeText(text);
          button.textContent = "Copied";
          button.dataset.state = "copied";
        } catch {
          button.textContent = "Copy failed";
          button.dataset.state = "error";
        }
        window.clearTimeout(reset);
      };

      button.addEventListener("click", onClick);
      cleanups.push(() => {
        window.clearTimeout(reset);
        button.removeEventListener("click", onClick);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [html]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}