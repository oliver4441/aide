import DocsNavList from "./DocsNavList";
import { DOC_NAV } from "@/lib/docs-nav";

/** Persistent left rail, mirroring the docs navigation on every page. */
export default function DocsSidebar() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-[84px] max-h-[calc(100vh-108px)] overflow-y-auto overscroll-contain pr-2">
        <DocsNavList groups={DOC_NAV} />
      </div>
    </aside>
  );
}