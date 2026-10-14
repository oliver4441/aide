/**
 * Fixed layer that paints the optional page background chosen in
 * Settings → Appearance → Background. Inert unless a `data-bg` attribute is
 * present on <html> (set by ThemeProvider); the gradient art itself lives in
 * globals.css so it costs no JS and no downloads.
 */
export default function BackgroundLayer() {
  return <div className="app-bg-layer" aria-hidden="true" />;
}
