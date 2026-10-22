import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPage } from "@/components/public/AccountPage";
import { getAccount } from "@/lib/auth";
import { landingFor } from "@/lib/studio";
import "@/styles/public.css";

export const metadata: Metadata = { title: "Entrar" };

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignInPage({ searchParams }: Props) {
  // Same reason as /signup: /studio bounces an artist-less account onwards, so
  // an unconditional redirect here can loop. `landingFor` only returns a route
  // the account can render.
  const account = await getAccount();
  const landing = account ? await landingFor(account) : null;
  if (landing) redirect(landing);

  // Only same-site paths are honoured, so ?next= cannot bounce a signed-in
  // artist to another origin.
  const { next } = await searchParams;
  // Who is signing in is unknown until they do, so the default stays /studio:
  // `requireStudioContext` forwards a staff account from there to /admin.
  const target = next && /^\/(?!\/)/.test(next) ? next : "/studio";

  return <AccountPage mode="login" next={target} />;
}
