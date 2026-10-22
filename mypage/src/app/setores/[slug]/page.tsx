import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailPage } from "@/components/public/DetailPage";
import { SECTOR_KEYS } from "@/lib/public-routes";
import { audiences } from "@/lib/public-content";
import "@/styles/public.css";

/** One page per sector, the handoff's setor-<key>.html. */

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return SECTOR_KEYS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const index = SECTOR_KEYS.indexOf((await params).slug as (typeof SECTOR_KEYS)[number]);
  if (index < 0) return {};
  const [title] = audiences.pt[index];
  return {
    title,
    description: `${title}: descobre o que podes fazer com o My Page.`,
    alternates: { canonical: `/setores/${SECTOR_KEYS[index]}` },
  };
}

export default async function SectorPage({ params }: Props) {
  const index = SECTOR_KEYS.indexOf((await params).slug as (typeof SECTOR_KEYS)[number]);
  if (index < 0) notFound();
  return <DetailPage kind="sector" index={index} />;
}
