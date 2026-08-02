// 首页：组合 Hero 头部与聊天组件
import Hero from '@/components/Hero';
import ChatWidget from '@/components/ChatWidget';
import { ORG_NAME, REPO_URL, REPO_LABEL } from '@/lib/config';

export default function Home() {
  return (
    <main className="page">
      {/* 顶部品牌介绍区（逐字标题 + 打字机标语） */}
      <Hero />
      {/* 聊天卡片：延迟入场，避免和 Hero 动画重叠 */}
      <div className="chat-wrap fade-in-up" style={{ animationDelay: '0.6s' }}>
        <ChatWidget />
      </div>
      <footer className="footer">
        Built for {ORG_NAME}
        {REPO_URL && (
          <>
            {' \u00b7 '}
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              {REPO_LABEL}
            </a>
          </>
        )}
      </footer>
    </main>
  );
}
