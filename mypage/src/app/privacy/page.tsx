import type { Metadata } from "next";
import { SystemPage } from "@/components/public/SystemPage";
import "@/styles/public.css";

export const metadata: Metadata = { title: "Privacidade", robots: { index: false } };

export default function PrivacyPage() {
  return <SystemPage type="privacy" />;
}
