/**
 * RFBTicket sandbox: provisioning requires explicit binding configuration.
 * Do not run cf deploy before creating a SEPARATE test D1 database, configuring
 * Firebase Auth and generating TICKET_SIGNING_SECRET outside GitHub.
 * Cloudflare CLI cf (Node >=22.18) — not Wrangler.
 */
import { bindings, defineConfig } from 'cf/config';

export default defineConfig({
  worker: {
    name: 'rfb-ticket-sandbox',
    compatibilityDate: '2026-11-22',
    entrypoint: './worker/index.mjs',
    workersDev: true,
    assets: {
      notFoundHandling: 'single-page-application',
      runWorkerFirst: ['/api/*'],
    },
    observability: {
      enabled: true,
      logs: { enabled: true, headSamplingRate: 0.1 },
      traces: { enabled: true, headSamplingRate: 0.01 },
      redactQueryString: true,
    },
    env: {
      // Replace name with a dedicated sandbox database after verifying cf's plan.
      DB: bindings.d1({ name: 'rfb-ticket-sandbox' }),
      FIREBASE_PROJECT_ID: bindings.text('REPLACE_WITH_SANDBOX_PROJECT_ID'),
      SANDBOX_MODE: bindings.text('true'),
      TICKET_SIGNING_SECRET: bindings.secret('TICKET_SIGNING_SECRET'),
    },
  },
});
