import { Container, Graphics } from 'pixi.js';

/**
 * 平台 SDK · 通用小人骨架。
 * 任何资产皮肤都可复用：身体/手臂/工具/表情分层，便于继续加细。
 * 三种行为：hoe 干活（锄/采）、walk 来回搬运、lazy 偷懒。
 */
export type CharacterKind = 'hoe' | 'walk' | 'lazy';

export interface CharacterOptions {
  kind: CharacterKind;
  scale?: number;
  shirt?: number;
  phase?: number;
  /** walk 行为的左右活动半径（世界 px） */
  walkRange?: number;
}

export interface Character {
  view: Container;
  update: (t: number) => void;
  celebrate: () => void;
}

const SKIN = 0xf0c089;
const HAT = 0xe7c66a;
const HAT_DARK = 0xcaa948;
const OVERALL = 0x466f9e;
const TOOL = 0x9a6a3a;
const TOOL_HEAD = 0xb9c2c8;

export function makeCharacter(o: CharacterOptions): Character {
  const s = o.scale ?? 1;
  const shirt = o.shirt ?? 0xc8553d;
  const phase = o.phase ?? 0;
  const view = new Container();

  const body = new Container();
  view.addChild(body);

  // 腿（左右分开，便于走路交替）
  const legBaseY = -4 * s;
  const legL = makeLeg(s);
  legL.position.set(-2.5 * s, legBaseY);
  const legR = makeLeg(s);
  legR.position.set(2.5 * s, legBaseY);
  body.addChild(legL, legR);

  // 躯干（背带裤 + 衬衫）
  const torso = new Graphics();
  torso.roundRect(-5 * s, -16 * s, 10 * s, 12 * s, 3 * s).fill(shirt);
  torso.roundRect(-5 * s, -9 * s, 10 * s, 6 * s, 2 * s).fill(OVERALL);
  torso.rect(-3.5 * s, -16 * s, 1.6 * s, 8 * s).fill(OVERALL);
  torso.rect(1.9 * s, -16 * s, 1.6 * s, 8 * s).fill(OVERALL);
  body.addChild(torso);

  const armBack = makeArm(s, shirt);
  armBack.position.set(-4.5 * s, -14 * s);
  body.addChild(armBack);

  // 头 + 草帽
  const head = new Graphics();
  head.circle(0, -19 * s, 4.6 * s).fill(SKIN);
  head.ellipse(0, -22 * s, 7 * s, 2.6 * s).fill(HAT);
  head.ellipse(0, -23.4 * s, 3.6 * s, 2.8 * s).fill(HAT);
  head.ellipse(0, -21.4 * s, 7 * s, 1.1 * s).fill(HAT_DARK);
  body.addChild(head);

  const armFront = makeArm(s, shirt);
  armFront.position.set(4.5 * s, -14 * s);
  body.addChild(armFront);

  if (o.kind === 'hoe') {
    const tool = new Container();
    const tg = new Graphics();
    tg.roundRect(-0.8 * s, 0, 1.6 * s, 14 * s, 1).fill(TOOL);
    tg.roundRect(-3 * s, 13 * s, 6 * s, 2.4 * s, 1).fill(TOOL_HEAD);
    tool.addChild(tg);
    tool.position.set(2.5 * s, 2 * s);
    armFront.addChild(tool);
  }

  let z: Graphics | null = null;
  if (o.kind === 'lazy') {
    z = new Graphics();
    z.moveTo(0, 0).lineTo(4 * s, 0).lineTo(0, 5 * s).lineTo(4 * s, 5 * s)
      .stroke({ width: 1.4 * s, color: 0xffffff });
    z.position.set(5 * s, -24 * s);
    view.addChild(z);
    body.position.y = 5 * s;
    body.rotation = -0.16;
  }

  let jump = 0;
  return {
    view,
    celebrate: () => {
      jump = 1;
    },
    update: (t) => {
      const tt = t + phase;
      switch (o.kind) {
        case 'hoe': {
          body.y = Math.abs(Math.sin(tt * 4)) * -1.5 * s;
          const chop = Math.sin(tt * 4);
          armFront.rotation = -0.5 + chop * 0.7;
          armBack.rotation = 0.2 + chop * 0.15;
          break;
        }
        case 'walk': {
          const range = o.walkRange ?? 14 * s;
          const dir = Math.cos(tt * 1.4);
          view.x = Math.sin(tt * 1.4) * range;
          view.scale.x = dir >= 0 ? 1 : -1;
          legL.y = legBaseY + Math.sin(tt * 6) * 1.4 * s;
          legR.y = legBaseY + Math.sin(tt * 6 + Math.PI) * 1.4 * s;
          armFront.rotation = Math.sin(tt * 6) * 0.5;
          armBack.rotation = Math.sin(tt * 6 + Math.PI) * 0.5;
          break;
        }
        case 'lazy': {
          body.y = 5 * s + Math.sin(tt * 1.6) * 0.6 * s;
          if (z) {
            const ph = (tt * 0.5) % 1;
            z.y = -24 * s - ph * 8 * s;
            z.alpha = 1 - ph;
          }
          break;
        }
      }
      if (jump > 0) {
        jump = Math.max(0, jump - 0.016 / 0.45);
        body.y += Math.sin(jump * Math.PI) * -6 * s;
      }
    },
  };
}

function makeLeg(s: number): Graphics {
  const g = new Graphics();
  g.roundRect(-1.2 * s, 0, 2.4 * s, 5 * s, 1).fill(0x3b5a82);
  return g;
}

function makeArm(s: number, color: number): Container {
  const arm = new Container();
  const g = new Graphics();
  g.roundRect(-1.3 * s, 0, 2.6 * s, 9 * s, 1.3 * s).fill(color);
  g.circle(0, 9 * s, 1.6 * s).fill(SKIN);
  arm.addChild(g);
  return arm;
}
