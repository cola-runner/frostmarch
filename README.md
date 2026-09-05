<div align="center">

<img src="public/favicon.svg" width="76" alt="Frostmarch snowflake emblem" />

# FROSTMARCH · 霜境远征

**寒冬已至。王国，由你守护。**

An original, mobile-first 3D fantasy RTS. A playable northern-frontier skirmish, built for the browser.

[![MIT License](https://img.shields.io/badge/license-MIT-d8bd89?style=flat-square)](LICENSE)
[![CI](https://github.com/cola-runner/frostmarch/actions/workflows/ci.yml/badge.svg)](https://github.com/cola-runner/frostmarch/actions/workflows/ci.yml)

</div>

## 这是什么

《霜境远征》是受经典奇幻 RTS 启发的原创开源 demo。指挥霜誓守卫艾拉与北境军团，采集资源、训练士兵、建造箭塔，越过冰河摧毁寒霜要塞。

采用 **Three.js + TypeScript + React + PWA**，以手机浏览器为主要入口。所有战斗都在本机运行，无账号、无后端、无付费服务。

**这不是《魔兽争霸 III：冰封王座》的移植版。** 不包含 Blizzard 的代码、地图、角色、美术或音频，也不运行 Warcraft 的原版战役文件。原创角色、场景和玩法旨在呈现经典 RTS 的操作感。

## 试玩

[打开已部署的试玩版](https://frostmarch-cola.black-egret-5400.chatgpt.site) — Sites 试玩入口当前仅项目所有者可访问；开源源码公开，任何人都可本地运行或自行托管静态产物。

- 手机横屏更适合观察战场，竖屏也有独立布局。
- 支持 WebGL 2 的现代浏览器；建议开启硬件加速。
- 浏览器菜单 → 添加到主屏幕，可按 PWA 启动。资源完成缓存后可离线重开战役。
- 当前是单人 demo，没有联机、账号、战役存档或已打包的 APK / IPA。

## Touch Edition · 手机适配

- 主要触控按钮至少 44px，指令集中在拇指附近；地图可收起，横竖屏分别布局。
- 按屏幕像素计算单位点击容错，缩放不会缩小有效选取面积；拖动、双指缩放和点击独立识别。
- 暴风雪与箭塔先展示世界坐标范围，再确认提交；无效位置会显示原因。预览和取消均不消耗资源。
- 打开营地、操作指南或瞄准时进入战术暂停；营地允许排队招募，返回战场后继续训练和战斗。
- 镜头中心避开底部操作区，触屏设备使用较低的像素倍率、阴影分辨率和落雪数量。

Web 原版保留在 [v0.1.0](https://github.com/cola-runner/frostmarch/releases/tag/v0.1.0)。本轮手游适配仍是浏览器游戏，并非 APK / IPA 原生安装包。

## 已实现

- 可平移、缩放、旋转的 3D 冰雪沙盘；雪松森林、矿洞、堡垒、冰河与桥梁。
- 实时战斗、单位自动索敌、编队移动、单位分离与建筑避让。
- 英雄、卫兵、远程射手、工人及敌方突袭者。
- 工人往返采矿伐木、资源消耗、训练队列、人口上限。
- 箭塔放置校验、建造时间和自动防御。
- **凛冬之环**：英雄周围伤害与减速；**暴风雪**：定点持续范围伤害。
- 敌军分波推进，双方要塞生命，英雄保护目标，胜败结算与重新开始。
- 小地图、触屏指挥、双指缩放、键盘快捷键、暂停、合成音效。
- PWA manifest、同源静态资源缓存，以及可选的 WebMCP 指挥接口。

## 操作

| 操作                | 手机 / 鼠标            | 键盘    |
| ------------------- | ---------------------- | ------- |
| 选择英雄            | 点英雄或“英雄”         | `1`     |
| 选择军队            | 点“全军”               | `A`     |
| 移动 / 自动交战     | 选中单位后点地面       | —       |
| 平移 / 缩放         | 拖动 / 双指或滚轮      | —       |
| 旋转                | 右侧旋转按钮           | —       |
| 凛冬之环            | 点击技能按钮           | `Q`     |
| 暴风雪              | 点击技能，再点目标位置 | `W`     |
| 招募卫兵            | 底部招募按钮           | `R`     |
| 工人、射手、箭塔    | 打开“营地与招募”       | —       |
| 暂停 / 继续         | 顶部暂停按钮           | `Space` |
| 取消施法 / 关闭面板 | 取消或关闭按钮         | `Esc`   |

工人默认自动采集。法力自动恢复；英雄脱离附近敌军后缓慢回复生命。战役目标是摧毁敌方要塞，同时保住英雄和己方要塞。

## 本地启动

需要 Node.js **22.18+**（推荐 Node 24）和 npm。

```bash
git clone https://github.com/cola-runner/frostmarch.git
cd frostmarch
npm ci
npm run dev
```

访问终端显示的地址。手机连接同一 Wi-Fi 后，访问终端显示的局域网地址。

```bash
npm run typecheck
npm test
npm run build
```

`npm run build` 导出纯静态网站至 **`dist/client/`**。可使用任意 HTTPS 静态托管服务部署该目录。当前路由和资源路径面向站点根目录；部署到子目录时需要相应配置 base path。开发模式不注册 Service Worker。

如果 macOS 的系统 libvips / Homebrew 检查卡住，可使用 sharp 官方支持的环境变量：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci
```

## 为什么选这个平台

这是为“小而惊艳、立即在手机试玩”的目标做的选择：

- [Three.js](https://threejs.org/manual/en/fundamentals.html)：直接渲染真正可交互的 3D 战场，几何与材质完全可控。
- [响应式 WebGL](https://threejs.org/manual/en/responsive.html)：适配不同画幅，并限制像素倍率、复用几何和实例化森林。
- **PWA**：免下载安装包，方便以链接交付 demo。
- [Capacitor](https://capacitorjs.com/docs)：后续需要原生安装包时可以封装现有 Web 应用；本仓库暂未配置原生工程，也未验证原生打包。

若扩展成大量单位、复杂寻路、完整战役或商业级联网 RTS，再评估专门游戏引擎和服务器。当前优先把可玩的最小战役打磨完整。

## 项目结构

```text
app/page.tsx          React 游戏 HUD、触控操作与结果界面
app/globals.css       手机竖屏 / 横屏 / 桌面游戏界面
game/simulation.ts   独立且可测试的战斗与经济规则
game/scene.ts        Three.js 场景、角色、相机、输入和特效
game/audio.ts        原创 Web Audio 合成音效
game/webmcp.ts       渐进增强的结构化读状态 / 指挥接口
tests/               无浏览器依赖的规则与战役验证
public/              英雄图像、图标与 PWA 文件
```

渲染器使用独立规则层；界面每 100ms 接收快照，渲染循环按帧更新。切到后台时停止推进模拟，避免回到游戏时发现战役已结束。场景按需载入；森林使用实例化绘制，像素倍率限制为 1.6，支持减少动态效果偏好。

## 验证范围

已检查 TypeScript、自有源码 lint、静态生产构建，以及 21 项自动化测试（经济、指令、训练、技能、建造、波次、暂停、重开和完整胜利流程）。已在浏览器中检查手机横竖屏、营地暂停、招募和技能确认流程。**尚未做 iOS / Android 真机帧率、离线安装流程或无障碍辅助技术验证。** 不承诺具体设备帧率。

WebMCP 是可选的浏览器提案：浏览器不支持时照常游戏；注册失败不会阻止游戏。已在支持该接口的浏览器中验证读状态、有效指挥、越界拒绝与非活动战役拒绝。

## 贡献与许可

欢迎改进战役平衡、触屏操作、性能、寻路和原创单位。提交前运行 `npm run typecheck && npm run lint && npm test && npm run build`。

代码与本项目原创资源采用 [MIT](LICENSE)。英雄肖像为本项目生成的原创图像；3D 模型在代码中程序化构建；音效实时合成。第三方依赖保留各自许可证，参见 [CREDITS.md](CREDITS.md)。
