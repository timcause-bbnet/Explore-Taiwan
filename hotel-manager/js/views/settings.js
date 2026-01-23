import { store } from '../store.js';

export function renderSettings(container) {
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 3rem;">
            <!-- Section 1: Room Types -->
            <div style="display: grid; grid-template-columns: 1fr 450px; gap: 2rem;">
                <div>
                    <h3 style="margin-bottom: 1.5rem; color: var(--text-primary);">房型列表</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">房號設定：依據數量自動產生對應的房號輸入格。</p>
                    <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border);">
                        <table class="data-table">
                            <thead style="background: var(--bg-card-hover);">
                                <tr>
                                    <th>房型名稱</th>
                                    <th>人數</th>
                                    <th>房號</th>
                                    <th>數量</th>
                                    <th>定價</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody id="room-table-body">
                                <!-- Rooms -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card" style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius-md); border: 1px solid var(--border); height: fit-content; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                    <h3 style="margin-bottom: 1.5rem; text-align:center; color: var(--text-primary);" id="form-title">新增房型</h3>
                    <form id="add-room-form">
                        <input type="hidden" name="id" id="edit-id">
                        <div class="form-group">
                            <label class="form-label">房型名稱</label>
                            <input type="text" name="name" id="in-name" class="form-input" required placeholder="例: VIP 套房">
                        </div>
                         <div class="form-group">
                            <div style="display:flex; gap:1rem;">
                                <div style="flex:1;">
                                    <label class="form-label">容納人數</label>
                                    <input type="number" name="capacity" id="in-capacity" class="form-input" value="2" min="1">
                                </div>
                                <div style="flex:1;">
                                    <label class="form-label">基本定價</label>
                                    <input type="number" name="price" id="in-price" class="form-input" required placeholder="5000">
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">房間數量</label>
                            <input type="number" id="in-count" class="form-input" value="1" min="1" max="50">
                        </div>

                        <div class="form-group">
                            <label class="form-label">房號設定</label>
                            <div id="room-inputs-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 0.5rem; background: #f0f4f8; padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
                                <!-- Dynamic Inputs -->
                            </div>
                        </div>

                        <div style="display:flex; gap: 1rem; margin-top: 2rem;">
                            <button type="submit" class="btn btn-primary" style="flex:1;">儲存設定</button>
                            <button type="button" id="btn-cancel" class="btn" style="display:none;">取消</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Section 2: Payment Methods -->
            <div style="border-top: 1px solid var(--border); padding-top: 2rem;">
                <h3 style="margin-bottom: 1rem; color: var(--text-primary);">付款方式設定</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <div>
                         <p style="color: var(--text-secondary); margin-bottom: 1rem;">管理系統中可用的付款方式 (如: 現金, 信用卡, 載具...)。</p>
                         <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border);">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>名稱</th>
                                        <th style="width: 100px;">操作</th>
                                    </tr>
                                </thead>
                                <tbody id="payment-table-body">
                                    <!-- Payments -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card" style="padding: 2rem; border-radius: var(--radius-md); border: 1px solid var(--border); height: fit-content;">
                        <h4 style="margin-bottom: 1rem;">新增付款方式</h4>
                        <div style="display: flex; gap: 1rem;">
                            <input type="text" id="new-pay-method" class="form-input" placeholder="名稱 (例: LINE Pay)">
                            <button id="btn-add-pay" class="btn btn-primary">新增</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section 3: System Maintenance -->
            <div style="border-top: 1px solid var(--border); padding-top: 2rem; margin-bottom: 3rem;">
                <h3 style="margin-bottom: 1rem; color: var(--danger);">系統維護</h3>
                <div class="card" style="border: 1px solid var(--danger); background: #fff0f0; padding: 1.5rem; border-radius: var(--radius-md);">
                    <h4 style="margin-bottom: 0.5rem; color: var(--danger);">重置系統資料</h4>
                    <p style="margin-bottom: 1rem; color: var(--text-secondary);">此操作將清空所有「訂單」、「帳務」與「房務狀態」，但會保留房型與專案設定。此動作無法復原。</p>
                    <button id="btn-reset-data" class="btn" style="background: var(--danger); color: white; border: none;">⚠️ 清空所有營運資料</button>
                </div>

                <div class="card" style="border: 1px solid var(--primary); margin-top: 1.5rem; padding: 1.5rem; border-radius: var(--radius-md);">
                    <h4 style="margin-bottom: 0.5rem; color: var(--primary);">資料備份與還原</h4>
                    <p style="margin-bottom: 1rem; color: var(--text-secondary);">檢視或複製系統備份資料 JSON，或從檔案還原。</p>
                    <div style="display: flex; gap: 1rem;">
                        <button id="btn-export-modal" class="btn btn-primary">📋 顯示備份資料 (複製/下載)</button>
                        <button id="btn-import-trigger" class="btn" style="background: var(--bg-card-hover); border: 1px solid var(--border);">⬆️ 匯入備份</button>
                        <input type="file" id="file-import" accept=".json" style="display:none;">
                    </div>
                </div>
            </div>
            
            <!-- Export Modal -->
            <div id="export-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2000; align-items:center; justify-content:center;">
                <div class="card" style="background:white; width:600px; height:80vh; display:flex; flex-direction:column; padding:1.5rem;">
                    <h3 style="margin-bottom:1rem;">系統備份資料</h3>
                    <p style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:1rem;">請複製下方內容並自行儲存為 .json 檔案，或直接點選「複製到剪貼簿」。</p>
                    <textarea id="export-textarea" style="flex:1; width:100%; padding:0.5rem; font-family:monospace; font-size:0.85rem; border:1px solid var(--border); resize:none;" readonly></textarea>
                    <div style="margin-top:1rem; display:flex; gap:1rem; justify-content:flex-end;">
                        <button id="btn-copy-export" class="btn btn-primary">複製到剪貼簿</button>
                         <button id="btn-close-export" class="btn">關閉</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const tbody = container.querySelector('#room-table-body');
    const form = container.querySelector('#add-room-form');
    const btnCancel = container.querySelector('#btn-cancel');
    const formTitle = container.querySelector('#form-title');
    const inCount = container.querySelector('#in-count');
    const roomInputsContainer = container.querySelector('#room-inputs-container');

    // Payment Refs
    const payTableBody = container.querySelector('#payment-table-body');
    const btnAddPay = container.querySelector('#btn-add-pay');
    const inputNewPay = container.querySelector('#new-pay-method');

    function renderTable() {
        tbody.innerHTML = store.rooms.map(r => {
            const numbers = r.roomNumbers ? r.roomNumbers.join(', ') : '-';
            const count = r.roomNumbers ? r.roomNumbers.length : 0;
            return `
            <tr>
                <td style="font-weight: 500; color: var(--text-primary);">${r.name}</td>
                <td>${r.capacity}</td>
                <td>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.3rem;">
                        ${(r.roomNumbers || []).map(num => `
                            <span style="background: rgba(59, 130, 246, 0.1); color: var(--primary); padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.85rem; font-family: monospace; border: 1px solid rgba(59, 130, 246, 0.2);">
                                ${num}
                            </span>
                        `).join('')}
                    </div>
                </td>
                <td>${count}</td>
                <td>$${r.price}</td>
                <td>
                    <button class="btn-edit" data-id="${r.id}" style="cursor:pointer; color:var(--primary); background:none; border:none; margin-right:0.5rem; font-weight:600;">編輯</button>
                    <button class="btn-del" data-id="${r.id}" style="cursor:pointer; color:var(--danger); background:none; border:none; font-weight:600;">刪除</button>
                </td>
            </tr>
            `;
        }).join('');
    }

    function renderPayTable() {
        if (!store.paymentMethods) return;
        payTableBody.innerHTML = store.paymentMethods.map(pm => `
            <tr>
                <td>${pm.name}</td>
                <td>
                     <button class="btn-del-pay" data-id="${pm.id}" style="cursor:pointer; color:var(--danger); background:none; border:none; font-weight:600;">刪除</button>
                </td>
            </tr>
        `).join('');
    }

    // Payment Events
    btnAddPay.onclick = () => {
        const val = inputNewPay.value.trim();
        if (val) {
            store.addPaymentMethod(val);
            renderPayTable();
            inputNewPay.value = '';
        }
    };

    payTableBody.onclick = (e) => {
        if (e.target.classList.contains('btn-del-pay')) {
            if (confirm('確定刪除此付款方式?')) {
                store.deletePaymentMethod(e.target.dataset.id);
                renderPayTable();
            }
        }
    };

    // System Reset
    const btnReset = container.querySelector('#btn-reset-data');
    if (btnReset) {
        btnReset.onclick = () => {
            const confirmText = prompt('請輸入 "DELETE" 以確認清空所有營運資料 (訂單/帳務/房況):');
            if (confirmText === 'DELETE') {
                store.resetData();
            } else if (confirmText !== null) {
                alert('輸入錯誤，取消操作');
            }
        };
    }

    const btnExportModal = container.querySelector('#btn-export-modal');
    const modalExport = container.querySelector('#export-modal');
    const txtExport = container.querySelector('#export-textarea');
    const btnCopy = container.querySelector('#btn-copy-export');
    const btnCloseExport = container.querySelector('#btn-close-export');
    const btnImportTrigger = container.querySelector('#btn-import-trigger');
    const fileImport = container.querySelector('#file-import');

    if (btnExportModal) {
        btnExportModal.onclick = () => {
            const dataStr = store.getBackupDataString();
            txtExport.value = dataStr;
            modalExport.style.display = 'flex';
        };
    }
    if (btnCopy) {
        btnCopy.onclick = () => {
            txtExport.select();
            document.execCommand('copy');
            alert('已複製到剪貼簿！請開啟記事本貼上並存檔。');
        };
    }
    if (btnCloseExport) {
        btnCloseExport.onclick = () => {
            modalExport.style.display = 'none';
        };
    }

    if (btnImportTrigger) {
        btnImportTrigger.onclick = () => fileImport.click();
    }
    if (fileImport) {
        fileImport.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                store.importData(evt.target.result);
            };
            reader.readAsText(file);
        };
    }

    // Event Delegation for robustness (Rooms)
    tbody.onclick = (e) => {
        if (e.target.classList.contains('btn-del')) {
            const id = e.target.dataset.id;
            if (confirm('確定要刪除此房型? 這將移除所有相關設定。')) {
                store.deleteRoom(id);
                renderTable();
            }
        } else if (e.target.classList.contains('btn-edit')) {
            const id = e.target.dataset.id;
            loadEdit(id);
        }
    };

    function renderRoomInputs(count, values = []) {
        roomInputsContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const val = values[i] || '';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-input small-room-input';
            input.placeholder = `房號 ${i + 1}`;
            input.value = val;
            input.style = 'padding: 0.4rem; font-size: 0.9rem; text-align: center; background: white;';
            roomInputsContainer.appendChild(input);
        }
    }

    inCount.onchange = (e) => {
        const count = parseInt(e.target.value) || 1;
        const existing = Array.from(roomInputsContainer.querySelectorAll('input')).map(i => i.value);
        renderRoomInputs(count, existing);
    };

    function loadEdit(id) {
        const r = store.rooms.find(x => x.id === id);
        if (!r) return;

        container.querySelector('#edit-id').value = r.id;
        container.querySelector('#in-name').value = r.name;
        container.querySelector('#in-capacity').value = r.capacity;
        container.querySelector('#in-price').value = r.price;

        const nums = r.roomNumbers || [];
        inCount.value = nums.length || 1;
        renderRoomInputs(nums.length || 1, nums);

        formTitle.textContent = '編輯房型';
        btnCancel.style.display = 'block';
    }

    btnCancel.onclick = () => {
        form.reset();
        container.querySelector('#edit-id').value = '';
        formTitle.textContent = '新增房型';
        btnCancel.style.display = 'none';
        renderRoomInputs(1);
    };

    renderTable();
    renderPayTable();
    renderRoomInputs(1);

    form.onsubmit = (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const id = data.get('id');

        const roomInputs = roomInputsContainer.querySelectorAll('input');
        const roomNumbers = Array.from(roomInputs).map(inp => inp.value.trim()).filter(v => v);

        if (roomNumbers.length === 0) {
            alert('請至少輸入一個房號'); // Keep alert for blocking validation
            return;
        }

        const payload = {
            name: data.get('name'),
            capacity: parseInt(data.get('capacity')),
            price: parseInt(data.get('price')),
            roomNumbers: roomNumbers
        };

        if (id) {
            store.updateRoom({ ...payload, id });
        } else {
            store.addRoom(payload);
        }

        renderTable();
        btnCancel.click();
    };
}
