import { test, expect, Page } from '@playwright/test';

/**
 * Zero Buddy 前端交互 + 前后端联调 e2e 测试。
 *
 * 前置条件：
 *   - 后端在线运行于 http://localhost:3030（CORS 允许 http://localhost:3040）
 *   - 前端 dev server 运行于 http://localhost:3040（npm run dev）
 *
 * 覆盖交互：页面加载、状态点健康探测、建议问题、手动输入/回车发送、
 * Shift+Enter 换行、空输入禁用、流式打字机渲染、linkify 链接、
 * 多轮上下文、网络错误重试。
 */

// 等待最后一条助手消息流式完成（有内容、光标消失）
async function waitAssistantDone(page: Page) {
  const assistant = page.locator('.msg.assistant').last();
  await expect(assistant).toContainText(/./, { timeout: 90_000 });
  await expect(assistant.locator('.cursor-blink')).toHaveCount(0, {
    timeout: 90_000,
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('页面加载：标题、Hero、footer 品牌链接', async ({ page }) => {
  await expect(page).toHaveTitle(/Zero Buddy/);
  await expect(page.locator('h1.hero-title')).toContainText('Zero Buddy');
  await expect(page.locator('.hero-subtitle')).toContainText('ZERO LABS');
  // footer 品牌链接（来自 NEXT_PUBLIC_REPO_URL）
  const footerLink = page.locator('.footer a');
  await expect(footerLink).toHaveCount(1);
  await expect(footerLink).toHaveAttribute('href', /github\.com/);
});

test('状态点：后端在线时显示 glow-pulse（健康探测生效）', async ({ page }) => {
  await expect(page.locator('.status-dot.glow-pulse')).toBeVisible({
    timeout: 20_000,
  });
});

test('建议问题：无消息时显示 4 个 chip，点击后出现回答', async ({ page }) => {
  const chips = page.locator('.suggestions .chip');
  await expect(chips).toHaveCount(4);
  await chips.nth(0).click(); // "What is Zero Inspector Kit?"
  await expect(page.locator('.msg.user')).toHaveCount(1);
  await expect(page.locator('.msg.user').first()).toContainText(
    /Zero Inspector Kit/i,
  );
  // 建议问题隐藏（已有消息）
  await expect(page.locator('.suggestions')).toHaveCount(0);
  await waitAssistantDone(page);
  await expect(page.locator('.msg.assistant').last()).toContainText(/./);
});

test('手动输入：点 Send 发送，输入框清空', async ({ page }) => {
  const input = page.locator('#chat-input');
  await input.fill('How to install Zero Inspector Kit?');
  await expect(page.locator('.btn-send')).toBeEnabled();
  await page.locator('.btn-send').click();
  await expect(page.locator('.msg.user')).toHaveCount(1);
  await expect(page.locator('.msg.user').first()).toContainText(
    'How to install Zero Inspector Kit?',
  );
  await expect(input).toHaveValue('');
  await waitAssistantDone(page);
});

test('回车发送、Shift+Enter 换行不发送', async ({ page }) => {
  const input = page.locator('#chat-input');
  // Shift+Enter：换行，不发送
  await input.fill('hello');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type(' world');
  await expect(input).toHaveValue('hello\n world');
  await expect(page.locator('.msg.user')).toHaveCount(0); // 未发送

  // Enter：发送
  await input.fill('hello');
  await page.keyboard.press('Enter');
  await expect(page.locator('.msg.user')).toHaveCount(1);
  await expect(input).toHaveValue('');
  await waitAssistantDone(page);
});

test('空输入时 Send 按钮禁用，非空启用', async ({ page }) => {
  const input = page.locator('#chat-input');
  const sendBtn = page.locator('.btn-send');
  await expect(sendBtn).toBeDisabled();
  await input.fill('   ');
  await expect(sendBtn).toBeDisabled(); // 纯空白仍禁用
  await input.fill('hello');
  await expect(sendBtn).toBeEnabled();
});

test('流式渲染：消息最终渲染出内容，完成后打字指示/光标消失', async ({
  page,
}) => {
  await page.locator('#chat-input').fill('hello');
  await page.locator('.btn-send').click();
  // 助手消息最终渲染出内容。
  // 注意：FAQ/缓存类短回答可能被前端一次取回并整体渲染（React 批处理），
  // 打字指示器中间态不一定会出现，因此这里断言「最终有内容」而非「必须有打字动画」；
  // 逐字流式行为由 lib/api.test.ts 的 SSE 解析单测与后端流式用例覆盖。
  await waitAssistantDone(page);
  await expect(page.locator('.msg.assistant').last()).toContainText(/./);
  // 完成后打字指示 / 光标消失
  await expect(
    page.locator('.msg.assistant .typing, .msg.assistant .cursor-blink'),
  ).toHaveCount(0);
});

test('linkify：助手消息中的 URL 渲染为可点击链接', async ({ page }) => {
  // "contact" 命中 contact-en FAQ，回复含 https://zerolabsco.com 与邮箱
  await page.locator('#chat-input').fill('How do I contact Zero Labs?');
  await page.locator('.btn-send').click();
  await waitAssistantDone(page);
  const assistant = page.locator('.msg.assistant').last();
  // 正文内链接（linkify 产物）
  const inlineLinks = assistant.locator('a.msg-inline-link');
  const hrefs = await inlineLinks.evaluateAll((els) =>
    els.map((a) => a.getAttribute('href')),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  expect(hrefs.some((h) => h && /^https?:\/\//.test(h))).toBe(true);
  // 来源链接块（后端返回的 url）也渲染为可点击
  const sourceLink = assistant.locator('a.msg-link');
  await expect(sourceLink).toHaveCount(1);
});

test('多轮对话：第二条消息追加而非覆盖', async ({ page }) => {
  await page.locator('#chat-input').fill('hello');
  await page.locator('.btn-send').click();
  await waitAssistantDone(page);
  await expect(page.locator('.msg')).toHaveCount(2); // user + assistant

  await page.locator('#chat-input').fill('What is Zero Buddy?');
  await page.locator('.btn-send').click();
  await waitAssistantDone(page);
  await expect(page.locator('.msg')).toHaveCount(4); // 两轮
  await expect(page.locator('.msg.user')).toHaveCount(2);
  await expect(page.locator('.msg.assistant')).toHaveCount(2);
  // 第一轮回答未被覆盖
  await expect(page.locator('.msg.assistant').first()).toContainText(/./);
});

test('发送中 Send 按钮禁用；完成后因输入清空仍禁用，重新输入后启用', async ({
  page,
}) => {
  const input = page.locator('#chat-input');
  const sendBtn = page.locator('.btn-send');
  await input.fill('hello');
  await expect(sendBtn).toBeEnabled();
  await page.locator('.btn-send').click();
  // 流式生成中禁用（防止连发）
  await expect(sendBtn).toBeDisabled();
  await waitAssistantDone(page);
  // 发送后输入框清空 -> 按钮仍禁用（无内容可发）
  await expect(input).toHaveValue('');
  await expect(sendBtn).toBeDisabled();
  // 重新输入 -> 恢复可用
  await input.fill('hello again');
  await expect(sendBtn).toBeEnabled();
});

test('长回答自动滚动到底部', async ({ page }) => {
  const scroller = page.locator('.chat-messages');
  // 发一条较长的回答（mock 回复足够长，真实后端亦然）
  await page.locator('#chat-input').fill('hello');
  await page.locator('.btn-send').click();
  await waitAssistantDone(page);
  // 滚动容器应滚到底部（scrollTop + clientHeight ≈ scrollHeight）
  await expect
    .poll(
      async () =>
        scroller.evaluate(
          (el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 4,
        ),
      { timeout: 20_000 },
    )
    .toBe(true);
});

test('网络错误重试：中断流式请求 -> 错误提示 + Retry -> 恢复后成功', async ({
  page,
}) => {
  // 只中断第一次流式请求
  let streamRequests = 0;
  await page.route('**/api/chat/stream', async (route) => {
    streamRequests += 1;
    if (streamRequests === 1) {
      await route.abort();
    } else {
      await route.continue();
    }
  });

  await page.locator('#chat-input').fill('hello');
  await page.locator('.btn-send').click();

  // 第一次请求被中断 -> 显示重试条
  await expect(page.locator('.retry-bar')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.retry-bar')).toContainText('Retry');

  // 点击 Retry（第二次请求放行）
  await page.locator('.btn-retry').click();
  await expect(page.locator('.retry-bar')).toHaveCount(0, { timeout: 20_000 });
  // 重试后成功收到助手回答（最后一条助手消息有内容）
  await waitAssistantDone(page);
  await expect(page.locator('.msg.assistant').last()).toContainText(/./);
});
