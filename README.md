# Zero Buddy — Frontend

> The official chat UI for the Zero Buddy AI assistant, styled to match the
> Zero Labs brand (dark theme, teal accent, Inter / Space Grotesk / JetBrains
> Mono typography).

---

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

## Tech stack

| Concern     | Choice                |
| ----------- | --------------------- |
| Framework   | Next.js 14 (App Router) |
| Language    | TypeScript            |
| Styling     | Plain CSS (globals.css) |
| Data        | `fetch` to backend REST API |

## Project structure

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

## Quick start

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

## Building for production

```bash
npm run build
npm start
```

## Environment (`.env.local`)

| Variable            | Default                  | Description                |
| ------------------- | ------------------------ | -------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3030` | Base URL of the backend API (no trailing `/api/chat`) |
| `NEXT_PUBLIC_PRODUCT_NAME` | `Zero Buddy`       | Product name shown in the UI |
| `NEXT_PUBLIC_ORG_NAME` | `Zero Labs`           | Organization name shown in the UI |
| `NEXT_PUBLIC_REPO_URL` | `https://github.com/zero-labsco` | Footer link URL (empty = hide link) |
| `NEXT_PUBLIC_LABEL` | `Zero Labs`             | Footer link display text (defaults to ORG_NAME if unset) |

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

### 中文文档

中文说明请见 [`README_ZH.md`](./README_ZH.md)。
