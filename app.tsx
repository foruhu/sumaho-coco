import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', background: '#121212', color: '#fff', minHeight: '100vh', fontSize: '14px' }}>
      <h1 style={{ color: '#bb86fc' }}>sumaho-coco (Debug)</h1>
      <p>正常にマウントされています。カウント: {count}</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        style={{ padding: '8px 16px', background: '#bb86fc', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
      >
        テストボタン
      </button>
    </div>
  );
}
