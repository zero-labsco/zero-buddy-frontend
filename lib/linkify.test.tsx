import { describe, expect, it } from 'vitest';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { linkify } from './linkify';

// 把 linkify 返回的 ReactNode 数组渲染成 HTML 字符串便于断言。
// 用 createElement(Fragment) 包裹，避免在测试文件里写 JSX（tsconfig 是 preserve）。
function render(text: string, keyPrefix = 'k'): string {
  return renderToStaticMarkup(
    createElement(Fragment, null, linkify(text, keyPrefix)),
  );
}

describe('linkify', () => {
  it('纯文本不产生链接', () => {
    const html = render('hello world');
    expect(html).toBe('<span>hello world</span>');
  });

  it('http 链接渲染为可点击 a（新窗口打开）', () => {
    const html = render('visit https://zerolabsco.com now');
    expect(html).toContain(
      '<a class="msg-inline-link link-underline" href="https://zerolabsco.com" target="_blank" rel="noopener noreferrer">https://zerolabsco.com</a>',
    );
  });

  it('mailto 链接渲染为可点击 a（非新窗口）', () => {
    const html = render('mail me at mailto:support@zerolabsco.com');
    expect(html).toContain('href="mailto:support@zerolabsco.com"');
    expect(html).not.toContain('target="_blank"');
    // 显示文本不带 mailto: 前缀
    expect(html).toContain('>support@zerolabsco.com</a>');
  });

  it('裸邮箱被识别为 mailto 链接', () => {
    const html = render('contact support@zerolabsco.com thanks');
    expect(html).toContain('href="mailto:support@zerolabsco.com"');
  });

  it('链接尾部标点被剥离并还原为普通文本', () => {
    const html = render('see https://zerolabsco.com.');
    // 链接本体不带句点
    expect(html).toContain('href="https://zerolabsco.com"');
    // 句点作为普通文本紧随其后
    expect(html).toContain('<span>.</span>');
  });

  it('中文紧跟 URL 不会被整段误判为链接', () => {
    const html = render('打开 https://zerolabsco.com 查看详情');
    expect(html).toContain('href="https://zerolabsco.com"');
    expect(html).toContain('查看详情');
    expect(html).toContain('打开');
  });

  it('多个链接各自独立渲染', () => {
    const html = render('a https://x.com b https://y.com c');
    const hrefs = (html.match(/href="([^"]+)"/g) ?? []).map((h) =>
      h.slice(6, -1),
    );
    expect(hrefs).toEqual(['https://x.com', 'https://y.com']);
  });

  it('空文本返回空数组（无输出）', () => {
    expect(render('')).toBe('');
  });
});
