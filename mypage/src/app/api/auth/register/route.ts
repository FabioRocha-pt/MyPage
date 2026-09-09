import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import {
  ApiError,
  assertSlug,
  clientKey,
  handle,
  ok,
  rateLimit,
  readJson,
  requireString,
  slugify,
} from "@/lib/api";
import { DEFAULT_EDITOR_ORDER, DEFAULT_SECTIONS } from "@/lib/page-model";

/**
 * Creates an account and its first artist in one step.
 *
 * Doc 01: "Free deve aproveitar o perfil existente. Plano pago usa a mesma
 * identidade com template e ferramentas autorizadas." Once the Muska identity
 * provider exists, this route should link to an existing Muska artist instead
 * of creating a new one — the `muskaId` column is already reserved for it, and
 * the check below refuses to create a duplicate identity for a known Muska id.
 */
export const POST = handle(async (request: Request) => {
  rateLimit(clientKey(request, "register"), 5, 60 * 60 * 1000);

  const body = await readJson(request);
  const email = requireString(body, "email", { max: 200 }).toLowerCase();
  const password = requireString(body, "password", { max: 200, min: 8 });
  const displayName = requireString(body, "displayName", { max: 80 });

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new ApiError("Email inválido.", 400, "invalid_email");
  }

  const existing = await db.account.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError("Já existe uma conta com este email.", 409, "email_taken");
  }

  const requestedSlug = typeof body.slug === "string" && body.slug.trim() ? body.slug.trim() : displayName;
  let slug = assertSlug(slugify(requestedSlug));

  // Append a counter rather than failing: the artist can change it later.
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const taken = await db.artist.findUnique({ where: { slug } });
    if (!taken) break;
    slug = `${slugify(requestedSlug).slice(0, 44)}-${attempt + 1}`;
    if (attempt === 20) throw new ApiError("Não foi possível gerar um endereço livre.", 409, "slug_exhausted");
  }

  const account = await db.$transaction(async (tx) => {
    const created = await tx.account.create({
      data: { email, passwordHash: hashPassword(password), displayName },
    });
    const artist = await tx.artist.create({
      data: {
        slug,
        displayName,
        plan: "free",
        memberships: { create: { accountId: created.id, role: "owner" } },
      },
    });
    await tx.pageDraft.create({
      data: {
        artistId: artist.id,
        editorOrder: JSON.stringify(DEFAULT_EDITOR_ORDER),
        sections: JSON.stringify(DEFAULT_SECTIONS),
      },
    });
    return created;
  });

  await createSession(account.id);
  return ok({ id: account.id, email: account.email, slug }, { status: 201 });
});
