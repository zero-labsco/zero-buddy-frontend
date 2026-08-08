// 把正文中的裸链接（http/https、mailto、裸邮箱）渲染为可点击 <a>，
// 避免网址以纯文本堆叠、与来源链接块视觉粘连。仅用于打字结束后的静态渲染。
// 匹配完整链接（保留点号，正确覆盖域名）；遇空白或 CJK/全角字符即止，
// 避免中文紧跟 URL 后整段被误判为链接。尾部标点由 linkify 剥离归还文本。
//
// 注意：此文件用 createElement 而非 JSX，便于 vitest/tsc/Next 三者在 .ts 上
// 无歧义编译（项目 tsconfig 的 jsx 是 "preserve"，且 JSX 仅允许出现在 .tsx）。
import { createElement, type ReactNode } from 'react';

const URL_RE =
  /(https?:\/\/[^\s　-鿿]+|mailto:[^\s　-鿿]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
// 链接尾部可能出现的句读/标点，需从链接中剥离、作为普通文本显示
const TRAILING_PUNCT = /[，。、；：！？.,;:!?)\]}'"]+$/;

// 判断一段文本是否是「链接」（作为 <a> 的 href 源）
function isUrlSegment(part: string): boolean {
  return /^(https?:\/\/|mailto:)|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
    part,
  );
}

function linkify(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(URL_RE);
  const out: ReactNode[] = [];
  parts.forEach((part, idx) => {
    if (!part) return;
    if (!isUrlSegment(part)) {
      out.push(createElement('span', { key: `${keyPrefix}-${idx}` }, part));
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
      createElement(
        'a',
        {
          key: `${keyPrefix}-${idx}`,
          className: 'msg-inline-link link-underline',
          href,
          ...(core.startsWith('http')
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {}),
        },
        core.replace('mailto:', ''),
      ),
    );
    if (punct) {
      out.push(createElement('span', { key: `${keyPrefix}-p-${idx}` }, punct));
    }
  });
  return out;
}

export { linkify, URL_RE, TRAILING_PUNCT };
