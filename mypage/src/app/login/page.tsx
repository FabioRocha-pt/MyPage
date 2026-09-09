import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getAccount } from "@/lib/auth";
import "@/styles/auth.css";

export const metadata: Metadata = { title: "Entrar" };

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const account = await getAccount();
  if (account) redirect("/studio");

  // Only same-site paths are honoured, so ?next= cannot bounce a signed-in
  // artist to another origin.
  const { next } = await searchParams;
  const target = next && /^\/(?!\/)/.test(next) ? next : "/studio";

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
          <h2>A tua página, gerida num só sítio.</h2>
          <p>
            Entra no backoffice para editar a página, gerir media, eventos, booking e acompanhar o que acontece.
          </p>
          <ul className="auth-list">
            <li>Rascunho e versão publicada separados</li>
            <li>Biblioteca de media com originais preservados</li>
            <li>Pedidos de booking com estados</li>
          </ul>
        </div>

        <p className="auth-foot">© {new Date().getFullYear()} My Page · Powered by Muska</p>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <Link className="auth-back" href="/">
            ← Voltar à página inicial
          </Link>
          <h1>Entrar</h1>
          <p>Usa o email da tua conta My Page.</p>

          <LoginForm next={target} />

          <p className="auth-alt">
            Ainda não tens conta? <Link href="/signup">Cria a tua página</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
