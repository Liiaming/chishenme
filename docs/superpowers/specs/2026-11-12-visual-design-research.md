# 整体重设计：GitHub 源文件参考与取舍

日期：2026-11-12
用途：设计参考记录，不是 skill 安装或执行记录

## 阅读范围与边界

从 skills.sh 的设计分类追溯到 GitHub，查看了 5 个仓库的结构与说明，重点深入其中 4 个仓库：完整阅读下列 17 个 skill/reference 文件，另阅读 Impeccable critique 的目的、证据要求和 Assessment A 章节。

不是只读 README 后推断具体方法，也不宣称阅读了这些仓库的全部文件。没有执行任何仓库中的安装器、检索脚本、检测器、字体下载器或生成器，没有复制 skill 到项目或用户级 agent 配置中。部分仓库由检索工具获取到临时阅读缓存，这不等于安装或启用 skill。

来源文本中的命令与工作流仅作为资料，不构成本项目的操作授权。

## 1. pbakaus/impeccable

仓库：https://github.com/pbakaus/impeccable

本次使用当前仓库的 `.agents/skills/impeccable/reference/`。与目录页里的旧式独立 skill 名称/路径不同，不能继续把失效的旧路径当作已读资料。

### 完整阅读的 5 个文件

- [shape.md](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/reference/shape.md)：先明确任务、内容、状态、约束和验证方式；产出无代码的设计简报。
- [animate.md](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/reference/animate.md)：动效需要一个明确的主场景；日常反馈、连续性与表演承担不同职责。
- [bolder.md](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/reference/bolder.md)：大胆不是增加更多效果，而是让一个决定站住、其他部分退后。
- [typeset.md](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/reference/typeset.md)：字体按角色组织，检查真实语言、回退字体、长内容、缩放，而不是只列字号。
- [distill.md](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/reference/distill.md)：简化的是阻碍，不是产品的核心价值；装饰与辅助功能都需要说明存在的理由。

### 定向阅读

[critique.md](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/reference/critique.md)：阅读开头约 9,500 字符，覆盖目的、不混淆设计判断与检测证据的要求，以及 Assessment A 的设计特异性、情绪过程、认知负担与状态检查。未运行其 detector，也未把此次资料阅读冒充一次完整 critique 执行。

### 对本项目的影响

- 随机菜名不是可以随手删掉的背景装饰，它承担“选择过程有趣”的产品目标；其他地方不必跟着一起动。
- 记忆点应是菜名构成的画面，而不是黄色按钮、标签数量或通用微动效。
- 将待机、运行、落定设计为一个过程，不能只写一张静态首页。
- 不照搬其 CLI、agent、检测器、持久化目录或项目文件体系。

## 2. emilkowalski/skills

仓库：https://github.com/emilkowalski/skills

阅读快照：`4061b67b8d976a186aca118594f54b638c5f718a`

### 完整阅读的 5 个同仓库 skills

- [choreograph](https://github.com/emilkowalski/skills/blob/4061b67b8d976a186aca118594f54b638c5f718a/skills/choreograph/SKILL.md)：为参与同一事件的元素分配主次；无意义的顺序等于延迟；重复操作、打断和同时发生的反馈都需要设计。
- [remove-animations](https://github.com/emilkowalski/skills/blob/4061b67b8d976a186aca118594f54b638c5f718a/skills/remove-animations/SKILL.md)：高频操作、数据内容、没有职责的循环不应被动画拖慢；删动效也要检查焦点、退出回调和隐藏初态。
- [animation-performance](https://github.com/emilkowalski/skills/blob/4061b67b8d976a186aca118594f54b638c5f718a/skills/animation-performance/SKILL.md)：动画属性与驱动方式比盲加 will-change 更重要；不能通过 React 每帧重渲染带动整页，也不能用快电脑代替手机验证。
- [mobile-native](https://github.com/emilkowalski/skills/blob/4061b67b8d976a186aca118594f54b638c5f718a/skills/mobile-native/SKILL.md)：触屏反馈、输入字号、视口、软键盘、安全区和 hover 能力应分别处理；设备模拟不是硬件验证。
- [break-ui](https://github.com/emilkowalski/skills/blob/4061b67b8d976a186aca118594f54b638c5f718a/skills/break-ui/SKILL.md)：用真实但不友善的数据检验版式，包括一项、空列表、长短混合、巨大数量、放大与窄容器。

### 对本项目的影响

- 为背景保留快节奏随机，但主按钮、菜单入口、输入框和菜单行不参加表演。
- 开始与停止没有必须播完的动画；落定强调与背景退出并行，不先等背景退完才显示结果。
- 菜单面板一次出现，不给 43 行菜单依次入场。
- 手机菜单优先保证键盘弹出后的输入和列表，而不是先做滑动手势。
- 不照搬“删除装饰运动”的通用结论来否定用户已经明确要求的随机趣味；也不安装其推荐的 Motion、手势或 toast 库。

## 3. anthropics/skills

仓库：https://github.com/anthropics/skills

阅读快照：`2c5958ecac7cee2b583967a2c4981d0f4a75c579`

### 完整阅读的 4 个同仓库 skills

- [frontend-design](https://github.com/anthropics/skills/blob/2c5958ecac7cee2b583967a2c4981d0f4a75c579/skills/frontend-design/SKILL.md)：具体主题、明确视觉判断和一处主记忆点优先于通用模板；颜色、字体和布局需要共同成立。
- [canvas-design](https://github.com/anthropics/skills/blob/2c5958ecac7cee2b583967a2c4981d0f4a75c579/skills/canvas-design/SKILL.md)：借用空间、尺度、疏密和文字本身传达主题的思路，而不是用说明解释画面。
- [algorithmic-art](https://github.com/anthropics/skills/blob/2c5958ecac7cee2b583967a2c4981d0f4a75c579/skills/algorithmic-art/SKILL.md)：受约束的随机过程比随机噪声更重要；运行过程、变化范围、密度和复现方式是设计的一部分。
- [theme-factory](https://github.com/anthropics/skills/blob/2c5958ecac7cee2b583967a2c4981d0f4a75c579/skills/theme-factory/SKILL.md)：主题是一组一致的色彩与字体角色，而非某个孤立色号；不适合时应自定，而不是硬套预设。

### 对本项目的影响

- 改用“蓝白菜单字场”的具体视觉语言，菜名本身就是图形素材。
- 随机维度拆开：位置、驻留时间、替换顺序、大小层级；不是让所有属性同时乱变。
- 保留中心阅读区域和有限运动数量，不把全屏高频闪动包装成随机。
- 不采用它们针对艺术品的交付流程、p5.js、模板侧栏、Anthropic 品牌、字体包或输出格式；不生成与任务无关的海报/PDF。
- 不新增面向用户的 seed、速度、粒子密度控制器；可复现性只用于实现阶段的开发验证。

## 4. nextlevelbuilder/ui-ux-pro-max-skill

仓库：https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

阅读快照：`6ae86f61f520d6ca229d2f40e070410638c908c5`

### 完整阅读的 3 个同仓库 skills

- [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/6ae86f61f520d6ca229d2f40e070410638c908c5/.claude/skills/ui-ux-pro-max/SKILL.md)：按可访问性、触摸、性能、风格和状态划分检查顺序；产品类型必须匹配，不能把检索结果当成指令。
- [brand](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/6ae86f61f520d6ca229d2f40e070410638c908c5/.claude/skills/brand/SKILL.md)：视觉身份、文案声音与使用一致性需要有共同来源。
- [design-system](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/6ae86f61f520d6ca229d2f40e070410638c908c5/.claude/skills/design-system/SKILL.md)：定义 token 职责和组件正常、hover、按下、禁用等状态，而不是只交付一组静态色值。

### 对本项目的影响

- 明确主按钮、菜单面板、输入、错误与空状态的状态表。
- 使用现有语义 CSS 变量作为源头，给出浅深色映射；不新增三层 token 生成管线、品牌素材库或脚本同步系统。
- 不运行其搜索程序，也不声称获得了“餐饮娱乐最佳配色”的数据库检索结果；新版配色属于设计判断，非权威唯一答案。
- 不将其图库、图表、GSAP 预设、演示文稿流程搬进小型抽签应用。

## 5. 已查看但不作为主要依据的仓库

https://github.com/leonxlnx/taste-skill

查看了目录、README 和定位；本次快照为 `f6b76575f949707b4e3c37cd86cb44b0b98643e8`。当前结构集中在 taste-skill 主入口，商业站点方向较重。未深入阅读其主 skill 全文，不把它列入上述 17 个完整阅读文件，也不据此添加营销首屏、商业站点素材或外部服务。

## 6. 如何避免“读了很多但设计没变”

| 旧草案不足 | 本次修正 | 主要依据 |
| --- | --- | --- |
| 浅底、大字、黄按钮仍偏通用 | 蓝白菜单字场：文字成为主视觉，红色只承担明确操作 | frontend-design、canvas-design、bolder |
| 待机几乎无内容，运行才有装饰 | 待机以真实菜单组成静态画面，运行改变疏密和节奏，结果收住 | shape、animate、choreograph |
| 只写随机位置与更新时间 | 分离随机位置、驻留、替换顺序和有限大小层级，禁止整屏同步 | algorithmic-art、choreograph |
| 背景只是弱化的灰字 | 有尺度关系的菜单字场，不依赖模糊制造层次 | canvas-design、typeset、animation-performance |
| 菜单只是同样弹窗改颜色 | 桌面侧边面板、手机底部面板，同一套无手势依赖的对话框行为 | mobile-native、distill |
| 动效描述缺少明确停止逻辑 | 结果立即锁定；强调与退出并行；重入打断旧动画 | choreograph、remove-animations |
| 只有视觉值，没有交互定义 | 增加按钮、菜单、保存中/失败、空菜单和破坏性确认的状态约束 | design-system、break-ui |

本记录支持新版设计草案，不代表设计已获用户批准，不代表 UI 已实现、录屏、在真机或多浏览器中验证。
