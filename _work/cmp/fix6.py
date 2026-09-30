p = 'src/templates/t02/T02Client.tsx'
s = open(p, encoding='utf8').read()
a = '''    if (reducedMotion() || !("IntersectionObserver" in window)) {'''
b = '''    // "Sem rede para o YouTube a miniatura falha: fica um fundo na cor do
    // artista com o botão de play." Runs with or without motion.
    root.querySelectorAll<HTMLImageElement>('.mp-foto[data-mp-lightbox="video"] img').forEach((img) => {
      const failed = () => img.closest(".mp-foto")?.classList.add("mp-sem-miniatura");
      if (img.complete && img.getAttribute("src") && !img.naturalWidth) failed();
      else {
        img.addEventListener("error", failed, { once: true });
        cleanups.push(() => img.removeEventListener("error", failed));
      }
    });

    if (reducedMotion() || !("IntersectionObserver" in window)) {'''
assert s.count(a) == 1; s = s.replace(a, b)
open(p, 'w', encoding='utf8', newline='\n').write(s)
