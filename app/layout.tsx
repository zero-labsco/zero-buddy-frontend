// 根布局：加载三款官网同款字体，并注入全局背景图层
import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// 三款 Google 字体：正文 Inter、标题 Space Grotesk、等宽 JetBrains Mono
// 通过 CSS 变量注入，供 globals.css 与各组件使用
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

// 页面元信息（标题/描述）
export const metadata: Metadata = {
  title: 'Zero Buddy — Zero Labs AI Assistant',
  description:
    'An AI assistant for Zero Labs open-source projects: Zero Inspector Kit, Flutter Agent Kit, WizardPlayer and Invoice Zero.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // 默认深色主题，并把三款字体变量挂到根节点
      className={`dark ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* 三层背景纹理：噪点 / 网格 / 顶部光晕 */}
        <div className="bg-grain" />
        <div className="bg-grid" />
        <div className="bg-glow" />
        {children}
      </body>
    </html>
  );
}
