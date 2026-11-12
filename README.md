# 吃什么

吃什么是一个用来解决「吃什么」这一被人类公认排在人生 N 大难题前列的问题的应用，简单，小巧，能够迅速的帮助人们解决苦恼，消除纠纷。

无数个上班的日子、无数栋写字楼、无数个团队、无数个上班族、无数个工作群、无数个高矮胖瘦各不相同的个体每天都会的问题，「中午吃什么」，从现在起，就要被改变。

灵感来自 [huangyafei/chishenme](https://github.com/huangyafei/chishenme)

## 界面与交互

- 菜单海报：番茄红底、大字结果、淡黄叠放菜单纸与方形主按钮，页面只保留抽签与菜单两部分。常见桌面尺寸一屏容纳；手机、短屏和放大字体允许滚动。左侧负责抽签，右侧“我的菜单”始终静止，前纸最多展示 6 道真实菜品，抽签仍覆盖完整菜单。
- 菜单纸上的“编辑”展开居中的纸张式编辑窗口，可查看和管理完整菜单，数量只在这里显示。支持添加、删除及确认重置；保存成功才清空输入，等待较久时显示保存提示，键盘删除后可继续操作下一道菜。
- 尊重“减少动态效果”偏好，取消过渡并降低候选切换频率；页面隐藏时暂停更新，打开菜单时停止抽签，关闭菜单不会自行重启。

当前设计见 [菜单海报方案](docs/superpowers/specs/2026-11-12-menu-poster-design.md)，此前的技能研究见 [GitHub 参考记录](docs/superpowers/specs/2026-11-12-visual-design-research.md)。

## 开发与构建

需要 Node.js 24.x 和 npm 11；依赖由 `package-lock.json` 锁定，不再使用 pnpm。

```bash
npm ci
npm run dev
```

开发地址：`http://localhost:3000`。

```bash
npm run build
npm start
```

`npm run build` 将应用静态导出到 `out/`；`npm start` 仅启动静态文件预览服务器，不运行 Next.js 生产服务。

### 部署

将 `out/` 的内容部署到任意支持 HTML/CSS/JavaScript 的静态站点服务，构建命令为 `npm run build`，发布目录为 `out`。不需要 Node.js 生产进程、API 路由、Server Actions、数据库或其他后端。

生产站点请使用 HTTPS。菜单只保存在当前站点、当前浏览器的 `localStorage` 中，不会上传；更换域名、协议、端口或浏览器后，菜单不会自动迁移。多标签页通过浏览器 Web Locks 串行保存，并同步菜单变化；普通非 localhost 的 HTTP 地址不支持安全保存时会显示提示，不会冒险覆盖数据。

存储不可读取或菜单数据损坏时，应用仍可使用默认菜单；可通过菜单中的“重置菜单”恢复。保存失败时保留旧菜单和输入，显示错误，不能将内存中的修改误当作已保存。

支持的现代浏览器：Chrome/Edge 111+、Safari 16.4+、Firefox 128+。不支持直接双击 `out/index.html` 通过 `file://` 使用，请通过 HTTP/HTTPS 静态服务打开。

## 验证

```bash
npm run lint
npm run typecheck
npm test
npm audit

# 首次运行浏览器测试时安装 Chromium
npx playwright install chromium
npm run test:e2e
```

浏览器测试会重新构建静态站点，在 `127.0.0.1:4173` 启动临时静态服务器，验证桌面和移动视口中的抽签、菜单持久化、异常恢复、多标签页并发、菜单预览与中断清理、保存等待、面板焦点、长菜名、200% 文字大小、按钮命中及明暗主题下的文字对比度。移动视口模拟不等于真实手机、软键盘或 Safari 验证。

## 升级说明

- Next.js 16、React 19、Tailwind CSS 4；shadcn 组件通过官方 CLI 更新为 React 19/Tailwind 4 实现，保留 Radix 底层；视觉改造采用菜单海报主题。
- 最新 shadcn 使用 `radix-ui` 统一入口和 `cn`，替代旧的独立 Radix 依赖以及 `clsx`/`tailwind-merge` 包装；动画使用 `tw-animate-css`。
- TypeScript 暂用 6.0.x：当前 `typescript-eslint` 不支持 TypeScript 7。ESLint 暂用 9.39.x：配套 `eslint-plugin-react` 尚未声明兼容 ESLint 10。Node.js 类型采用与运行环境一致的 24.x。
- `overrides` 将静态预览工具的 `compression` 提升至修复版本 1.8.2，将 TypeScript ESLint 解析器的 `minimatch` 提升至修复版本 11.0.8。两处都已验证安装、lint 和浏览器测试，待上游直接采用修复版本后可删除。

## 协议

基于 [WTFPL](https://en.wikipedia.org/wiki/WTFPL) 协议开源。
