import { store } from '../store.js';

export function renderFrontDesk(container) {
    const state = {
        filterType: 'all' // New: for room type filter
    };

    container.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem;">
                <div>
                    <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">前台作業</h3>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);" id="current-time"></div>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button id="btn-refresh" class="btn btn-sm" style="background: var(--bg-card); border: 1px solid var(--border);">🔄 更新狀態</button>
                    <button id="btn-batch-checkout" class="btn btn-sm" style="border: 1px solid var(--danger); color: var(--danger); background: transparent;">
                        ⚠️ 全部退房
                    </button>
                    <button id="btn-auto-assign" class="btn" style="border: 1px solid var(--accent); color: var(--primary); background: transparent;">
                        ⚡ 自動排房 (今日入住)
                    </button>
                </div>
            </div>

            <!-- Room Type Filter -->
            <div id="room-type-filter" style="display: flex; gap: 0.8rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                <!-- Pills will be injected here -->
            </div>

            <!-- Unassigned Warning -->
            <div id="unassigned-warning" style="display:none; margin-bottom: 1.5rem; background: #fff4e5; border: 1px solid #ffcc80; padding: 1rem; border-radius: var(--radius-sm); align-items: center; justify-content: space-between;">
                 <div style="display: flex; align-items: center; gap: 0.8rem; color: #e65100; font-weight: 500;">
                     <span>⚠️ 有 <span id="unassigned-count">0</span> 筆尚未排房的訂單 (佔用庫存)</span>
                 </div>
                 <button id="btn-show-unassigned" class="btn btn-sm" style="background: white; border: 1px solid #ffcc80; color: #e65100;">查看 / 排房</button>
            </div>

            <!-- Toolbar -->
            <div class="card" style="padding: 1rem; display: flex; gap: 2rem; align-items: center; border-radius: var(--radius-sm); border-left: 4px solid var(--primary);">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <label class="form-label" style="margin:0;">排序</label>
                    <select id="sort-select" class="form-input" style="width: 150px; padding: 0.4rem;">
                        <option value="roomNumber">依房號 (樓層)</option>
                        <option value="roomType">依房型</option>
                    </select>
                </div>

                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <label class="form-label" style="margin:0;">狀態篩選</label>
                    <div style="display: flex; gap: 0.5rem;">
                         <button class="filter-btn active" data-filter="all" style="padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid var(--border); background: var(--bg-card); cursor: pointer;">全部</button>
                         <button class="filter-btn" data-filter="occupied" style="padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid var(--primary); color: var(--primary); background: var(--bg-card); cursor: pointer;">已入住</button>
                         <button class="filter-btn" data-filter="reserved" style="padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid var(--warning); color: var(--warning); background: var(--bg-card); cursor: pointer;">預抵/保留</button>
                         <button class="filter-btn" data-filter="vacant" style="padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid var(--text-secondary); color: var(--text-secondary); background: var(--bg-card); cursor: pointer;">空房</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="room-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 1rem;">
            <!-- Rooms -->
        </div>

        <!-- Action Modal -->
        <div id="fd-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(44, 62, 80, 0.4); backdrop-filter: blur(4px); z-index:100; align-items:center; justify-content:center;">
             <div class="card" style="background: var(--bg-card); width: 600px; padding: 2rem; border-radius: var(--radius-md); border: 1px solid var(--border); max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.2);">
                 <h3 id="fd-modal-title" style="margin-bottom: 1.5rem; color: var(--text-primary);">房號操作</h3>
                 <div id="fd-modal-content"></div>
                 <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem;">
                     <button id="fd-modal-close" class="btn">關閉</button>
                 </div>
             </div>
        </div>

        <!-- Toast Notification -->
        <div id="fd-toast" style="display:none; position: fixed; bottom: 2rem; right: 2rem; background: var(--success); color: white; padding: 1rem 2rem; border-radius: var(--radius-sm); box-shadow: 0 4px 12px rgba(92, 124, 156, 0.3); z-index: 200;">
            Action Successful
        </div>
    `;

    // Time
    setInterval(() => {
        const el = container.querySelector('#current-time');
        if (el) el.textContent = new Date().toLocaleString('zh-TW', { hour12: false });
    }, 1000);

    // Refs
    const grid = container.querySelector('#room-grid');
    const modal = container.querySelector('#fd-modal');
    const modalContent = container.querySelector('#fd-modal-content');
    const toast = container.querySelector('#fd-toast');
    const todayStr = store.getLocalTodayStr();
    const sortSelect = container.querySelector('#sort-select');
    const filterBtns = container.querySelectorAll('.filter-btn');
    const btnRefresh = container.querySelector('#btn-refresh');

    let currentSort = 'roomNumber';
    let currentFilter = 'all';

    function showToast(msg, type = 'success') {
        toast.textContent = msg;
        toast.style.background = type === 'error' ? 'var(--danger)' : 'var(--success)';
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }

    if (btnRefresh) {
        btnRefresh.onclick = () => {
            renderGrid();
            showToast('狀態已更新');
        }
    }

    // Helper to check room dirty status
    function isRoomDirty(roomId) {
        // Use store.roomStatuses for synced status, fallback to local (migration)
        if (store.roomStatuses && store.roomStatuses[roomId]) return true;

        // Legacy local check
        const key = `dirty_${roomId}`;
        return localStorage.getItem(key) === 'true';
    }

    function setRoomDirty(roomId, isDirty) {
        if (!store.roomStatuses) store.roomStatuses = {};

        if (isDirty) {
            store.roomStatuses[roomId] = 'dirty';
            // Also set local for backup/speed? No, rely on store.
        } else {
            delete store.roomStatuses[roomId];
        }
        store.save(); // Sync to server
    }

    // Render Filter Pills
    function renderTypeFilters() {
        const filterContainer = container.querySelector('#room-type-filter');
        if (!filterContainer) return;

        const types = [{ id: 'all', name: '全部分類' }, ...store.rooms];

        filterContainer.innerHTML = types.map(t => {
            const isActive = state.filterType === t.id;
            const style = isActive
                ? `background: var(--primary); color: white; border: 1px solid var(--primary);`
                : `background: transparent; color: var(--text-primary); border: 1px solid var(--border);`;

            return `<button 
                class="btn-filter"
                data-type="${t.id}"
                style="border-radius: 50px; padding: 6px 16px; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; ${style}"
                onmouseover="this.style.borderColor='var(--primary)'"
                onmouseout="${isActive ? '' : "this.style.borderColor='var(--border)'"}"
            >${t.name}</button>`;
        }).join('');

        filterContainer.querySelectorAll('.btn-filter').forEach(btn => {
            btn.onclick = () => {
                state.filterType = btn.dataset.type;
                renderTypeFilters();
                renderGrid();
            };
        });
    }

    function renderGrid() {
        // Check Unassigned
        const unassigned = store.getUnassignedBookings(state.date);
        const warningEl = container.querySelector('#unassigned-warning');
        const countEl = container.querySelector('#unassigned-count');
        const btnShowUnassigned = container.querySelector('#btn-show-unassigned');

        if (warningEl && unassigned.length > 0) {
            warningEl.style.display = 'flex';
            if (countEl) countEl.textContent = unassigned.length;
            if (btnShowUnassigned) {
                btnShowUnassigned.onclick = () => {
                    showUnassignedModal(unassigned);
                };
            }
        } else if (warningEl) {
            warningEl.style.display = 'none';
        }

        let physicalRooms = store.getPhysicalRooms();

        // Apply room type filter
        if (state.filterType !== 'all') {
            physicalRooms = physicalRooms.filter(room => room.typeId === state.filterType);
        }

        // Sorting
        if (currentSort === 'roomType') {
            physicalRooms.sort((a, b) => a.typeName.localeCompare(b.typeName) || a.number.localeCompare(b.number));
        } else {
            // Room Number (Floor) - alphanumeric sort
            physicalRooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
        }

        const activeBookings = store.bookings.filter(b =>
            b.status !== 'cancelled' && b.status !== 'checked-out' &&
            b.checkIn <= todayStr && b.checkOut >= todayStr &&
            b.roomNumber
        );

        // Filter and Render
        const filteredHtml = physicalRooms.map(room => {
            const booking = activeBookings.find(b => b.roomNumber === room.number);
            let statusClass = 'vacant';
            let statusText = '空房';
            let guestName = '';
            let balanceInfo = '';
            let cardContent = '';

            const isDirty = isRoomDirty(room.number);

            if (booking) {
                if (booking.status === 'checked-in') {
                    statusClass = 'occupied';
                    statusText = '已入住';
                } else {
                    statusClass = 'reserved';
                    statusText = '未入住';
                }

                guestName = booking.guest.name;
                const balance = booking.totalPrice - (booking.paid || 0);
                balanceInfo = balance > 0 ? `<div style="font-size:0.8rem; margin-top:0.2rem; font-weight:600; opacity:0.9;">欠 $${balance}</div>` : `<div style="font-size:0.8rem; margin-top:0.2rem; opacity:0.8;">已結清</div>`;
            } else {
                if (isDirty) {
                    statusClass = 'dirty';
                    statusText = '待清掃';
                }
            }

            // Apply Filter
            if (currentFilter !== 'all') {
                if (currentFilter === 'vacant' && statusClass !== 'vacant' && statusClass !== 'dirty') return '';
                if (currentFilter === 'occupied' && statusClass !== 'occupied') return '';
                if (currentFilter === 'reserved' && statusClass !== 'reserved') return '';
            }

            // Styles
            let bgColor = 'var(--bg-card)';
            let textColor = 'var(--text-primary)';
            let borderColor = 'var(--border)';

            if (statusClass === 'occupied') {
                bgColor = 'var(--status-occupied)'; // Blue
                textColor = '#ffffff';
                borderColor = 'transparent';
            } else if (statusClass === 'reserved') {
                bgColor = 'var(--status-reserved)'; // Orange/Gold
                textColor = '#ffffff';
                borderColor = 'transparent';
            } else if (statusClass === 'dirty') {
                bgColor = '#e0e0e0'; // Grey
                textColor = '#757575';
            } else {
                // Vacant - White
                bgColor = '#ffffff';
            }

            if (booking) {
                const statusColor = booking.status === 'confirmed' ? 'var(--accent)' : 'var(--success)';
                const paidStatus = (booking.paid || 0) >= booking.totalPrice ? '已結清' : '未結清';

                // Note indicators
                let noteHtml = '';
                if (booking.guest.specialNote) {
                    noteHtml += `<div title="${booking.guest.specialNote}" style="color: #ffcccc; font-size: 0.8rem; margin-top: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; font-weight: 500;">★ ${booking.guest.specialNote}</div>`;
                }
                if (booking.guest.housekeepingNote) {
                    noteHtml += `<div title="${booking.guest.housekeepingNote}" style="color: #cceeff; font-size: 0.8rem; margin-top: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; font-weight: 500;">🧹 ${booking.guest.housekeepingNote}</div>`;
                }

                cardContent = `
                    <div style="font-weight: bold; margin-bottom: 0.2rem;">${booking.guest.name}</div>
                    <div style="font-size: 0.8rem; opacity: 0.8;">${booking.status === 'checked-in' ? '已入住' : '預抵: ' + booking.checkIn.slice(5)}</div>
                    <div style="font-size: 0.8rem; opacity: 0.8;">${paidStatus}</div>
                    ${noteHtml}
                `;
            } else {
                cardContent = `
                    ${statusClass === 'dirty' ? '<div style="font-size:1.5rem; text-align:center;">🧹</div>' : ''}
                    <div style="font-size: 0.85rem; opacity: 0.9;">${statusText}</div>
                `;
            }


            return `
                <div class="room-cell-modern status-${statusClass}" data-number="${room.number}" data-typeid="${room.typeId}" data-status="${statusClass}" style="cursor: pointer;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: 700; font-size: 1.25rem;">${room.number}</span>
                        <span style="font-size: 0.75rem; opacity: 0.85;">${room.typeName}</span>
                    </div>
                    <div style="margin-top: 0.5rem;">
                        ${cardContent}
                        ${booking ? balanceInfo : ''}
                    </div>
                </div>
            `;
        }).join('');

        grid.innerHTML = filteredHtml;

        // Click Events (Hover handled by CSS now)
        grid.querySelectorAll('.room-cell-modern').forEach(cell => {
            cell.onclick = () => {
                if (cell.dataset.status === 'vacant') {
                    window.location.hash = `/booking?roomNumber=${cell.dataset.number}&typeId=${cell.dataset.typeid}`;
                } else if (cell.dataset.status === 'dirty') {
                    openDirtyAction(cell.dataset.number);
                } else {
                    openRoomAction(cell.dataset.number);
                }
            };
        });
    }

    function openDirtyAction(roomNumber) {
        modalContent.innerHTML = `
            < div style = "text-align:center; padding: 2rem;" >
                <h3 style="margin-bottom: 2rem;">房號 ${roomNumber} 待清掃</h3>
                <div style="font-size: 4rem; margin-bottom: 2rem;">🧹</div>
                <button id="btn-clean" class="btn btn-primary" style="font-size: 1.2rem; padding: 0.8rem 2rem;">已打掃完畢</button>
            </div >
            `;
        modal.style.display = 'flex';
        modal.querySelector('#btn-clean').onclick = () => {
            setRoomDirty(roomNumber, false);
            renderGrid();
            modal.style.display = 'none';
            showToast('房間已標記為空房');
        };
        modal.querySelector('#fd-modal-close').onclick = () => modal.style.display = 'none';
    }

    function openRoomAction(roomNumber) {
        const booking = store.bookings.find(b =>
            b.roomNumber === roomNumber &&
            b.status !== 'cancelled' && b.status !== 'checked-out' &&
            b.checkIn <= todayStr && b.checkOut >= todayStr
        );

        if (!booking) return;

        const balance = booking.totalPrice - (booking.paid || 0);

        const occupiedNumbers = store.bookings
            .filter(b => b.status !== 'cancelled' && b.status !== 'checked-out' && b.roomNumber && b.id !== booking.id)
            .filter(b => b.checkIn <= todayStr && b.checkOut >= todayStr)
            .map(b => b.roomNumber);

        const availableRooms = store.getPhysicalRooms().filter(r => !occupiedNumbers.includes(r.number));

        modalContent.innerHTML = `
            <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                <button id="tab-action" class="btn btn-primary" style="flex:1;">操作</button>
                <button id="tab-edit" class="btn" style="flex:1; background: var(--bg-card-hover);">修改/換房</button>
            </div>

            <div id="content-action">
                <div style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1rem;">
                    <h4 style="color:var(--text-primary); margin-bottom:0.5rem;">${booking.guest.name} (${booking.status === 'checked-in' ? '已入住' : '未入住'})</h4>
                    <p style="color:var(--text-secondary);">入住: ${booking.checkIn} ~ ${booking.checkOut}</p>
                    <div class="form-group" style="margin-top: 1rem;">
                         <label class="form-label" style="color: #e74c3c;">★ 特殊需求備註</label>
                         <textarea id="room-special-note" class="form-input" rows="1">${booking.guest.specialNote || ''}</textarea>
                    </div>
                    <div class="form-group">
                         <label class="form-label" style="color: #3498db;">🧹 房務備註</label>
                         <textarea id="room-hk-note" class="form-input" rows="1">${booking.guest.housekeepingNote || ''}</textarea>
                    </div>
                     <button id="btn-save-note" class="btn btn-sm" style="margin-top: 0.5rem; background: var(--bg-card-hover); color: var(--text-primary); width:100%;">儲存備註</button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <div>
                       <h4 style="margin-bottom: 1rem; color:var(--text-primary);">結帳</h4>
                       <!-- Payment Summary -->
                       <div style="font-size: 0.9rem; margin-bottom: 0.5rem;">總價: $${booking.totalPrice}</div>
                       <div style="font-size: 0.9rem; margin-bottom: 0.5rem;">已付: $${booking.paid || 0}</div>
                       <div style="font-size: 1.2rem; margin-bottom: 1rem; font-weight: bold;">餘額: <span style="color: ${balance > 0 ? 'var(--danger)' : 'var(--success)'}">$${balance}</span></div>
                        
                        ${booking.payments && booking.payments.length > 0 ? `
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; background:var(--bg-card); padding:0.5rem; border-radius:4px;">
                                ${booking.payments.map(p => {
            const mName = store.paymentMethods.find(m => m.id === p.method)?.name || p.method;
            return `<div>${mName}: $${p.amount}</div>`;
        }).join('')}
                            </div>
                        ` : ''}

                       ${balance > 0 || booking.status === 'reserved' ? `
                       <div class="form-group" style="background: var(--bg-card-hover); padding: 1rem; border-radius: var(--radius-sm);">
                           <label class="form-label" style="margin-bottom:0.5rem">新增付款</label>
                           <input type="number" id="pay-amount" class="form-input" value="${balance > 0 ? balance : ''}" placeholder="金額" style="margin-bottom:0.5rem">
                           <select id="pay-method" class="form-input" style="margin-bottom:0.5rem">
                               ${store.paymentMethods.map(pm => `<option value="${pm.id}">${pm.name}</option>`).join('')}
                           </select>
                           <button id="btn-pay" class="btn btn-primary" style="width: 100%;">收款</button>
                       </div>
                       ` : '<div style="color: var(--success); font-weight:600;">已結清所有款項</div>'}
                    </div>

                    <div style="border-left: 1px solid var(--border); padding-left: 2rem;">
                        <h4 style="margin-bottom: 1rem; color:var(--text-primary);">住房操作</h4>
                        ${booking.status === 'confirmed' ? `
                            <button id="btn-checkin" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem; background-color: var(--success);">辦理入住</button>
                            <p style="font-size:0.8rem; color: var(--text-secondary);">* 若未結清，請先收款再入住，或入住後再收。</p>
                        ` : ''}
                        
                        ${booking.status === 'checked-in' ? `
                             ${balance > 0 ?
                    `<div style="text-align:center; color: var(--danger); font-size: 0.85rem; margin-bottom: 0.5rem; font-weight: bold;">⚠️ 尚有欠款 $${balance}</div>` :
                    ''}
                             <button id="btn-checkout" class="btn-danger btn" style="width: 100%; margin-bottom: 1rem;">辦理退房</button>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div id="content-edit" style="display:none;">
                <h4 style="margin-bottom: 1rem;">更換房間</h4>
                <div style="display:flex; gap: 0.5rem;">
                    <select id="swap-target" class="form-input">
                        ${availableRooms.map(r => `<option value="${r.number}">${r.number} (${r.typeName})</option>`).join('')}
                    </select>
                    <button id="btn-swap" class="btn btn-primary">確認換房</button>
                </div>
                
                <h4 style="margin-top: 2rem; margin-bottom: 1rem;">修改訂單</h4>
                <button id="btn-goto-order" class="btn" style="width: 100%;">前往訂單管理頁面完整編輯</button>
            </div>
        `;

        modal.style.display = 'flex';
        // ... Toggle logic (same as before) ...
        const tabAction = modal.querySelector('#tab-action');
        const tabEdit = modal.querySelector('#tab-edit');
        const cAction = modal.querySelector('#content-action');
        const cEdit = modal.querySelector('#content-edit');

        tabAction.onclick = () => { cAction.style.display = 'block'; cEdit.style.display = 'none'; tabAction.classList.add('btn-primary'); tabEdit.classList.remove('btn-primary'); };
        tabEdit.onclick = () => { cAction.style.display = 'none'; cEdit.style.display = 'block'; tabEdit.classList.add('btn-primary'); tabAction.classList.remove('btn-primary'); };

        // Events
        container.querySelector('#fd-modal-close').onclick = () => modal.style.display = 'none'; // Duplicate binding but safe

        const btnCheckIn = modal.querySelector('#btn-checkin');
        if (btnCheckIn) btnCheckIn.onclick = () => {
            booking.status = 'checked-in';
            store.updateBooking(booking);
            renderGrid();
            openRoomAction(roomNumber);
            showToast('入住成功');
        };
        const btnCheckOut = modal.querySelector('#btn-checkout');
        if (btnCheckOut) btnCheckOut.onclick = async () => {
            console.log('Checkout clicked');
            try {
                let msg = '確定要退房嗎? 房間將標記為待清掃。';
                if (typeof balance !== 'undefined' && balance > 0) msg += `\n\n⚠️ 注意：此房間尚有欠款 $${balance} 未結清！\n(建議先收款再退房，或退房後至訂單管理追蹤)`;

                if (confirm(msg)) {
                    // booking.status = 'checked-out';
                    // store.updateBooking(booking);
                    // setRoomDirty(roomNumber, true); // Mark Dirty

                    await store.checkoutBooking(booking); // Atomic update & single save

                    renderGrid();
                    modal.style.display = 'none';
                    showToast('退房成功');
                }
            } catch (err) {
                console.error('Checkout error:', err);
                alert('退房發生錯誤: ' + err.message);
            }
        };
        const btnPay = modal.querySelector('#btn-pay');
        if (btnPay) btnPay.onclick = () => {
            const amt = modal.querySelector('#pay-amount').value;
            if (amt && amt > 0) {
                store.addPayment(booking.id, amt, modal.querySelector('#pay-method').value, 'balance');
                showToast('收款成功');
                renderGrid(); // IMMEDIATE UPDATE: Refresh the background grid (colors, paid status)
                openRoomAction(roomNumber); // Refresh Modal to show updated balance
            }
        };
        const btnSaveNote = modal.querySelector('#btn-save-note');
        if (btnSaveNote) btnSaveNote.onclick = () => {
            booking.guest.specialNote = modal.querySelector('#room-special-note').value;
            booking.guest.housekeepingNote = modal.querySelector('#room-hk-note').value;
            // Update legacy note field for safety
            booking.guest.note = booking.guest.specialNote + (booking.guest.housekeepingNote ? ' / ' + booking.guest.housekeepingNote : '');
            store.updateBooking(booking);
            showToast('備註儲存');
            renderGrid(); // Refresh grid to show new notes
        };
        const btnSwap = modal.querySelector('#btn-swap');
        if (btnSwap) btnSwap.onclick = () => {
            const newN = modal.querySelector('#swap-target').value;
            if (newN) {
                booking.roomNumber = newN;
                store.updateBooking(booking);
                showToast('換房成功');
                modal.style.display = 'none';
                renderGrid();
            }
        };
        const btnGoOrder = modal.querySelector('#btn-goto-order');
        if (btnGoOrder) btnGoOrder.onclick = () => window.location.hash = '/orders';
    }

    container.querySelector('#fd-modal-close').onclick = () => modal.style.display = 'none';

    // Toolbar Events
    sortSelect.onchange = (e) => {
        currentSort = e.target.value;
        renderGrid();
    };

    filterBtns.forEach(btn => {
        btn.onclick = () => {
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'var(--bg-card)';
                b.style.fontWeight = 'normal';
            });

            btn.classList.add('active');
            btn.style.background = '#e3f2fd';
            btn.style.fontWeight = 'bold';

            currentFilter = btn.dataset.filter;
            renderGrid();
        };
    });

    // Auto Assign
    container.querySelector('#btn-auto-assign').onclick = () => {
        const todays = store.bookings.filter(b => b.checkIn === todayStr && !b.roomNumber && b.status === 'confirmed');
        let count = 0;
        todays.forEach(b => {
            const sameType = store.getPhysicalRooms().filter(r => r.typeId === b.roomId);
            const occupied = store.bookings
                .filter(bx => bx.status !== 'cancelled' && bx.status !== 'checked-out' && bx.roomNumber)
                .map(bx => bx.roomNumber);
            const avail = sameType.find(r => !occupied.includes(r.number));
            if (avail) {
                b.roomNumber = avail.number;
                store.updateBooking(b);
                count++;
            }
        });
        showToast(`自動分配 ${count} 筆`);
        renderGrid();
    };

    // Batch Checkout
    const btnBatchCheckout = container.querySelector('#btn-batch-checkout');
    if (btnBatchCheckout) {
        btnBatchCheckout.onclick = () => {
            if (confirm('確定要將目前所有「已入住」的房間全部退房嗎？\n(房間將標記為待清掃)')) {
                const count = store.checkoutAllActive();
                showToast(`已完成 ${count} 間退房`);
                renderGrid();
            }
        };
    }

    renderGrid();

    function showUnassignedModal(bookings) {
        modalContent.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>預訂人</th>
                        <th>房型</th>
                        <th>入住/退房</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(b => `
                    <tr>
                        <td>${b.guest.name}</td>
                        <td>${b.roomName}</td>
                        <td>${b.checkIn.slice(5)} ~ ${b.checkOut.slice(5)}</td>
                        <td>
                             <button class="btn btn-sm btn-assign-manual" data-id="${b.id}" style="background: var(--bg-card-hover); border: 1px solid var(--border);">排房</button>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        modal.querySelector('#fd-modal-title').textContent = `待排房訂單 (${bookings.length})`;
        modal.style.display = 'flex';

        modalContent.querySelectorAll('.btn-assign-manual').forEach(btn => {
            btn.onclick = () => {
                const bookingId = btn.dataset.id;
                const roomNum = prompt('請輸入要分配的房號:');
                if (roomNum) {
                    const booking = store.bookings.find(b => b.id === bookingId);
                    if (booking) {
                        booking.roomNumber = roomNum;
                        store.updateBooking(booking);
                        showToast(`已分配房號 ${roomNum}`);
                        modal.style.display = 'none';
                        renderGrid();
                    }
                }
            };
        });
    }
}
