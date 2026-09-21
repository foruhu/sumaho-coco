const STORAGE_KEY = 'sumaho_coco_multiscenario_v18';
let editingScenarioId = null;
let collapsedSentIds = {};
let historyStack = [];

function pushHistory() {
    historyStack.push(JSON.parse(JSON.stringify(allData)));
    if (historyStack.length > 20) historyStack.shift();
}

function undoAction() {
    if (historyStack.length === 0) {
        showToast('戻せる履歴がありません');
        return;
    }
    allData = historyStack.pop();
    editingScenarioId = null;
    save();
    renderAll();
    showToast('一歩前に戻しました');
}

const defaultData = {
    currentScenario: 'default_sc',
    scenarios: {
        'default_sc': {
            title: 'サンプルシナリオ',
            tabs: ['共通', 'PC1', 'KP用', '情報'],
            currentTab: '共通',
            customItems: {
                '共通': [{ label: '移動宣言', text: '【宣言】移動します' }],
                'PC1': [], 'KP用': [], '情報': []
            },
            scenariosList: [
                { id: 's1', tab: '共通', speaker: 'KP', text: 'セッション開始します。\n導入シーンの描写。', isIndex: true, indexTitle: '導入' },
                { id: 's2', tab: 'PC1', speaker: 'PC1', text: '周辺の調査を行ないます。目星判定。', isIndex: true, indexTitle: '調査' }
            ],
            sentIds: {}
        }
    }
};

let allData;
try {
    const saved = localStorage.getItem(STORAGE_KEY);
    allData = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(defaultData));
    if (!allData.scenarios) allData = JSON.parse(JSON.stringify(defaultData));
} catch (e) {
    allData = JSON.parse(JSON.stringify(defaultData));
}

function getCur() {
    if (!allData.scenarios[allData.currentScenario]) {
        const firstKey = Object.keys(allData.scenarios)[0];
        if (firstKey) allData.currentScenario = firstKey;
    }
    return allData.scenarios[allData.currentScenario];
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    } catch (e) {
        showToast('保存容量オーバーの可能性');
    }
}

function exportDataJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sumaho_coco_backup_${Date.now()}.json`);
    dlAnchorElem.click();
    showToast('JSON書き出し完了');
}

function importDataJsonPrompt() {
    document.getElementById('jsonFileInput').click();
}

function handleJsonFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed && parsed.scenarios && parsed.currentScenario) {
                if (confirm('現在のデータを上書きしてJSONを復元しますか？')) {
                    pushHistory();
                    allData = parsed;
                    editingScenarioId = null;
                    save();
                    renderAll();
                    showToast('JSON復元完了');
                }
            } else { alert('不正なJSON形式'); }
        } catch (err) { alert('読込失敗'); }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function resetAllData() {
    if (confirm('データを初期化してサンプルに戻しますか？')) {
        pushHistory();
        localStorage.removeItem(STORAGE_KEY);
        allData = JSON.parse(JSON.stringify(defaultData));
        renderAll();
        showToast('初期化しました');
    }
}

function deleteCheckedScenarios() {
    const cur = getCur();
    const checkedIds = Object.keys(cur.sentIds).filter(id => cur.sentIds[id]);
    if (checkedIds.length === 0) { showToast('送信済み（チェック付）項目なし'); return; }
    if (!confirm(`送信済み ${checkedIds.length} 件を削除しますか？`)) return;
    pushHistory();
    const removeSet = new Set(checkedIds);
    cur.scenariosList = cur.scenariosList.filter(s => !removeSet.has(s.id));
    checkedIds.forEach(id => {
        delete cur.sentIds[id];
        delete collapsedSentIds[id];
    });
    if (editingScenarioId && removeSet.has(editingScenarioId)) editingScenarioId = null;
    save(); renderScenarios(); showToast(`${checkedIds.length} 件削除しました`);
}

function resetAllChecks() {
    const cur = getCur();
    if (Object.keys(cur.sentIds).length === 0) { showToast('解除するチェックなし'); return; }
    if (confirm('すべての送信済みチェックを解除しますか？')) {
        pushHistory();
        cur.sentIds = {};
        collapsedSentIds = {};
        save(); renderScenarios(); showToast('全解除完了');
    }
}

if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    try {
        showToast('ファイル読み込み中...');
        if (name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            document.getElementById('importPreview').value = result.value;
            showToast('.docx 抽出完了');
        } else if (name.endsWith('.pdf')) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
            }
            document.getElementById('importPreview').value = fullText;
            showToast('.pdf 抽出完了');
        } else {
            const reader = new FileReader();
            reader.onload = function(evt) { document.getElementById('importPreview').value = evt.target.result; showToast('テキスト読込完了'); };
            reader.readAsText(file);
        }
    } catch (err) { showToast('解析エラーが発生しました'); }
});

function parseAndImportText() {
    const raw = document.getElementById('importPreview').value;
    if (!raw.trim()) { showToast('テキストが空です'); return; }
    pushHistory();
    const cur = getCur();
    const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
    const targetTab = cur.currentTab || cur.tabs[0] || '共通';
    lines.forEach((line, idx) => {
        const text = line.trim();
        let speaker = 'KP';
        let content = text;
        const colonMatch = text.match(/^(PC\d+|KP|GM)[：:]\s*(.*)$/i);
        if (colonMatch) {
            const sp = colonMatch[1].toUpperCase();
            speaker = sp === 'GM' ? 'KP' : sp;
            content = colonMatch[2];
        }
        cur.scenariosList.push({ id: 'imp_' + Date.now() + '_' + idx, tab: targetTab, speaker: speaker, text: content });
    });
    document.getElementById('importPreview').value = '';
    document.getElementById('fileInput').value = '';
    save(); renderScenarios(); showToast(`${lines.length} 件インポート完了`);
}

function renderScenarioSelector() {
    const sel = document.getElementById('scenarioSelect');
    sel.innerHTML = '';
    Object.keys(allData.scenarios).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = allData.scenarios[key].title;
        if (key === allData.currentScenario) opt.selected = true;
        sel.appendChild(opt);
    });
}

function switchScenario(key) {
    allData.currentScenario = key;
    editingScenarioId = null;
    save(); renderAll();
}

function addScenario() {
    const name = prompt('新しいシナリオ名:');
    if (name && name.trim()) {
        pushHistory();
        const key = 'sc_' + Date.now();
        allData.scenarios[key] = {
            title: name.trim(),
            tabs: ['共通', 'PC1', 'KP用', '情報'],
            currentTab: '共通',
            customItems: { '共通': [{ label: '移動宣言', text: '【宣言】移動します' }], 'PC1': [], 'KP用': [], '情報': [] },
            scenariosList: [],
            sentIds: {}
        };
        allData.currentScenario = key;
        editingScenarioId = null;
        save(); renderAll();
    }
}

function renderTabs() {
    const cur = getCur();
    const bar = document.getElementById('tabBar');
    bar.innerHTML = '';
    cur.tabs.forEach(tab => {
        const item = document.createElement('div');
        item.className = `tab-item ${tab === cur.currentTab ? 'active' : ''}`;
        const btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.textContent = tab;
        btn.onclick = () => { cur.currentTab = tab; save(); renderTabs(); renderGrid(); };
        const editBtn = document.createElement('button');
        editBtn.className = 'tab-edit-mini';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'タブ名変更/削除';
        editBtn.onclick = (e) => { e.stopPropagation(); editTab(tab); };
        item.appendChild(btn); item.appendChild(editBtn); bar.appendChild(item);
    });
}

function addTab() {
    const cur = getCur();
    const name = prompt('追加するタブ名:');
    if (name && name.trim()) {
        pushHistory();
        const clean = name.trim();
        if (!cur.tabs.includes(clean)) cur.tabs.push(clean);
        if (!cur.customItems[clean]) cur.customItems[clean] = [];
        cur.currentTab = clean;
        save(); renderAll();
    }
}

function editTab(oldName) {
    const cur = getCur();
    const action = prompt(`タブ「${oldName}」の操作（新名を入力 / 「DEL」で削除）`, oldName);
    if (action === null) return;
    const newName = action.trim();
    if (newName === '' || newName.toLowerCase() === 'del') {
        if (cur.tabs.length <= 1) { alert('最後のタブは削除できません'); return; }
        if (!confirm(`タブ「${oldName}」を削除しますか？`)) return;
        pushHistory();
        cur.tabs = cur.tabs.filter(t => t !== oldName);
        delete cur.customItems[oldName];
        const fallbackTab = cur.tabs[0] || '共通';
        cur.scenariosList.forEach(s => { if (s.tab === oldName) s.tab = fallbackTab; });
        if (cur.currentTab === oldName) cur.currentTab = fallbackTab;
        save(); renderAll(); showToast('タブを削除しました');
        return;
    }
    if (newName !== oldName) {
        if (cur.tabs.includes(newName)) { alert('同名タブが既に存在します'); return; }
        pushHistory();
        const idx = cur.tabs.indexOf(oldName);
        if (idx !== -1) cur.tabs[idx] = newName;
        if (cur.customItems[oldName]) { cur.customItems[newName] = cur.customItems[oldName]; delete cur.customItems[oldName]; }
        cur.scenariosList.forEach(s => { if (s.tab === oldName) s.tab = newName; });
        if (cur.currentTab === oldName) cur.currentTab = newName;
        save(); renderAll(); showToast('タブ名を変更しました');
    }
}

function deleteItem(idx) {
    pushHistory();
    getCur().customItems[getCur().currentTab].splice(idx, 1);
    save(); renderGrid();
}

window.changeItemTab = function(id, newTab) {
    const cur = getCur();
    const item = cur.scenariosList.find(s => s.id === id);
    if (!item || item.tab === newTab) return;
    pushHistory(); item.tab = newTab; save(); renderScenarios();
};

window.insertScenarioItemAfter = function(id) {
    const cur = getCur();
    const idx = cur.scenariosList.findIndex(s => s.id === id);
    if (idx === -1) return;
    const currentItem = cur.scenariosList[idx];
    const speaker = prompt('話者:', currentItem.speaker || 'KP');
    if (speaker === null) return;
    const text = prompt('本文:');
    if (text === null || !text.trim()) return;
    pushHistory();
    cur.scenariosList.splice(idx + 1, 0, { id: 'ins_' + Date.now(), tab: currentItem.tab, speaker: speaker.trim() || 'KP', text: text });
    save(); renderScenarios(); showToast('項目を挿入しました');
};

window.makeItemIndexByFirstChar = function(id) {
    const cur = getCur();
    const item = cur.scenariosList.find(s => s.id === id);
    if (!item || !item.text) return;
    pushHistory();
    item.isIndex = true;
    item.indexTitle = item.text.trim().slice(0, 8);
    save(); renderScenarios(); showToast('目次ピン留めしました');
};

window.editIndexTitle = function(id) {
    const cur = getCur();
    const item = cur.scenariosList.find(s => s.id === id);
    if (!item) return;
    const currentTitle = item.indexTitle || item.text.trim().slice(0, 8);
    const newTitle = prompt('目次タイトル（縦書き用 4〜6文字推奨）:', currentTitle);
    if (newTitle !== null) {
        pushHistory();
        item.isIndex = true;
        item.indexTitle = newTitle.trim() || currentTitle;
        save(); renderScenarios(); showToast('目次名更新');
    }
};

window.removeIndexStatus = function(headerId) {
    const cur = getCur();
    const item = cur.scenariosList.find(s => s.id === headerId);
    if (!item) return;
    pushHistory(); item.isIndex = false; delete item.indexTitle; save(); renderScenarios(); showToast('目次解除');
};

window.editScenarioItem = function(id) { editingScenarioId = id; renderScenarios(); };
window.cancelInlineEdit = function() { editingScenarioId = null; renderScenarios(); };
window.saveInlineEdit = function(id) {
    const cur = getCur();
    const item = cur.scenariosList.find(s => s.id === id);
    if (!item) return;
    const speakerInput = document.getElementById(`edit-speaker-${id}`);
    const textInput = document.getElementById(`edit-text-${id}`);
    if (speakerInput && textInput) {
        pushHistory();
        item.speaker = speakerInput.value.trim() || 'KP';
        item.text = textInput.value;
        if (!item.indexTitle && item.isIndex) {
            item.indexTitle = item.text.trim().slice(0, 8);
        }
        save(); showToast('保存しました');
    }
    editingScenarioId = null; renderScenarios();
};

window.mergeScenarioItemNext = function(id) {
    const cur = getCur();
    const idx = cur.scenariosList.findIndex(s => s.id === id);
    if (idx === -1 || idx === cur.scenariosList.length - 1) return;
    const currentItem = cur.scenariosList[idx];
    const nextItem = cur.scenariosList[idx + 1];
    if (!confirm('下段の項目と結合しますか？')) return;
    pushHistory();
    currentItem.text = currentItem.text + '\n' + nextItem.text;
    cur.scenariosList.splice(idx + 1, 1);
    delete cur.sentIds[nextItem.id];
    delete collapsedSentIds[nextItem.id];
    save(); renderScenarios(); showToast('結合しました');
};

window.splitScenarioItem = function(id) {
    const cur = getCur();
    const item = cur.scenariosList.find(s => s.id === id);
    if (!item) return;
    pushHistory();
    const pos = Math.floor(item.text.length / 2);
    const idx = cur.scenariosList.findIndex(s => s.id === id);
    const newItem1 = { ...item, text: item.text.slice(0, pos) };
    const newItem2 = { id: 'split_' + Date.now(), tab: item.tab, speaker: item.speaker, text: item.text.slice(pos) };
    cur.scenariosList.splice(idx, 1, newItem1, newItem2);
    save(); renderScenarios(); showToast('分割しました');
};

window.moveScenarioItem = function(id, direction) {
    const cur = getCur();
    const idx = cur.scenariosList.findIndex(s => s.id === id);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= cur.scenariosList.length) return;
    pushHistory();
    const item = cur.scenariosList.splice(idx, 1)[0];
    cur.scenariosList.splice(targetIdx, 0, item);
    save(); renderScenarios();
};

window.deleteScenarioItem = function(id) {
    if (!confirm('この項目を削除しますか？')) return;
    pushHistory();
    const cur = getCur();
    cur.scenariosList = cur.scenariosList.filter(s => s.id !== id);
    delete cur.sentIds[id];
    delete collapsedSentIds[id];
    if (editingScenarioId === id) editingScenarioId = null;
    save(); renderScenarios(); showToast('削除しました');
};

window.toggleCollapseSent = function(e, id) {
    e.stopPropagation();
    collapsedSentIds[id] = !collapsedSentIds[id];
    renderScenarios();
};

window.toggleAllSentCollapse = function() {
    const cur = getCur();
    const sentList = (cur.scenariosList || []).filter(s => cur.sentIds[s.id]);
    const allCollapsed = sentList.length > 0 && sentList.every(s => collapsedSentIds[s.id]);
    sentList.forEach(s => {
        collapsedSentIds[s.id] = !allCollapsed;
    });
    renderScenarios();
    showToast(allCollapsed ? '送信済みを展開' : '送信済みを折り畳み');
};

let toastTimer = null;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerHTML = `<span>✨</span> <span>${escapeHTML(msg)}</span>`;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove('show'); }, 1800);
}

function copy(text) {
    navigator.clipboard.writeText(text).then(() => showToast('クリップボードにコピー'));
}

function renderGrid() {
    const cur = getCur();
    const grid = document.getElementById('buttonGrid');
    grid.innerHTML = '';
    const items = cur.customItems[cur.currentTab] || [];
    items.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'grid-btn';
        div.innerHTML = `<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(item.label)}</span><button class="del-btn" onclick="event.stopPropagation(); deleteItem(${idx})" title="削除">✕</button>`;
        div.onclick = () => copy(item.text);
        grid.appendChild(div);
    });
}

function renderScenarioIndex(originalList) {
    const indexBar = document.getElementById('scenarioIndexBar');
    if (!indexBar) return;
    indexBar.innerHTML = '';
    const indexItems = originalList.filter(s => s.isIndex || s.indexTitle);
    
    const allBtn = document.createElement('button');
    allBtn.className = 'index-action-btn';
    allBtn.textContent = 'TOP';
    allBtn.style.height = '58px';
    allBtn.onclick = () => { document.getElementById('scenarioList').scrollTo({ top: 0, behavior: 'smooth' }); };
    indexBar.appendChild(allBtn);

    indexItems.forEach(item => {
        const titleText = item.indexTitle || (item.text || '').slice(0, 6);
        const group = document.createElement('div');
        group.className = 'index-item-group';
        
        const btn = document.createElement('button');
        btn.className = 'index-action-btn';
        btn.textContent = titleText.slice(0, 5);
        btn.title = `ジャンプ: ${titleText}`;
        btn.onclick = () => {
            const el = document.querySelector(`.scenario-item[data-id="${item.id}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        const unifiedBtn = document.createElement('button');
        unifiedBtn.className = 'index-unified-btn';
        unifiedBtn.textContent = '✎⚙';
        unifiedBtn.title = '目次操作（編集・解除）';
        unifiedBtn.onclick = (e) => {
            e.stopPropagation();
            const choice = prompt(`目次「${titleText}」の操作:\n1 or 空白: 目次名義を編集\ndel: 目次ピン留めを解除`, '1');
            if (choice === null) return;
            if (choice.trim().toLowerCase() === 'del' || choice.trim() === '×') {
                removeIndexStatus(item.id);
            } else {
                editIndexTitle(item.id);
            }
        };

        group.appendChild(btn);
        group.appendChild(unifiedBtn);
        indexBar.appendChild(group);
    });
}

function renderScenarios() {
    const cur = getCur();
    const list = document.getElementById('scenarioList');
    list.innerHTML = '';
    const allScenarios = cur.scenariosList || [];
    const sentCount = allScenarios.filter(s => cur.sentIds[s.id]).length;
    const progressEl = document.getElementById('scenarioProgress');
    if (progressEl) progressEl.textContent = `${sentCount}/${allScenarios.length}`;

    const searchInput = document.getElementById('scenarioSearchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    renderScenarioIndex(allScenarios);

    let filteredScenarios = allScenarios;
    if (query) {
        filteredScenarios = filteredScenarios.filter(item => {
            return (item.speaker && item.speaker.toLowerCase().includes(query)) ||
                   (item.text && item.text.toLowerCase().includes(query));
        });
    }

    filteredScenarios.forEach(item => {
        const isSent = !!cur.sentIds[item.id];
        const isCollapsed = isSent && !!collapsedSentIds[item.id];
        const isEditing = editingScenarioId === item.id;
        const div = document.createElement('div');
        div.className = `scenario-item ${isSent ? 'sent' : ''} ${isCollapsed ? 'collapsed' : ''} ${isEditing ? 'editing' : ''}`;
        div.setAttribute('data-id', item.id);
        let tabOptionsHTML = cur.tabs.map(t => `<option value="${escapeHTML(t)}" ${item.tab === t ? 'selected' : ''}>${escapeHTML(t)}</option>`).join('');

        if (isEditing) {
            div.innerHTML = `
                <div class="inline-edit-box" onclick="event.stopPropagation()">
                    <input type="text" id="edit-speaker-${item.id}" value="${escapeAttr(item.speaker)}" placeholder="話者">
                    <textarea id="edit-text-${item.id}" rows="3">${escapeHTML(item.text)}</textarea>
                    <div style="display:flex; justify-content:flex-end; gap:4px;">
                        <button onclick="cancelInlineEdit()">キャンセル</button>
                        <button onclick="saveInlineEdit('${item.id}')" style="background:var(--primary); color:#fff; border:none;">保存</button>
                    </div>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="scenario-header-row">
                    <div style="display:flex; gap:6px; align-items:center;">
                        <input type="checkbox" ${isSent ? 'checked' : ''} onchange="toggleCheck(event, '${item.id}')" style="width:14px; height:14px; cursor:pointer;">
                        <span class="speaker-badge">${escapeHTML(item.speaker)}</span>
                        ${isSent ? `<span style="color:var(--accent-green); font-size:0.6rem; font-weight:600;">✓ 送信済</span>` : ''}
                        ${isCollapsed ? `<span style="color:var(--text-muted); font-size:0.65rem; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">：${escapeHTML(item.text).split('\n')[0]}</span>` : ''}
                    </div>
                    ${isSent ? `<button onclick="toggleCollapseSent(event, '${item.id}')" class="action-sub-btn">${isCollapsed ? '▶ 展開' : '▼ 畳む'}</button>` : ''}
                </div>
                <div class="scenario-body">${escapeHTML(item.text)}</div>
                <div class="scenario-actions-top">
                    <div class="actions-row">
                        <select class="item-tab-select" onclick="event.stopPropagation()" onchange="changeItemTab('${item.id}', this.value)">${tabOptionsHTML}</select>
                        <button class="action-sub-btn" onclick="event.stopPropagation(); makeItemIndexByFirstChar('${item.id}')" title="縦書き目次へピン留め">📌目次</button>
                        ${item.isIndex || item.indexTitle ? `<button class="action-sub-btn" onclick="event.stopPropagation(); editIndexTitle('${item.id}')">✎目次名</button>` : ''}
                        <button class="action-sub-btn" onclick="event.stopPropagation(); insertScenarioItemAfter('${item.id}')">+挿入</button>
                        <button class="action-sub-btn" onclick="event.stopPropagation(); moveScenarioItem('${item.id}', -1)">⬆️</button>
                        <button class="action-sub-btn" onclick="event.stopPropagation(); moveScenarioItem('${item.id}', 1)">⬇️</button>
                    </div>
                    <div class="actions-row">
                        <button class="action-sub-btn" onclick="event.stopPropagation(); editScenarioItem('${item.id}')">✏️編集</button>
                        <button class="action-sub-btn" onclick="event.stopPropagation(); mergeScenarioItemNext('${item.id}')">↓結合</button>
                        <button class="action-sub-btn" onclick="event.stopPropagation(); splitScenarioItem('${item.id}')">✂️分割</button>
                        <button class="action-sub-btn" style="color:var(--accent-red); border-color:rgba(239,68,68,0.3);" onclick="event.stopPropagation(); deleteScenarioItem('${item.id}')">✕</button>
                    </div>
                </div>
            `;
            div.onclick = (e) => {
                if (['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
                const payload = item.speaker === 'KP' ? item.text : `${item.speaker}：${item.text}`;
                cur.sentIds[item.id] = true;
                save(); copy(payload); renderScenarios();
            };
        }
        list.appendChild(div);
    });
}

window.toggleCheck = function(e, id) {
    e.stopPropagation();
    const cur = getCur();
    if (cur.sentIds[id]) {
        delete cur.sentIds[id];
        delete collapsedSentIds[id];
    } else {
        cur.sentIds[id] = true;
    }
    save(); renderScenarios();
};

function escapeHTML(str) {
    return String(str || '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}
function escapeAttr(str) { return String(str || '').replace(/"/g, '&quot;'); }

function renderAll() {
    try {
        renderScenarioSelector();
        renderTabs();
        renderGrid();
        renderScenarios();
    } catch (e) {
        console.error('Render error:', e);
    }
}

renderAll();
