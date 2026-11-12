# 参与贡献

修复问题、补充常见餐食、改进交互和完善文档都欢迎。提交前，请先搜索已有 [Issues](https://github.com/Liiaming/chishenme/issues) 和 [PR](https://github.com/Liiaming/chishenme/pulls)，避免重复工作。

## 反馈问题或建议

通过 [Issue 模板](https://github.com/Liiaming/chishenme/issues/new/choose) 提交，说明操作步骤、期望结果和实际结果；界面问题尽量附截图、浏览器版本和屏幕尺寸。不要附带隐私数据。

功能建议请先说明遇到的问题。较大的改动，先开 Issue 讨论范围，再开始实现。安全漏洞请使用 [私密报告入口](SECURITY.md)。

## 提交修改

1. Fork 仓库，从 `master` 创建你的工作分支。
2. 按 [开发指南](docs/development.md) 安装依赖，小范围完成一件事。
3. 运行下列检查；涉及交互、存储或构建时，再运行浏览器测试。
4. 向 `master` 提交 PR，说明改了什么、为什么改、如何验证；UI 改动附前后截图。

```bash
npm run lint
npm run typecheck
npm test
npm run build

# 首次运行需要安装测试浏览器
npx playwright install chromium
npm run test:e2e
```

提交信息采用 Conventional Commits，中文或英文都可以，例如 `fix(menu): 修复空菜单提示`、`docs: 补充部署说明`。

## 项目约定

- 保持纯前端、纯静态部署；新增后端、账号或统计服务前先讨论。
- 尊重用户保存的菜单，注意跨标签页、存储失败和空菜单等情况。
- UI 改动同时考虑手机、键盘、焦点和减少动态效果；新增测试验证实际行为。
- 使用 npm 和现有 `package-lock.json`。仅在修改依赖时更新锁文件，不顺带升级无关依赖。
- 新代码遵循相邻代码的写法；对事不对人，尊重不同经验的贡献者。

贡献代码时，请确认你有权提交，并同意按项目的 [WTFPL 2.0](LICENSE) 分发。引入第三方代码时保留它要求的许可和署名。
