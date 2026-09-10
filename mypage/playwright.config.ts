import { defineConfig, devices } from "@playwright/test";

/**
 * Mobile layout regression suite.
 *
 * The three widths are the ones that actually broke things: 320px is the
 * narrowest phone still in use (iPhone SE 1st gen), 360px is the single most
 * common Android width, and 393px covers current iPhone/Pixel. Anything that
 * holds at 320 holds above it, but the wider two catch layouts that only fail
 * once a second column becomes possible.
 *
 * `reuseExistingServer` keeps `npm run dev` usable while iterating; CI starts
 * its own server. The dev server is used rather than a production build so a
 * failing test can be fixed and re-run without a rebuild.
 */

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
/*
 * `localhost`, not `127.0.0.1`. Next 16 blocks cross-origin requests to dev
 * resources, and it treats the two as different origins: hitting the IP serves
 * the HTML but refuses every stylesheet, so all layout assertions would run
 * against an unstyled page and "pass" for the wrong reason.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "phone-320",
      dependencies: ["setup"],
      use: { ...devices["iPhone SE"], viewport: { width: 320, height: 640 } },
    },
    {
      name: "phone-360",
      dependencies: ["setup"],
      use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 } },
    },
    {
      name: "phone-393",
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"], viewport: { width: 393, height: 852 } },
    },
  ],

  webServer: {
    command: `next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
