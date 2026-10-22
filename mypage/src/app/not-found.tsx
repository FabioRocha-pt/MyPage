import { SystemPage } from "@/components/public/SystemPage";
import "@/styles/public.css";

/** The handoff's 404.html, for any address the app does not know. */
export default function NotFound() {
  return <SystemPage type="404" />;
}
