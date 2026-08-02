# Contributing Guide / 贡献指南

Welcome to the **zero buddy frontend** (Next.js · React). This document explains how to
contribute. It is written in **English (EN)** and **简体中文 (ZH)** — the two languages
are presented side by side under each heading.

欢迎参与 **zero buddy 前端**（Next.js · React）的开发。本文档说明如何参与贡献。内容以
**英文（EN）** 与 **简体中文（ZH）** 双语呈现，每个小节下方并列两种语言。

---

## 1. Code of Conduct / 行为准则

**EN** — Be respectful and constructive. By participating you agree to uphold a
welcoming, harassment-free environment for everyone.

**ZH** — 请保持尊重与建设性。参与本项目即表示你同意维护一个对所有人友好、无骚扰的环境。

---

## 2. Getting Started / 开始之前

**EN**

1. Fork the repository and clone your fork.
2. Install Node.js (LTS) and enable Corepack if needed.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```

**ZH**

1. Fork 本仓库并克隆你的副本。
2. 安装 Node.js（LTS 版本），如需可启用 Corepack。
3. 安装依赖：
   ```bash
   npm install
   ```
4. 启动开发服务器：
   ```bash
   npm run dev
   ```

---

## 3. Branching Model / 分支模型

**EN** — Create a feature branch from `main` using the `feature/` prefix:

```bash
git checkout -b feature/your-feature-name
```

Use prefixes consistently: `feature/`, `fix/`, `chore/`, `docs/`, `refactor/`, `style/`.

**ZH** — 从 `main` 切出以 `feature/` 为前缀的功能分支：

```bash
git checkout -b feature/your-feature-name
```

请统一使用前缀：`feature/`、`fix/`、`chore/`、`docs/`、`refactor/`、`style/`。

---

## 4. Commit Message Convention / 提交信息规范

**EN** — We follow [Conventional Commits](https://www.conventionalcommits.org/).
The CI rejects PRs whose commits do not match the pattern.

Format:

```
<type>(<optional scope>): <description>

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, `revert`.

Examples:

```
feat(widget): add retry button on connection failure
fix(api): handle 429 rate-limit response
style: normalize line endings to LF
```

**ZH** — 我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，
CI 会拒绝不符合规范的 PR 提交。

格式：

```
<type>(<可选 scope>): <描述>

[可选正文]
[可选脚注]
```

类型：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、
`ci`、`chore`、`revert`。

示例：

```
feat(widget): 在连接失败时新增重试按钮
fix(api): 处理 429 速率限制响应
style: 统一行尾为 LF
```

---

## 5. Before You Push / 推送前检查

**EN** — Run the same checks the CI runs locally:

```bash
npm run lint:prettier   # prettier --check .
npm run lint:eslint     # next lint
npm run build           # next build (type check + production build)
```

Optionally install the pre-commit hook so formatting/linting is enforced automatically:

```bash
git config core.hooksPath .githooks
```

**ZH** — 推送前请在本地运行与 CI 相同的检查：

```bash
npm run lint:prettier   # prettier --check .
npm run lint:eslint     # next lint
npm run build           # next build（类型检查 + 生产构建）
```

可选：安装 pre-commit 钩子，自动强制格式化与 lint：

```bash
git config core.hooksPath .githooks
```

---

## 6. Security & Dependency Audits / 安全与依赖审计

**EN** — A scheduled workflow runs `npm audit` weekly, applies fixes, and opens a PR.
Do not ship code with known high/critical vulnerabilities. Run locally with:

```bash
npm audit
```

**ZH** — 定时工作流每周运行 `npm audit`、应用修复并自动开 PR。请勿提交存在已知
高危/严重漏洞的代码。本地可运行：

```bash
npm audit
```

---

## 7. Opening a Pull Request / 发起 Pull Request

**EN**

1. Push your branch to your fork.
2. Open a PR against `main`.
3. Fill in the PR template and link any related issue.
4. Ensure required checks (prettier, eslint, build, commit-lint) pass.
5. A maintainer will review; please respond to review comments.

**ZH**

1. 将分支推送到你的 fork。
2. 向 `main` 发起 Pull Request。
3. 填写 PR 模板并关联相关 issue。
4. 确保必需的检查（prettier、eslint、build、commit-lint）通过。
5. 维护者会进行评审，请回复评审意见。

---

## 8. License / 许可证

**EN** — Contributions are licensed under [Apache-2.0](./LICENSE).

**ZH** — 本项目的贡献以 [Apache-2.0](./LICENSE) 协议授权。

---

Thank you for contributing! / 感谢你的贡献！
