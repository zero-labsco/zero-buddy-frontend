<p align="center">
  <img src="https://img.shields.io/badge/Zero%20Buddy-Frontend-5eead4?style=for-the-badge" alt="Zero Buddy Frontend" />
  <img src="https://img.shields.io/badge/Next.js-000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-Apache--2.0-blue?style=for-the-badge" alt="License" />
</p>

<h1 align="center">Zero Buddy Frontend</h1>

<p align="center">
  The official chat UI for the Zero Buddy AI assistant.
</p>

<p align="center">
  <a href="https://github.com/zero-labsco/zero-buddy-frontend">Frontend Repo</a>
  ·
  <a href="https://github.com/zero-labsco/zero-buddy-backend">Backend Repo</a>
  ·
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>

---

> **Part of the Zero Buddy project.** This repository is the **frontend** (Next.js
> chat UI). The API server lives in a separate repo:
> [**Zero Buddy Backend »**](https://github.com/zero-labsco/zero-buddy-backend)

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Building for Production](#building-for-production)
- [Environment](#environment)
- [Notes](#notes)
- [Contributing & CI](#contributing--ci)

## Overview

A Next.js 14 (App Router) single-page chat widget that talks to the Zero Buddy
backend. It is a **separate repository** from the backend and connects over
HTTP via `NEXT_PUBLIC_API_URL`.

The look & feel mirrors [zerolabsco.com](https://zerolabsco.com):

- Near-black background (`#0a0a0a`), near-white text (`#f1f1f1`)
- Teal accent (`#5eead4`) for highlights, dividers and the typing cursor
- Typography: **Inter** for body, **Space Grotesk** for headings,
  **JetBrains Mono** for code/labels
- Subtle radial glow background and smooth fade-in animations

## Tech Stack

| Concern   | Choice                      |
| --------- | --------------------------- |
| Framework | Next.js 14 (App Router)     |
| Language  | TypeScript                  |
| Styling   | Plain CSS (globals.css)     |
| Data      | `fetch` to backend REST API |

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout + metadata
│   ├── page.tsx            # Landing page (hero + chat)
│   └── globals.css         # Zero Labs–style theme
├── components/
│   └── ChatWidget.tsx       # Chat UI and message logic
├── lib/
│   └── api.ts               # API client (fetch + error handling)
├── next.config.js
├── tsconfig.json
└── .env.local.example
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure the backend URL
cp .env.local.example .env.local
#    Set NEXT_PUBLIC_API_URL=http://localhost:3030

# 3. Run the dev server (fixed port 3040)
npm run dev
#    Open http://localhost:3040
```

## Building for Production

```bash
npm run build
npm start
```

## Environment (`.env.local`)

| Variable                   | Default                          | Description                                              |
| -------------------------- | -------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`      | `http://localhost:3030`          | Base URL of the backend API (no trailing `/api/chat`)    |
| `NEXT_PUBLIC_PRODUCT_NAME` | `Zero Buddy`                     | Product name shown in the UI                             |
| `NEXT_PUBLIC_ORG_NAME`     | `Zero Labs`                      | Organization name shown in the UI                        |
| `NEXT_PUBLIC_REPO_URL`     | `https://github.com/zero-labsco` | Footer link URL (empty = hide link)                      |
| `NEXT_PUBLIC_LABEL`        | `Zero Labs`                      | Footer link display text (defaults to ORG_NAME if unset) |

## Notes

- The UI works in **offline mode** too: if the backend has no LLM key, it
  displays the retrieved knowledge snippet instead of a generated answer.
- Fonts are loaded from Google Fonts in `globals.css`; self-host them if you
  need to run fully offline.
- **Robustness**: errors are shown inline but never added to the conversation
  history, so a failed request never pollutes the context sent to the backend.
  The header shows a small status dot that reflects backend health (polled
  every 15s). It does **not** surface an ONLINE/OFFLINE text label — only the dot
  indicates connectivity.
  Typing animation is skipped when the user prefers reduced motion.
- **Clickable links**: when the backend's RAG match carries a `url` (e.g. an
  official website or a `mailto:` email), the frontend renders it as a clickable
  link after typing finishes (`mailto:` opens the mail client, `http(s)` opens
  in a new tab).

---

## Contributing & CI

Full contribution guidelines (English + 简体中文) are in **[CONTRIBUTING.md](./CONTRIBUTING.md)**,
following the [Zero Labs contributing guidelines](https://github.com/zero-labsco/.github/blob/main/profile/CONTRIBUTING.md):

- **Commit messages** must follow [Conventional Commits](https://www.conventionalcommits.org)
  (e.g. `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `ci:` …).
  PR commits are enforced by `wagoid/commitlint-github-action` (see `commitlint.config.js`).
- **Branch naming**: use a descriptive prefix, e.g. `feature/your-feature-name`.
- **Code style**: JavaScript/TypeScript uses `prettier` + `eslint` (Airbnb JS Style Guide).
  Run `npm run format` and `npm run lint:eslint` before pushing.
- **Pre-commit hook**: this repo ships `prettier` + `eslint` checks in `.githooks/pre-commit`.
  Enable it once after cloning:

  ```bash
  git config core.hooksPath .githooks
  ```

  It rejects commits that fail `npm run lint:prettier` or `npm run lint:eslint`.

### Available scripts

| Script                  | Purpose                               |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | Start Next.js dev server on port 3040 |
| `npm run build`         | Production build (type-check + lint)  |
| `npm run lint:eslint`   | ESLint (Airbnb) check                 |
| `npm run lint:prettier` | Prettier format check                 |
| `npm run format`        | Auto-format with Prettier             |

### CI workflow (`.github/workflows/ci.yml`)

Runs on every push to `main`/`master` and on every PR:

1. `npm run lint:prettier` — Prettier format check.
2. `npm run lint:eslint` — ESLint (Airbnb) check.
3. `npm run build` — Next.js build (includes TypeScript type-check).
4. **Commit Message Lint** (PR only) — validates each commit against Conventional Commits.

### Dependabot (`.github/dependabot.yml`)

- `npm`: weekly dependency updates, `chore:` commit prefix.
- `github-actions`: weekly workflow updates, `ci:` commit prefix.
- **Security-first**: all updates must pass the audit / dependency-review gates below before merge; Dependabot never auto-merges.

### Dependency Audit & Auto-Fix (`.github/workflows/audit.yml`)

- Runs **every Monday 09:00 UTC** and is also manually triggerable (`workflow_dispatch`).
- **Security is a hard gate**: runs `npm audit --audit-level=high`; if vulnerabilities are found,
  it runs `npm audit fix` (compatible, non-breaking updates only), then re-checks. The job
  **fails (red)** unless the tree is clean — an unsafe version is never accepted "just because it's latest".
- If the fix succeeds, it opens a PR titled `chore(deps): fix npm audit vulnerabilities` for human review.
- The PR is **never auto-merged** — a maintainer must review and merge.
- Vulnerabilities needing a breaking change are left for manual intervention (job fails on purpose).

### Dependency Review Gate (`.github/workflows/dependency-review.yml`)

- Runs on **every PR to `main`**. Blocks any change that introduces high/critical vulnerabilities
  (covers Dependabot's "latest version" PRs too). Ensures **secure-first, then latest**.

---

### 中文文档

中文说明请见 [`README_ZH.md`](./README_ZH.md)。
