import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPage } from "@/components/public/AccountPage";
import { SignOutButton } from "@/components/studio/SignOutButton";
import { load } from "@/lib/data";
import { getTemplate } from "@/templates/registry";
import "@/styles/public.css";

export const metadata: Metadata = { title: "Criar conta" };

interface Props {
  /** `?template=NN` arrives from the public catalogue (TemplateCatalog). */
  searchParams: Promise<{ template?: string }>;
}

export default async function SignUpPage({ searchParams }: Props) {
  // Never redirect straight to /studio: it sends an account with no artist
  // back here, which is an infinite loop. `landingFor` returns null when there
  // is nowhere safe to go, and then this page renders instead of bouncing.
  const { account, landing } = await load.signedInLanding();
  if (landing) redirect(landing);

  // Doc 01: the public address format is still to be confirmed with the owner,
  // so the prefix is configuration, not a decision baked into the screen.
  const domain = process.env.PAGE_DOMAIN ?? "muska.cv";

  /**
   * The catalogue promises the choice "fica logo aplicado ao teu rascunho", so
   * it has to survive registration. New artists start on the free plan, which
   * does not include every template — say so here rather than letting the
   * server quietly fall back to the default.
   */
  const { template } = await searchParams;
  const chosen = template ? getTemplate(template) : undefined;
  const freePlan = await load.freeEntitlement();
  const chosenIsFree = chosen ? freePlan.allowedTemplates.includes(chosen.id) : false;

  const notice = (
    <>
      {account && (
        // Reachable only in the anomalous state landingFor returns null for: a
        // live session whose account manages no artist. Saying so is better
        // than showing a registration form that will reject the email it is
        // already signed in with.
        <p className="account-status" role="status">
          Tens sessão aberta como <b>{account.email}</b>, mas esta conta não tem nenhum artista associado. Termina a
          sessão para criar uma conta nova, ou fala com a equipa My Page. <SignOutButton />
        </p>
      )}
      {chosen && (
        <p className="account-status" role="status">
          {chosenIsFree ? (
            <>
              Template escolhido: <b>{chosen.id} · {chosen.name}</b>. Fica aplicado ao teu rascunho.
            </>
          ) : (
            <>
              O template <b>{chosen.id} · {chosen.name}</b> faz parte de um plano pago. A tua página começa no template
              incluído no plano Free e podes trocar quando mudares de plano.
            </>
          )}
        </p>
      )}
    </>
  );

  return (
    <AccountPage
      mode="signup"
      domain={domain}
      templateId={chosenIsFree ? chosen?.id : undefined}
      notice={account || chosen ? notice : undefined}
    />
  );
}
