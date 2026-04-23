import React from 'react';

const C = {
  blue: '#1A6FE8',
  textSub: '#6B7280',
  border: '#E5E7EB',
};

const MultiTopicSelector = ({ selected = [], onChange }) => {
  const topics = ['lifestyle', 'parenting', 'mama', 'food', 'kuliner', 'travel', 'fashion', 'beauty', 'finance', 'gaming', 'edukasi', 'entertainment', 'bisnis', 'umkm', 'otomotif', 'olahraga', 'teknologi'];
  
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: '#F9FAFB', padding: 8, borderRadius: 8, border: `1px solid ${C.border}` }}>
      {topics.map(t => {
        const active = (selected || []).includes(t);
        return (
          <div
            key={t}
            onClick={() => onChange(active ? selected.filter(x => x !== t) : [...selected, t])}
            style={{
              padding: '3px 10px',
              borderRadius: 15,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              background: active ? C.blue : '#fff',
              color: active ? '#fff' : C.textSub,
              border: `1px solid ${active ? C.blue : C.border}`,
              transition: 'all .1s',
              userSelect: 'none'
            }}
          >
            {t}
          </div>
        );
      })}
    </div>
  );
};

export default MultiTopicSelector;
