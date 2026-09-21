const STORAGE_KEY = 'sumaho_coco_multiscenario_v11';
let editingScenarioId = null;
let activeIndexId = null;

const defaultData = {
    currentScenario: 'sample_scenario',
    scenarios: {
        'sample_scenario': {
            title: '生物ユニット 55（サンプル）',
            tabs: ['共通', 'PC1', 'KP用', '情報', '描写'],
            currentTab: '情報',
            customItems: {
                '共通': [{ label: '移動宣言', text: '【宣言】移動します' }],
                'PC1': [{ label: '目星', text: '1d100<=70 目星' }],
                'KP用': [{ label: 'シークレット', text: '【KP】シークレットダイス' }],
                '情報': [],
                '描写': []
            },
            scenariosList: [
                { id: 's1', tab: '情報', speaker: 'KP', text: '《施設情報》この施設は「財団」と呼ばれる組織の運営する研究施設であり、名称を「生物ユニット 55」という。' },
                { id: 's2', tab: '描写', speaker: 'KP', text: '【導入シーン】薄暗いロビーに足を踏み入れると、不気味な静寂が迎えてくれる。' }
            ],
            sentIds: {}
        }
    }
};

let allData;
try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('sumaho_coco_multiscenario_v10') || localStorage.getItem('sumaho_coco_multiscenario_v9');
    allData = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(defaultData));
    if (!allData.scenarios) allData = JSON.parse(JSON.stringify(defaultData));
} catch (e) {
    console.error('LocalStorage load error, resetting...', e);
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
        showToast('保存容量オーバーの可能性があります');
    }
}

function exportDataJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sumaho_coco_backup_${Date.now()}.json`);
    dlAnchorElem.click();
    showToast('JSONファイルを書き出しました');
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
                    allData = parsed;
                    editingScenarioId = null;
                    activeIndexId = null;
                    save();
                    renderAll();
                    showToast('JSONデータを復元しました');
                }
            } else {
                alert('不正な形式のJSONファイルです');
            }
        } catch (err) {
            alert('JSONファイルの読み込みに失敗しました');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function resetAllData() {
    if (confirm('データを初期化してサンプルに戻しますか？')) {
        localStorage.removeItem(STORAGE_KEY);
        allData = JSON.parse(JSON.stringify(defaultData));
        activeIndexId = null;
        renderAll();
        showToast('初期化しました');
    }
}

function clearAllScenarios() {
    const cur = getCur();
    if (confirm('このシナリオの登録シナリオをすべて削除しますか？')) {
        cur.scenariosList = [];
        cur.sentIds = {};
        editingScenarioId = null;
        activeIndexId = null;
        save();
        renderScenarios();
        showToast('シナリオをクリアしました');
    }
}

function resetAllChecks() {
    const cur = getCur();
    if (Object.keys(cur.sentIds).length === 0) {
        showToast('解除するチェックはありません');
        return;
    }
    if (confirm('すべてのチェック（送信済み状態）を解除しますか？')) {
        cur.sentIds = {};
        save();
        renderScenarios();
        showToast('チェックを全解除しました');
    }
}

document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const name = file.name.toLowerCase();

    try {
        showToast('読み込み中...');
        if (name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            document.getElementById('importPreview').value = result.value;
            showToast('Word(.docx)抽出完了');
        } else if (name.endsWith('.pdf')) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }
            document.getElementById('importPreview').value = fullText;
            showToast('PDF抽出完了');
        } else {
            const reader = new FileReader();
            reader.onload = function(evt) {
                document.getElementById('importPreview').value = evt.target.result;
                showToast('テキスト読込完了');
            };
            reader.readAsText(file);
        }
    } catch (err) {
        console.error(err);
        showToast('ファイル解析エラー');
    }
});

function parseAndImportText() {
    const raw = document.getElementById('importPreview').value;
    if (!raw.trim()) return;
    const cur = getCur();
    const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
    const targetTab = cur.currentTab || cur.tabs[0] || '共通';
    
    lines.forEach((line, idx) => {
        let speaker = 'KP';
        let text = line.trim();
        const colonMatch = line.match(/^(PC\d+|KP|GM)[：:]\s*(.*)$/i);
        const bracketMatch = line.match(/^【(.*?)】\s*(.*)$/);

        if (colonMatch) {
            speaker = colonMatch.toUpperCase();
            text = colonMatch;
        } else if (bracketMatch) {
            speaker = 'KP';
            text = line.trim();
        }

        cur.scenariosList.push({
            id: 'imp_' + Date.now() + '_' + idx,
            tab: targetTab,
            speaker: speaker,
            text: text
        });
    });

    document.getElementById('importPreview').value = '';
    document.getElementById('fileInput').value = '';
    activeIndexId = null;
    save();
    renderScenarios();
    showToast('テキスト登録完了！');
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
    activeIndexId = null;
    save();
    renderAll();
}

function addScenario() {
    const name = prompt('新しいシナリオ名を入力してください:');
    if (name && name.trim()) {
        const key = 'sc_' + Date.now();
        allData.scenarios[key] = {
            title: name.trim(),
            tabs: ['共通', 'PC1', 'KP用', '情報'],
            currentTab: '共通',
            customItems: {
                '共通': [{ label: '移動宣言', text: '【宣言】移動します' }],
                'PC1': [], 'KP用': [], '情報': []
            },
            scenariosList: [],
            sentIds: {}
        };
        allData.currentScenario = key;
        editingScenarioId = null;
        activeIndexId = null;
        save();
        renderAll();
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
        editBtn.title = 'タブ名変更・削除';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editTab(tab);
        };

        item.appendChild(btn);
        item.appendChild(editBtn);
        bar.appendChild(item);
    });
}

function addTab() {
    const cur = getCur();
    const name = prompt('追加するタブ名（例: PC2, 敵A）:');
    if (name && name.trim()) {
        const clean = name.trim();
        if (!cur.tabs.includes(clean)) cur.tabs.push(clean);
        if (!cur.customItems[clean]) cur.customItems[clean] = [];
        cur.currentTab = clean;
        save(); renderAll();
    }
}

function editTab(oldName) {
    const cur = getCur();
    const action = prompt(`タブ「${oldName}」の操作:\n・名前を変更する場合は新しい名前を入力\n・「DEL」または空欄で削除`, oldName);
    
    if (action === null) return;
    const newName = action.trim();
    if (newName === '' || newName.toLowerCase() === 'del') {
        if (cur.tabs.length <= 1) {
            alert('最後のタブは削除できません');
            return;
        }
        if (!confirm(`タブ「${oldName}」を削除しますか？`)) return;

        cur.tabs = cur.tabs.filter(t => t !== oldName);
        delete cur.customItems[oldName];
        const fallbackTab = cur.tabs[0] || '共通';
        cur.scenariosList.forEach(s => {
            if (s.tab === oldName) s.tab = fallbackTab;
        });

        if (cur.currentTab === oldName) {
            cur.currentTab = fallbackTab;
        }
        save();
        renderAll();
        showToast(`タブ「${oldName}」削除完了`);
        return;
    }

    if (newName !== oldName) {
        if (cur.tabs.includes(newName)) {
            alert('同名のタブが既に存在します');
            return;
        }
        const idx = cur.tabs.indexOf(oldName);
        if (idx !== -1) cur.tabs[idx] = newName;
        if (cur.customItems[oldName]) {
            cur.customItems[newName] = cur.customItems[oldName];
            delete cur.customItems[oldName];
        }
        cur.scenariosList.forEach(s => {
            if (s.tab === oldName) s.tab = newName;
        });
        if (cur.currentTab === oldName) {
            cur.currentTab = newName;
        }
        save();
        renderAll();
        showToast(`タブ名を「${newName}」に変更`);
    }
}

function deleteItem(idx) {
    const cur = getCur();
    cur.customItems[cur.currentTab].splice(idx, 1);
    save(); renderGrid();
}

window.changeItemTab = function(id, newTab) {
    const cur = getCur();
    const item = cur.scenariosList.find(s => s.id === id);
    if (!item) return;
    item.tab = newTab;
    save();
    renderScenarios();
    showToast(`タブを「${newTab}」に変更`);
};

window.insertScenarioItemAfter = function(id) {
    const cur = getCur();
    const idx = cur.scenariosList.findIndex(s => s.id === id);
    if (idx === -1) return;
    const currentItem = cur.scenariosList[idx];
    
    const speaker = prompt('挿入する話者:', currentItem.speaker || 'KP');
    if (speaker === null) return;
    const text = prompt('挿入する本文:');
    if (text === null || !text.trim()) return;
    
    const newItem = {
        id: 'ins_' + Date.now(),
        tab: currentItem.tab,
        speaker: speaker.trim() || 'KP',
        text: text
    };
    cur.scenariosList.splice(idx + 1, 0, newItem);
    save();
    renderScenarios();
    showToast('途中に挿入しました');
};

window.addNewIndexBlock = function() {
    const cur = getCur();
    const titleInput = prompt('新しい目次名（例: 【調査フェイズ】 or 《魔力の痕跡》）:');
    if (titleInput === null || !titleInput.trim()) return;
    
    const rawTitle = titleInput.trim();
    const formattedHeading = (/^[【《].*?[】》]/.test(rawTitle)) ? rawTitle : `【${rawTitle}】`;

    const speaker = prompt('話者:', 'KP');
    if (speaker === null) return;
    const textBody = prompt('目次項目の本文（任意、空欄可）:');
    if (textBody === null) return;

    const fullText = textBody.trim() ? `${formattedHeading}${textBody.trim()}` : formattedHeading;
    const targetTab = cur.currentTab || cur.tabs[0] || '共通';

    const newItem = {
        id: 'idx_' + Date.now(),
        tab: targetTab,
        speaker: speaker.trim() || 'KP',
        text: fullText
    };

    cur.scenariosList.push(newItem);
    save();
    renderScenarios();
    showToast('新しい目次を追加しました');
};

window.insertUnderIndex = function(targetId) {
    const cur = getCur();
    const idx = cur.scenariosList.findIndex(s => s.id === targetId);
    if (idx === -1) return;
    
    let insertPos = idx + 1;
    while (insertPos < cur.scenariosList.length) {
        const s = cur.scenariosList[insertPos];
        const firstLine = (s.text || '').split('\n')[0].trim();
        if (/^[【《].*?[】》]/.test(firstLine)) break;
        insertPos++;
    }

    const currentItem = cur.scenariosList[idx];
    const speaker = prompt('話者:', currentItem.speaker || 'KP');
    if (speaker === null) return;
    const text = prompt('追加する本文:');
    if (text === null || !text.trim()) return;

    const newItem = {
        id: 'ins_' + Date.now(),
        tab: currentItem.tab,
        speaker: speaker.trim() || 'KP',
        text: text
    };

    cur.scenariosList.splice(insertPos, 0, newItem);
    save();
    renderScenarios();
    showToast('目次ブロック内に追加しました');
};

window.editScenarioItem = function(id) {
    editingScenarioId = id;
    renderScenarios();
};

window.saveInlineEdit = function(id) {
    const cur = getCur();
    const item = cur.scenariosList.find(s => s.id === id);
    if (!item) return;
    const speakerInput = document.getElementById(`edit-speaker-${id}`);
    const textInput = document.getElementById(`edit-text-${id}`);
    if (speakerInput && textInput) {
        item.speaker = speakerInput.value.trim() || 'KP';
        item.text = textInput.value;
        save();
        showToast('保存しました');
    }
    editingScenarioId = null;
    renderScenarios();
};

window.cancelInlineEdit = function() {
    editingScenarioId = null;
    renderScenarios();
};

window.mergeScenarioItemNext = function(id) {
    const cur = getCur();
    const idx = cur.scenariosList.findIndex(s => s.id === id);
    if (idx === -1 || idx === cur.scenariosList.length - 1) {
        showToast('下に結合できる項目がありません');
        return;
    }
    const currentItem = cur.scenariosList[idx];
    const nextItem = cur.scenariosList[idx + 1];
    if (!confirm(`「${currentItem.text.slice(0, 15)}...」と下の項目を結合しますか？`)) return;
    
    currentItem.text = currentItem.text + '\n' + nextItem.text;
    cur.scenariosList.splice(idx + 1, 1);
    delete cur.sentIds[nextItem.id];
    save();
    renderScenarios();
    showToast('結合完了');
};

window.splitScenarioItem = function(id, event) {
    const cur = getCur();
    const item = cur.scenariosList.find(s => s.id === id);
    if (!item) return;

    if (item.text.includes('\n')) {
        const lines = item.text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (lines.length > 1) {
            if (!confirm(`この項目を ${lines.length} 個の行に分割しますか？`)) return;
            const idx = cur.scenariosList.findIndex(s => s.id === id);
            const newItems = lines.map((l, i) => ({
                id: 'split_' + Date.now() + '_' + i,
                tab: item.tab,
                speaker: item.speaker,
                text: l
            }));
            cur.scenariosList.splice(idx, 1, ...newItems);
            delete cur.sentIds[id];
            save();
            renderScenarios();
            showToast('行で分割完了');
            return;
        }
    }
    const pos = Math.floor(item.text.length / 2);
    const idx = cur.scenariosList.findIndex(s => s.id === id);
    const firstText = item.text.slice(0, pos);
    const secondText = item.text.slice(pos);
    const newItem1 = { ...item, text: firstText };
    const newItem2 = { id: 'split_' + Date.now(), tab: item.tab, speaker: item.speaker, text: secondText };
    cur.scenariosList.splice(idx, 1, newItem1, newItem2);
    save();
    renderScenarios();
    showToast('分割完了');
};

window.moveScenarioItem = function(id, direction) {
    const cur = getCur();
    const idx = cur.scenariosList.findIndex(s => s.id === id);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= cur.scenariosList.length) return;

    const item = cur.scenariosList.splice(idx, 1)[0];
    cur.scenariosList.splice(targetIdx, 0, item);
    save();
    renderScenarios();
};

window.deleteScenarioItem = function(id) {
    const cur = getCur();
    cur.scenariosList = cur.scenariosList.filter(s => s.id !== id);
    delete cur.sentIds[id];
    if (editingScenarioId === id) editingScenarioId = null;
    save();
    renderScenarios();
};

let toastTimer = null;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = `コピー: ${msg}`;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        t.classList.remove('show');
    }, 1500);
}

function copy(text) {
    navigator.clipboard.writeText(text).then(() => showToast(text));
}

function renderGrid() {
    const cur = getCur();
    const grid = document.getElementById('buttonGrid');
    grid.innerHTML = '';
    const items = cur.customItems[cur.currentTab] || [];
    items.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'btn';
        div.innerHTML = `${escapeHTML(item.label)}<button class="del-btn" onclick="event.stopPropagation(); deleteItem(${idx})">✕</button>`;
        div.onclick = () => copy(item.text);
        grid.appendChild(div);
    });
}

function renderScenarioIndex(originalList) {
    const indexBar = document.getElementById('scenarioIndexBar');
    if (!indexBar) return;
    indexBar.innerHTML = '';

    const addMainBtn = document.createElement('button');
    addMainBtn.className = 'index-add-main-btn';
    addMainBtn.textContent = '+目次追加';
    addMainBtn.title = '新しい目次項目を追加';
    addMainBtn.onclick = () => addNewIndexBlock();
    indexBar.appendChild(addMainBtn);

    const indexItems = originalList.filter(s => {
        const firstLine = (s.text || '').split('\n')[0].trim();
        return /^[【《].*?[】》]/.test(firstLine);
    });

    const allBtn = document.createElement('button');
    allBtn.className = 'scenario-action-btn scenario-index-btn';
    allBtn.textContent = '全表示';
    allBtn.style.background = activeIndexId === null ? 'var(--primary)' : 'var(--bg)';
    allBtn.style.color = activeIndexId === null ? '#fff' : 'var(--text-muted)';
    allBtn.onclick = () => {
        activeIndexId = null;
        renderScenarios();
    };
    indexBar.appendChild(allBtn);

    indexItems.forEach(item => {
        const firstLine = item.text.split('\n')[0].trim();
        const group = document.createElement('div');
        group.className = 'index-item-group';

        const btn = document.createElement('button');
        btn.className = 'scenario-action-btn scenario-index-btn';
        btn.textContent = firstLine.slice(0, 10);
        btn.title = firstLine;
        const isSelected = activeIndexId === item.id;
        btn.style.background = isSelected ? 'var(--primary)' : 'var(--bg)';
        btn.style.color = isSelected ? '#fff' : 'var(--text-muted)';
        
        btn.onclick = () => {
            if (activeIndexId === item.id) {
                const el = document.querySelector(`.scenario-item[data-id="${item.id}"]`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                activeIndexId = item.id;
                renderScenarios();
                const el = document.querySelector(`.scenario-item[data-id="${item.id}"]`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };

        const addSubBtn = document.createElement('button');
        addSubBtn.className = 'index-add-sub-btn';
        addSubBtn.textContent = '+直下追加';
        addSubBtn.title = 'この目次セクション内に追加';
        addSubBtn.onclick = (e) => {
            e.stopPropagation();
            insertUnderIndex(item.id);
        };

        group.appendChild(btn);
        group.appendChild(addSubBtn);
        indexBar.appendChild(group);
    });
}

function renderScenarios() {
    const cur = getCur();
    const list = document.getElementById('scenarioList');
    list.innerHTML = '';
    const allScenarios = cur.scenariosList || [];
    
    const sentCount = allScenarios.filter(s => cur.sentIds[s.id]).length;
    document.getElementById('scenarioProgress').textContent = `${sentCount} / ${allScenarios.length} 完了`;

    const searchInput = document.getElementById('scenarioSearchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    renderScenarioIndex(allScenarios);

    let filteredScenarios = allScenarios;

    if (activeIndexId) {
        const startIdx = allScenarios.findIndex(s => s.id === activeIndexId);
        if (startIdx !== -1) {
            const sliced = [];
            for (let i = startIdx; i < allScenarios.length; i++) {
                const s = allScenarios[i];
                const isHeading = i > startIdx && /^[【《].*?[】》]/.test((s.text || '').split('\n')[0].trim());
                if (isHeading) break;
                sliced.push(s);
            }
            filteredScenarios = sliced;
        } else {
            activeIndexId = null;
        }
    }

    if (query) {
        filteredScenarios = filteredScenarios.filter(item => {
            return (item.speaker && item.speaker.toLowerCase().includes(query)) ||
                   (item.text && item.text.toLowerCase().includes(query));
        });
    }

    if (filteredScenarios.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:16px;">該当する文章はありません</div>';
        return;
    }

    filteredScenarios.forEach(item => {
        const isSent = !!cur.sentIds[item.id];
        const isEditing = editingScenarioId === item.id;
        const div = document.createElement('div');
        div.className = `scenario-item ${isSent ? 'sent' : ''} ${isEditing ? 'editing' : ''}`;
        div.setAttribute('data-id', item.id);
        
        let tabOptionsHTML = cur.tabs.map(t => `<option value="${escapeHTML(t)}" ${item.tab === t ? 'selected' : ''}>${escapeHTML(t)}</option>`).join('');

        if (isEditing) {
            div.innerHTML = `
                <div style="width:100%; display:flex; flex-direction:column; gap:6px;" onclick="event.stopPropagation()">
                    <div style="display:flex; gap:6px; align-items:center;">
                        <label style="font-size:0.65rem; color:var(--text-muted);">話者:</label>
                        <input type="text" id="edit-speaker-${item.id}" value="${escapeAttr(item.speaker)}" style="flex:1;">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-size:0.65rem; color:var(--text-muted);">本文（マルチ行OK）:</label>
                        <textarea id="edit-text-${item.id}" style="width:100%; min-height:90px; font-size:0.8rem; line-height:1.4;">${escapeHTML(item.text)}</textarea>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:4px;">
                        <button onclick="cancelInlineEdit()" style="background:var(--surface); color:var(--text-muted); border:1px solid var(--border); padding:4px 10px;">キャンセル</button>
                        <button onclick="saveInlineEdit('${item.id}')" style="background:var(--primary); color:#fff; border:none; padding:4px 12px; font-weight:bold;">保存</button>
                    </div>
                </div>
            `;
        } else {
            div.innerHTML = `
                <input type="checkbox" ${isSent ? 'checked' : ''} onchange="toggleCheck(event, '${item.id}')">
                <div class="scenario-actions-top">
                    <select class="item-tab-select" onclick="event.stopPropagation()" onchange="changeItemTab('${item.id}', this.value)" title="所属タブ変更">
                        ${tabOptionsHTML}
                    </select>
                    <button class="scenario-action-btn" onclick="event.stopPropagation(); insertScenarioItemAfter('${item.id}')" title="この下に追加">+挿入</button>
                    <button class="scenario-action-btn" onclick="event.stopPropagation(); moveScenarioItem('${item.id}', -1)" title="上に移動">⬆️</button>
                    <button class="scenario-action-btn" onclick="event.stopPropagation(); moveScenarioItem('${item.id}', 1)" title="下に移動">⬇️</button>
                    <button class="scenario-action-btn" onclick="event.stopPropagation(); editScenarioItem('${item.id}')" title="編集">✏️編集</button>
                    <button class="scenario-action-btn" onclick="event.stopPropagation(); mergeScenarioItemNext('${item.id}')" title="下の項目と結合">↓結合</button>
                    <button class="scenario-action-btn" onclick="event.stopPropagation(); splitScenarioItem('${item.id}', event)" title="改行・分割">✂️分割</button>
                    <button class="scenario-del-btn" onclick="event.stopPropagation(); deleteScenarioItem('${item.id}')" title="削除">✕</button>
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-muted); margin-bottom:4px; padding-right: 210px;">
                        <strong style="color:var(--text);">${escapeHTML(item.speaker)}</strong>
                        ${isSent ? '<span style="color:#34d399;">✓ 送信済み</span>' : ''}
                    </div>
                    <div class="text-body" style="font-size:0.8rem; line-height:1.4; word-break:break-all;">${escapeHTML(item.text)}</div>
                </div>
            `;
            div.onclick = (e) => {
                if (['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
                
                const joinedText = item.text;
                const payload = item.speaker === 'KP' 
                    ? joinedText 
                    : `${item.speaker}：${joinedText}`;
                    
                cur.sentIds[item.id] = true;
                save();
                copy(payload);
                renderScenarios();
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
    } else {
        cur.sentIds[id] = true;
    }
    save();
    renderScenarios();
};

function escapeHTML(str) {
    return String(str || '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}

function escapeAttr(str) {
    return String(str || '').replace(/"/g, '&quot;');
}

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
