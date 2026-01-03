import { store } from '../store.js';

export function renderDateSettings(container) {
    container.innerHTML = `
        <div style="max-width: 800px;">
            <div class="card" style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1.5rem;">每週平假日定義</h3>
                <div class="form-group">
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        ${['週日', '週一', '週二', '週三', '週四', '週五', '週六'].map((day, idx) => `
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" class="weekend-check" value="${idx}">
                                ${day}
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="card" style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
                <h3 style="margin-bottom: 1.5rem;">特殊節日 / 季節定義</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">定義不同的特殊日期群組。若設定範圍，會自動展開為每一天。</p>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: end;">
                    <div>
                        <label class="form-label">節日名稱</label>
                        <input type="text" id="new-period-name" class="form-input" placeholder="例: 春節">
                    </div>
                    <button id="btn-add-period" class="btn btn-primary">新增定義群組</button>
                </div>

                <div id="periods-list">
                    <!-- Dynamic Periods -->
                </div>
            </div>
            
            <button id="btn-save-dates" class="btn btn-primary" style="margin-top: 2rem;">儲存全部設定</button>
        </div>
    `;

    const weekendChecks = container.querySelectorAll('.weekend-check');
    const periodNameInput = container.querySelector('#new-period-name');
    const addPeriodBtn = container.querySelector('#btn-add-period');
    const periodsList = container.querySelector('#periods-list');
    const saveBtn = container.querySelector('#btn-save-dates');

    // Load State
    let currentSettings = JSON.parse(JSON.stringify(store.dateSettings));
    if (!currentSettings.specialPeriods) currentSettings.specialPeriods = [];

    // Init UI
    weekendChecks.forEach(cb => {
        cb.checked = currentSettings.weekendDays.includes(parseInt(cb.value));
        cb.onchange = () => {
            const val = parseInt(cb.value);
            if (cb.checked) {
                if (!currentSettings.weekendDays.includes(val)) currentSettings.weekendDays.push(val);
            } else {
                currentSettings.weekendDays = currentSettings.weekendDays.filter(d => d !== val);
            }
        };
    });

    function renderPeriods() {
        periodsList.innerHTML = currentSettings.specialPeriods.map((sp, idx) => `
            <div style="border: 1px solid var(--border); padding: 1.5rem; border-radius: var(--radius-sm); margin-bottom: 1rem; background: rgba(255,255,255,0.02);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; align-items: center;">
                    <div class="period-header" style="display:flex; gap:0.5rem; align-items:center; flex:1;">
                         <h4 style="font-size: 1.1rem; color: var(--accent); margin:0;">${sp.name}</h4>
                         <button class="btn-edit-period-name" data-idx="${idx}" style="background:none; border:none; color: var(--text-secondary); cursor: pointer; font-size:0.9rem;">✎</button>
                    </div>
                    <div class="period-edit-form" style="display:none; gap:0.5rem; align-items:center; flex:1;">
                        <input type="text" class="input-edit-name form-input" value="${sp.name}" style="padding:0.3rem;">
                        <button class="btn-save-period-name btn btn-sm btn-primary" data-idx="${idx}">儲存</button>
                        <button class="btn-cancel-period-name btn btn-sm" data-idx="${idx}">取消</button>
                    </div>

                    <button class="btn-delete-period" data-idx="${idx}" style="background:none; border:none; color: var(--danger); cursor: pointer;">刪除群組</button>
                </div>
                
                <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; align-items: flex-end; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 4px;">
                    <div>
                        <label style="font-size: 0.8rem; color: var(--text-secondary);">新增單日</label>
                        <input type="date" class="input-date-single form-input" data-idx="${idx}" style="padding: 0.3rem;">
                        <button class="btn btn-sm btn-add-single" data-idx="${idx}">+</button>
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; color: var(--text-secondary);">新增連續日期 (起 ~ 訖)</label>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <input type="date" class="input-date-start form-input" data-idx="${idx}" style="padding: 0.3rem;">
                            <span>~</span>
                            <input type="date" class="input-date-end form-input" data-idx="${idx}" style="padding: 0.3rem;">
                            <button class="btn btn-sm btn-add-range" data-idx="${idx}">加入範圍</button>
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${sp.dates.sort().map(date => `
                        <div style="background: rgba(210, 153, 34, 0.15); color: #d29922; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
                            ${date}
                            <span class="btn-rm-date" data-pidx="${idx}" data-date="${date}" style="cursor: pointer; font-weight: bold;">&times;</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Event Handling
        // Add Single
        container.querySelectorAll('.btn-add-single').forEach(btn => {
            btn.onclick = () => {
                const idx = btn.dataset.idx;
                const input = container.querySelector(`.input-date-single[data-idx="${idx}"]`);
                if (input.value && !currentSettings.specialPeriods[idx].dates.includes(input.value)) {
                    currentSettings.specialPeriods[idx].dates.push(input.value);
                    renderPeriods();
                }
            };
        });

        // Add Range
        container.querySelectorAll('.btn-add-range').forEach(btn => {
            btn.onclick = () => {
                const idx = btn.dataset.idx;
                const start = container.querySelector(`.input-date-start[data-idx="${idx}"]`).value;
                const end = container.querySelector(`.input-date-end[data-idx="${idx}"]`).value;

                if (start && end && start <= end) {
                    let curr = new Date(start);
                    const last = new Date(end);
                    while (curr <= last) {
                        const dStr = curr.toISOString().slice(0, 10);
                        if (!currentSettings.specialPeriods[idx].dates.includes(dStr)) {
                            currentSettings.specialPeriods[idx].dates.push(dStr);
                        }
                        curr.setDate(curr.getDate() + 1);
                    }
                    renderPeriods();
                } else if (start > end) {
                    alert('結束日期必須晚於開始日期');
                }
            };
        });

        // Remove Date
        container.querySelectorAll('.btn-rm-date').forEach(span => {
            span.onclick = () => {
                const pIdx = span.dataset.pidx;
                const date = span.dataset.date;
                currentSettings.specialPeriods[pIdx].dates = currentSettings.specialPeriods[pIdx].dates.filter(d => d !== date);
                renderPeriods();
            };
        });

        // Delete Period
        container.querySelectorAll('.btn-delete-period').forEach(btn => {
            btn.onclick = () => {
                if (confirm('確定刪除此節日定義?')) {
                    currentSettings.specialPeriods.splice(btn.dataset.idx, 1);
                    renderPeriods();
                }
            };
        });
        // Rename Period
        container.querySelectorAll('.btn-edit-period-name').forEach(btn => {
            btn.onclick = () => {
                const idx = btn.dataset.idx;
                const card = periodsList.children[idx];
                card.querySelector('.period-header').style.display = 'none';
                card.querySelector('.period-edit-form').style.display = 'flex';
            };
        });

        container.querySelectorAll('.btn-cancel-period-name').forEach(btn => {
            btn.onclick = () => {
                renderPeriods(); // Re-render to reset state is easiest
            };
        });

        container.querySelectorAll('.btn-save-period-name').forEach(btn => {
            btn.onclick = () => {
                const idx = btn.dataset.idx;
                const card = periodsList.children[idx];
                const newName = card.querySelector('.input-edit-name').value;
                if (newName) {
                    currentSettings.specialPeriods[idx].name = newName;
                    renderPeriods();
                }
            };
        });
    }

    renderPeriods();

    addPeriodBtn.onclick = () => {
        const name = periodNameInput.value;
        if (name) {
            currentSettings.specialPeriods.push({
                id: 'sp' + Date.now(),
                name: name,
                dates: []
            });
            periodNameInput.value = '';
            renderPeriods();
        }
    };

    saveBtn.onclick = () => {
        store.saveDateSettings(currentSettings);
        alert('日期設定已儲存');
    };
}
