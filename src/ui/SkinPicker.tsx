import { useEffect, useState } from 'react';
import { listAssetSkins } from '@/skins';
import { renderSkinThumbnail } from '@/engine/skinThumbnail';
import { useLanguage } from '@/i18n';

interface SkinPickerProps {
  value: string;
  onChange: (id: string) => void;
}

/** 资产外观选择器：卡片网格，缩略图为皮肤实际渲染（异步加载，回退到名字）。 */
export function SkinPicker({ value, onChange }: SkinPickerProps) {
  const { language } = useLanguage();
  const skins = listAssetSkins();
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const s of skins) {
        const url = await renderSkinThumbnail(s.id);
        if (alive && url) setThumbs((prev) => ({ ...prev, [s.id]: url }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="skin-picker">
      {skins.map((s) => (
        <button
          key={s.id}
          type="button"
          className={'skin-card' + (s.id === value ? ' is-active' : '')}
          onClick={() => onChange(s.id)}
        >
          {thumbs[s.id] ? (
            <img className="skin-card__img" src={thumbs[s.id]} alt={s.name[language]} />
          ) : (
            <span className="skin-card__ph">🌱</span>
          )}
          <span className="skin-card__name">{s.name[language]}</span>
        </button>
      ))}
    </div>
  );
}
