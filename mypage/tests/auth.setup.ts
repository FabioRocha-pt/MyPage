import { test as setup, expect } from "@playwright/test";
import { ACCOUNTS, PASSWORD, statePath } from "./helpers/accounts";

/**
 * Signs in the seeded test accounts once per run and saves their cookies.
 *
 * Logging in inside each spec would trip the login route's own brute-force
 * guard: `rateLimit(clientKey(request, "login"), 10, 10 * 60 * 1000)` allows ten
 * attempts per IP per ten minutes, and three viewports times a dozen specs is
 * well past that. Doing it here means three logins per run, whatever the matrix.
 */

for (const account of ACCOUNTS) {
  setup(`authenticate ${account.plan}`, async ({ page }) => {
    // Through the API rather than the form: this is a fixture, not a test of
    // the login screen, and it shares the context's cookie jar either way.
    const response = await page.request.post("/api/auth/login", {
      data: { email: account.email, password: PASSWORD },
    });

    expect(
      response.ok(),
      `Login falhou para ${account.email} (${response.status()}). ` +
        'Corre "npm run db:seed:tiers" para criar as contas de teste.',
    ).toBeTruthy();

    await page.context().storageState({ path: statePath(account.plan) });
  });
}
