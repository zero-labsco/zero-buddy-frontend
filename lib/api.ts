// 与后端通信的唯一入口，集中错误处理、超时控制与地址配置。
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';

// 单次请求超时（毫秒）。超时视为网络不可用，可触发前端兜底提示。
const REQUEST_TIMEOUT_MS = 15_000;

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
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ChatApiError('Request timed out. The service may be unavailable.', 0, true);
    }
    // 网络层错误（连接被拒、DNS 失败等）= 服务掉线
    throw new ChatApiError('Cannot reach the service. Please try again later.', 0, true);
  } finally {
    clearTimeout(timer);
  }
}

// 发送整段对话历史到后端 /api/chat。
// 返回体为统一信封 { code, message, body }，业务数据在 body 中。
// 网络错误/超时抛 isNetworkError=true，供 UI 展示友好兜底提示并允许重试。
export async function sendChat(messages: { role: string; content: string }[]): Promise<ChatResult> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  } catch (e) {
    if (e instanceof ChatApiError) throw e;
    throw new ChatApiError('Cannot reach the service. Please try again later.', 0, true);
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

