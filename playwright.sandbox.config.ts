import {defineConfig,devices} from '@playwright/test';

/** Public sandbox UI only: fake Firebase configuration, API fulfilled by Playwright.
 * No real identities, Cloudflare, Firebase or payment actions. */
export default defineConfig({
  testDir:'./tests/sandbox-ui',
  timeout:30000,
  retries:process.env.CI?1:0,
  reporter:process.env.CI?'github':'list',
  use:{baseURL:'http://127.0.0.1:4180',trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[
    {name:'sandbox-public-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'sandbox-public-mobile',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  ],
  webServer:{
    command:'npm run dev:demo -- --host 127.0.0.1 --port 4180 --strictPort',
    url:'http://127.0.0.1:4180',
    reuseExistingServer:!process.env.CI,
    timeout:60000,
    env:{
      VITE_FIREBASE_API_KEY:'synthetic-browser-only',
      VITE_FIREBASE_AUTH_DOMAIN:'rfb-browser.invalid',
      VITE_FIREBASE_PROJECT_ID:'rfb-browser-synthetic',
      VITE_FIREBASE_APP_ID:'1:123:web:synthetic-browser-only'
    }
  }
});
