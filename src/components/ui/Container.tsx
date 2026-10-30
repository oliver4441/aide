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
        wide ? "max-w-[1440px]" : "max-w-[1100px]"
      } ${className}`}
    >
      {children}
    </div>
  );
}
