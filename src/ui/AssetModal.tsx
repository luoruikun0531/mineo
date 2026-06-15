import { useState } from 'react';
import { useGameStore } from '@/state/store';
import { useT } from '@/i18n';
import { displaySymbol } from '@/domain/currency';
import { assetInputSchema, type AssetInput } from '@/domain/assetInput';
import { ASSET_KINDS, type Asset, type AssetKind } from '@/domain/types';
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

/** 边输入边加千分位逗号（仅保留数字与小数点） */
const groupDigits = (s: string): string => {
  const cleaned = s.replace(/[^\d.]/g, '');
  if (cleaned === '') return '';
  const [int, ...rest] = cleaned.split('.');
  const head = int === '' ? '' : Number(int).toLocaleString('en-US');
  return rest.length ? `${head}.${rest.join('')}` : head;
};

const toRate = (s: string): number | undefined => {
  const t = s.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? NaN : n / 100;
};

/** 录入弹窗：添加 / 编辑资产（4 类）。货币与隐私是全局设置，不在此录入。 */
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
    editing?.kind === 'deposit' ? groupDigits(String(editing.principal)) : '',
  );
  const [rate, setRate] = useState(
    editing?.kind === 'deposit' ? String(editing.annualRate * 100) : '3',
  );
  const [estimate, setEstimate] = useState(
    editing?.kind === 'realestate' ? groupDigits(String(editing.estimatedValue)) : '',
  );
  const [rent, setRent] = useState(
    editing?.kind === 'realestate' ? groupDigits(String(editing.annualRent)) : '',
  );
  const [symbol, setSymbol] = useState(editing?.kind === 'investment' ? editing.symbol : '');
  const [shares, setShares] = useState(
    editing?.kind === 'investment' ? String(editing.shares) : '',
  );
  const [price, setPrice] = useState(
    editing?.kind === 'investment' ? String(editing.latestPrice) : '',
  );
  const [err, setErr] = useState('');

  const submit = () => {
    const input: AssetInput = {
      kind,
      name,
      iconId,
      annualIncome: kind === 'cashflow' ? num(income) : undefined,
      principal: kind === 'deposit' ? num(principal) : undefined,
      annualRate: kind === 'deposit' ? toRate(rate) : undefined,
      estimatedValue: kind === 'realestate' ? num(estimate) : undefined,
      annualRent: kind === 'realestate' ? num(rent) : undefined,
      symbol: kind === 'investment' ? symbol : undefined,
      shares: kind === 'investment' ? num(shares) : undefined,
      latestPrice: kind === 'investment' ? num(price) : undefined,
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
              : msg === 'symbol'
                ? t('err.symbol')
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
        <div className="seg seg--4">
          {ASSET_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={kind === k ? 'is-active' : ''}
              onClick={() => setKind(k)}
            >
              {t(`asset.${k}`)}
            </button>
          ))}
        </div>
        <p className="hint">{t(`asset.${kind}Hint`)}</p>
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

      {kind === 'cashflow' && (
        <NumField label={`${t('asset.annualIncome')} (${sym})`} value={income} onChange={(v) => setIncome(groupDigits(v))} />
      )}

      {kind === 'deposit' && (
        <>
          <NumField label={`${t('asset.principal')} (${sym})`} value={principal} onChange={(v) => setPrincipal(groupDigits(v))} />
          <div className="field">
            <label>{t('asset.annualRate')}</label>
            <input inputMode="decimal" value={rate} placeholder="3" onChange={(e) => setRate(e.target.value)} />
          </div>
        </>
      )}

      {kind === 'realestate' && (
        <>
          <NumField label={`${t('asset.estimatedValue')} (${sym})`} value={estimate} onChange={(v) => setEstimate(groupDigits(v))} />
          <NumField label={`${t('asset.annualRent')} (${sym})`} value={rent} onChange={(v) => setRent(groupDigits(v))} />
        </>
      )}

      {kind === 'investment' && (
        <>
          <div className="field">
            <label>{t('asset.symbol')}</label>
            <input
              value={symbol}
              placeholder="AAPL"
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
          </div>
          <NumField label={t('asset.shares')} value={shares} onChange={setShares} />
          <NumField label={`${t('asset.latestPrice')} (${sym})`} value={price} onChange={setPrice} />
        </>
      )}

      {err && <p className="form-error">{err}</p>}
    </Modal>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input inputMode="numeric" value={value} placeholder="0" onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
