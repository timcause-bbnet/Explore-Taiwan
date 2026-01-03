import { store } from '../store.js';

export function renderOrders(container) {
    container.innerHTML = `
        <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
            <button class="filter-btn btn btn-primary" data-filter="all">所有訂單</button>
            <button class="filter-btn btn" data-filter="today-new">今日新增</button>
            <button class="filter-btn btn" data-filter="today-checkin">今日入住</button>
            <button class="filter-btn btn" data-filter="unpaid" style="color: var(--warning); border: 1px solid var(--warning);">未結清</button>
        </div>

        <div class="card" style="background: var(--bg-card); overflow: hidden; border-radius: var(--radius-md); border: 1px solid var(--border);">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>訂單編號</th>
                        <th>姓名</th>
                        <th>房型 / 專案</th>
                        <th>入住日期</th>
                        <th>狀態</th>
                        <th>金額 (需訂金)</th>
                        <th>付費狀況</th>
                        <th>備註</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="orders-tbody"></tbody>
            </table>
        </div>
        
        <!-- Edit Modal -->
        <div id="edit-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:100; align-items:center; justify-content:center;">
             <div class="card" style="background: var(--bg-card); width: 600px; padding: 2rem; border-radius: var(--radius-md); border: 1px solid var(--border); max-height: 90vh; overflow-y: auto;">
                 <h3 style="margin-bottom: 1.5rem;">編輯訂單</h3>
                 <input type="hidden" id="edit-order-id">
                 
                 <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                     <div class="form-group">
                         <label class="form-label">顧客姓名</label>
                         <input type="text" id="edit-name" class="form-input">
                     </div>
                     <div class="form-group">
                         <label class="form-label">電話</label>
                         <input type="text" id="edit-phone" class="form-input">
                     </div>
                 </div>

                 <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                     <div class="form-group">
                         <label class="form-label">入住日期</label>
                         <input type="date" id="edit-checkin" class="form-input">
                     </div>
                     <div class="form-group">
                         <label class="form-label">退房日期</label>
                         <input type="date" id="edit-checkout" class="form-input">
                     </div>
                 </div>

                 <div class="form-group">
                     <label class="form-label">房型</label>
                     <select id="edit-room" class="form-input"></select>
                 </div>
                 
                 <div class="form-group">
                     <label class="form-label">專案</label>
                     <select id="edit-project" class="form-input"></select>
                 </div>

                 <div class="form-group">
                     <label class="form-label">備註</label>
                     <textarea id="edit-note" class="form-input" rows="2"></textarea>
                 </div>

                 <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--border);">
                     <h4 style="margin-bottom: 1rem; color: var(--success);">財務管理</h4>
                     <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                         <span>總金額: <span id="financial-total">$0</span></span>
                         <span>已付: <span id="financial-paid">$0</span></span>
                         <span>欠款: <span id="financial-balance" style="color:var(--danger)">$0</span></span>
                     </div>
                     
                     <div id="payment-history" style="margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-secondary);"></div>

                     <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 4px;">
                         <label class="form-label">新增收款 (訂金/尾款)</label>
                         <div style="display: flex; gap: 0.5rem;">
                             <input type="number" id="new-pay-amount" class="form-input" placeholder="金額">
                             <select id="new-pay-method" class="form-input">
                                 <option value="cash">現金</option>
                                 <option value="transfer">匯款</option>
                                 <option value="card">信用卡</option>
                             </select>
                             <button id="btn-add-pay" class="btn btn-sm" style="border: 1px solid var(--accent); color: var(--accent);">入帳</button>
                         </div>
                     </div>
                 </div>

                 <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem;">
                     <button id="btn-close-edit" class="btn">關閉</button>
                     <button id="btn-save-edit" class="btn btn-primary">儲存變更</button>
                 </div>
             </div>
        </div>
    `;

    const tbody = container.querySelector('#orders-tbody');
    const modal = container.querySelector('#edit-modal');

    // Inputs
    const editId = container.querySelector('#edit-order-id');
    const editName = container.querySelector('#edit-name');
    const editPhone = container.querySelector('#edit-phone');
    const editCheckIn = container.querySelector('#edit-checkin');
    const editCheckOut = container.querySelector('#edit-checkout');
    const editRoom = container.querySelector('#edit-room');
    const editProject = container.querySelector('#edit-project');
    const editNote = container.querySelector('#edit-note');

    // Financials
    const fTotal = container.querySelector('#financial-total');
    const fPaid = container.querySelector('#financial-paid');
    const fBalance = container.querySelector('#financial-balance');
    const pHistory = container.querySelector('#payment-history');
    const payAmount = container.querySelector('#new-pay-amount');
    const payMethod = container.querySelector('#new-pay-method');
    const btnAddPay = container.querySelector('#btn-add-pay');

    let currentFilter = 'all';

    function getFilteredBookings() {
        const today = store.getLocalTodayStr();
        return store.bookings.slice().reverse().filter(b => {
            if (currentFilter === 'today-new') return b.createdAt.startsWith(today);
            if (currentFilter === 'today-checkin') return b.checkIn === today;
            if (currentFilter === 'unpaid') return (b.paid || 0) < b.totalPrice;
            return true;
        });
    }

    function renderList() {
        const list = getFilteredBookings();
        tbody.innerHTML = list.map(b => {
            const paid = b.paid || 0;
            const balance = b.totalPrice - paid;
            const statusColor = b.status === 'confirmed' ? 'var(--accent)' : (b.status === 'checked-in' ? 'var(--success)' : 'var(--text-secondary)');
            const depositInfo = b.requiredDeposit ? `<br><small style="color:width: var(--warning)">需訂金 $${Math.round(b.requiredDeposit)}</small>` : '';

            return `
            <tr>
                <td style="font-family: monospace;">${b.id.slice(-6)}</td>
                <td title="備註: ${b.guest.note || '無'}">${b.guest.name}<br><small style="opacity:0.7">${b.guest.phone}</small></td>
                <td>${b.roomName}<br><small style="color:var(--accent)">${b.projectName}</small></td>
                <td>${b.checkIn} ~ ${b.checkOut}</td>
                <td style="color:${statusColor}">${b.status}</td>
                <td>
                    $${b.totalPrice}
                    ${depositInfo}
                </td>
                <td>
                    <span style="color: ${balance > 0 ? 'var(--danger)' : 'var(--success)'}">
                        ${balance > 0 ? `欠 $${balance}` : '已結清'}
                    </span>
                    ${paid > 0 ? `<br><small style="color:var(--success)">已付 $${paid}</small>` : ''}
                </td>
                <td style="max-width: 150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${b.guest.note || '-'}
                </td>
                <td>
                    <button class="btn-xs btn-edit-order" data-id="${b.id}" style="cursor:pointer; color:var(--accent); background:none; border:none;">管理 / 編輯</button>
                    <button class="btn-xs btn-del-order" data-id="${b.id}" style="cursor:pointer; color:var(--danger); background:none; border:none; margin-left: 0.5rem;">刪除</button>
                </td>
            </tr>
            `;
        }).join('');

        // Attach Events
        tbody.querySelectorAll('.btn-edit-order').forEach(btn => {
            btn.onclick = () => showEdit(btn.dataset.id);
        });

        tbody.querySelectorAll('.btn-del-order').forEach(btn => {
            btn.onclick = () => {
                if (confirm('確定刪除此訂單?')) {
                    store.deleteBooking(btn.dataset.id);
                    renderList();
                }
            };
        });
    }

    function showEdit(id) {
        const b = store.bookings.find(bx => bx.id === id);
        if (!b) return;

        editId.value = b.id;
        editName.value = b.guest.name;
        editPhone.value = b.guest.phone;
        editCheckIn.value = b.checkIn;
        editCheckOut.value = b.checkOut;
        editNote.value = b.guest.note || '';

        // Populate Rooms
        editRoom.innerHTML = store.rooms.map(r => `<option value="${r.id}" ${r.id === b.roomId ? 'selected' : ''}>${r.name}</option>`).join('');
        // Populate Projects
        editProject.innerHTML = store.projects.map(p => `<option value="${p.id}" ${p.id === b.projectId ? 'selected' : ''}>${p.name}</option>`).join('');

        updateFinancials(b);

        modal.style.display = 'flex';
    }

    function updateFinancials(b) {
        fTotal.textContent = `$${b.totalPrice}`;
        fPaid.textContent = `$${b.paid || 0}`;
        const balance = b.totalPrice - (b.paid || 0);
        fBalance.textContent = `$${balance}`;

        pHistory.innerHTML = (b.payments || []).map(p => `
            <div style="display:flex; justify-content:space-between; padding: 2px 0;">
                <span>${p.date.slice(0, 10)} ${p.type === 'deposit' ? '(訂金)' : ''}</span>
                <span>$${p.amount} (${p.method})</span>
            </div>
        `).join('');
    }

    btnAddPay.onclick = () => {
        const id = editId.value;
        const amt = payAmount.value;
        if (id && amt) {
            store.addPayment(id, amt, payMethod.value, 'deposit'); // Assume user adding deposit or partial pay
            payAmount.value = '';
            // Refresh financials UI
            const b = store.bookings.find(bx => bx.id === id);
            updateFinancials(b);
            renderList(); // Refresh list background
        }
    };

    container.querySelector('#btn-save-edit').onclick = () => {
        const id = editId.value;
        const b = store.bookings.find(bx => bx.id === id);
        if (b) {
            b.guest.name = editName.value;
            b.guest.phone = editPhone.value;
            b.checkIn = editCheckIn.value;
            b.checkOut = editCheckOut.value;
            b.guest.note = editNote.value;

            // Check if Room/Project changed to update Name
            if (editRoom.value !== b.roomId) {
                const r = store.rooms.find(x => x.id === editRoom.value);
                b.roomId = r.id;
                b.roomName = r.name;
            }
            if (editProject.value !== b.projectId) {
                const p = store.projects.find(x => x.id === editProject.value);
                b.projectId = p.id;
                b.projectName = p.name;
            }

            store.updateBooking(b);
            modal.style.display = 'none';
            renderList();
        }
    };

    container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            currentFilter = btn.dataset.filter;
            container.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('btn-primary');
                if (b === btn) b.classList.add('btn-primary');
            });
            renderList();
        };
    });

    container.querySelector('#btn-close-edit').onclick = () => modal.style.display = 'none';

    renderList();
}
