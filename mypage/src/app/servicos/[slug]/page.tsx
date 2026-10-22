import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailPage } from "@/components/public/DetailPage";
import { SERVICE_KEYS } from "@/lib/public-routes";
import { services } from "@/lib/public-content";
import "@/styles/public.css";

/** One page per service, the handoff's servico-<key>.html. */

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICE_KEYS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const index = SERVICE_KEYS.indexOf((await params).slug as (typeof SERVICE_KEYS)[number]);
  if (index < 0) return {};
  const [title] = services[index].pt;
  return {
    title,
    description: `${title}: descobre o que podes fazer com o My Page.`,
    alternates: { canonical: `/servicos/${SERVICE_KEYS[index]}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const index = SERVICE_KEYS.indexOf((await params).slug as (typeof SERVICE_KEYS)[number]);
  if (index < 0) notFound();
  return <DetailPage kind="service" index={index} />;
}
