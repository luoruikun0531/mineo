# Mineo — 设计文档索引

> 把每个人的资产变成一张像素地图上会自己赚钱的可爱小单位，
> 通过"看着自己的产业持续产出"来增强**拥有感 → 安全感 → 幸福感**。

## 一句话定位

一个治愈系的"资产模拟经营"应用：你的工资、投资、房租、退休金……
都变成星露谷风格暖色田园地图上的小单位，持续运作、持续产出、头顶不断冒 `+X`。

## 文档导航

| 文档 | 内容 |
|---|---|
| [01-PRD.md](./01-PRD.md) | 产品愿景、目标用户、MVP 范围、功能需求 |
| [02-DATA-MODEL.md](./02-DATA-MODEL.md) | 数据模型、货币/隐私模式、本地存储 |
| [03-HARVEST-ALGORITHM.md](./03-HARVEST-ALGORITHM.md) | **收成节流算法**（进度条 / `+X` 的核心数学） |
| [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) | 技术架构、Web↔桌面代码复用、渲染层 |
| [05-ART-DIRECTION.md](./05-ART-DIRECTION.md) | 美术方向、动画规范、占位图策略 |
| [06-UX-FLOWS.md](./06-UX-FLOWS.md) | 关键交互流程（添加资产向导、隐私模式、地图） |
| [07-ROADMAP.md](./07-ROADMAP.md) | 里程碑与实现顺序 |
| [08-SKINS.md](./08-SKINS.md) | **皮肤系统**：土地+UI / 资产，可动画可切换可替换 |
| [09-DESKTOP.md](./09-DESKTOP.md) | **桌面组件**：widget 只读模式、同步模型、Tauri 套壳步骤 |

## 已锁定的关键决策

| 维度 | 决定 |
|---|---|
| 平台 | Web 优先 → Mac/Windows 桌面组件（同一套代码） |
| 技术栈 | React + TypeScript + Vite + **PixiJS**（渲染）+ **Tauri**（桌面）+ **IndexedDB** |
| 后端 | MVP 无后端、无账号，数据全本地 |
| 美术风格 | 星露谷 / 牧场物语 暖色田园像素风 |
| 美术来源 | 最终 AI 生成精灵图；MVP 阶段先用手写 SVG/Canvas 占位图跑通 |

## 待用户拍板的开放问题

见各文档中标注 `🟡 OPEN` 的条目，汇总在 [07-ROADMAP.md](./07-ROADMAP.md) 末尾。
