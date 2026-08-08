import { defineConfig } from 'vitest/config';

// vitest 单元测试配置：测试纯逻辑模块（lib/api.ts、lib/linkify.ts）。
// 运行环境用 node（不渲染 DOM），全局 fetch 由单测内 mock。
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx'],
    environment: 'node',
  },
});
