import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTemplate, TEMPLATES } from "@/templates/registry";
import { demoSnapshot } from "@/templates/demo";
import { PageRenderer } from "@/templates/PageRenderer";
import "@/styles/templates.css";

/**
 * A single template rendered with demonstration content.
 *
 * This is the Next equivalent of the prototype's `dj-template-NN.html`: the
 * catalogue scales it down for the thumbnail and "Ver em tamanho real" opens
 * the same URL. Because it goes through `PageRenderer`, the catalogue can never
 * show a template that differs from what a published page would look like.
 */

interface Props {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return TEMPLATES.map((template) => ({ id: template.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const template = getTemplate(id);
  if (!template) return { title: "Template não encontrado" };
  return {
    title: `Template ${template.id} · ${template.name}`,
    description: template.description,
    // Demonstration content must not be indexed as if it were an artist page.
    robots: { index: false, follow: false },
  };
}

export default async function TemplatePreviewPage({ params }: Props) {
  const { id } = await params;
  const template = getTemplate(id);
  if (!template) notFound();

  return <PageRenderer snapshot={demoSnapshot(template.id)} />;
}
