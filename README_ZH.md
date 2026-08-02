# Zero Buddy — 前端

> Zero Buddy AI 助手的官方聊天界面，视觉风格与 Zero Labs 品牌一致（深色主题、
> 青绿强调色、Inter / Space Grotesk / JetBrains Mono 字体）。

---

## 简介

一个 Next.js 14（App Router）单页聊天组件，与 Zero Buddy 后端通信。它与后端是
**独立仓库**，通过 `NEXT_PUBLIC_API_URL` 以 HTTP 方式连接。

视觉风格与 [zerolabsco.com](https://zerolabsco.com) 保持一致：

- 近黑背景（`#0a0a0a`）、近白文字（`#f1f1f1`）
- 青绿强调色（`#5eead4`）用于高亮、分隔线与打字光标
- 字体：**Inter** 正文、**Space Grotesk** 标题、**JetBrains Mono** 代码/标签
- 微妙的径向光晕背景与平滑淡入动画

## 技术栈

| 关注点   | 选型                      |
| -------- | ------------------------- |
| 框架     | Next.js 14（App Router）  |
| 语言     | TypeScript                |
| 样式     | 原生 CSS（globals.css）   |
| 数据     | `fetch` 调用后端 REST API |

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

| 变量                | 默认值                    | 说明                          |
| ------------------- | ------------------------- | ----------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3030` | 后端 API 的基础地址（不带 /api/chat） |
| `NEXT_PUBLIC_PRODUCT_NAME` | `Zero Buddy`       | 界面显示的产品名 |
| `NEXT_PUBLIC_ORG_NAME` | `Zero Labs`           | 界面显示的组织名 |
| `NEXT_PUBLIC_REPO_URL` | `https://github.com/zero-labsco` | 底部 footer 链接地址（留空则不显示链接） |
| `NEXT_PUBLIC_LABEL` | `Zero Labs`             | 底部 footer 链接的显示文案（未设置时回退到组织名） |

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
