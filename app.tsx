　import React, { useState } from 'react';

// --- 型定義 ---
interface ScenarioEntry {
  id: string;
  speaker: string;
  text: string;
}

// --- チャット送信用フォーマッター ---
function formatChatPayload(item: ScenarioEntry): string {
  if (item.speaker === 'GM' || item.speaker === 'ナレーション') {
    return item.text;
  }
  return `${item.speaker}「${item.text}」`;
}

// --- シナリオデータ初期値 ---
const initialQueue: ScenarioEntry[] = [
  { id: '1', speaker: 'GM', text: '暗い部屋に足を踏み入れると、冷たい空気が肌を刺した。' },
  { id: '2', speaker: '謎の男', text: '……よくぞたどり着いたな。' },
  { id: '3', speaker: 'GM', text: '男は薄暗がりの中で不敵に笑っている。' },
];

export default function App() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<string>('');

  // ブロッククリック時の処理
  const handleBlockClick = async (entry: ScenarioEntry, index: number) => {
    const payload = formatChatPayload(entry);
    await navigator.clipboard.writeText(payload);
    setSelectedIndex(index);
    setCopiedMessage(`コピー完了: ${payload}`);

    setTimeout(() => {
      setCopiedMessage('');
    }, 2500);
  };

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">TRPGセッション支援ツール</h1>
        {copiedMessage && (
          <span className="text-xs bg-emerald-600 px-2 py-1 rounded text-white px-2 py-1">
            {copiedMessage}
          </span>
        )}
      </div>

      <div className="text-xs text-zinc-400">
        ※テキストをクリックするとコピーされます。ココフォリアのチャット欄で{' '}
        <code className="bg-zinc-800 px-1 rounded">Ctrl+V</code>（または貼り付け）してください。
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
