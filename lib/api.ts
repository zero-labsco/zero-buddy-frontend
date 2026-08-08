// 与后端通信的唯一入口，集中错误处理、超时控制与地址配置。
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';

// 单次请求超时（毫秒）。后端为「累积完整流式响应后一次性返回」，
// 长回答（如「详细介绍」）可能超过 15s，故放宽到 120s 避免误判超时。
const REQUEST_TIMEOUT_MS = 120_000;

export type ChatSource = 'faq' | 'cache' | 'llm' | 'offline';

export interface ChatResult {
  reply: string;
  source: ChatSource | string;
  url?: string; // 命中文档附带的链接（官网/邮箱等），前端渲染为可点击链接
}

// 后端统一响应信封：{ code, message, body }
interface ApiEnvelope<T> {
  code: number;
  message: string;
  body: T | null;
}

// 前端统一错误：携带是否「网络层错误」（可重试）标记，便于 UI 决策。
export class ChatApiError extends Error {
  code: number;
  // true 表示网络不可达/超时（服务掉线），UI 应提示「稍后重试」而非把技术错误暴露给用户
  isNetworkError: boolean;
  constructor(message: string, code = 0, isNetworkError = false) {
    super(message);
    this.name = 'ChatApiError';
    this.code = code;
    this.isNetworkError = isNetworkError;
  }
}

// 带超时的 fetch：超时抛出带 isNetworkError=true 的错误
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ChatApiError(
        'Request timed out. The service may be unavailable.',
        0,
        true,
      );
    }
    // 网络层错误（连接被拒、DNS 失败等）= 服务掉线
    throw new ChatApiError(
      'Cannot reach the service. Please try again later.',
      0,
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

// 发送整段对话历史到后端 /api/chat。
// 返回体为统一信封 { code, message, body }，业务数据在 body 中。
// 网络错误/超时抛 isNetworkError=true，供 UI 展示友好兜底提示并允许重试。
export async function sendChat(
  messages: { role: string; content: string }[],
): Promise<ChatResult> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  } catch (e) {
    if (e instanceof ChatApiError) throw e;
    throw new ChatApiError(
      'Cannot reach the service. Please try again later.',
      0,
      true,
    );
  }

  let envelope: ApiEnvelope<{ reply: string; source: string; url?: string }>;
  try {
    envelope = await res.json();
  } catch {
    throw new ChatApiError(`Request failed (${res.status})`, res.status);
  }

  // 非 2xx 或信封 code 非 200 都视为错误，使用后端返回的 message
  if (!res.ok || (envelope.code !== undefined && envelope.code !== 200)) {
    const msg = envelope?.message || `Request failed (${res.status})`;
    throw new ChatApiError(msg, envelope?.code ?? res.status);
  }

  const body = envelope.body;
  if (!body || typeof body.reply !== 'string') {
    throw new ChatApiError('Unexpected response from backend.');
  }
  return { reply: body.reply, source: body.source ?? 'unknown', url: body.url };
}

// 探测后端存活（用于状态点）。网络错误返回 false，不抛异常。
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// 流式发送：调用 /api/chat/stream，边收 SSE 边回调，实现「边生成边显示」。
// onDelta(content: string) 每收到一段增量文本调用一次；
// onDone({ source, url }) 在流正常结束时调用；onError(msg) 在业务/流错误时调用。
// 注意：流式请求不使用全局超时（生成可能很久），但保留连接超时以便服务掉线时快速失败。
export async function sendChatStream(
  messages: { role: string; content: string }[],
  handlers: {
    onDelta: (_content: string) => void;
    onDone?: (_info: { source: string; url?: string }) => void;
    onError?: (_message: string) => void;
  },
): Promise<void> {
  let res: Response;
  try {
    // 流式连接用较短的连接超时（服务掉线能快速报错），不使用逐字超时
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      res = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    // 连接失败 / 超时 = 服务掉线
    handlers.onError?.(
      e instanceof DOMException && e.name === 'AbortError'
        ? 'Request timed out. The service may be unavailable.'
        : 'Cannot reach the service. Please try again later.',
    );
    return;
  }

  if (!res.ok || !res.body) {
    handlers.onError?.(`Request failed (${res.status})`);
    return;
  }

  // 逐块读取 SSE：按行解析 `data: {json}`。
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let doneInfo: { source: string; url?: string } | null = null;

  try {
    for (;;) {
      // eslint-disable-next-line no-await-in-loop
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 以空行（\n\n）分隔事件；按行处理 data:
      let nl = buffer.indexOf('\n');
      while (nl >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line.startsWith('data:')) {
          const payload = line.slice('data:'.length).trim();
          if (payload) {
            try {
              const evt = JSON.parse(payload) as {
                type?: string;
                content?: string;
                source?: string;
                url?: string;
                message?: string;
              };
              if (evt.type === 'delta' && typeof evt.content === 'string') {
                handlers.onDelta(evt.content);
              } else if (evt.type === 'done') {
                doneInfo = { source: evt.source ?? 'llm', url: evt.url };
              } else if (evt.type === 'error') {
                handlers.onError?.(evt.message ?? 'Unknown stream error');
                return;
              }
            } catch {
              // skip malformed SSE payloads
            }
          }
        }
        nl = buffer.indexOf('\n');
      }
    }
  } catch (e) {
    handlers.onError?.(
      e instanceof DOMException && e.name === 'AbortError'
        ? 'Request timed out. The service may be unavailable.'
        : 'Connection interrupted.',
    );
    return;
  }

  handlers.onDone?.(doneInfo ?? { source: 'llm' });
}
