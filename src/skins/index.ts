import { loadAllSkins } from './loader';

let installed = false;

/** 安装（自动发现并注册）所有皮肤，幂等。应用启动时调用一次。 */
export function installDefaultSkins(): void {
  if (installed) return;
  loadAllSkins();
  installed = true;
}

export * from './types';
export * from './registry';
