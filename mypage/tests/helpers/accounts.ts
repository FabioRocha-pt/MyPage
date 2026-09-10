import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The seeded test accounts and where their cookies land.
 *
 * Kept out of `auth.setup.ts` because Playwright refuses to let one test file
 * import another; both the setup and the specs read it from here instead.
 *
 * `import.meta` rather than `__dirname`: package.json declares `"type":
 * "module"`, so the CommonJS globals do not exist.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));

export const STATE_DIR = path.join(HERE, "..", ".auth");

/** Created by `npm run db:seed:tiers`. */
export const ACCOUNTS = [
  { plan: "free", email: "free@exemplo.cv" },
  { plan: "pro", email: "pro@exemplo.cv" },
  { plan: "premium", email: "premium@exemplo.cv" },
] as const;

export const PASSWORD = "mypage123";

export function statePath(plan: string) {
  return path.join(STATE_DIR, `${plan}.json`);
}
