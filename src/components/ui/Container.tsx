/**
 * The single horizontal container used by every landing section.
 *
 * The page previously mixed `max-w-[1440px]`, `max-w-[1180px]`, `max-w-6xl`
 * (1152px) and `max-w-4xl` (896px) across sections, so content edges jumped as
 * you scrolled. Everything now shares this primitive.
 *
 * Inner elements still cap their own width (`max-w-5xl`, `max-w-2xl`, …), so a
 * headline or paragraph never stretches to fill the container.
 */
export default function Container({
  children,
  className = "",
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Use for full-bleed sections that should line up with the nav and footer. */
  wide?: boolean;
}) {
  return (
    <div
      className={`mx-auto w-full px-4 md:px-8 ${
        wide ? "max-w-[1440px]" : "max-w-[1180px]"
      } ${className}`}
    >
      {children}
    </div>
  );
}
