import { EMBED_SANDBOX } from "@/lib/platforms";

/**
 * The only place an iframe is created on a public page.
 *
 * Doc 03: "URLs externas: whitelist de embeds, bloquear esquemas perigosos …
 * Sanitização de texto enriquecido e CSP apropriada."
 *
 * `src` here always comes from `resolveEmbed`, which rebuilds the URL from a
 * validated id against a fixed host — it is never a URL the artist typed.
 */
export function Embed({
  src,
  title,
  ratio = "16/9",
  height,
}: {
  src: string;
  title: string;
  ratio?: string;
  height?: number;
}) {
  const style = height
    ? { height: `${height}px` }
    : { aspectRatio: ratio.replace("/", " / ") };

  return (
    <div className="tpl-embed" style={style}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        sandbox={EMBED_SANDBOX}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
