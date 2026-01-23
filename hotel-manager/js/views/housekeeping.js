import { store } from '../store.js';

export function renderHousekeeping(container) {
    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
            <h3 style="color: var(--text-primary);">房務整理清單</h3>
            <div style="display: flex; gap: 1rem;">
                <button id="btn-refresh-hk" class="btn btn-sm" style="background: var(--bg-card); border: 1px solid var(--border);">🔄 更新狀態</button>
            </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <table class="data-table">
                <thead style="background: var(--bg-card-hover);">
                    <tr>
                        <th style="width: 100px;">房號</th>
                        <th style="width: 150px;">狀態</th>
                        <th style="width: 150px;">房型</th>
                        <th>房務備註 (清潔需求)</th>
                        <th style="width: 150px;">操作</th>
                    </tr>
                </thead>
                <tbody id="hk-table-body">
                    <!-- Dynamic Body -->
                </tbody>
            </table>
        </div>
    `;

    const tbody = container.querySelector('#hk-table-body');
    const refreshBtn = container.querySelector('#btn-refresh-hk');

    function renderList() {
        const physicalRooms = store.getPhysicalRooms();
        const todayStr = store.getLocalTodayStr();

        // Map all rooms to their current relevant status
        const roomData = physicalRooms.map(r => {
            const isDirty = localStorage.getItem('dirty_' + r.number);

            // Find current active booking (Occupied)
            const currentBooking = store.bookings.find(b =>
                b.roomNumber === r.number &&
                b.status === 'checked-in'
            );

            // Find arrival today (Reserved) - Prioritize those with notes
            const arrivalBooking = store.bookings.find(b =>
                b.roomNumber === r.number &&
                b.status === 'confirmed' &&
                b.checkIn === todayStr
            );

            // Determine display priority: Dirty > Occupied > Arrival with Note
            let status = 'vacant';
            let displayBooking = null;
            let statusLabel = '';
            let statusColor = '';

            if (isDirty) {
                status = 'dirty';
                statusLabel = '待清掃';
                statusColor = '#666';
                // Try to find the booking that just checked out for context
                displayBooking = store.bookings
                    .filter(b => b.roomNumber === r.number && b.status === 'checked-out')
                    .sort((a, b) => b.checkOut.localeCompare(a.checkOut) || b.id.localeCompare(a.id))[0];
            } else if (currentBooking) {
                status = 'occupied';
                statusLabel = '入住中';
                statusColor = 'var(--status-occupied)'; // Blue
                displayBooking = currentBooking;
            } else if (arrivalBooking) {
                status = 'arrival';
                statusLabel = '今日預抵';
                statusColor = 'var(--status-reserved)'; // Orange
                displayBooking = arrivalBooking;
            }

            return {
                ...r,
                status,
                statusLabel,
                statusColor,
                booking: displayBooking
            };
        });

        // Filter: Show matching criteria
        // Criteria: 
        // 1. Is Dirty
        // 2. Is Occupied (Sync with front desk)
        // 3. Is Arrival AND has Housekeeping Note (Prep for arrival)
        const list = roomData.filter(d =>
            d.status === 'dirty' ||
            d.status === 'occupied' ||
            (d.status === 'arrival' && d.booking && d.booking.guest.housekeepingNote)
        );

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 3rem; color: var(--text-secondary);">目前沒有待處理的房間 ✨</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(d => {
            const hkNote = d.booking && d.booking.guest.housekeepingNote
                ? `<span style="color: #3498db; font-weight: bold;">${d.booking.guest.housekeepingNote}</span>`
                : '<span style="color: #ccc;">-</span>';

            const rowBg = d.status === 'dirty' ? '#fffafa' : '#fff';

            // Action button
            let actionBtn = '';
            if (d.status === 'dirty') {
                actionBtn = `<button class="btn btn-sm btn-clean" data-num="${d.number}" style="background: var(--success); color: white; padding: 0.4rem 0.8rem;">✨ 完成打掃</button>`;
            } else if (d.status === 'occupied') {
                actionBtn = `<span style="font-size:0.8rem; color:#aaa;">入住中</span>`;
            } else if (d.status === 'arrival') {
                actionBtn = `<span style="font-size:0.8rem; color: var(--status-reserved);">待入住</span>`;
            }

            // Status Badge Style
            let badgeStyle = `background: #eee; color: ${d.statusColor}; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem;`;
            if (d.status === 'occupied' || d.status === 'arrival') {
                badgeStyle = `background: ${d.statusColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem;`;
            }

            return `
                <tr style="background: ${rowBg};">
                    <td style="font-size: 1.2rem; font-weight: bold;">${d.number}</td>
                    <td><span style="${badgeStyle}">${d.statusLabel}</span></td>
                    <td>${d.typeName}</td>
                    <td style="font-size: 0.95rem;">${hkNote}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        }).join('');

        // Attach events
        tbody.querySelectorAll('.btn-clean').forEach(btn => {
            btn.onclick = () => {
                const num = btn.dataset.num;
                if (confirm(`${num} 號房已打掃完畢？`)) {
                    localStorage.removeItem('dirty_' + num);
                    renderList();
                }
            };
        });
    }

    refreshBtn.onclick = () => renderList();

    renderList();
}
