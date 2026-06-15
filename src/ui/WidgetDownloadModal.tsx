import { useState } from 'react';
import { useGameStore } from '@/state/store';
import { useT } from '@/i18n';
import { cloudEnabled } from '@/sync/cloud';
import { Modal } from './Modal';

/**
 * 桌面挂件下载地址。
 * 用 `npm run tauri build` 打出 Mineo 应用后，发布到 GitHub Releases；
 * 此按钮指向 releases 页（或改成某个 .dmg/.app.zip 的直链即可一键下载）。
 */
const WIDGET_DOWNLOAD_URL = 'https://github.com/luoruikun0531/mineo/releases/latest';

interface WidgetDownloadModalProps {
  onClose: () => void;
}

/** 主页面「桌面挂件」入口：一键下载挂件 + 展示配对码 + 三步说明。 */
export function WidgetDownloadModal({ onClose }: WidgetDownloadModalProps) {
  const t = useT();
  const syncCode = useGameStore((s) => s.syncCode);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    try {
      navigator.clipboard?.writeText(syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时静默；配对码本身仍可见可手动输入
    }
  };

  const paired = cloudEnabled() && !!syncCode;

  return (
    <Modal
      title={t('widget.title')}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </>
      }
    >
      <p className="hint">{t('widget.desc')}</p>

      <div className="field">
        <a
          className="btn btn--primary widget-dl"
          href={WIDGET_DOWNLOAD_URL}
          target="_blank"
          rel="noreferrer"
        >
          ⬇ {t('widget.download')}
        </a>
      </div>

      {paired && (
        <div className="field">
          <label>{t('sync.code')}</label>
          <div className="sync-code">
            <code className="sync-code__value">{syncCode}</code>
            <button type="button" className="btn" onClick={copyCode}>
              {copied ? t('sync.copied') : t('sync.copy')}
            </button>
          </div>
        </div>
      )}

      <ol className="widget-steps">
        <li>{t('widget.step1')}</li>
        <li>{t('widget.step2')}</li>
        {paired && <li>{t('widget.step3')}</li>}
      </ol>
    </Modal>
  );
}
