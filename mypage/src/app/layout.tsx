import type { Metadata, Viewport } from "next";
import "@/styles/tokens.css";

export const metadata: Metadata = {
  title: {
    default: "My Page · Powered by Muska",
    template: "%s · My Page",
  },
  description:
    "My Page dá ao artista uma página pública profissional e um backoffice para a alimentar, escolher ferramentas e acompanhar a sua atividade.",
  applicationName: "My Page",
  authors: [{ name: "Muska" }],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#19233a" },
    { media: "(prefers-color-scheme: light)", color: "#e8eef5" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" data-theme="dark" suppressHydrationWarning>
      <head>
        {/*
          Theme is restored before paint so a light-mode user never sees a dark
          flash. Kept inline and tiny on purpose; everything else is React.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('mypage-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
