import type { Metadata } from "next";
import { SystemPage } from "@/components/public/SystemPage";
import "@/styles/public.css";

export const metadata: Metadata = { title: "Termos de utilização", robots: { index: false } };

export default function TermsPage() {
  return <SystemPage type="terms" />;
}
