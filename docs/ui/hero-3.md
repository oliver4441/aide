# AnimatedMarqueeHero (`hero-3`)

## Project setup (already present in this repo)

- **TypeScript** — `tsconfig.json` with `@/*` → `./src/*`.
- **Tailwind CSS** — `tailwind.config.ts`, `src/app/globals.css`.
- **shadcn structure** — `components.json` was added so `npx shadcn@latest add …` works here.
- **UI folder** — `src/components/ui/` (the `src/`-directory equivalent of `/components/ui`).
- **`cn` helper** — `src/lib/utils.ts` (clsx + tailwind-merge).
- **Animation** — `framer-motion` (already a dependency; `npm install framer-motion` on a fresh project).

If starting from scratch:

```bash
npx create-next-app@latest my-app --typescript --tailwind --app --src-dir --alias "@/*"
cd my-app
npx shadcn@latest init -d
npm install framer-motion
npx shadcn@latest add button   # optional: generates src/components/ui/button.tsx
```

### Why `src/components/ui` matters

The shadcn CLI writes generated primitives to `components/ui` (or `src/components/ui` for a
`--src-dir` project) and imports them as `@/components/ui/*`. Keeping that folder at the
configured path means:

- `npx shadcn@latest add …` lands next to the existing components instead of creating a
  second, competing folder.
- Generated code and hand-added components share the same import alias, so future CLI
  updates don't require rewriting imports.
- Feature components stay in `src/components/` while reusable primitives stay isolated and
  easy to audit.

Styles stay in `src/app/globals.css`; new shadcn components read their colors from the
Tailwind theme. This repo's shadcn color names (`background`, `foreground`, `card`, `border`,
`muted-foreground`) are **aliases** onto existing Newsprint tokens, so no new palette was
introduced.

## Component

`src/components/ui/hero-3.tsx` exports `AnimatedMarqueeHero`:

| Prop | Type | Notes |
|------|------|-------|
| `tagline` | `string` | Small pill above the headline. |
| `title` | `React.ReactNode` | Strings are word-split and staggered; JSX (e.g. `<>…</>`) renders as-is. |
| `description` | `string` | Supporting copy. |
| `ctaText` | `string` | Label for the animated CTA button. |
| `images` | `string[]` | URLs for the bottom marquee; the component duplicates them for a seamless loop. |
| `className` | `string?` | Extra classes merged with `cn()`. |

No context provider, hook, or state management is required — animation state is local to
framer-motion. No icons are used, so `lucide-react` is not needed. The CTA is intentionally a
presentational button; wrap the component (or extend `ActionButton`) to add navigation.

## Demo / preview

- `src/app/ui-preview/hero3/demo.tsx` — demo with Unsplash stock images.
- `src/app/ui-preview/hero3/page.tsx` — renders the demo at `/ui-preview/hero3`.

Responsive behavior comes from the component: full-viewport section, `text-5xl md:text-7xl`
headline, and a marquee that grows from `h-1/3` to `h-2/5` at the `md` breakpoint. The landing
page keeps its existing `src/components/landing/Hero.tsx`; this component is additive.
