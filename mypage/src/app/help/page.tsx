import type { Metadata } from "next";
import { SystemPage } from "@/components/public/SystemPage";
import "@/styles/public.css";

export const metadata: Metadata = { title: "Ajuda", robots: { index: false } };

export default function HelpPage() {
  return <SystemPage type="help" />;
}
