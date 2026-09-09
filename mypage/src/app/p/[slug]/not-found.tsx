import Link from "next/link";

export default function PageNotFound() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 520, display: "grid", gap: 16 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--cyan)" }}>MY PAGE</span>
        <h1 style={{ fontSize: 44, lineHeight: 1, letterSpacing: "-0.04em", margin: 0 }}>
          Esta página ainda não foi publicada.
        </h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          O endereço pode estar errado, ou o artista ainda não publicou a primeira versão. Guardar um
          rascunho não torna a página pública.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/artists"
            style={{
              padding: "12px 20px",
              borderRadius: 999,
              border: "1px solid var(--line)",
            }}
          >
            Ver artistas
          </Link>
          <Link
            href="/"
            style={{
              padding: "12px 20px",
              borderRadius: 999,
              background: "var(--accent-grad)",
              color: "#0d1626",
              fontWeight: 700,
            }}
          >
            Conhecer o My Page
          </Link>
        </div>
      </div>
    </main>
  );
}
