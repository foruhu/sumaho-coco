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

// --- シナリオデータ初期値（全て表示用） ---
const initialQueue: ScenarioEntry[] = [
  { id: '1', speaker: 'GM', text: '暗い部屋に足を踏み入れると、冷たい空気が肌を刺した。' },
  { id: '2', speaker: '謎の男', text: '……よくぞたどり着いたな。' },
  { id: '3', speaker: 'GM', text: '男は薄暗がりの中で不敵に笑っている。' },
];

export default function App() {
  // 送信済み（チェック済み）のIDを保持するSetまたは配列・オブジェクト
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [lastCopied, setLastCopied] = useState<string>('');

  // ブロッククリック or 送信アクション
  const handleItemClick = async (entry: ScenarioEntry) => {
    const payload = formatChatPayload(entry);
    await navigator.clipboard.writeText(payload);
    
    // チェック済み（送信済み）状態をONにトグル、またはONにする
    setSentIds((prev) => ({ ...prev, [entry.id]: true }));
    setLastCopied(`コピー完了: ${payload}`);

    setTimeout(() => setLastCopied(''), 2500);
  };

  // チェックボックスを手動で切り替える用
  const toggleCheck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // 親のクリック発火を防ぐ
    setSentIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 進捗状況の計算
  const totalCount = initialQueue.length;
  const sentCount = initialQueue.filter((item) => sentIds[item.id]).length;

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">セッション進行パネル</h1>
        <div className="text-xs text-zinc-400">
          進行度: {sentCount} / {totalCount} 完了
        </div>
      </div>

      {lastCopied && (
        <div className="text-xs bg-emerald-600 px-3 py-1.5 rounded text-white font-medium">
          {lastCopied}
        </div>
      )}

      <div className="text-xs text-zinc-400">
        ※ブロックをクリックするとココフォリア用にコピー＆チェックが入ります。左のチェックボックスで手動切り替えも可能。
      </div>

      {/* 全て表示するテキストブロック一覧 */}
      <div className="space-y-2">
        {initialQueue.map((item) => {
          const isSent = !!sentIds[item.id];
          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-3 rounded-lg cursor-pointer transition border flex items-start gap-3 ${
                isSent
                  ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400 opacity-75'
                  : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800/80 text-zinc-100'
              }`}
            >
              {/* チェックボックス要素 */}
              <input
                type="checkbox"
                checked={isSent}
                onClick={(e) => toggleCheck(e, item.id)}
                onChange={() => {}} // Reactの警告防止
                className="mt-1 w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />

              {/* テキスト本体領域 */}
              <div className="flex-1">
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>{item.speaker}</span>
                  {isSent && <span className="text-emerald-400 text-[10px]">送信済み</span>}
                </div>
                <div className={`text-sm leading-relaxed ${isSent ? 'line-through decoration-zinc-600' : ''}`}>
                  {item.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
