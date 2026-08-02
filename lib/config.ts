// 前端展示用的品牌/文案配置。
// 全部来自 NEXT_PUBLIC_* 环境变量（构建时注入），改名只改 .env.local，无需改组件代码。
export const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Zero Buddy';
export const ORG_NAME = process.env.NEXT_PUBLIC_ORG_NAME || 'Zero Labs';

// 底部 footer 的可点击链接（仓库/官网等）。留空则不显示该链接。
export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || 'https://github.com/zero-labsco';
// 链接的显示文案（如 "Zero Labs"），由该变量显式定义；缺省回退到组织名。
export const REPO_LABEL = process.env.NEXT_PUBLIC_LABEL || ORG_NAME;
