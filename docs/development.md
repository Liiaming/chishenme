# 开发指南

## 环境与命令

需要 Node.js 24.x、npm 11。具体依赖版本以 `package.json` 和 `package-lock.json` 为准。

```bash
npm ci
npm run dev
```

开发服务器默认位于 [localhost:3000](http://localhost:3000)。不需要环境变量、数据库或外部 API。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建静态站点到 `out/` |
| `npm start` | 预览 `out/`，不是 Next.js 生产服务 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | 生成 Next.js 类型并执行 TypeScript 检查 |
| `npm test` | 菜单数据相关单元测试 |
| `npm run test:e2e` | 先构建，再执行 Playwright 浏览器测试 |

## 目录结构

```text
app/                  页面入口、全局样式、元数据和 favicon
components/           抽签、菜单预览与编辑窗口
  ui/                 项目内维护的 shadcn/ui 组件
lib/                  菜单数据、浏览器存储与工具函数
public/               静态资源
tests/                单元测试与浏览器测试
docs/                 当前开发与部署说明
  images/             README 截图
.github/              CI 和贡献模板
```

## 实现约定

页面使用 Next.js App Router，配置 `output: "export"`。业务交互在客户端完成，布局保留站点元数据；不使用 API 路由、Server Actions 或数据库。

`lib/foods.ts` 维护默认菜单、规范化与随机选择。预览纸张最多展示 6 道菜，抽签使用完整菜单。`components/ui/` 是仓库内的组件源码，修改时同时检查项目样式和实际调用。

`lib/food-store.ts` 通过 `useSyncExternalStore` 提供菜单快照，用 `foods` 键保存 JSON 菜名数组。Web Locks 串行处理跨标签页的读取、修改、写入，`storage` 事件同步其他标签页。保存成功后才发布新菜单；保存失败保留旧值和用户输入。不要在 UI 组件中另建一套菜单存储。

选餐时右侧菜单保持静止。页面隐藏时暂停候选更新，打开编辑窗口停止抽签；关闭窗口不自动开始。界面改动需要保留键盘操作、焦点管理和减少动态效果支持。

## 验证

```bash
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
```

浏览器测试在 `127.0.0.1:4173` 启动独立静态服务器，请保持该端口空闲。测试覆盖桌面 Chromium 和 Pixel 7 移动视口，包括抽签、持久化、异常恢复、多标签页并发、菜单编辑、焦点和部分布局检查。移动视口模拟不等于真机、软键盘、Safari、Firefox 或屏幕阅读器验证。

[CI](../.github/workflows/ci.yml) 在推送到 `master`、提交 PR 和手动触发时执行 lint、类型检查、单元测试、静态构建及浏览器测试。CI 明确使用已验证的 Webpack 构建路径；在本地复现 CI 构建和浏览器测试可运行：

```bash
npm run build -- --webpack
npx playwright test
```

CI 中的官方 Actions 固定到提交 SHA。浏览器测试失败时保留 `test-results/` 供排查。工作流本身不部署站点，也不自动合并 PR。

## 依赖维护

使用 npm 锁文件，不混用其他包管理器。当前 TypeScript 和 ESLint 主版本受配套工具的 peer dependencies 约束；升级时检查实际兼容范围并跑完整验证，不只修改版本号。

`package.json` 中两处 `overrides` 用于 `serve` 的 `compression` 和 TypeScript ESLint 解析器的 `minimatch`。它们是已有的兼容与安全修复约束；未来上游采用相应修复后，再验证是否可以移除。可用 `npm audit` 检查当前报告，不要未经评估运行强制修复。
