import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { ApiError, clientKey, fail, handle, ok, rateLimit, readJson, requireString } from "@/lib/api";

export const POST = handle(async (request: Request) => {
  // Brute-force guard: 10 attempts per IP per 10 minutes.
  rateLimit(clientKey(request, "login"), 10, 10 * 60 * 1000);

  const body = await readJson(request);
  const email = requireString(body, "email", { max: 200 }).toLowerCase();
  const password = requireString(body, "password", { max: 200, min: 1 });

  const account = await db.account.findUnique({ where: { email } });
  // Same message and roughly the same work either way: no user enumeration.
  if (!account || !verifyPassword(password, account.passwordHash)) {
    throw new ApiError("Email ou palavra-passe incorretos.", 401, "invalid_credentials");
  }

  await createSession(account.id);
  return ok({ id: account.id, email: account.email, displayName: account.displayName });
});

export const GET = () => fail("Método não suportado.", 405, "method_not_allowed");
