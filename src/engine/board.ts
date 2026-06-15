import { Container, Graphics, Text, type TextStyleOptions } from 'pixi.js';
import type { Asset, Settings } from '@/domain/types';
import { productivityRate } from '@/domain/earnings';
import { initHarvest, progress, type HarvestState } from '@/domain/harvest';
import { formatHarvest } from '@/domain/currency';
import {
  assetEventForProgress,
  getAssetSkin,
  type AssetEvent,
  type AssetSkinHandle,
  type SceneHandle,
  type ThemeSkin,
} from '@/skins';
import { cellCenter, type SceneSize } from './layout';

interface LandLayer {
  handle: SceneHandle;
  targetAlpha: number;
}

interface Unit {
  id: string;
  asset: Asset;
  handle: AssetSkinHandle;
  label: Container;
  x: number;
  y: number;
  tx: number;
  ty: number;
  placed: boolean;
  hs: HarvestState;
  lastBand: AssetEvent | null;
}

interface FloatText {
  text: Text;
  life: number;
}

const FADE_SPEED = 4;
const MOVE_SMOOTH = 8;
const FLOAT_DUR = 1.1; // +X 飘字时长（秒）

/**
 * 管理土地层与资产单位层，并驱动每个资产的「收成周期」：
 * 进度推进 → 跨段发 working1/2/3（带动态时长）→ 满则丰收（发 harvest + 弹 +X + 记账）。
 * 主程序只向皮肤发抽象事件；如何表现由皮肤决定。
 */
export class BoardController {
  readonly view = new Container();
  private landLayer = new Container();
  private unitsLayer = new Container();
  private labelLayer = new Container();
  private floatLayer = new Container();

  private lands: LandLayer[] = [];
  private units = new Map<string, Unit>();
  private floats: FloatText[] = [];

  private theme: ThemeSkin | null = null;
  private n = 0;
  private sceneSize: SceneSize = { width: 1, height: 1 };
  private settings: Settings = { currency: 'CNY', language: 'zh', privacyMode: false };
  private onHarvest: (amount: number) => void = () => {};
  private onUnitTap: (id: string) => void = () => {};

  constructor() {
    this.view.addChild(
      this.landLayer,
      this.unitsLayer,
      this.labelLayer,
      this.floatLayer,
    );
  }

  getSceneSize(): SceneSize {
    return this.sceneSize;
  }

  /** 可种植区（格子区）在世界坐标中的中心与尺寸 —— widget 只框这块。 */
  getPlotRect(): { cx: number; cy: number; w: number; h: number } | null {
    const plot = this.lands[this.lands.length - 1]?.handle.plot;
    if (!plot) return null;
    const w = this.n * plot.tileSize;
    const h = this.n * plot.tileSize;
    return {
      cx: plot.x + w / 2 - this.sceneSize.width / 2,
      cy: plot.y + h / 2 - this.sceneSize.height / 2,
      w,
      h,
    };
  }

  setOnUnitTap(cb: (id: string) => void): void {
    this.onUnitTap = cb;
  }

  setOnHarvest(cb: (amount: number) => void): void {
    this.onHarvest = cb;
  }

  /** 设定全局设置（货币/隐私）；变化会改变收益速率 → 重算各单位周期。 */
  setSettings(settings: Settings): void {
    this.settings = settings;
    for (const unit of this.units.values()) {
      unit.hs = initHarvest(this.rateFor(unit.asset));
      unit.lastBand = null;
    }
  }

  private rateFor(asset: Asset): number {
    try {
      return productivityRate(asset, this.settings);
    } catch {
      return 0;
    }
  }

  setGrid(theme: ThemeSkin, n: number): void {
    const themeChanged = this.theme?.id !== theme.id;
    if (!themeChanged && this.n === n) return;

    this.theme = theme;
    this.n = n;

    const land = theme.buildLand({ cols: n, rows: n, tileSize: theme.tileSize });
    land.view.alpha = this.lands.length === 0 ? 1 : 0;
    const size = land.size ?? { width: land.view.width, height: land.view.height };
    land.view.position.set(-size.width / 2, -size.height / 2);
    this.sceneSize = size;

    for (const l of this.lands) l.targetAlpha = 0;
    this.lands.push({ handle: land, targetAlpha: 1 });
    this.landLayer.addChild(land.view);
  }

  syncUnits(assets: Asset[]): void {
    const active = this.lands[this.lands.length - 1]?.handle;
    const plot = active?.plot;
    const seen = new Set<string>();

    assets.forEach((asset, index) => {
      seen.add(asset.id);
      let unit = this.units.get(asset.id);

      // 换了皮肤 → 重建单位
      if (unit && unit.asset.iconId !== asset.iconId) {
        this.disposeUnit(unit);
        this.units.delete(asset.id);
        unit = undefined;
      }

      if (!unit) {
        const created = this.createUnit(asset);
        if (!created) return;
        unit = created;
        this.units.set(asset.id, unit);
      } else {
        // 编辑：金额变了重置收成周期；名字变了更新标签
        const r = this.rateFor(asset);
        if (Math.abs(r - unit.hs.r) > 1e-9) {
          unit.hs = initHarvest(r);
          unit.lastBand = null;
        }
        if (unit.asset.name !== asset.name) {
          const tile = this.theme?.tileSize ?? 104;
          const lbl = this.makeNameplate(asset.name, tile);
          lbl.position.set(unit.label.x, unit.label.y);
          lbl.alpha = unit.label.alpha;
          this.labelLayer.addChild(lbl);
          unit.label.destroy({ children: true });
          unit.label = lbl;
        }
        unit.asset = asset;
      }

      if (plot) {
        const c = cellCenter(index, this.n, plot, this.sceneSize);
        unit.tx = c.x;
        unit.ty = c.y;
        if (!unit.placed) {
          unit.x = c.x;
          unit.y = c.y;
          unit.handle.view.position.set(c.x, c.y);
          unit.placed = true;
        }
      }
    });

    for (const [id, unit] of this.units) {
      if (!seen.has(id)) {
        this.disposeUnit(unit);
        this.units.delete(id);
      }
    }
  }

  private createUnit(asset: Asset): Unit | null {
    const skin = getAssetSkin(asset.iconId) ?? getAssetSkin('wheat-farm');
    if (!skin) return null;
    const tile = this.theme?.tileSize ?? 104;
    const handle = skin.build({ tileSize: tile });
    handle.view.alpha = 0;
    this.unitsLayer.addChild(handle.view);

    // 点击单位 → 查看/编辑（主程序只收到 id）
    handle.view.eventMode = 'static';
    handle.view.cursor = 'pointer';
    handle.view.on('pointertap', () => this.onUnitTap(asset.id));

    const label = this.makeNameplate(asset.name, tile);
    label.alpha = 0;
    this.labelLayer.addChild(label);

    return {
      id: asset.id,
      asset,
      handle,
      label,
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      placed: false,
      hs: initHarvest(this.rateFor(asset)),
      lastBand: null,
    };
  }

  private disposeUnit(unit: Unit): void {
    unit.handle.destroy?.();
    unit.label.destroy({ children: true });
  }

  /** 资产名铭牌：深色像素底牌 + 文字，放在格子内小人脚下。 */
  private makeNameplate(text: string, tile: number): Container {
    const style: TextStyleOptions = {
      fontFamily: "'Press Start 2P', ui-monospace, monospace",
      fontSize: Math.max(8, Math.round(tile * 0.095)),
      fill: 0xfff6d8,
      align: 'center',
    };
    const t = new Text({ text, style });
    t.anchor.set(0.5);
    const padX = Math.round(tile * 0.07);
    const padY = Math.round(tile * 0.045);
    const bw = t.width + padX * 2;
    const bh = t.height + padY * 2;
    const bg = new Graphics();
    bg.roundRect(-bw / 2, -bh / 2, bw, bh, Math.max(2, Math.round(tile * 0.03)))
      .fill({ color: 0x4a3526, alpha: 0.82 });
    const c = new Container();
    c.addChild(bg, t);
    return c;
  }

  update(dt: number): void {
    const active = this.lands[this.lands.length - 1];
    active?.handle.update?.(dt);

    const k = Math.min(1, dt * FADE_SPEED);
    this.lands = this.lands.filter((l) => {
      l.handle.view.alpha += (l.targetAlpha - l.handle.view.alpha) * k;
      if (l.targetAlpha === 0 && l.handle.view.alpha < 0.02) {
        l.handle.destroy?.();
        return false;
      }
      return true;
    });

    const mk = Math.min(1, dt * MOVE_SMOOTH);
    for (const unit of this.units.values()) {
      unit.handle.update?.(dt);
      this.tickHarvest(unit, dt);
      unit.x += (unit.tx - unit.x) * mk;
      unit.y += (unit.ty - unit.y) * mk;
      const v = unit.handle.view;
      v.position.set(unit.x, unit.y);
      if (v.alpha < 1) v.alpha = Math.min(1, v.alpha + dt * FADE_SPEED);
      // 进度条（皮肤画，引擎喂值）+ 资产名标签（引擎画）
      unit.handle.setProgress?.(progress(unit.hs));
      const tile = this.theme?.tileSize ?? 104;
      unit.label.position.set(unit.x, unit.y + tile * 0.32);
      unit.label.alpha = v.alpha;
    }

    this.tickFloats(dt);
  }

  /** 推进单个资产的收成周期，发出 4 段事件与丰收。 */
  private tickHarvest(unit: Unit, dt: number): void {
    const hs = unit.hs;
    if (!Number.isFinite(hs.D) || hs.D <= 0) return;
    hs.elapsed += dt;

    // 跨过一个或多个周期 → 丰收
    while (hs.elapsed >= hs.D) {
      hs.elapsed -= hs.D;
      this.onHarvest(hs.X);
      unit.handle.onEvent?.('harvest', Math.min(0.6, hs.D * 0.4));
      this.spawnFloat(unit, hs.X);
      unit.lastBand = null; // 新周期：working1 会重新触发
    }

    // 当前工作阶段（动态时长随周期 D 变化）
    const band = assetEventForProgress(progress(hs)); // working1/2/3
    if (band !== unit.lastBand) {
      const phaseSec = band === 'working3' ? hs.D * 0.5 : hs.D * 0.25;
      unit.handle.onEvent?.(band, phaseSec);
      unit.lastBand = band;
    }
  }

  private spawnFloat(unit: Unit, amount: number): void {
    const tile = this.theme?.tileSize ?? 104;
    const style: TextStyleOptions = {
      fontFamily: "'Press Start 2P', ui-monospace, monospace",
      fontSize: Math.round(tile * 0.16),
      fontWeight: '700',
      fill: 0xfff1b8,
      stroke: { color: 0x6b3f12, width: Math.max(3, tile * 0.03) },
      align: 'center',
    };
    const text = new Text({ text: formatHarvest(amount, this.settings), style });
    text.anchor.set(0.5, 1);
    text.position.set(unit.x, unit.y - tile * 0.5);
    this.floatLayer.addChild(text);
    this.floats.push({ text, life: FLOAT_DUR });
  }

  private tickFloats(dt: number): void {
    const tile = this.theme?.tileSize ?? 104;
    this.floats = this.floats.filter((f) => {
      f.life -= dt;
      if (f.life <= 0) {
        f.text.destroy();
        return false;
      }
      const t = 1 - f.life / FLOAT_DUR; // 0→1
      f.text.y -= tile * 0.5 * dt; // 上飘
      f.text.alpha = Math.min(1, (1 - t) * 1.6);
      const pop = 1 + Math.sin(Math.min(1, t * 3) * Math.PI) * 0.18;
      f.text.scale.set(pop);
      return true;
    });
  }

  destroy(): void {
    for (const unit of this.units.values()) this.disposeUnit(unit);
    for (const l of this.lands) l.handle.destroy?.();
    for (const f of this.floats) f.text.destroy();
    this.units.clear();
    this.lands = [];
    this.floats = [];
    this.view.destroy({ children: true });
  }
}
