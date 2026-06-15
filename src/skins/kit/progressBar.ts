import { Container, Graphics } from 'pixi.js';

/**
 * 平台 SDK · 像素进度条（成熟度）。皮肤把它放在单位头顶，
 * 由皮肤的 setProgress(p) 喂值（引擎只告诉皮肤"当前进度"，皮肤决定怎么画）。
 */
export interface ProgressBar {
  view: Container;
  set: (p: number) => void;
}

export function makeProgressBar(
  width: number,
  fill = 0xffd24a,
  highlight = 0xfff1b8,
): ProgressBar {
  const h = Math.max(5, Math.round(width * 0.12));
  const b = Math.max(2, Math.round(width * 0.03));
  const view = new Container();

  const track = new Graphics();
  track.roundRect(-width / 2 - b, -h / 2 - b, width + b * 2, h + b * 2, 2).fill(0x4a3526);
  track.rect(-width / 2, -h / 2, width, h).fill(0x2f2316);
  view.addChild(track);

  const bar = new Graphics();
  bar.rect(0, -h / 2, width, h).fill(fill);
  bar.rect(0, -h / 2, width, Math.max(1, Math.round(h * 0.4))).fill(highlight);
  bar.x = -width / 2; // 从左边缘开始填充
  view.addChild(bar);

  const set = (p: number) => {
    bar.scale.x = Math.max(0, Math.min(1, p));
  };
  set(0);
  return { view, set };
}
