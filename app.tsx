import React, { useEffect, useState } from 'react';

// キュー管理クラス（別ファイルにするか、同一ファイル内に直書きでもOK）
interface ScenarioEntry {
  id: string;
  speaker: string;
  text: string;
}

class SessionQueueManager {
  private queue: ScenarioEntry[] = [];
  private currentIndex = 0;

  constructor(entries: ScenarioEntry[]) {
    this.queue = entries;
  }

  getCurrent(): ScenarioEntry | null {
    return this.queue[this.currentIndex] || null;
  }

  async copyNextAndAdvance(): Promise<ScenarioEntry | null> {
    const current = this.getCurrent();
    if (!current) return null;

    const payload = current.speaker === 'GM' 
      ? `[GM] ${current.text}` 
      : `${current.speaker}「${current.text}」`;

    await navigator.clipboard.writeText(payload);
    this.currentIndex++;
    return current;
  }
}

const manager = new SessionQueueManager([
  { id: '1', speaker: 'GM', text: '暗い部屋に足を踏み入れると、冷たい空気が肌を刺した。' },
  { id: '2', speaker: '謎の男', text: '……よくぞたどり着いたな。' }
]);

export default function App() {
  const [current, setCurrent] = useState<ScenarioEntry | null>(manager.getCurrent());

  const handleNext = async () => {
    const item = await manager.copyNextAndAdvance();
    if (item) {
      setCurrent(manager.getCurrent());
    }
  };

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
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">TRPGセッション支援ツール</h1>
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
    </div>
  );
}
