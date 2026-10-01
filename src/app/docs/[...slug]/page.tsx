import type { Metadata } from "next";
import { notFound } from "next/navigation";

import DocsArticle from "@/components/docs/DocsArticle";
import { buildMetadata } from "@/lib/docs-metadata";
import { getDocSlugs } from "@/lib/docs";
import { getDocPage } from "@/lib/docs-nav";

/**
 * Every doc page except the index, addressed by its slug segments — so
 * `/docs/api/products` resolves `["api", "products"]`.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return getDocSlugs().map((slug) => ({ slug: slug.split("/") }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}): Metadata {
  return buildMetadata(params.slug.join("/"));
}

export default function DocsPage({ params }: { params: { slug: string[] } }) {
  const page = getDocPage(params.slug.join("/"));
  if (!page) notFound();

  return <DocsArticle page={page} />;
}