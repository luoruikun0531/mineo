import { useEffect, useRef, useState } from 'react';
import { Application, Container } from 'pixi.js';
import {
  defaultTheme,
  getTheme,
  initSkins,
  preloadAssetSkins,
  type SceneHandle,
  type ThemeSkin,
} from '@/skins';
import { gridNFor, useGameStore } from '@/state/store';
import { Camera } from './camera';
import { BoardController } from './board';

/**
 * 编排：Pixi 应用 + 相机 + 棋盘控制器。
 * 订阅 store：资产数量 → 格子数 n → 土地重建 + 镜头随 n 拉高；资产增删 → 单位增删/重排。
 */
interface GameCanvasProps {
  onUnitTap?: (id: string) => void;
  /** 桌面 widget：只展示格子区、无全屏背景、不可编辑、不写账本 */
  widget?: boolean;
}

export function GameCanvas({ onUnitTap, widget = false }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onUnitTapRef = useRef(onUnitTap);
  onUnitTapRef.current = onUnitTap;
  const widgetRef = useRef(widget);
  widgetRef.current = widget;
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const boardRef = useRef<BoardController | null>(null);
  const backdropRef = useRef<SceneHandle | null>(null);
  const themeRef = useRef<ThemeSkin | null>(null);
  const rebuildBackdropRef = useRef<() => void>(() => {});
  const nRef = useRef(0);
  const firstBuildRef = useRef(true);
  const [ready, setReady] = useState(false);

  const assets = useGameStore((s) => s.assets);
  const themeId = useGameStore((s) => s.themeId);
  const settings = useGameStore((s) => s.settings);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        background: 0xffd28a,
        resizeTo: host,
        antialias: false,
        roundPixels: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        // 共用 ticker：让皮肤内基于 Pixi ticker 的自播放动画与主循环同步
        sharedTicker: true,
      });
      if (disposed) {
        app.destroy(true);
        return;
      }
      host.appendChild(app.canvas);

      // 皮肤就绪（从本地库加载/注册）+ 预加载资产皮肤纹理，确保 build() 时已就绪
      await initSkins();
      await preloadAssetSkins();
      if (disposed) {
        app.destroy(true);
        return;
      }

      const world = new Container();
      world.label = 'world';
      app.stage.addChild(world);

      const camera = new Camera();
      camera.setViewport(app.screen.width, app.screen.height);
      const board = new BoardController();
      world.addChild(board.view);

      // 全屏皮肤背景（屏幕空间，位于 world 之下）——"整个页面都是皮肤"
      const rebuildBackdrop = () => {
        backdropRef.current?.destroy?.();
        backdropRef.current = null;
        const theme = themeRef.current;
        if (!theme?.buildBackdrop) return;
        const bd = theme.buildBackdrop(app.screen.width, app.screen.height);
        app.stage.addChildAt(bd.view, 0);
        backdropRef.current = bd;
      };
      rebuildBackdropRef.current = rebuildBackdrop;

      app.ticker.add((ticker) => {
        const dt = Math.min(0.1, ticker.deltaMS / 1000);
        backdropRef.current?.update?.(dt);
        board.update(dt);
        camera.update(dt, world);
      });

      const onResize = () => {
        camera.setViewport(app.screen.width, app.screen.height);
        if (widgetRef.current) {
          const r = board.getPlotRect();
          if (r) camera.setFrame(r.cx, r.cy, r.w, r.h);
        } else {
          camera.setTarget(board.getSceneSize(), nRef.current || 2);
          rebuildBackdrop();
        }
      };
      app.renderer.on('resize', onResize);

      appRef.current = app;
      worldRef.current = world;
      cameraRef.current = camera;
      boardRef.current = board;
      setReady(true);
    };

    void init();

    return () => {
      disposed = true;
      backdropRef.current?.destroy?.();
      backdropRef.current = null;
      boardRef.current?.destroy();
      boardRef.current = null;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      worldRef.current = null;
      cameraRef.current = null;
      firstBuildRef.current = true;
      setReady(false);
    };
  }, []);

  // 收成回调（用 getState 取最新 action，避免闭包陈旧）。widget 只读：不写账本、不接编辑。
  useEffect(() => {
    if (!ready || widget) return;
    boardRef.current?.setOnUnitTap((id) => onUnitTapRef.current?.(id));
  }, [ready, widget]);

  // 全局设置变化 → 重算各资产收益速率
  useEffect(() => {
    if (!ready) return;
    boardRef.current?.setSettings(settings);
  }, [settings, ready]);

  // 主题变化 → 设画布底色 + 重建全屏皮肤背景
  useEffect(() => {
    if (!ready) return;
    const theme = getTheme(themeId) ?? defaultTheme();
    themeRef.current = theme;
    if (appRef.current) appRef.current.renderer.background.color = theme.canvasBackground;
    if (!widget) rebuildBackdropRef.current?.(); // widget 无全屏背景
  }, [themeId, ready, widget]);

  // 资产 / 主题变化 → 重建棋盘 + 设定镜头目标
  useEffect(() => {
    if (!ready) return;
    const camera = cameraRef.current;
    const board = boardRef.current;
    if (!camera || !board) return;

    const theme = getTheme(themeId) ?? defaultTheme();
    const n = gridNFor(assets.length);
    nRef.current = n;

    board.setGrid(theme, n);
    board.syncUnits(assets);
    if (widget) {
      const r = board.getPlotRect();
      if (r) camera.setFrame(r.cx, r.cy, r.w, r.h);
    } else {
      camera.setTarget(board.getSceneSize(), n);
    }
    if (firstBuildRef.current) {
      camera.snap();
      firstBuildRef.current = false;
    }
  }, [assets, themeId, ready, widget]);

  return <div ref={hostRef} className="game-canvas" />;
}
