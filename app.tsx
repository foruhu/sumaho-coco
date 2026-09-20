import React, { useEffect, useState } from 'react';
import { SessionQueueManager } from '../core/SessionQueueManager';

// 初期化（ボード切り替え時やシナリオロード時にインスタンス生成）
const manager = new SessionQueueManager([
  { id: '1', speaker: 'GM', text: '暗い部屋に足を踏み入れると、冷たい空気が肌を刺した。' },
  { id: '2', speaker: '謎の男', text: '……よくぞたどり着いたな。' }
]);

export function SessionControlPanel() {
  const [current, setCurrent] = useState(manager.getCurrent());

  const handleNext = async () => {
    const item = await manager.copyNextAndAdvance();
    if (item) {
      setCurrent(manager.getCurrent());
      // TODO: ココフォリアタブへフォーカスを促す、あるいはトースト通知
    }
  };

  // ショートカット登録
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="p-4 border rounded bg-zinc-900 text-zinc-100">
      <div className="text-sm text-zinc-400">次へ送り込み (Alt+→)</div>
      <div className="my-2 p-2 bg-zinc-800 rounded">
        {current ? `${current.speaker}: ${current.text}` : 'シナリオ終了'}
      </div>
      <button 
        onClick={handleNext}
        className="px-4 py-2 bg-blue-600 rounded text-white"
      >
        クリップボードにコピーして進む
      </button>
    </div>
  );
}
