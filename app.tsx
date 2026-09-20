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
import React, { useState } from 'react';

interface ScenarioEntry {
  id: string;
  speaker: string;
  text: string;
}

const initialQueue: ScenarioEntry[] = [
  { id: '1', speaker: 'GM', text: '暗い部屋に足を踏み入れると、冷たい空気が肌を刺した。' },
  { id: '2', speaker: '謎の男', text: '……よくぞたどり着いたな。' },
  { id: '3', speaker: 'GM', text: '男は薄暗がりの中で不敵に笑っている。' },
];

export default function App() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<string>('');

  const handleBlockClick = async (entry: ScenarioEntry, index: number) => {
    // ココフォリア送信用フォーマットの組み立て
    const payload = entry.speaker === 'GM' 
      ? `[GM] ${entry.text}` 
      : `${entry.speaker}「${entry.text}」`;

    // クリップボードへコピー
    await navigator.clipboard.writeText(payload);
    setSelectedIndex(index);
    setCopiedMessage(`コピー完了: ${payload}`);

    // 数秒後に通知を消す
    setTimeout(() => setCopiedMessage(''), 2500);
  };

// ココフォリア Clipboard API 形式の簡易型定義 (v1.19.0〜)
export interface CcfoliaCharacterData {
  kind: 'character';
  data: {
    name: string;
    memo?: string;
    initiative?: number;
    color?: string;
    commands?: string;
    [key: string]: any;
  };
}

// 景品・キャラクター駒データをクリップボードへ流し込むヘルパー
export async function copyCcfoliaCharacterJson(name: string, memo: string = '') {
  const payload: CcfoliaCharacterData = {
    kind: 'character',
    data: {
      name,
      memo,
      color: '#4a90e2',
    }
  };
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
}

import { copyCcfoliaCharacterJson } from './core/ccfolia-types';

// 例: NPC名クリックや「キャラコマコピー」ボタン等で呼び出し
const handleExportChar = async (name: string, memo: string) => {
  await copyCcfoliaCharacterJson(name, memo);
  alert(`ココフォリア用キャラクター「${name}」をクリップボードにコピーしました！ルーム上でCtrl+Vしてください。`);
};

interface ScenarioMessage {
  speaker: string;
  text: string;
  isSecret?: boolean; // 秘匿やGMメモ判定
}

/**
 * ココフォリアのチャット欄に貼り付けやすい形式へ変換する
 */
export function formatChatPayload(item: ScenarioMessage): string {
  if (item.speaker === 'GM' || item.speaker === 'ナレーション') {
    return item.text; // 描写はそのまま、または[GM]プレフィックス
  }
  return `${item.speaker}「${item.text}」`;
}

import { formatChatPayload } from './core/chat-formatter';

// ... コンポーネント内等のハンドラー例
const handleSendToCcfolia = async (entry: { speaker: string; text: string }) => {
  const payload = formatChatPayload(entry);
  await navigator.clipboard.writeText(payload);
  // 必要に応じてUI側の「コピー済み/待機中」ステータスを更新
};


  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">セッション進行パネル</h1>
        {copiedMessage && (
          <span className="text-xs bg-emerald-600 px-2 py-1 rounded text-white animate-fade-in">
            {copiedMessage}
          </span>
        )}
      </div>

      <div className="text-xs text-zinc-400">
        ※テキストをクリックするとコピーされます。ココフォリアのチャット欄で <code className="bg-zinc-800 px-1 rounded">Ctrl+V</code>（または貼り付け）してください。
      </div>

      {/* テキストブロック一覧 */}
      <div className="space-y-2">
        {initialQueue.map((item, index) => {
          const isSelected = selectedIndex === index;
          return (
            <div
              key={item.id}
              onClick={() => handleBlockClick(item, index)}
              className={`p-3 rounded-lg cursor-pointer transition border ${
                isSelected 
                  ? 'bg-blue-950/60 border-blue-500 text-blue-100' 
                  : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/80 text-zinc-200'
              }`}
            >
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>{item.speaker}</span>
                {isSelected && <span className="text-blue-400">✓ コピー済み</span>}
              </div>
              <div className="text-sm leading-relaxed">{item.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}