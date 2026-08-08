// Hero 头部：逐字入场标题 + 悬停发光 + 打字机标语（纯前端动画，无依赖）
'use client';

import { useEffect, useState } from 'react';
import { PRODUCT_NAME, ORG_NAME } from '../lib/config';

const TITLE = PRODUCT_NAME; // 大标题文字（来自配置）
const TAGLINE = `Ask me anything about ${ORG_NAME}.`; // 打字机标语

export default function Hero() {
  // 已打出的标语字符数（用于逐字显示）
  const [typed, setTyped] = useState('');

  // 进入页面后延迟启动打字机效果
  useEffect(() => {
    const start = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i += 1;
        setTyped(TAGLINE.slice(0, i));
        if (i >= TAGLINE.length) clearInterval(iv); // 打完停止
      }, 45);
      return () => clearInterval(iv);
    }, 1200);
    return () => clearTimeout(start);
  }, []);

  return (
    <section className="hero hero--compact">
      {/* 顶部等宽小字副标题 */}
      <p className="hero-subtitle fade-in">
        {ORG_NAME.toUpperCase()} &middot; AI ASSISTANT
      </p>

      {/* 大标题：逐字符渲染，带错峰入场与悬停抖动发光 */}
      <h1 className="hero-title">
        {TITLE.split('').map((ch, i) => (
          <span
            key={i}
            className="mouse-hover-char char-in"
            style={{ ['--i' as string]: i } as React.CSSProperties}
          >
            {/* 空格用不换行空格，避免 inline-block 下塌陷成 0 宽（"Zero Buddy" 变 "ZeroBuddy"） */}
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </h1>

      {/* 音标 */}
      <p className="hero-phonetic fade-in" style={{ animationDelay: '0.8s' }}>
        /ˈzɪəroʊ bʌdi/
      </p>

      {/* 打字机标语 + 闪烁光标 */}
      <p className="hero-tagline fade-in" style={{ animationDelay: '1s' }}>
        <span>{typed}</span>
        <span className="cursor-blink" />
      </p>

      {/* 描述文字 */}
      <p className="hero-desc fade-in" style={{ animationDelay: '1.15s' }}>
        An AI assistant grounded in {ORG_NAME}&rsquo; open-source projects
        &mdash; Zero Inspector Kit, Flutter Agent Kit, WizardPlayer, and Invoice
        Zero.
      </p>

      {/* 青绿渐变分隔线 */}
      <div
        className="hero-divider fade-in"
        style={{ animationDelay: '1.3s' }}
      />
    </section>
  );
}
