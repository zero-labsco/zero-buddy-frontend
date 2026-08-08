// 聊天组件：发送问题、接收回答，并以"实时流式"方式呈现（后端逐 token 推送，边生成边显示）
'use client';

import { useState, useRef, useEffect } from 'react';
import { sendChatStream, checkHealth } from '../lib/api';
import { linkify } from '../lib/linkify';

// 一条消息：用户(user) 或 助手(assistant)
type Message = { role: 'user' | 'assistant'; content: string; url?: string };

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
  const [loading, setLoading] = useState(false); // 是否等待后端回包 / 流式生成中
  const [online, setOnline] = useState<boolean | null>(null); // 后端连通状态（null=检测中）
  // 每条助手消息是否已完成流式生成（完成后才渲染链接 / 允许再次发送）
  const [done, setDone] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null); // 消息区滚动容器
  // 最近一次因网络错误失败的用户问题（state 以便渲染「重试」按钮）；null 表示无需重试
  const [retryable, setRetryable] = useState<string | null>(null);

  // 新消息或流式进度变化时，自动滚动到底部
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

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

  // 发送一条消息到后端（流式），并把回答以「边生成边显示」的方式追加到列表。
  // 错误处理：网络层错误（服务掉线/超时）展示友好兜底提示并允许重试；
  // 业务错误只作为一次性提示展示（不写入 messages，避免污染多轮上下文）。
  async function send(text: string, retryFrom?: string) {
    const q = (retryFrom ?? text).trim();
    if (!q || loading) return; // 空内容或正在发送则忽略
    setLoading(true);
    setRetryable(null); // 新一轮发送清除重试态

    const next = [...messages, { role: 'user' as const, content: q }];
    const assistantIdx = next.length; // 助手消息将插入到此下标
    // 先放一条空助手消息，流式过程中持续往里追加内容
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');

    try {
      await sendChatStream(
        next.map((m) => ({ role: m.role, content: m.content })),
        {
          onDelta: (content) => {
            setMessages((prev) => {
              const cp = [...prev];
              // 仅更新最后一条助手消息的内容（追加增量）
              const last = cp[cp.length - 1];
              if (last && last.role === 'assistant') {
                cp[cp.length - 1] = {
                  ...last,
                  content: last.content + content,
                };
              }
              return cp;
            });
          },
          onDone: (info) => {
            // 给最终助手消息补上来源链接（如有），并标记完成
            setMessages((prev) => {
              const cp = [...prev];
              const last = cp[cp.length - 1];
              if (last && last.role === 'assistant') {
                cp[cp.length - 1] = { ...last, url: info.url };
              }
              return cp;
            });
            setDone((d) => ({ ...d, [assistantIdx]: true }));
            setLoading(false);
          },
          onError: (msg) => {
            const fallback = `⚠️ ${msg}`;
            setMessages((prev) => {
              const cp = [...prev];
              const last = cp[cp.length - 1];
              if (last && last.role === 'assistant') {
                cp[cp.length - 1] = { ...last, content: fallback };
              }
              return cp;
            });
            setDone((d) => ({ ...d, [assistantIdx]: true }));
            // 网络类错误才提供重试；这里统一把最后一条用户问题记为可重试
            setRetryable(q);
            setLoading(false);
          },
        },
      );
    } catch (err) {
      // sendChatStream 内部已处理网络错误并回调 onError；此处仅为兜底
      console.error('[ChatWidget] unexpected stream error:', err);
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
          const isDone = m.role === 'assistant' ? !!done[i] : true; // 用户消息恒为完成
          const isTyping =
            m.role === 'assistant' && !isDone && m.content.length > 0; // 流式生成中
          // 助手消息附带链接（如官网/邮箱）时，生成结束后显示可点击的来源链接
          const showLink = m.role === 'assistant' && m.url && isDone;
          return (
            <div key={i} className={`msg ${m.role}`} role="listitem">
              {m.role === 'assistant' && !isDone && m.content.length === 0 ? (
                // 尚未收到首字：显示三点"打字中"指示
                <span className="typing" aria-label="Assistant is typing">
                  <span className="dot" />
                  <span className="dot" style={{ animationDelay: '0.2s' }} />
                  <span className="dot" style={{ animationDelay: '0.4s' }} />
                </span>
              ) : isTyping ? (
                // 流式生成中：原始文本 + 闪烁光标
                <>
                  {m.content}
                  <span className="cursor-blink" aria-hidden="true" />
                </>
              ) : (
                // 已完成：linkify 渲染链接
                linkify(m.content, `m${i}`)
              )}
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
