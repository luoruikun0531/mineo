import type { Texture } from 'pixi.js';
import {
  buildFarmerStates,
  buildGroundTexture,
  buildLazyFrames,
  buildSackTexture,
  buildWheatFrames,
} from '../kit';
import { buildCrateTexture, buildFruitTreeFrames, buildGrassTexture } from '../assets/orchard/sprites';

/**
 * 构建期/开发期工具：把现有"程序化皮肤"的贴图渲染成 PNG（dataURL）。
 *
 * 用途：把老皮肤一次性导出为 PNG 素材，重组成图片皮肤包（manifest + PNG）。
 * 之后老皮肤即作为图片皮肤的「范例」存在，不再在运行时跑 canvas 手绘代码。
 *
 * 原理：kit 的 makePixelTexture 内部是 `Texture.from(canvas)`，
 * 故 `texture.source.resource` 即那张逻辑像素 canvas，直接 toDataURL 即得源 PNG。
 */
function pngOf(tex: Texture): string {
  const canvas = tex.source.resource as HTMLCanvasElement;
  return canvas.toDataURL('image/png');
}

/** orchard（果园）：导出所有帧 → {帧名: dataURL}。帧名与 orchard 皮肤包 manifest 对应。 */
export function exportOrchard(): Record<string, string> {
  const out: Record<string, string> = {};

  out.grass = pngOf(buildGrassTexture());
  out.crate = pngOf(buildCrateTexture(0xe2502f));

  const FRUIT = [0xe2502f, 0xf0902f, 0xe2502f];
  FRUIT.forEach((f, i) => {
    buildFruitTreeFrames(f).forEach((t, k) => {
      out[`tree${i}_${k}`] = pngOf(t);
    });
  });

  const SHIRTS = [0x4f8d5b, 0xc8553d];
  SHIRTS.forEach((s, i) => {
    const st = buildFarmerStates(s);
    st.idle.forEach((t, k) => {
      out[`picker${i}_idle_${k}`] = pngOf(t);
    });
    st.harvest.forEach((t, k) => {
      out[`picker${i}_harvest_${k}`] = pngOf(t);
    });
  });

  const LAZY = 0xcf9b3e;
  buildLazyFrames(LAZY).forEach((t, k) => {
    out[`lazy_sit_${k}`] = pngOf(t);
  });
  const lazyWork = buildFarmerStates(LAZY);
  lazyWork.idle.forEach((t, k) => {
    out[`lazy_work_${k}`] = pngOf(t);
  });
  lazyWork.harvest.forEach((t, k) => {
    out[`lazy_harvest_${k}`] = pngOf(t);
  });

  return out;
}

/** wheat-farm（麦田场）：耕地 + 一排麦子 + 锄地工 + 偷懒者 + 粮袋。 */
export function exportWheat(): Record<string, string> {
  const out: Record<string, string> = {};

  out.ground = pngOf(buildGroundTexture());
  out.sack = pngOf(buildSackTexture());
  buildWheatFrames().forEach((t, k) => {
    out[`wheat_${k}`] = pngOf(t);
  });

  const hoe = buildFarmerStates(0xc8553d);
  hoe.idle.forEach((t, k) => {
    out[`hoe_idle_${k}`] = pngOf(t);
  });
  hoe.harvest.forEach((t, k) => {
    out[`hoe_harvest_${k}`] = pngOf(t);
  });

  const LAZY = 0xcf9b3e;
  buildLazyFrames(LAZY).forEach((t, k) => {
    out[`lazy_sit_${k}`] = pngOf(t);
  });
  const lazyWork = buildFarmerStates(LAZY);
  lazyWork.idle.forEach((t, k) => {
    out[`lazy_work_${k}`] = pngOf(t);
  });
  lazyWork.harvest.forEach((t, k) => {
    out[`lazy_harvest_${k}`] = pngOf(t);
  });

  return out;
}
