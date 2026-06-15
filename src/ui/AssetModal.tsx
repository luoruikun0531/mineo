import { useState } from 'react';
import { useGameStore } from '@/state/store';
import { useT } from '@/i18n';
import { displaySymbol } from '@/domain/currency';
import { assetInputSchema, type AssetInput } from '@/domain/assetInput';
import type { Asset, AssetKind } from '@/domain/types';
import { listAssetSkins } from '@/skins';
import { Modal } from './Modal';
import { SkinPicker } from './SkinPicker';

interface AssetModalProps {
  editing?: Asset | null;
  onClose: () => void;
}

/** 解析金额（去掉千分位逗号） */
const num = (s: string): number | undefined => {
  const t = s.replace(/,/g, '').trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? NaN : n;
};

/** 边输入边加千分位逗号（仅保留数字） */
const groupDigits = (s: string): string => {
  const digits = s.replace(/[^\d]/g, '');
  return digits === '' ? '' : Number(digits).toLocaleString('en-US');
};

/** 录入弹窗：添加 / 编辑资产。货币与隐私是全局设置，不在此录入。 */
export function AssetModal({ editing, onClose }: AssetModalProps) {
  const t = useT();
  const settings = useGameStore((s) => s.settings);
  const addAsset = useGameStore((s) => s.addAsset);
  const updateAsset = useGameStore((s) => s.updateAsset);
  const removeAsset = useGameStore((s) => s.removeAsset);
  const sym = displaySymbol(settings);
  const firstSkin = listAssetSkins()[0]?.id ?? 'wheat-farm';

  const [kind, setKind] = useState<AssetKind>(editing?.kind ?? 'cashflow');
  const [name, setName] = useState(editing?.name ?? '');
  const [iconId, setIconId] = useState(editing?.iconId ?? firstSkin);
  const [income, setIncome] = useState(
    editing?.kind === 'cashflow' ? groupDigits(String(editing.annualIncome)) : '',
  );
  const [principal, setPrincipal] = useState(
    editing?.kind === 'investment' ? groupDigits(String(editing.principal)) : '',
  );
  const [rate, setRate] = useState(
    editing?.kind === 'investment' ? String(editing.annualReturnRate * 100) : '8',
  );
  const [err, setErr] = useState('');

  const submit = () => {
    const input: AssetInput = {
      kind,
      name,
      iconId,
      annualIncome: kind === 'cashflow' ? num(income) : undefined,
      principal: kind === 'investment' ? num(principal) : undefined,
      annualReturnRate: kind === 'investment' ? toRate(rate) : undefined,
    };
    const res = assetInputSchema.safeParse(input);
    if (!res.success) {
      const msg = res.error.issues[0]?.message;
      setErr(
        msg === 'name' || msg === 'nameLong'
          ? t('err.name')
          : msg === 'rate'
            ? t('err.rate')
            : msg === 'icon'
              ? t('err.skin')
              : t('err.amount'),
      );
      return;
    }
    if (editing) updateAsset(editing.id, res.data);
    else addAsset(res.data);
    onClose();
  };

  return (
    <Modal
      title={t(editing ? 'asset.edit' : 'asset.add')}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <button
              className="btn btn--danger"
              type="button"
              onClick={() => {
                removeAsset(editing.id);
                onClose();
              }}
            >
              {t('asset.delete')}
            </button>
          )}
          <span className="spacer" />
          <button className="btn" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn--primary" type="button" onClick={submit}>
            {editing ? t('common.save') : t('common.add')}
          </button>
        </>
      }
    >
      <div className="field">
        <label>{t('asset.kind')}</label>
        <div className="seg">
          <button
            type="button"
            className={kind === 'cashflow' ? 'is-active' : ''}
            onClick={() => setKind('cashflow')}
          >
            {t('asset.cashflow')}
          </button>
          <button
            type="button"
            className={kind === 'investment' ? 'is-active' : ''}
            onClick={() => setKind('investment')}
          >
            {t('asset.investment')}
          </button>
        </div>
        <p className="hint">
          {t(kind === 'cashflow' ? 'asset.cashflowHint' : 'asset.investmentHint')}
        </p>
      </div>

      <div className="field">
        <label>{t('asset.name')}</label>
        <input
          value={name}
          maxLength={24}
          placeholder={t('asset.namePlaceholder')}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <label>{t('asset.skin')}</label>
        <SkinPicker value={iconId} onChange={setIconId} />
      </div>

      {kind === 'cashflow' ? (
        <div className="field">
          <label>
            {t('asset.annualIncome')} ({sym})
          </label>
          <input
            inputMode="numeric"
            value={income}
            placeholder="0"
            onChange={(e) => setIncome(groupDigits(e.target.value))}
          />
        </div>
      ) : (
        <>
          <div className="field">
            <label>
              {t('asset.principal')} ({sym})
            </label>
            <input
              inputMode="numeric"
              value={principal}
              placeholder="0"
              onChange={(e) => setPrincipal(groupDigits(e.target.value))}
            />
          </div>
          <div className="field">
            <label>{t('asset.returnRate')}</label>
            <input
              inputMode="decimal"
              value={rate}
              placeholder="8"
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
        </>
      )}

      {err && <p className="form-error">{err}</p>}
    </Modal>
  );
}

function toRate(s: string): number | undefined {
  const t = s.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? NaN : n / 100;
}
