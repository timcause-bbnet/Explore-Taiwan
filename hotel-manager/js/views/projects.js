import { store } from '../store.js';

export function renderProjects(container) {
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
            <!-- Project List -->
            <div>
                <h3 style="margin-bottom: 1.5rem; color: var(--text-primary);">專案列表</h3>
                <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border);">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>專案名稱</th>
                                <th>描述</th>
                                <th>適用日期</th>
                                <th style="width: 120px;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="project-table-body">
                            <!-- Projects -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Add/Edit Project Form -->
            <div class="card" style="padding: 2rem; border-radius: var(--radius-md); border: 1px solid var(--border); height: fit-content; position: sticky; top: 1rem;">
                <h3 style="margin-bottom: 1.5rem; color: var(--text-primary);" id="form-title">新增專案</h3>
                <form id="project-form">
                    <input type="hidden" id="edit-id">
                    <div class="form-group">
                        <label class="form-label">專案名稱</label>
                        <input type="text" id="p-name" class="form-input" required placeholder="例: 早鳥優惠">
                    </div>
                    <div class="form-group">
                        <label class="form-label">專案描述</label>
                        <textarea id="p-desc" class="form-input" rows="3" placeholder="專案說明..."></textarea>
                    </div>

                    <!-- Room Selection -->
                    <div class="form-group">
                        <label class="form-label">適用房型</label>
                         <div style="display: flex; flex-wrap: wrap; gap: 1rem; padding: 0.5rem; background: var(--bg-card-hover); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                            ${store.rooms.map(r => `
                                <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
                                    <input type="checkbox" class="chk-room" value="${r.id}"> ${r.name}
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Date Selection -->
                    <div class="form-group">
                        <label class="form-label">適用日期類型</label>
                        <div style="display: flex; flex-wrap: wrap; gap: 1rem; padding: 0.5rem; background: var(--bg-card-hover); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                            <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
                                <input type="checkbox" class="chk-date" value="weekday" checked> 平日
                            </label>
                            <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
                                <input type="checkbox" class="chk-date" value="weekend" checked> 假日
                            </label>
                            ${(store.dateSettings.specialPeriods || []).map(sp => `
                                <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; color: var(--accent);">
                                    <input type="checkbox" class="chk-date" value="${sp.id}"> ${sp.name}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem; border: 1px solid var(--border);">
                        <label class="form-label" style="margin-bottom:0.5rem;">房價設定 (針對選定房型與日期)</label>
                        <div id="pricing-matrix" style="display: flex; flex-direction: column; gap: 1rem;">
                            <!-- Generated Matrix -->
                            <div style="text-align:center; color: var(--text-secondary); font-size: 0.9rem; padding: 1rem;">請選擇房型與日期以設定價格</div>
                        </div>
                    </div>

                    <div style="display:flex; gap: 1rem;">
                        <button type="submit" class="btn btn-primary" style="flex:1;">儲存專案</button>
                        <button type="button" id="btn-cancel" class="btn" style="flex:1; display:none;">取消</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const tbody = container.querySelector('#project-table-body');
    const form = container.querySelector('#project-form');
    const pricingMatrix = container.querySelector('#pricing-matrix');
    const btnCancel = container.querySelector('#btn-cancel');
    const formTitle = container.querySelector('#form-title');

    // State for temporary pricing
    let tempPricing = {};

    function renderTable() {
        if (!store.projects || store.projects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-secondary);">尚無專案</td></tr>';
            return;
        }

        tbody.innerHTML = store.projects.map(p => {
            const applicableDates = new Set();
            // Need to scan roomPricing for keys
            // But usually we store selected date types in p.applyTo or similar? 
            // Previous structure had p.applyTo.
            // New structure: roomPricing = { r1: { weekday: 2000, weekend: 2500 } }
            // Let's derive date types from the keys present in roomPricing
            // Or stick to p.applyTo for *which* are active, and roomPricing for values.
            // Let's use p.applyDateTypes (array) and p.applyRoomIds (array)

            const dateLabels = (p.applyDateTypes || []).map(id => {
                if (id === 'weekday') return '平日';
                if (id === 'weekend') return '假日';
                const sp = store.dateSettings.specialPeriods.find(s => s.id === id);
                return sp ? sp.name : id;
            });

            return `
                <tr>
                    <td style="font-weight: 500;">${p.name}</td>
                    <td style="font-size: 0.9rem; color: var(--text-secondary);">${p.description || '-'}</td>
                    <td style="font-size: 0.85rem; color: var(--primary);">
                        ${dateLabels.join(', ') || '無'}
                    </td>
                    <td>
                        <button class="btn-edit" data-id="${p.id}" style="color: var(--primary); background: none; border: none; font-weight: 600; cursor: pointer; margin-right: 0.5rem;">編輯</button>
                        <button class="btn-del" data-id="${p.id}" style="color: var(--danger); background: none; border: none; font-weight: 600; cursor: pointer;">刪除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Dynamic Matrix
    function updateMatrix(loadedPricing = null) {
        const selectedRooms = Array.from(form.querySelectorAll('.chk-room:checked')).map(cb => cb.value);
        const selectedDates = Array.from(form.querySelectorAll('.chk-date:checked')).map(cb => cb.value);

        if (selectedRooms.length === 0 || selectedDates.length === 0) {
            pricingMatrix.innerHTML = '<div style="text-align:center; color: var(--text-secondary); font-size: 0.9rem; padding: 1rem;">請選擇房型與日期以設定價格</div>';
            return;
        }

        pricingMatrix.innerHTML = selectedRooms.map(rid => {
            const room = store.rooms.find(r => r.id === rid);
            if (!room) return '';

            // Build columns for selected dates
            const dateInputs = selectedDates.map(did => {
                let label = '';
                if (did === 'weekday') label = '平日';
                else if (did === 'weekend') label = '假日';
                else {
                    const sp = store.dateSettings.specialPeriods.find(s => s.id === did);
                    label = sp ? sp.name : did;
                }

                // Value resolution
                // 1. Check loadedPricing (from edit load)
                // 2. Check tempPricing (state during editing)
                // 3. Default to room.price
                let val = '';
                if (loadedPricing && loadedPricing[rid] && loadedPricing[rid][did]) {
                    val = loadedPricing[rid][did];
                } else if (tempPricing[rid] && tempPricing[rid][did]) {
                    val = tempPricing[rid][did];
                } else {
                    // Default logic: standard price for all?
                    // Maybe just 2000?
                    // Let's use room.price as base. 
                    // If weekend, +500? This is hardcoded but helpful standard behavior.
                    if (did === 'weekend') val = room.price + 500;
                    else val = room.price;
                }

                return `
                    <div style="flex: 1; min-width: 80px;">
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.2rem;">${label}</div>
                        <input type="number" class="form-input matrix-input" 
                            data-rid="${rid}" data-did="${did}" 
                            value="${val}" style="padding: 0.3rem; font-size: 0.9rem;">
                    </div>
                `;
            }).join('');

            return `
                <div style="border-bottom: 1px dashed var(--border); padding-bottom: 0.8rem;">
                    <div style="font-weight: 500; font-size: 0.9rem; margin-bottom: 0.5rem;">${room.name}</div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${dateInputs}
                    </div>
                </div>
            `;
        }).join('');

        // Bind input events to update tempPricing
        pricingMatrix.querySelectorAll('.matrix-input').forEach(inp => {
            inp.onchange = () => {
                const rid = inp.dataset.rid;
                const did = inp.dataset.did;
                if (!tempPricing[rid]) tempPricing[rid] = {};
                tempPricing[rid][did] = parseInt(inp.value);
            };
        });
    }

    // Checkbox Listeners
    function bindCheckboxListeners() {
        form.querySelectorAll('.chk-room, .chk-date').forEach(cb => {
            cb.onchange = () => updateMatrix();
        });
    }
    bindCheckboxListeners();

    // Event Delegation for Table - FIXING DELETE ISSUE
    tbody.onclick = (e) => {
        // Use closest to find the button even if clicked on an icon inside (if any)
        const btnDel = e.target.closest('.btn-del');
        const btnEdit = e.target.closest('.btn-edit');

        if (btnDel) {
            const id = btnDel.dataset.id;
            // Prevent default just in case
            e.preventDefault();
            e.stopPropagation();

            console.log('Action: Delete Project', id);
            // Small delay to ensure UI is responsive
            setTimeout(() => {
                if (confirm('確定要刪除此專案嗎？')) {
                    store.deleteProject(id);
                    renderTable(); // Re-render table
                }
            }, 10);
        } else if (btnEdit) {
            loadEdit(btnEdit.dataset.id);
        }
    };

    function loadEdit(id) {
        const p = store.projects.find(x => x.id === id);
        if (!p) return;

        tempPricing = JSON.parse(JSON.stringify(p.roomPricing || {})); // Clone existing pricing

        container.querySelector('#edit-id').value = p.id;
        container.querySelector('#p-name').value = p.name;
        container.querySelector('#p-desc').value = p.description || '';

        // Check Rooms
        form.querySelectorAll('.chk-room').forEach(cb => {
            cb.checked = (p.applyRoomIds || []).includes(cb.value);
        });

        // Check Dates
        form.querySelectorAll('.chk-date').forEach(cb => {
            cb.checked = (p.applyDateTypes || []).includes(cb.value);
        });

        updateMatrix(p.roomPricing);

        formTitle.textContent = '編輯專案';
        btnCancel.style.display = 'block';
        const scrollTarget = container.querySelector('.card:last-child');
        if (scrollTarget) scrollTarget.scrollIntoView({ behavior: 'smooth' });
    }

    btnCancel.onclick = () => {
        form.reset();
        container.querySelector('#edit-id').value = '';
        tempPricing = {};

        // Reset Checks: Default Weekday/Weekend
        form.querySelectorAll('.chk-room').forEach(cb => cb.checked = false);
        form.querySelectorAll('.chk-date').forEach(cb => {
            if (cb.value === 'weekday' || cb.value === 'weekend') cb.checked = true;
            else cb.checked = false;
        });

        updateMatrix();
        formTitle.textContent = '新增專案';
        btnCancel.style.display = 'none';
    };

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = container.querySelector('#edit-id').value;
        const name = container.querySelector('#p-name').value;
        const desc = container.querySelector('#p-desc').value;

        const applyRoomIds = Array.from(form.querySelectorAll('.chk-room:checked')).map(cb => cb.value);
        const applyDateTypes = Array.from(form.querySelectorAll('.chk-date:checked')).map(cb => cb.value);

        // Collect Pricing from DOM (most fresh)
        const pricing = {};
        pricingMatrix.querySelectorAll('.matrix-input').forEach(inp => {
            const rid = inp.dataset.rid;
            const did = inp.dataset.did;
            const val = parseInt(inp.value) || 0;
            if (!pricing[rid]) pricing[rid] = {};
            pricing[rid][did] = val;
        });

        const projectData = {
            name,
            description: desc,
            applyRoomIds,
            applyDateTypes,
            roomPricing: pricing
        };

        if (id) {
            store.updateProject({ ...projectData, id });
        } else {
            store.addProject(projectData);
        }

        renderTable();
        btnCancel.click(); // Reset
    };

    renderTable();
    updateMatrix(); // Initial
}
