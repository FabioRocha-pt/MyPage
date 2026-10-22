"use client";

import { useEffect } from "react";
import { SystemPage } from "@/components/public/SystemPage";
import "@/styles/public.css";

/** The handoff's 500.html; "Tentar novamente" re-renders the failed segment. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <SystemPage type="500" onRetry={retry} />;
}
