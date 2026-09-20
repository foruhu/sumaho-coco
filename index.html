import React, { useState } from 'react';

interface ScenarioEntry {
  id: string;
  tab: string;
  speaker: string;
  text: string;
}

interface CustomButton {
  label: string;
  text: string;
}

// 初期シナリオデータ（必要に応じて編集・追加可能）
const initialScenarioData: ScenarioEntry[] = [
  { id: '1', tab: '情報', speaker: 'KP', text: '《施設情報》この施設は「財団」と呼ばれる組織の運営する研究施設であり、名称を「生物ユニット 55」という。' },
  { id: '2', tab: '情報', speaker: 'KP', text: '「財団」は、現実ではあり得ないような異常存在を確保・収容する超国家的組織である。' },
  { id: '3', tab: '情報', speaker: 'KP', text: 'この施設では、いずれも異常存在に分類される 6 種類の生命体と、3 種類の物体を収容している……' },
  { id: '4', tab: 'PC1', speaker: 'PC1', text: '端末の画面を凝視し、記述された内容に息を呑む。' },
];

export default function App() {
  const [tabs, setTabs] = useState<string[]>(['共通', 'PC1', 'KP用', '情報', '描写']);
  const [activeTab, setActiveTab] = useState<string>('情報');
  const [scenarioItems] = useState<ScenarioEntry[]>(initialScenarioData);
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [copiedText, setCopiedText] = useState<string>('コピー待機中...');

  // カスタムコマンド用ステート
  const [label, setLabel] = useState<string>('');
  const [command, setCommand] = useState<string>('');
  const [customItems, setCustomItems] = useState<Record<string, CustomButton[]>>({
    '共通': [{ label: '移動宣言', text: '【宣言】移動します' }],
    'PC1': [{ label: '目星', text: '1d100<=70 目星' }],
    'KP用': [{ label: 'シークレット', text: '【KP】シークレットダイス' }],
    '情報': [],
    '描写': []
  });

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(`コピー: ${text}`);
  };

  const handleScenarioClick = async (item: ScenarioEntry) => {
    const payload = item.speaker === 'KP' ? item.text : `${item.speaker}「${item.text}」`;
    await handleCopy(payload);
    setSentIds((prev) => ({ ...prev, [item.id]: true }));
  };

  const toggleCheck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSentIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addCustomItem = () => {
    if (!label.trim() || !command.trim()) return;
    setCustomItems((prev) => ({
      ...prev,
      [activeTab]: [...(prev[activeTab] || []), { label: label.trim(), text: command.trim() }]
    }));
    setLabel('');
    setCommand('');
  };

  const deleteCustomItem = (idx: number) => {
    setCustomItems((prev) => ({
      ...prev,
      [activeTab]: (prev[activeTab] || []).filter((_, i) => i !== idx)
    }));
  };

  const addTab = () => {
    const name = window.prompt('追加するタブ名（例: PC2, 敵A）:');
    if (name && name.trim()) {
      const clean = name.trim();
      if (!tabs.includes(clean)) {
        setTabs((prev) => [...prev, clean]);
        setCustomItems((prev) => ({ ...prev, [clean]: [] }));
      }
      setActiveTab(clean);
    }
  };

  const currentButtons = customItems[activeTab] || [];
  const filteredScenario = scenarioItems.filter((item) => item.tab === activeTab);
  const totalCount = scenarioItems.length;
  const sentCount = Object.keys(sentIds).filter((id) => sentIds[id]).length;

  return (
    <div className="p-4 space-y-3 max-w-md mx-auto bg-zinc-950 text-zinc-100 min-h-screen text-xs pb-24">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <span className="font-bold text-sm text-purple-400">📱 Sumaho-coco</span>
        <button onClick={addTab} className="bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded text-[11px] text-zinc-300">
          +タブ追加
        </button>
      </div>

      {/* タブバー */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium shrink-0 transition ${
              activeTab === tab ? 'bg-purple-600 text-white font-bold' : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* カスタムコマンド追加ボックス */}
      <div className="flex gap-1.5">
        <input
          type="text"
          placeholder="ラベル (例: 目星)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-[0.4] bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100"
        />
        <input
          type="text"
          placeholder="コマンド/台詞"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="flex-[0.6] bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100"
        />
        <button onClick={addCustomItem} className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold">
          追加
        </button>
      </div>

      {/* カスタムコマンドグリッド */}
      <div className="grid grid-cols-2 gap-2">
        {currentButtons.map((btn, idx) => (
          <div
            key={idx}
            onClick={() => handleCopy(btn.text)}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-3 text-center cursor-pointer relative break-all active:bg-zinc-800 transition"
          >
            <div className="font-medium text-zinc-200">{btn.label}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteCustomItem(idx);
              }}
              className="absolute top-1.5 right-2 text-[10px] text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* タブ連動・全件チェックボックス付きシナリオリスト */}
      <div className="space-y-2 pt-3 border-t border-zinc-800">
        <div className="flex justify-between items-center text-[11px] text-zinc-400 px-0.5">
          <span className="font-semibold text-zinc-300">📜 シナリオ・情報一覧 ({activeTab})</span>
          <span>完了: {sentCount} / {totalCount}</span>
        </div>

        {filteredScenario.length === 0 ? (
          <div className="text-zinc-500 py-4 text-center">このタブに紐づく文章はありません</div>
        ) : (
          filteredScenario.map((item) => {
            const isSent = !!sentIds[item.id];
            return (
              <div
                key={item.id}
                onClick={() => handleScenarioClick(item)}
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

      {/* 下部固定のコピープレビューエリア */}
      <div className="fixed bottom-3 left-3 right-3 max-w-md mx-auto bg-teal-950/95 border border-teal-500/60 text-teal-200 p-2.5 rounded-lg text-xs break-all shadow-xl backdrop-blur-sm z-50">
        {copiedText}
      </div>
    </div>
  );
}
