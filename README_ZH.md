<p align="center">
  <img src="https://img.shields.io/badge/Zero%20Buddy-%E5%89%8D%E7%AB%AF%20Frontend-5eead4?style=for-the-badge" alt="Zero Buddy 前端" />
  <img src="https://img.shields.io/badge/Next.js-000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-Apache--2.0-blue?style=for-the-badge" alt="License" />
</p>

<h1 align="center">Zero Buddy 前端 (Frontend)</h1>

<p align="center">
  Zero Buddy AI 助手的官方聊天界面。
</p>

<p align="center">
  <a href="https://github.com/zero-labsco/zero-buddy-frontend">前端仓库</a>
  ·
  <a href="https://github.com/zero-labsco/zero-buddy-backend">后端仓库</a>
  ·
  <a href="./CONTRIBUTING.md">贡献指南</a>
</p>

---

> **Zero Buddy 项目的一部分。** 本仓库是**前端**（Next.js 聊天界面）。API 服务
> 位于另一个独立仓库：**[Zero Buddy 后端 »](https://github.com/zero-labsco/zero-buddy-backend)**

## 目录

- [简介](#简介)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [生产构建](#生产构建)
- [环境变量](#环境变量)
- [说明](#说明)
- [贡献与 CI](#贡献与-ci)

## 简介

一个 Next.js 14（App Router）单页聊天组件，与 Zero Buddy 后端通信。它与后端是
**独立仓库**，通过 `NEXT_PUBLIC_API_URL` 以 HTTP 方式连接。

视觉风格与 [zerolabsco.com](https://zerolabsco.com) 保持一致：

- 近黑背景（`#0a0a0a`）、近白文字（`#f1f1f1`）
- 青绿强调色（`#5eead4`）用于高亮、分隔线与打字光标
- 字体：**Inter** 正文、**Space Grotesk** 标题、**JetBrains Mono** 代码/标签
- 微妙的径向光晕背景与平滑淡入动画

## 技术栈

| 关注点 | 选型                      |
| ------ | ------------------------- |
| 框架   | Next.js 14（App Router）  |
| 语言   | TypeScript                |
| 样式   | 原生 CSS（globals.css）   |
| 数据   | `fetch` 调用后端 REST API |

## 项目结构

```
frontend/
├── app/
│   ├── layout.tsx          # 根布局 + 元信息
│   ├── page.tsx            # 落地页（Hero + 聊天）
│   └── globals.css         # Zero Labs 风格主题
├── components/
│   └── ChatWidget.tsx       # 聊天 UI 与消息逻辑
├── lib/
│   └── api.ts               # API 客户端（fetch + 错误处理）
├── next.config.js
├── tsconfig.json
└── .env.local.example
```

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置后端地址
cp .env.local.example .env.local
#    设置 NEXT_PUBLIC_API_URL=http://localhost:3030

# 3. 运行开发服务器（固定端口 3040）
npm run dev
#    打开 http://localhost:3040
```

## 生产构建

```bash
npm run build
npm start
```

## 环境变量（`.env.local`）

| 变量                       | 默认值                           | 说明                                               |
| -------------------------- | -------------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`      | `http://localhost:3030`          | 后端 API 的基础地址（不带 /api/chat）              |
| `NEXT_PUBLIC_PRODUCT_NAME` | `Zero Buddy`                     | 界面显示的产品名                                   |
| `NEXT_PUBLIC_ORG_NAME`     | `Zero Labs`                      | 界面显示的组织名                                   |
| `NEXT_PUBLIC_REPO_URL`     | `https://github.com/zero-labsco` | 底部 footer 链接地址（留空则不显示链接）           |
| `NEXT_PUBLIC_LABEL`        | `Zero Labs`                      | 底部 footer 链接的显示文案（未设置时回退到组织名） |

## 说明

- 界面同样支持**离线模式**：若后端未配置 LLM key，会直接展示检索到的知识
  片段，而非生成的回答。
- 字体在 `globals.css` 中通过 Google Fonts 加载；如需完全离线运行可自行托管字体。
- **健壮性**：错误信息以提示形式展示，但**不会**写入对话历史，因此失败请求
  不会污染发给后端的上下文。顶部状态点真实反映后端连通性（每 15 秒探测一次），
  **不显示** ONLINE/OFFLINE 文字，仅以圆点指示连接状态。
  当用户偏好减少动态效果时，打字动画会被跳过。
- **可点击链接**：后端 RAG 命中文档若携带 `url`（如官网或 `mailto:` 邮箱），
  前端会在助手消息打字结束后将其渲染为可点击链接（`mailto:` 调起邮件客户端、
  `http(s)` 新开网页）。

---

## 贡献与 CI

完整的贡献指南（英文 + 简体中文）见 **[CONTRIBUTING.md](./CONTRIBUTING.md)**，
遵循 [Zero Labs 贡献规范](https://github.com/zero-labsco/.github/blob/main/profile/CONTRIBUTING.md)：

- **提交信息**须遵循 [Conventional Commits](https://www.conventionalcommits.org)
  （如 `feat:`、`fix:`、`docs:`、`chore:`、`refactor:`、`ci:` …）。
  PR 提交由 `wagoid/commitlint-github-action` 强制校验（见 `commitlint.config.js`）。
- **分支命名**：使用有描述性的前缀，如 `feature/your-feature-name`。
- **代码风格**：JavaScript/TypeScript 使用 `prettier` + `eslint`（Airbnb JS Style Guide）。
  推送前请运行 `npm run format` 和 `npm run lint:eslint`。
- **Pre-commit 钩子**：本仓库在 `.githooks/pre-commit` 内置 `prettier` + `eslint` 检查。
  克隆后启用一次：

  ```bash
  git config core.hooksPath .githooks
  ```

  未通过 `npm run lint:prettier` 或 `npm run lint:eslint` 的提交会被拒绝。

### 可用脚本

| 脚本                    | 用途                                |
| ----------------------- | ----------------------------------- |
| `npm run dev`           | 在 3040 端口启动 Next.js 开发服务器 |
| `npm run build`         | 生产构建（含类型检查 + lint）       |
| `npm run lint:eslint`   | ESLint（Airbnb）检查                |
| `npm run lint:prettier` | Prettier 格式检查                   |
| `npm run format`        | 用 Prettier 自动格式化              |

### CI 工作流（`.github/workflows/ci.yml`）

每次推送到 `main`/`master` 以及每个 PR 都会运行：

1. `npm run lint:prettier` — Prettier 格式检查。
2. `npm run lint:eslint` — ESLint（Airbnb）检查。
3. `npm run build` — Next.js 构建（含 TypeScript 类型检查）。
4. **提交信息 lint**（仅 PR）— 逐条校验 Conventional Commits。

### Dependabot（`.github/dependabot.yml`）

- `npm`：每周依赖更新，提交前缀 `chore:`。
- `github-actions`：每周工作流更新，提交前缀 `ci:`。
- **安全优先**：所有更新须先通过下方的审计 / 依赖审查关卡才能合并；Dependabot 永不自动合并。

### 依赖审计与自动修复（`.github/workflows/audit.yml`）

- 每**周一 09:00 UTC** 运行，也可手动触发（`workflow_dispatch`）。
- **安全是硬关卡**：运行 `npm audit --audit-level=high`；若发现漏洞，
  则运行 `npm audit fix`（仅兼容、非破坏性更新）后再次检查。任务**除非依赖树干净否则失败**——
  绝不为了"最新"而接受不安全版本。
- 若修复成功，会开出标题为 `chore(deps): fix npm audit vulnerabilities` 的 PR 供人工审查。
- 该 PR **永不自动合并**——须由维护者审查后合并。
- 需要破坏性变更的漏洞留作人工处理（任务故意失败）。

### 依赖审查关卡（`.github/workflows/dependency-review.yml`）

- 每次对 `main` 的 **PR** 都会运行。阻断任何引入高/严重漏洞的变更
  （也覆盖 Dependabot 的"最新版本" PR）。确保**安全优先，其次最新**。

---

### English Documentation

See [`README.md`](./README.md) for the English version.
