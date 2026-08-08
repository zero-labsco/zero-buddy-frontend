# Zero Buddy 前端 E2E 测试指南

前端交互测试基于 **Playwright**，复用系统 Chrome（或 CI 里的 Playwright Chromium）。
用例见 `e2e/chat.spec.ts`，配置见 `playwright.config.ts`。

## 快速开始

先装依赖（已装可跳过）：

```bash
npm install
```

### 方式 A：用真实后端（前后端真实联调）

1. 启动后端（在 `backend/` 目录）：
   ```bash
   cd ../backend
   RATE_LIMIT_PER_MIN=100 ./target/debug/zero-buddy-backend.exe
   ```
2. 回到前端跑测试（Playwright 会自动拉起前端 dev server）：
   ```bash
   cd ../frontend
   npm run test:e2e
   ```

### 方式 B：用 mock 后端（不依赖 Rust，纯前端自测）

```bash
npm run test:e2e:mock
```

`CI=true` 会让 Playwright 自动启动 `scripts/mock-api-server.mjs`（模拟后端协议）+ 前端 dev server，
测完自动关掉。CI 里的 e2e job 就是这么跑的。

## 怎么「看」自动化过程

Playwright 默认 **headless（无头）**，看不到窗口。按需选下面一种：

| 场景         | 命令                                                           | 说明                                                                |
| ------------ | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| 有头模式     | `npm run test:e2e:headed`                                      | 弹出 Chrome 窗口，肉眼看到它输入、点击、流式打字、出链接            |
| 慢放         | `cross-env PLAYWRIGHT_SLOWMO=800 npx playwright test --headed` | 每步间隔 800ms，看得更清楚（数字可调）                              |
| 逐步调试     | `npm run test:e2e:debug`                                       | 打开 Playwright Inspector：暂停/回看每一步、查看 locator 与页面状态 |
| 只看某个用例 | `npx playwright test --headed -g "建议问题"`                   | `-g` 按标题过滤（支持正则）                                         |
| 跑完看报告   | `npm run test:e2e:report`                                      | 浏览器打开 HTML 报告：耗时、失败详情、每一步截图、网络请求          |

`npm run test:e2e:mock:headed` 则是在 mock 模式下带窗口查看。

## 脚本一览

`package.json` 里已固化以下脚本：

| 脚本                   | 等价命令                                                           | 用途                             |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------- |
| `test:e2e`             | `playwright test`                                                  | 无头跑全部用例（默认，适合 CI）  |
| `test:e2e:headed`      | `cross-env PLAYWRIGHT_SLOWMO=800 playwright test --headed`         | 有头 + 慢放，肉眼观察过程        |
| `test:e2e:debug`       | `playwright test --debug`                                          | 打开 Inspector 逐步调试          |
| `test:e2e:mock`        | `cross-env CI=true playwright test`                                | mock 后端模式下跑（不依赖 Rust） |
| `test:e2e:mock:headed` | `cross-env CI=true PLAYWRIGHT_SLOWMO=800 playwright test --headed` | mock 模式 + 有头窗口             |
| `test:e2e:report`      | `playwright show-report`                                           | 查看最近一次的 HTML 报告         |

> `cross-env` 用于跨平台设置 `CI=true`（Windows 下 `CI=true` 前缀在 cmd 里不生效）。

## 环境变量

| 变量                  | 作用                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `CI=true`             | 强制 `webServer` 启动 mock 后端 + dev server；关闭复用已运行服务 |
| `PW_CHANNEL=chromium` | 用 Playwright 自带 Chromium 而非系统 Chrome（CI 用）             |

本地默认用系统 Chrome（`channel: 'chrome'`），无需额外下载浏览器。

## 用例覆盖

`e2e/chat.spec.ts` 共 12 个用例：

- 页面加载 / 状态点健康探测
- 建议问题点击、手动输入发送、回车发送、Shift+Enter 换行
- 空输入禁用 Send、发送中禁用 Send
- 流式打字机渲染、长回答自动滚动
- linkify 链接渲染、多轮上下文、网络错误重试

## 常见问题

**端口被占用？**
本地已有服务在跑时，Playwright 会复用（`reuseExistingServer`），
不会重复启动。若端口冲突报错，先停掉占用 3030/3040 的进程。

**想只测一两个用例？**

```bash
npx playwright test -g "建议问题|流式"
```

**CI 失败怎么排查？**
CI 会 `--with-deps chromium` 装浏览器，失败时上传 `playwright-report/` 工件（trace + 截图），
下载后 `npm run test:e2e:report` 查看。
