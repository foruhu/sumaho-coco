function onClassChange() {
  const mc = document.getElementById('mc')?.value || '';
  const sc = document.getElementById('sc')?.value || '';
  const mcParts = (typeof CLASS_PARTS !== 'undefined' && CLASS_PARTS[mc]) || [0,0,2];
  const scParts = (typeof CLASS_PARTS !== 'undefined' && CLASS_PARTS[sc]) || [0,0,2];

  ['wep', 'mut', 'cyb'].forEach((key, idx) => {
    if (document.getElementById(`mc-${key}`)) document.getElementById(`mc-${key}`).textContent = mcParts[idx];
    if (document.getElementById(`sc-${key}`)) document.getElementById(`sc-${key}`).textContent = scParts[idx];
  });

  calcTotals();
}

function calcTotals() {
  const getVal = id => parseInt(document.getElementById(id)?.value || document.getElementById(id)?.textContent, 10) || 0;

  const bonusSelected = document.querySelector('input[name="bonus"]:checked')?.value;
  const totals = {
    wep: getVal('mc-wep') + getVal('sc-wep') + (bonusSelected === 'wep' ? 1 : 0) + getVal('chouai-wep'),
    mut: getVal('mc-mut') + getVal('sc-mut') + (bonusSelected === 'mut' ? 1 : 0) + getVal('chouai-mut'),
    cyb: getVal('mc-cyb') + getVal('sc-cyb') + (bonusSelected === 'cyb' ? 1 : 0) + getVal('chouai-cyb')
  };

  if (document.getElementById('total-wep')) document.getElementById('total-wep').textContent = totals.wep;
  if (document.getElementById('total-mut')) document.getElementById('total-mut').textContent = totals.mut;
  if (document.getElementById('total-cyb')) document.getElementById('total-cyb').textContent = totals.cyb;

  const currentCounts = { '武装': {1:0, 2:0, 3:0}, '変異': {1:0, 2:0, 3:0}, '改造': {1:0, 2:0, 3:0} };

  document.querySelectorAll('#parts-container tr.part-row').forEach(tr => {
    const type = tr.querySelector('.p-type')?.value;
    const lv = parseInt(tr.querySelector('.p-level')?.value, 10);
    if (currentCounts[type] && currentCounts[type][lv] !== undefined) {
      currentCounts[type][lv]++;
    }
  });

  // スキル選択状態を取得（「時計仕掛け」と「業躯」）
  const hasClockwork = Array.from(document.querySelectorAll('#skill-tbody select')).some(s => s.value === '時計仕掛け');
  const hasGouku = Array.from(document.querySelectorAll('#skill-tbody select')).some(s => s.value === '業躯');

  const categories = [
    { name: '武装', total: totals.wep, key: 'wep' },
    { name: '変異', total: totals.mut, key: 'mut' },
    { name: '改造', total: totals.cyb, key: 'cyb' }
  ];

  const limitTbody = document.getElementById('limit-tbody');
  if (limitTbody) { limitTbody.innerHTML = ''; }

  categories.forEach(cat => {
    const limit = (typeof getLimitByVal === 'function') ? getLimitByVal(cat.total) : { lv1:0, lv2:0, lv3:0 };
    [1, 2, 3].forEach(lv => {
      const baseLimit = limit[`lv${lv}`] || 0;

      // ボーナス適用判定：改造Lv3(時計仕掛け) または 変異Lv3(業躯)
      let autoBonus = 0;
      if (cat.name === '改造' && lv === 3 && hasClockwork) {
        autoBonus = 1;
      } else if (cat.name === '変異' && lv === 3 && hasGouku) {
        autoBonus = 1;
      }

      const maxAllowed = baseLimit + autoBonus;
      const current = (currentCounts[cat.name] && currentCounts[cat.name][lv]) || 0;

      const usedSpan = document.getElementById(`used-${cat.key}-lv${lv}`);
      const maxSpan = document.getElementById(`max-${cat.key}-lv${lv}`);
      if (usedSpan) usedSpan.textContent = current;
      if (maxSpan) {
        maxSpan.textContent = maxAllowed;
        maxSpan.style.color = current > maxAllowed ? '#ff8888' : '#8ff';
        maxSpan.style.fontWeight = 'bold';
      }

      let statusHtml;
      if (maxAllowed <= 0) {
        statusHtml = `<span style="color:#666;">対象外</span>`;
      } else if (current > maxAllowed) {
        statusHtml = `<span class="limit-ng" style="color:#ff6666; font-weight:bold;">超過 (${current}/${maxAllowed})</span>`;
      } else if (current > 0) {
        statusHtml = `<span class="limit-selected" style="color:#88ff88;">OK (${current}/${maxAllowed})</span>`;
      } else {
        statusHtml = `<span style="color:#f0c060; font-weight:bold;">未取得 (0/${maxAllowed})</span>`;
      }

      if (limitTbody) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><b>${cat.name}</b> (総${cat.total})</td>
          <td>Lv ${lv}</td>
          <td>${maxAllowed} 個</td>
          <td><b>${current}</b> 個</td>
          <td>${statusHtml}</td>
        `;
        limitTbody.appendChild(tr);
      }
    });
  });

  if (typeof updateExtraPartOptions === 'function') updateExtraPartOptions();
  if (typeof calcActionValue === 'function') calcActionValue();
}

function addRow(target = '', emotion = '', madness = 0) {
  const tbody = document.getElementById('list');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" value="${target}"></td>
    <td><input type="text" value="${emotion}"></td>
    <td><input type="number" value="${madness}" min="0"></td>
    <td class="col-op"><button type="button" class="del" onclick="removeRowWithUndo(this)">X</button></td>
  `;
  tbody.appendChild(tr);
  markDirty();
}

function updateSkillOptions() {
  const selectedSkills = new Set(Array.from(document.querySelectorAll('#skill-tbody .skill-name-select')).map(s => s.value).filter(Boolean));

  document.querySelectorAll('#skill-tbody tr').forEach(tr => {
    const select = tr.querySelector('.skill-name-select');
    if (!select) return;
    const category = tr.querySelector('.skill-category')?.value || '';
    const currentValue = select.value;

    let optionsHtml = '<option value="">-- スキルを選択 --</option>';
    if (typeof SKILL_DATABASE !== 'undefined' && SKILL_DATABASE[category]) {
      SKILL_DATABASE[category].forEach(s => {
        const isSelectedByOther = selectedSkills.has(s.name) && s.name !== currentValue;
        const disabledAttr = isSelectedByOther ? 'disabled' : '';
        const labelText = isSelectedByOther ? `${s.name} (選択済み)` : s.name;
        optionsHtml += `<option value="${s.name}" ${s.name === currentValue ? 'selected' : ''} ${disabledAttr}>${labelText}</option>`;
      });
    }
    select.innerHTML = optionsHtml;
  });
}

// スキルDBのメモ文字列「【名前】 タイミング/コスト/射程\n効果...」をタイミング・コスト・射程・効果本文に分解する
// スキルDBのメモ文字列「タイミング/コスト/射程\n効果...」をタイミング・コスト・射程・効果本文に分解する
// （表記ゆれ対策として、先頭に「【名前】」や単独の「【」が残っている場合は取り除いてから解析する）
function parseSkillMemo(memoText) {
  let text = memoText || '';
  text = text.replace(/^【[^】]*】\s*/, ''); // 「【名前】」がまだ付いている旧形式
  text = text.replace(/^【\s*/, '');          // 「【」だけが残ってしまっている表記ゆれ

  const match = text.match(/^([^\/\n]+)\/([^\/\n]+)\/([^\/\n]+)\n?([\s\S]*)$/);
  if (match) {
    return { timing: match[1].trim(), cost: match[2].trim(), range: match[3].trim(), effect: match[4] };
  }
  return { timing: '', cost: '', range: '', effect: text };
}

// スキルの「使用」チェックは、都度発生するタイミング（ジャッジ/ダメージ/ラピッド）の時だけ表示する
// （オートなど常時効果のスキルは、損傷と違って使う/使わないの管理が不要なため）
const SKILL_USED_CHECK_TIMINGS = ['ジャッジ', 'ダメージ', 'ラピッド'];

// タイミングは基本的にこの中から選ぶ（保存データ等に無い値が来た場合は、選択肢へその場で追加して失われないようにする）
const SKILL_TIMING_OPTIONS = ['', 'オート', 'アクション', 'ジャッジ', 'ダメージ', 'ラピッド', '参照'];

function buildTimingOptionsHtml(selected) {
  const options = SKILL_TIMING_OPTIONS.includes(selected) || !selected
    ? SKILL_TIMING_OPTIONS
    : [...SKILL_TIMING_OPTIONS, selected]; // 未知の値は選択肢の最後に追加して保持する
  return options.map(t => `<option value="${t}" ${t === selected ? 'selected' : ''}>${t || '（未選択）'}</option>`).join('');
}

// 既存のselectに無い値をセットしたい時、その場で選択肢へ追加してから値を反映する
function setTimingSelectValue(selectEl, value) {
  if (!selectEl) return;
  const hasOption = Array.from(selectEl.options).some(o => o.value === value);
  if (!hasOption && value) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    selectEl.appendChild(opt);
  }
  selectEl.value = value;
}

function updateSkillUsedCheckboxVisibility(tr) {
  if (!tr) return;
  const timingInput = tr.querySelector('.skill-timing');
  const usedCell = tr.querySelector('.skill-used-cell');
  const usedCb = tr.querySelector('.skill-used');
  if (!timingInput || !usedCell || !usedCb) return;

  const shouldShow = SKILL_USED_CHECK_TIMINGS.includes((timingInput.value || '').trim());
  usedCell.style.visibility = shouldShow ? 'visible' : 'hidden';
  if (!shouldShow && usedCb.checked) {
    usedCb.checked = false;
    toggleSkillUsed(usedCb);
  }
}

function toggleSkillUsed(checkbox) {
  const tr = checkbox.closest('tr');
  tr.classList.toggle('used', checkbox.checked);
  if (tr.nextElementSibling && tr.nextElementSibling.classList.contains('skill-memo-row')) {
    tr.nextElementSibling.classList.toggle('used', checkbox.checked);
  }
  markDirty();
}

function addSkillRow(category, skillName = '', timing = '', cost = '', range = '', memo = '', tag = '', isUsed = false) {
  const tbody = document.getElementById('skill-tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.className = 'skill-row';
  tr.innerHTML = `
    <td class="skill-used-cell"><input type="checkbox" class="skill-used" onchange="toggleSkillUsed(this)"></td>
    <td><input type="text" class="skill-category" value="${category}" readonly style="background:#1e1e24;color:#ccc;border:none;"></td>
    <td class="color-col"><select class="skill-tag" onchange="onManeuverCategoryChange(this)">${buildCategoryOptions(tag)}</select></td>
    <td><select class="skill-name-select" onchange="onSkillSelect(this)"><option value="">-- スキルを選択 --</option></select></td>
    <td><select class="skill-timing" onchange="updateSkillUsedCheckboxVisibility(this.closest('tr'))">${buildTimingOptionsHtml(timing)}</select></td>
    <td><input type="text" class="skill-cost" value="${cost}"></td>
    <td><input type="text" class="skill-range" value="${range}"></td>
    <td class="col-op"><button type="button" class="del" onclick="removeRowWithUndo(this, () => { calcTotals(); updateSkillOptions(); })">X</button></td>
  `;
  tbody.appendChild(tr);

  const memoTr = document.createElement('tr');
  memoTr.className = 'skill-memo-row';
  memoTr.innerHTML = `<td colspan="8"><textarea class="skill-memo" oninput="onManeuverMemoInput(this, '.skill-tag')" onfocus="setTimeout(() => autoResizeTextarea(this), 80)" placeholder="効果メモ">${memo}</textarea></td>`;
  tbody.appendChild(memoTr);

  applyCategoryColorToRow(tr, tag);
  applyCategoryColorToRow(memoTr, tag);
  autoResizeTextarea(memoTr.querySelector('.skill-memo'));
  updateSkillUsedCheckboxVisibility(tr);
  if (isUsed) {
    const cb = tr.querySelector('.skill-used');
    cb.checked = true;
    toggleSkillUsed(cb);
  }

  // 選択肢一覧を先に生成してから値をセットする（順序を逆にすると保存データの選択状態が復元されない）
  updateSkillOptions();
  if (skillName) tr.querySelector('.skill-name-select').value = skillName;
  markDirty();
  calcTotals();
}

function addPosSkillRow() { addSkillRow(document.getElementById('pos').value); }
function addMcSkillRow() { addSkillRow(document.getElementById('mc').value); }
function addScSkillRow() { addSkillRow(document.getElementById('sc').value); }

function onSkillSelect(selectElem) {
  const skillName = selectElem.value;
  const tr = selectElem.closest('tr');
  const memoTr = tr.nextElementSibling && tr.nextElementSibling.classList.contains('skill-memo-row') ? tr.nextElementSibling : null;
  const category = tr.querySelector('.skill-category').value;
  const timingInput = tr.querySelector('.skill-timing');
  const costInput = tr.querySelector('.skill-cost');
  const rangeInput = tr.querySelector('.skill-range');
  const textarea = memoTr ? memoTr.querySelector('.skill-memo') : null;
  const tagSelect = tr.querySelector('.skill-tag');

  if (!skillName) {
    if (timingInput) setTimingSelectValue(timingInput, '');
    if (costInput) costInput.value = '';
    if (rangeInput) rangeInput.value = '';
    if (textarea) { textarea.value = ''; autoResizeTextarea(textarea); }
    if (tagSelect) {
      tagSelect.value = '';
      applyCategoryColorToRow(tr, '');
      if (memoTr) applyCategoryColorToRow(memoTr, '');
    }
  } else if (typeof SKILL_DATABASE !== 'undefined' && SKILL_DATABASE[category]) {
    const found = SKILL_DATABASE[category].find(s => s.name === skillName);
    if (found) {
      const parsed = parseSkillMemo(found.memo);
      if (timingInput) setTimingSelectValue(timingInput, parsed.timing);
      if (costInput) costInput.value = parsed.cost;
      if (rangeInput) rangeInput.value = parsed.range;
      if (textarea) { textarea.value = parsed.effect; autoResizeTextarea(textarea); }
      const detected = detectCategoryFromMemo(parsed.effect);
      if (tagSelect) {
        tagSelect.value = detected;
        applyCategoryColorToRow(tr, detected);
        if (memoTr) applyCategoryColorToRow(memoTr, detected);
      }
    }
  }

  updateSkillUsedCheckboxVisibility(tr);
  updateSkillOptions();
  calcTotals();
}

// --- 1. セッション履歴（獲得）の行追加 ---
function addSessionHistoryRow(scenario = '', battle = 0, personal = 0, memo = '') {
  const tbody = document.getElementById('session-history-tbody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="padding: 4px; border: 1px solid #444;">
      <input type="text" class="h-scenario" value="${scenario}" placeholder="例: 狂い咲く薔薇" style="width: 95%; background: #1a1a20; color: #fff; border: 1px solid #555; padding: 4px; border-radius: 3px;">
    </td>
    <td style="padding: 4px; border: 1px solid #444;">
      <input type="number" class="battle-pts" value="${battle}" min="0" oninput="calcChouaiTotals()" style="width: 75%; background: #1a1a20; color: #8ff; border: 1px solid #555; padding: 4px; text-align: center; font-weight: bold; border-radius: 3px;"> pt
    </td>
    <td style="padding: 4px; border: 1px solid #444;">
      <input type="number" class="personal-pts" value="${personal}" min="0" oninput="calcChouaiTotals()" style="width: 75%; background: #1a1a20; color: #8ff; border: 1px solid #555; padding: 4px; text-align: center; font-weight: bold; border-radius: 3px;"> pt
    </td>
    <td style="padding: 4px; border: 1px solid #444;">
      <input type="text" class="h-memo" value="${memo}" placeholder="例: 2026/05/10 通過" style="width: 95%; background: #1a1a20; color: #fff; border: 1px solid #555; padding: 4px; border-radius: 3px;">
    </td>
    <td class="col-op" style="padding: 4px; border: 1px solid #444; text-align: center;">
      <button type="button" class="edit-only" onclick="removeRowWithUndo(this, calcChouaiTotals)" style="background: #ff4444; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">X</button>
    </td>
  `;

  tbody.appendChild(tr);
  markDirty();
  calcChouaiTotals();
}

// --- 2. 寵愛点の使い道（消費）の行追加 ---
function addChouaiUseRow(used = 0, memo = '') {
  const tbody = document.getElementById('chouai-use-tbody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="padding: 4px; border: 1px solid #444;">
      <input type="number" class="used-pts" value="${used}" min="0" oninput="calcChouaiTotals()" style="width: 75%; background: #1a1a20; color: #ff88c2; border: 1px solid #555; padding: 4px; text-align: center; font-weight: bold; border-radius: 3px;"> pt
    </td>
    <td style="padding: 4px; border: 1px solid #444;">
      <input type="text" class="use-memo" value="${memo}" placeholder="例: 武装基本値+1、基本パーツ修復" style="width: 95%; background: #1a1a20; color: #fff; border: 1px solid #555; padding: 4px; border-radius: 3px;">
    </td>
    <td class="col-op" style="padding: 4px; border: 1px solid #444; text-align: center;">
      <button type="button" class="edit-only" onclick="removeRowWithUndo(this, calcChouaiTotals)" style="background: #ff4444; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">X</button>
    </td>
  `;

  tbody.appendChild(tr);
  markDirty();
  calcChouaiTotals();
}

// --- 3. 寵愛点計算処理 ---
function calcChouaiTotals() {
  let totalBattle = 0;
  let totalPersonal = 0;
  let totalUsed = 0;

  // 獲得寵愛の計算
  document.querySelectorAll('#session-history-tbody .battle-pts').forEach(input => {
    totalBattle += parseInt(input.value, 10) || 0;
  });
  document.querySelectorAll('#session-history-tbody .personal-pts').forEach(input => {
    totalPersonal += parseInt(input.value, 10) || 0;
  });

  // 使用寵愛の計算
  document.querySelectorAll('#chouai-use-tbody .used-pts').forEach(input => {
    totalUsed += parseInt(input.value, 10) || 0;
  });

  const totalEarned = totalBattle + totalPersonal;
  const current = totalEarned - totalUsed;

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('total-battle-chouai', totalBattle);
  setTxt('total-personal-chouai', totalPersonal);
  setTxt('total-earned-chouai', totalEarned);
  setTxt('total-used-chouai', totalUsed);

  const currentSpan = document.getElementById('current-chouai');
  if (currentSpan) {
    currentSpan.textContent = current;
    currentSpan.style.color = current < 0 ? '#ff4444' : '#8ff';
  }
}

// --- 保存・読込 ---
