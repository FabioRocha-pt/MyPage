import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { SignOutButton } from "@/components/studio/SignOutButton";
import { getAccount } from "@/lib/auth";
import { getEntitlement } from "@/lib/entitlements";
import { landingFor } from "@/lib/studio";
import { getTemplate } from "@/templates/registry";
import "@/styles/auth.css";

export const metadata: Metadata = { title: "Criar página" };

interface Props {
  /** `?template=NN` arrives from the public catalogue (TemplateCatalog). */
  searchParams: Promise<{ template?: string }>;
}

export default async function SignUpPage({ searchParams }: Props) {
  const account = await getAccount();
  // Never redirect straight to /studio: it sends an account with no artist
  // back here, which is an infinite loop. `landingFor` returns null when there
  // is nowhere safe to go, and then this page renders instead of bouncing.
  const landing = account ? await landingFor(account) : null;
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
  const freePlan = await getEntitlement("free");
  const chosenIsFree = chosen ? freePlan.allowedTemplates.includes(chosen.id) : false;

  return (
    <div className="auth">
      <aside className="auth-aside">
        <Link className="auth-brand" href="/">
          <span className="auth-mark" aria-hidden="true">
            M
          </span>
          <span>
            My Page
            <small>Powered by Muska</small>
          </span>
        </Link>

        <div className="auth-pitch">
          <h2>Começa grátis. Publica quando estiver pronta.</h2>
          <p>
            Criamos já a tua conta e a primeira página em rascunho. Nada fica público antes de carregares em publicar.
          </p>
          <ul className="auth-list">
            <li>Template inicial e paleta com contraste validado</li>
            <li>Endereço público que podes mudar</li>
            <li>Ferramentas ativadas conforme o plano</li>
          </ul>
        </div>

        <p className="auth-foot">© {new Date().getFullYear()} My Page · Powered by Muska</p>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <Link className="auth-back" href="/">
            ← Voltar à página inicial
          </Link>
          <h1>Criar a tua página</h1>
          <p>Leva menos de um minuto. Podes mudar tudo depois.</p>

          {account && (
            // Reachable only in the anomalous state landingFor returns null
            // for: a live session whose account manages no artist. Saying so is
            // better than showing a registration form that will reject the
            // email it is already signed in with.
            <p className="auth-alt" role="status">
              Tens sessão aberta como <b>{account.email}</b>, mas esta conta não tem nenhum artista associado. Termina
              a sessão para criar uma conta nova, ou fala com a equipa My Page. <SignOutButton />
            </p>
          )}

          {chosen && (
            <p className="auth-alt" role="status">
              {chosenIsFree ? (
                <>
                  Template escolhido: <b>{chosen.id} · {chosen.name}</b>. Fica aplicado ao teu rascunho.
                </>
              ) : (
                <>
                  O template <b>{chosen.id} · {chosen.name}</b> faz parte de um plano pago. A tua página começa no
                  template incluído no plano Free e podes trocar quando mudares de plano.
                </>
              )}
            </p>
          )}

          <RegisterForm domain={domain} templateId={chosenIsFree ? chosen?.id : undefined} />

          <p className="auth-alt">
            Já tens conta? <Link href="/login">Entrar</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
