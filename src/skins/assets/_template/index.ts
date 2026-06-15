/**
 * 模板：资产皮肤（一个"会生产的小世界"）。复制本文件夹、改 id、按需修改。
 * 规则：只 import `../../types` 与 `../../kit`，绝不 import 其它皮肤文件夹。
 * 以 `_` 开头的文件夹会被加载器忽略，所以本模板不会被注册。
 *
 * 一个资产皮肤文件夹至少包含：
 *   index.ts        默认导出一个 AssetSkin（清单 + build()）
 * 建议把本皮肤私有的部件/美术拆到同文件夹内的其它文件（如 crops.ts、props.ts）。
 *
 * build({ tileSize }) 要点：
 *   - 以 (0,0) 为格子中心绘制，整体大致落在 [-tileSize/2, tileSize/2]。
 *   - 分层：场地 → 产物 → 角色（多个、各有行为，可留一个偷懒的）→ 道具 → 特效。
 *   - 返回 { view, update(dt), onEvent(event), destroy() }。
 *   - update(dt) 推进常驻动画；onEvent('harvest') 在丰收时被主程序调用（主程序只发抽象事件）。
 *   - 与资产类型（现金流/投资）无关——外观不随类型变化。
 */
import { Container, Graphics } from 'pixi.js';
import type { AssetSkin, AssetSkinHandle } from '../../types';
import { makeCharacter, makeProgressBar, type Character } from '../../kit';

const template: AssetSkin = {
  id: 'template-asset', // ← 改成唯一 id（建议与文件夹名一致）
  name: { en: 'Template', zh: '模板' },
  build: ({ tileSize }): AssetSkinHandle => {
    const s = tileSize / 104;
    const view = new Container();

    // 场地
    const ground = new Graphics();
    ground
      .roundRect(-tileSize * 0.4, -tileSize * 0.25, tileSize * 0.8, tileSize * 0.5, 8 * s)
      .fill(0x9c6f43);
    view.addChild(ground);

    // 角色（至少放一个干活的 + 一个偷懒的，制造"小世界"的生气）
    const chars: Character[] = [
      makeCharacter({ kind: 'hoe', scale: s, phase: 0 }),
      makeCharacter({ kind: 'lazy', scale: s, phase: 1.4 }),
    ];
    chars[0].view.position.set(-tileSize * 0.18, tileSize * 0.16);
    chars[1].view.position.set(tileSize * 0.22, tileSize * 0.18);
    for (const c of chars) view.addChild(c.view);

    // 头顶进度条（成熟度）—— 皮肤的一部分，引擎喂 setProgress(p)
    const bar = makeProgressBar(tileSize * 0.6);
    bar.view.position.set(0, -tileSize * 0.42);
    view.addChild(bar.view);

    let elapsed = 0;
    return {
      view,
      setProgress: (p) => bar.set(p),
      update: (dt) => {
        elapsed += dt;
        for (const c of chars) c.update(elapsed);
      },
      onEvent: (event) => {
        if (event !== 'harvest') return;
        for (const c of chars) c.celebrate();
      },
      destroy: () => view.destroy({ children: true }),
    };
  },
};

export default template;
