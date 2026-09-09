import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getAccount } from "@/lib/auth";
import "@/styles/auth.css";

export const metadata: Metadata = { title: "Criar página" };

export default async function SignUpPage() {
  const account = await getAccount();
  if (account) redirect("/studio");

  // Doc 01: the public address format is still to be confirmed with the owner,
  // so the prefix is configuration, not a decision baked into the screen.
  const domain = process.env.PAGE_DOMAIN ?? "muska.cv";

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

          <RegisterForm domain={domain} />

          <p className="auth-alt">
            Já tens conta? <Link href="/login">Entrar</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
