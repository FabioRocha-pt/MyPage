import { destroySession } from "@/lib/auth";
import { handle, ok } from "@/lib/api";

export const POST = handle(async () => {
  await destroySession();
  return ok({ signedOut: true });
});
