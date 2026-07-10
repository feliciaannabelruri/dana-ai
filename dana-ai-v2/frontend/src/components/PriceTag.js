import React from 'react';

const C = {
  indigo: '#4F46E5',
  text: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
};

const SYMBOLS = { AUD: 'A$', CNY: '¥', SGD: 'S$', MYR: 'RM', JPY: '¥', KRW: '₩', USD: '$' };

export const fmtOriginal = (amount, currency) => {
  const sym = SYMBOLS[currency] || currency + ' ';
  const decimals = currency === 'JPY' || currency === 'KRW' ? 0 : 2;
  return `${sym}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })}`;
};

export const fmtIDR = n => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

// rates: { USD: 15700, AUD: 10400, ... } → IDR per 1 unit of that currency
const PriceTag = ({ amount, currency, rates, loading, date, size = 'md' }) => {
  if (amount == null || amount === '' || isNaN(amount)) return null;
  const rate = rates?.[currency];
  const big = size === 'lg';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 800, fontSize: big ? 16 : 13, color: C.text }}>
        {fmtOriginal(amount, currency)}
      </span>
      {loading && <span style={{ fontSize: 11, color: C.textMuted }}>menghitung kurs...</span>}
      {!loading && rate && (
        <span style={{ fontSize: big ? 13 : 11, color: C.indigo, fontWeight: 600 }}>
          ≈ {fmtIDR(amount * rate)}
          <span style={{ color: C.textMuted, fontWeight: 400, marginLeft: 4 }}>
            (kurs {date || 'hari ini'})
          </span>
        </span>
      )}
      {!loading && !rate && (
        <span style={{ fontSize: 11, color: C.textMuted }}>kurs belum tersedia</span>
      )}
    </span>
  );
};

export default PriceTag;
