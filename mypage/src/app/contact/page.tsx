import type { Metadata } from "next";
import { SystemPage } from "@/components/public/SystemPage";
import "@/styles/public.css";

export const metadata: Metadata = { title: "Contacto", robots: { index: false } };

interface Props {
  /** `?request=tool` arrives from "Quero pedir uma ferramenta" on the service pages. */
  searchParams: Promise<{ request?: string }>;
}

export default async function ContactPage({ searchParams }: Props) {
  const { request } = await searchParams;
  return <SystemPage type="contact" toolRequest={request === "tool"} />;
}
