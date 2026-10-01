import DocsArticle from "@/components/docs/DocsArticle";
import { docsMetadata } from "@/lib/docs-metadata";
import { getDocPage } from "@/lib/docs-nav";

export const metadata = docsMetadata(
  getDocPage("")!
);

export default function DocsIndexPage() {
  return <DocsArticle page={getDocPage("")!} />;
}