// 聊天组件：发送问题、接收回答，并以"逐字打字"方式呈现（前端动画，不依赖后端流式）
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChat, checkHealth, ChatApiError } from '../lib/api';

// 一条消息：用户(user) 或 助手(assistant)
type Message = { role: 'user' | 'assistant'; content: string; url?: string };

// 把正文中的裸链接（http/https、mailto、裸邮箱）渲染为可点击 <a>，
// 避免网址以纯文本堆叠、与来源链接块视觉粘连。仅用于打字结束后的静态渲染。
// 匹配完整链接（保留点号，正确覆盖域名）；遇空白或 CJK/全角字符即止，
// 避免中文紧跟 URL 后整段被误判为链接。尾部标点由 linkify 剥离归还文本
const URL_RE =
  /(https?:\/\/[^\s　-鿿]+|mailto:[^\s　-鿿]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
// 链接尾部可能出现的句读/标点，需从链接中剥离、作为普通文本显示
const TRAILING_PUNCT = /[，。、；：！？.,;:!?)\]}'"]+$/;
function linkify(text: string, keyPrefix: string) {
  const parts = text.split(URL_RE);
  const out: React.ReactNode[] = [];
  parts.forEach((part, idx) => {
    if (!part) return;
    // 无状态判定：该段是否为一个链接
    const isUrl =
      /^(https?:\/\/|mailto:)|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
        part,
      );
    if (!isUrl) {
      out.push(<span key={`${keyPrefix}-${idx}`}>{part}</span>);
      return;
    }
    // 剥离尾部标点：链接本体可点击，标点作为普通文本紧随其后
    const m = part.match(TRAILING_PUNCT);
    const punct = m ? m[0] : '';
    const core = punct ? part.slice(0, -punct.length) : part;
    const href =
      core.startsWith('http') || core.startsWith('mailto:')
        ? core
        : `mailto:${core}`;
    out.push(
      <a
        key={`${keyPrefix}-${idx}`}
        className="msg-inline-link link-underline"
        href={href}
        target={core.startsWith('http') ? '_blank' : undefined}
        rel={core.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {core.replace('mailto:', '')}
      </a>,
    );
    if (punct) out.push(<span key={`${keyPrefix}-p-${idx}`}>{punct}</span>);
  });
  return out;
}

// 首次进入时展示的建议问题（点击即可发送）
const SUGGESTIONS = [
  'What is Zero Inspector Kit?',
  'How do I install Flutter Agent Kit?',
  'Tell me about WizardPlayer',
  'What does Invoice Zero do?',
];

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]); // 消息列表
  const [input, setInput] = useState(''); // 输入框内容
  const [loading, setLoading] = useState(false); // 是否等待后端回包 / 打字中
  const [online, setOnline] = useState<boolean | null>(null); // 后端连通状态（null=检测中）
  // 每条助手消息当前已揭示的字符数（用于逐字打字效果）
  const [revealed, setRevealed] = useState<Record<number, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null); // 消息区滚动容器
  const timers = useRef<Record<number, ReturnType<typeof setInterval>>>({}); // 打字定时器
  // 最近一次因网络错误失败的用户问题（state 以便渲染「重试」按钮）；null 表示无需重试
  const [retryable, setRetryable] = useState<string | null>(null);

  // 是否开启"减少动态效果"（无障碍偏好），开启则直接整段显示
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 新消息或打字进度变化时，自动滚动到底部
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, revealed, loading]);

  // 组件卸载时清理所有仍在跑的打字定时器
  useEffect(() => {
    return () => Object.values(timers.current).forEach(clearInterval);
  }, []);

  // 检测后端连通性，并周期性刷新状态点
  useEffect(() => {
    let alive = true;
    const probe = async () => {
      const ok = await checkHealth();
      if (alive) setOnline(ok);
    };
    probe();
    const id = setInterval(probe, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // 逐字揭示一条助手消息，模拟打字机效果；结束后才放开 loading
  const typeOut = useCallback(
    (index: number, text: string) => {
      if (reduceMotion || text.length <= 1) {
        setRevealed((r) => ({ ...r, [index]: text.length }));
        setLoading(false);
        return;
      }
      let shown = 0;
      const perTick = text.length > 300 ? 2 : 1; // 长文本加速播放
      timers.current[index] = setInterval(() => {
        shown += perTick;
        if (shown >= text.length) {
          shown = text.length;
          clearInterval(timers.current[index]);
          delete timers.current[index];
          setLoading(false); // 打字结束才允许再次发送
        }
        setRevealed((r) => ({ ...r, [index]: shown }));
      }, 16);
    },
    [reduceMotion],
  );

  // 发送一条消息到后端，并把回答加入列表、触发打字效果。
  // 错误处理：网络层错误（服务掉线/超时）展示友好兜底提示并允许重试；
  // 业务错误只作为一次性提示展示（不写入 messages，避免污染多轮上下文）。
  async function send(text: string, retryFrom?: string) {
    const q = (retryFrom ?? text).trim();
    if (!q || loading) return; // 空内容或正在发送则忽略
    setLoading(true);
    const next = [...messages, { role: 'user' as const, content: q }];
    setMessages(next);
    setInput('');

    try {
      const { reply, url } = await sendChat(
        next.map((m) => ({ role: m.role, content: m.content })),
      );
      const idx = next.length;
      setRetryable(null); // 成功则清除重试态
      setMessages([...next, { role: 'assistant', content: reply, url }]);
      typeOut(idx, reply);
    } catch (err) {
      const apiErr = err instanceof ChatApiError ? err : null;
      // 记录错误日志便于排查（网络错误单独标记）
      if (apiErr?.isNetworkError) {
        console.error(
          '[ChatWidget] backend unreachable / timeout:',
          apiErr.message,
        );
      } else {
        console.error('[ChatWidget] chat request failed:', err);
      }

      // 友好兜底：网络层错误提示「服务暂时不可用，请稍后重试」并支持重试；
      // 业务错误用后端返回的具体 message（如参数校验失败）。
      const fallback = apiErr?.isNetworkError
        ? '⚠️ Service temporarily unavailable. Please try again later.'
        : apiErr?.message || 'Something went wrong. Please try again.';

      const idx = next.length;
      setMessages([...next, { role: 'assistant', content: fallback }]);
      typeOut(idx, fallback);

      // 网络错误时记录最后一条用户问题，供「重试」重发（不污染多轮上下文）
      if (apiErr?.isNetworkError) {
        setRetryable(q);
      }
    }
  }

  return (
    <div className="chat-shell">
      {/* 头部：状态点仅作视觉连通指示，不显示 ONLINE/OFFLINE 文字 */}
      <div className="chat-header">
        <span
          className={`status-dot ${online ? 'glow-pulse' : online === false ? 'status-off' : ''}`}
          aria-hidden="true"
        />
        <span>ZERO BUDDY</span>
      </div>

      {/* 消息区 */}
      <div
        className="chat-messages"
        ref={scrollRef}
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 && (
          <div className="msg empty">
            Start a conversation or pick a question below.
          </div>
        )}
        {messages.map((m, i) => {
          const shown = revealed[i] ?? m.content.length; // 已揭示字符数
          const isTyping = m.role === 'assistant' && shown < m.content.length; // 是否正在打字
          // 助手消息附带链接（如官网/邮箱）时，打字结束后显示可点击的来源链接
          const showLink = m.role === 'assistant' && m.url && !isTyping;
          return (
            <div key={i} className={`msg ${m.role}`} role="listitem">
              {isTyping
                ? m.content.slice(0, shown)
                : linkify(m.content, `m${i}`)}
              {isTyping && <span className="cursor-blink" aria-hidden="true" />}
              {showLink && (
                <a
                  className={`msg-link link-underline ${
                    m.url!.startsWith('mailto:')
                      ? 'msg-link-mail'
                      : 'msg-link-url'
                  }`}
                  href={m.url}
                  target={m.url!.startsWith('http') ? '_blank' : undefined}
                  rel={
                    m.url!.startsWith('http')
                      ? 'noopener noreferrer'
                      : undefined
                  }
                >
                  <span className="msg-link-icon">
                    {m.url!.startsWith('mailto:') ? '✉' : '🔗'}
                  </span>
                  {m.url!.startsWith('mailto:')
                    ? m.url!.replace('mailto:', '')
                    : m.url}
                </a>
              )}
            </div>
          );
        })}
        {/* 等待后端时显示三点"打字中"指示 */}
        {loading && (
          <div className="msg assistant" role="status">
            <span className="typing" aria-label="Assistant is typing">
              <span className="dot" />
              <span className="dot" style={{ animationDelay: '0.2s' }} />
              <span className="dot" style={{ animationDelay: '0.4s' }} />
            </span>
          </div>
        )}
      </div>

      {/* 无消息时展示建议问题芯片 */}
      {messages.length === 0 && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="chip link-underline"
              onClick={() => send(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 网络错误兜底条：提供「重试」按钮，避免用户感知技术故障 */}
      {retryable && !loading && (
        <div className="retry-bar" role="alert">
          <span>Service temporarily unavailable.</span>
          <button
            className="btn-retry btn-press"
            onClick={() => {
              const q = retryable;
              setRetryable(null);
              send('', q); // 用记录的问题重试
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 输入区：文本框 + 发送按钮（青绿→青蓝渐变） */}
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          id="chat-input"
          className="chat-textarea"
          rows={1}
          placeholder="Ask about Zero Labs…"
          aria-label="Ask about Zero Labs"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // 回车发送，Shift+回车换行
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button
          className="btn-send btn-press"
          type="submit"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
