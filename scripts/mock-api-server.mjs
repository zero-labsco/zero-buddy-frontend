#!/usr/bin/env node
/**
 * 前端 CI 用的轻量 mock 后端。
 *
 * 前后端是两个独立仓库，前端 CI 无法拉起 Rust 后端；本脚本在 3030 端口
 * 模拟 Zero Buddy 后端的协议（统一信封 + SSE 流式），让 Playwright e2e
 * 在无真实后端、无 LLM key 的环境下也能确定性跑通 UI 交互测试。
 *
 * 实现的接口：
 *   GET  /health             -> 200 空信封（前端状态点探测）
 *   POST /api/chat/stream    -> SSE：若干 delta + done（打字机流式）
 *   POST /api/chat           -> 统一信封 JSON（非流式，供兼容）
 *
 * 用法：node scripts/mock-api-server.mjs   （监听 127.0.0.1:3030）
 */
import http from 'node:http';

const PORT = Number(process.env.PORT || 3030);
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3040';

// 统一的回答：内容足够长以触发消息区滚动，且带 URL 供 linkify 用例断言
const MOCK_REPLY =
  'Mock answer: Zero Labs is the team behind Zero Buddy and several ' +
  'open-source developer tools. Zero Inspector Kit adds an in-app ' +
  'debugging panel to Flutter apps, Flutter Agent Kit automates ' +
  'agent workflows, and Invoice Zero handles freelancer invoicing. ' +
  'All of these are designed to speed up everyday development work. ' +
  'For the official site and documentation, visit ' +
  'https://zerolabsco.com. More details about the company, its mission, ' +
  'and every open-source repository are available there. This is a ' +
  'longer reply so the message list scrolls and the auto-scroll ' +
  'behaviour can be observed in the e2e tests.';
const MOCK_URL = 'https://zerolabsco.com';

function json(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function corsHeaders(req) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// SSE：把 MOCK_REPLY 拆成小块逐个推送（模拟打字机），最后发 done
async function streamReply(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    ...corsHeaders(req),
  });
  const chunks = MOCK_REPLY.match(/.{1,6}/gs) ?? [MOCK_REPLY];
  for (const chunk of chunks) {
    res.write(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`);
    // 小延迟让前端打字机指示器可见（e2e 断言 .cursor-blink/.typing）
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 15));
  }
  res.write(
    `data: ${JSON.stringify({ type: 'done', source: 'llm', url: MOCK_URL })}\n\n`,
  );
  res.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  // 读取请求体（POST）
  let body = '';
  req.on('data', (c) => {
    body += c;
  });
  req.on('end', async () => {
    if (url.pathname === '/health' && req.method === 'GET') {
      json(res, 200, { code: 200, message: 'success', body: null });
      return;
    }
    if (url.pathname === '/api/chat/stream' && req.method === 'POST') {
      await streamReply(req, res);
      return;
    }
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      // 兼容非流式：返回统一信封
      json(res, 200, {
        code: 200,
        message: 'success',
        body: { reply: MOCK_REPLY, source: 'llm', url: MOCK_URL },
      });
      return;
    }
    json(res, 404, { code: 404, message: 'not found', body: null });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-api-server] listening on http://127.0.0.1:${PORT}`);
});
