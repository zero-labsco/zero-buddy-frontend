import { defineConfig } from '@playwright/test';

/**
 * Playwright 前端交互测试配置。
 * - 本地：复用系统已装的 Google Chrome（channel: 'chrome'），不额外下载浏览器。
 * - CI：设 PW_CHANNEL=chromium 用 Playwright 自带 Chromium（npx playwright install）。
 * - 前端 dev server 跑在 3040；后端 API 跑在 3030（本地需先启动，CI 用 mock-api-server）。
 * - 超时放宽：SSE 流式 + 真实 LLM 生成较慢。
 */
const useSystemChrome = process.env.PW_CHANNEL !== 'chromium';
// 有头查看时放慢每一步（毫秒），由 npm 脚本传 PLAYWRIGHT_SLOWMO 控制
const slowMo = Number(process.env.PLAYWRIGHT_SLOWMO || 0);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // 串行跑：多个用例会向同一后端发请求，避免相互干扰
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  retries: 0,
  // list：控制台逐条输出；html：生成报告供 `npm run test:e2e:report` 查看
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://localhost:3040',
    // 本地复用系统 Chrome；CI 用 Playwright 自带 Chromium
    channel: useSystemChrome ? 'chrome' : undefined,
    headless: true,
    // 有头模式下放慢每步（PLAYWRIGHT_SLOWMO），便于肉眼观察自动化过程
    launchOptions: { slowMo },
    trace: 'retain-on-failure',
    // 失败时录屏 + 截图，报告里可回看自动化过程
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // 本地开发：前端 dev server 与真实后端由外部管理（npm run dev + 启动后端），
  // 此处 reuseExistingServer 复用已运行的服务，不重复拉起。
  // CI：自动启动 mock 后端（scripts/mock-api-server.mjs）与 Next dev server。
  webServer: [
    {
      command: 'node scripts/mock-api-server.mjs',
      url: 'http://127.0.0.1:3030/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3040',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
