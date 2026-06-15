import { useEffect, useState } from 'react';

/** 每 intervalMs 触发一次重渲染，返回当前 epoch ms。用于让"总价值"等随时间实时跳动。 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
