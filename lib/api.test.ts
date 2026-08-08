import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendChat, sendChatStream, checkHealth, ChatApiError } from './api';

// —— 测试辅助：mock 全局 fetch ——
type MockFetch = ReturnType<typeof vi.fn>;
let fetchMock: MockFetch;

function mockFetch(impl: (..._args: unknown[]) => unknown) {
  fetchMock = vi.fn().mockImplementation(impl);
  vi.stubGlobal('fetch', fetchMock);
}

// 构造一个「成功响应」对象：带 ok/status/json()（用于 sendChat / checkHealth）
function okResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

// 构造一个 SSE 响应对象：body 是 ReadableStream，可被 getReader() 消费
function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
      controller.close();
    },
  });
  return {
    ok: true,
    status: 200,
    body: stream,
  } as unknown as Response;
}

function messages() {
  return [{ role: 'user' as const, content: 'hello' }];
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ChatApiError', () => {
  it('默认不是网络错误', () => {
    const e = new ChatApiError('boom', 400);
    expect(e.name).toBe('ChatApiError');
    expect(e.code).toBe(400);
    expect(e.isNetworkError).toBe(false);
  });

  it('isNetworkError 标记', () => {
    const e = new ChatApiError('network', 0, true);
    expect(e.isNetworkError).toBe(true);
  });
});

describe('sendChat', () => {
  it('成功：解析统一信封并返回 reply/source/url', async () => {
    mockFetch(() =>
      okResponse({
        code: 200,
        message: 'success',
        body: { reply: 'Hi there', source: 'faq', url: 'https://x.com' },
      }),
    );
    const r = await sendChat(messages());
    expect(r).toEqual({
      reply: 'Hi there',
      source: 'faq',
      url: 'https://x.com',
    });
    // 请求应带 JSON body 与正确路径
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/chat$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body).messages).toHaveLength(1);
  });

  it('HTTP 非 2xx：抛 ChatApiError 并带后端 message', async () => {
    mockFetch(() =>
      okResponse({ code: 400, message: 'too many messages', body: null }, 400),
    );
    await expect(sendChat(messages())).rejects.toThrowError(
      /too many messages/,
    );
  });

  it('信封 code != 200：抛 ChatApiError', async () => {
    mockFetch(() =>
      okResponse({ code: 500, message: 'internal', body: null }, 200),
    );
    await expect(sendChat(messages())).rejects.toThrowError(/internal/);
  });

  it('响应体非 JSON：抛 ChatApiError 且非网络错误', async () => {
    mockFetch(
      () =>
        ({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error('bad json')),
        }) as unknown as Response,
    );
    await expect(sendChat(messages())).rejects.toThrowError(
      /Request failed \(200\)/,
    );
  });

  it('body 结构异常：抛 Unexpected response', async () => {
    mockFetch(() =>
      okResponse({ code: 200, message: 'success', body: { reply: 123 } }),
    );
    await expect(sendChat(messages())).rejects.toThrowError(
      /Unexpected response/,
    );
  });

  it('网络错误：抛 isNetworkError=true', async () => {
    mockFetch(() => Promise.reject(new TypeError('fetch failed')));
    await expect(sendChat(messages())).rejects.toMatchObject({
      isNetworkError: true,
    });
  });
});

describe('checkHealth', () => {
  it('后端存活返回 true', async () => {
    mockFetch(() => okResponse({ code: 200, body: null }));
    await expect(checkHealth()).resolves.toBe(true);
  });

  it('非 2xx 返回 false', async () => {
    mockFetch(() => okResponse({}, 500));
    await expect(checkHealth()).resolves.toBe(false);
  });

  it('网络错误返回 false 而非抛异常', async () => {
    mockFetch(() => Promise.reject(new TypeError('fetch failed')));
    await expect(checkHealth()).resolves.toBe(false);
  });
});

describe('sendChatStream', () => {
  it('解析 SSE：delta 依次回调，done 携带 source/url', async () => {
    mockFetch(() =>
      sseResponse([
        'data: {"type":"delta","content":"Hel"}\n\n',
        'data: {"type":"delta","content":"lo"}\n\n',
        'data: {"type":"done","source":"llm","url":"https://x.com"}\n\n',
      ]),
    );
    const deltas: string[] = [];
    let doneInfo: { source: string; url?: string } | null = null;
    await sendChatStream(messages(), {
      onDelta: (c) => deltas.push(c),
      onDone: (info) => {
        doneInfo = info;
      },
    });
    expect(deltas.join('')).toBe('Hello');
    expect(doneInfo).toEqual({ source: 'llm', url: 'https://x.com' });
  });

  it('无 done 事件时 onDone 使用默认 source=llm', async () => {
    mockFetch(() => sseResponse(['data: {"type":"delta","content":"hi"}\n\n']));
    let doneInfo: { source: string } | null = null;
    await sendChatStream(messages(), {
      onDelta: () => {},
      onDone: (info) => {
        doneInfo = info;
      },
    });
    expect(doneInfo).toEqual({ source: 'llm' });
  });

  it('error 事件：调用 onError 并停止流', async () => {
    mockFetch(() =>
      sseResponse([
        'data: {"type":"delta","content":"partial"}\n\n',
        'data: {"type":"error","message":"backend exploded"}\n\n',
      ]),
    );
    const errors: string[] = [];
    let doneCalled = false;
    await sendChatStream(messages(), {
      onDelta: () => {},
      onDone: () => {
        doneCalled = true;
      },
      onError: (m) => errors.push(m),
    });
    expect(errors).toEqual(['backend exploded']);
    expect(doneCalled).toBe(false);
  });

  it('畸形的 SSE 载荷被跳过，不中断', async () => {
    mockFetch(() =>
      sseResponse([
        'data: {bad json}\n\n',
        'data: {"type":"delta","content":"ok"}\n\n',
        'data: {"type":"done","source":"faq"}\n\n',
      ]),
    );
    const deltas: string[] = [];
    await sendChatStream(messages(), { onDelta: (c) => deltas.push(c) });
    expect(deltas.join('')).toBe('ok');
  });

  it('HTTP 非 2xx：调用 onError，不调 onDone', async () => {
    mockFetch(
      () => ({ ok: false, status: 500, body: null }) as unknown as Response,
    );
    const errors: string[] = [];
    let doneCalled = false;
    await sendChatStream(messages(), {
      onDelta: () => {},
      onDone: () => {
        doneCalled = true;
      },
      onError: (m) => errors.push(m),
    });
    expect(errors).toEqual(['Request failed (500)']);
    expect(doneCalled).toBe(false);
  });

  it('网络错误：调用 onError（不可达提示）', async () => {
    mockFetch(() => Promise.reject(new TypeError('fetch failed')));
    const errors: string[] = [];
    await sendChatStream(messages(), {
      onDelta: () => {},
      onError: (m) => errors.push(m),
    });
    expect(errors[0]).toMatch(/Cannot reach the service/);
  });
});
