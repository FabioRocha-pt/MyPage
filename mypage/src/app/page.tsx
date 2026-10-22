import type { Metadata } from "next";
import { Landing } from "@/components/public/Landing";
import "@/styles/public.css";

/**
 * Landing page — the handoff MyPage-Landing-Entrega-2026-10-22.zip
 * (my-page-landing.html). See components/public/Landing.tsx for what changed
 * to fit the app.
 */

export const metadata: Metadata = {
  title: { absolute: "My Page · O teu palco começa aqui" },
  description: "Página, música, press kit, booking e eventos, no ecossistema Muska.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <Landing />;
}
