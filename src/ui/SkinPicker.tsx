import { useEffect, useState } from 'react';
import {
  fetchRegistry,
  installAndRegisterSkin,
  listAssetSkins,
  type RegistryEntry,
} from '@/skins';
import { renderSkinThumbnail } from '@/engine/skinThumbnail';
import { useLanguage } from '@/i18n';

interface SkinPickerProps {
  value: string;
  onChange: (id: string) => void;
}

/**
 * 资产外观「皮肤商店」：列出 Registry 里的全部资产皮肤。
 *  - 已下载到本地：缩略图为皮肤实际渲染，可点选。
 *  - 未下载：灰显 + 右下角下载按钮；点一下下载到本地（IndexedDB）后即可选。
 */
export function SkinPicker({ value, onChange }: SkinPickerProps) {
  const { language } = useLanguage();
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [installed, setInstalled] = useState<Set<string>>(
    () => new Set(listAssetSkins().map((s) => s.id)),
  );
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // 拉 Registry（仅资产皮肤）
  useEffect(() => {
    let alive = true;
    fetchRegistry()
      .then((reg) => {
        if (alive) setEntries(reg.skins.filter((s) => s.kind === 'asset'));
      })
      .catch((e: unknown) => {
        if (alive) setError(String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  // 已装皮肤的缩略图（皮肤实际渲染）
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const id of installed) {
        if (thumbs[id]) continue;
        const url = await renderSkinThumbnail(id);
        if (alive && url) setThumbs((prev) => ({ ...prev, [id]: url }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installed]);

  const download = async (entry: RegistryEntry) => {
    setDownloading((prev) => new Set(prev).add(entry.id));
    try {
      await installAndRegisterSkin(entry);
      setInstalled((prev) => new Set(prev).add(entry.id));
    } catch (e) {
      setError(String(e));
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  return (
    <div className="skin-store">
      {error && <p className="skin-store__err">{error}</p>}
      <div className="skin-picker">
        {entries.map((entry) => {
          const isInstalled = installed.has(entry.id);
          const isDownloading = downloading.has(entry.id);
          const cls =
            'skin-card' +
            (entry.id === value ? ' is-active' : '') +
            (isInstalled ? '' : ' skin-card--locked');
          return (
            <div key={entry.id} className={cls}>
              <button
                type="button"
                className="skin-card__main"
                disabled={!isInstalled}
                onClick={() => onChange(entry.id)}
              >
                {isInstalled && thumbs[entry.id] ? (
                  <img className="skin-card__img" src={thumbs[entry.id]} alt={entry.name[language]} />
                ) : (
                  <span className="skin-card__ph">{isInstalled ? '🌱' : '🖼'}</span>
                )}
                <span className="skin-card__name">{entry.name[language]}</span>
              </button>
              {!isInstalled && (
                <button
                  type="button"
                  className="skin-card__dl"
                  disabled={isDownloading}
                  onClick={() => download(entry)}
                  title={language === 'zh' ? '下载到本地' : 'Download'}
                  aria-label={language === 'zh' ? '下载到本地' : 'Download'}
                >
                  {isDownloading ? <span className="skin-card__spin" /> : '⬇'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
