import React, { useState } from 'react';

interface ScenarioEntry {
  id: string;
  tab: 'common' | 'pc1' | 'kp' | 'info' | 'desc';
  speaker: string;
  text: string;
}

// サンプルデータ（各タブに紐づくテキスト群）
const scenarioData: ScenarioEntry[] = [
  { id: '1', tab: 'info', speaker: 'KP', text: '《施設情報》この施設は「財団」と呼ばれる組織の運営する研究施設であり、名称を「生物ユニット 55」という。' },
  { id: '2', tab: 'info', speaker: 'KP', text: '「財団」は、現実ではあり得ないような異常存在を確保・収容する超国家的組織である。' },
  { id: '3', tab: 'info', speaker: 'KP', text: 'この施設では、いずれも異常存在に分類される 6 種類の生命体と、3 種類の物体を収容している……' },
  { id: '4', tab: 'pc1', speaker: 'PC1', text: '端末の画面を凝視し、記述された内容に息を呑む。' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'common' | 'pc1' | 'kp' | 'info' | 'desc'>('info');
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [copiedText, setCopiedText] = useState<string>('コピー: <<施設情報>>（※探索者が端末から読み取った内容の概要）この施設は……');
  
  // 元のカスタムコマンド用ステート
  const [label, setLabel] = useState('');
  const [command, setCommand] = useState('');

  // ブロッククリックでコピー ＆ チェックON
  const handleItemClick = async (item: ScenarioEntry) => {
    const payload = item.speaker === 'KP' ? item.text : `${item.speaker}「${item.text}」`;
    await navigator.clipboard.writeText(payload);
    setCopiedText(`コピー: ${payload}`);
    setSentIds((prev) => ({ ...prev, [item.id]: true }));
  };

  // チェックボックス手動トグル
  const toggleCheck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSentIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredScenario = scenarioData.filter((item) => item.tab === activeTab);
  const totalCount = filteredScenario.length;
  const sentCount = filteredScenario.filter((item) => sentIds[item.id]).length;

  return (
    <div className="p-4 space-y-3 max-w-md mx-auto bg-zinc-950 text-zinc-100 min-h-screen text-xs pb-24">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <span className="font-bold text-sm text-purple-400">📱 Sumaho-coco</span>
        <button className="bg-zinc-800 px-2 py-0.5 rounded text-[10px] text-zinc-300">+タブ追加</button>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['common', 'pc1', 'kp', 'info', 'desc'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium shrink-0 ${
              activeTab === tab ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {tab === 'common' && '共通'}
            {tab === 'pc1' && 'PC1'}
            {tab === 'kp' && 'KP用'}
            {tab === 'info' && '情報'}
            {tab === 'desc' && '描写'}
          </button>
        ))}
      </div>

      {/* カスタムコマンド入力欄 */}
      <div className="flex gap-1.5">
        <input
          type="text"
          placeholder="ラベル (例: 目星)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
        />
        <input
          type="text"
          placeholder="コマンド/台詞 (1d100<=70)"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
        />
        <button className="bg-zinc-800 border border-zinc-700 px-2.5 rounded text-xs">追加</button>
      </div>

      {/* 移動宣言 */}
      <div>
        <button className="w-full bg-zinc-900 border border-zinc-700 rounded py-1.5 text-center text-zinc-300">
          移動宣言
        </button>
      </div>

      {/* タブ連動・全件チェックボックス付きシナリオリスト */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <div className="flex justify-between items-center text-[11px] text-zinc-400 px-0.5">
          <span className="font-semibold">📜 シナリオ・情報一覧（全件表示）</span>
          <span>{sentCount} / {totalCount} 完了</span>
        </div>

        {filteredScenario.length === 0 ? (
          <div className="text-zinc-500 py-4 text-center">このタブに登録された文章はありません</div>
        ) : (
          filteredScenario.map((item) => {
            const isSent = !!sentIds[item.id];
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-2.5 rounded-lg cursor-pointer transition border flex items-start gap-2.5 ${
                  isSent
                    ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400 opacity-75'
                    : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSent}
                  onClick={(e) => toggleCheck(e, item.id)}
                  onChange={() => {}}
                  className="mt-0.5 w-4 h-4 rounded accent-emerald-500 cursor-pointer shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-0.5">
                    <span className="font-bold text-zinc-300">{item.speaker}</span>
                    {isSent && <span className="text-emerald-400 font-medium">✓ 送信済み</span>}
                  </div>
                  <div className={`leading-relaxed break-words text-xs ${isSent ? 'line-through decoration-zinc-600' : ''}`}>
                    {item.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 下部固定のコピープレビューエリア（元の緑色バーを踏襲） */}
      <div className="fixed bottom-3 left-3 right-3 max-w-md mx-auto bg-teal-950/90 border border-teal-500/60 text-teal-200 p-2 rounded-lg text-xs break-all shadow-xl backdrop-blur-sm">
        {copiedText}
      </div>
    </div>
  );
}
