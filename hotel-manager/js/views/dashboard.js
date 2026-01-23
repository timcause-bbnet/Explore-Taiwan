import { store } from '../store.js';

export function renderDashboard(container) {
    // Local Date Helper
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localTodayStr = new Date(today.getTime() - offset).toISOString().slice(0, 10);

    // Calc Stats
    const arrivals = store.bookings.filter(b => b.checkIn === localTodayStr && b.status === 'confirmed');
    const departures = store.bookings.filter(b => b.checkOut === localTodayStr && b.status === 'checked-in');

    // Dirty Count (localStorage scan)
    let dirtyCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i).startsWith('dirty_')) dirtyCount++;
    }

    // Occupancy
    const physicalRooms = store.rooms.reduce((acc, r) => acc + (r.roomNumbers ? r.roomNumbers.length : 0), 0);
    const occupied = store.bookings.filter(b => b.status === 'checked-in').length;
    const occupancyRate = physicalRooms > 0 ? Math.round((occupied / physicalRooms) * 100) : 0;

    container.innerHTML = `
        <h3 style="margin-bottom: 2rem; color: var(--text-primary);">大廳概況 (Lobby)</h3>
        
        <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem;">
            <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                 <div>
                    <h4 style="margin-bottom: 0.5rem; opacity: 0.9;">今日入住</h4>
                    <div id="dash-checkin" style="font-size: 2.5rem; font-weight: bold;">${arrivals.length}</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">待辦理</div>
                 </div>
            </div>
             <div class="stat-card" style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%); color: #555; padding: 1.5rem; border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                 <div>
                    <h4 style="margin-bottom: 0.5rem; opacity: 0.9;">今日退房</h4>
                    <div id="dash-checkout" style="font-size: 2.5rem; font-weight: bold;">${departures.length}</div>
                     <div style="font-size: 0.9rem; opacity: 0.8;">待辦理</div>
                 </div>
            </div>
             <div class="stat-card" style="background: white; border: 1px solid var(--border); padding: 1.5rem; border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                 <div>
                    <h4 style="margin-bottom: 0.5rem; color: var(--text-secondary);">目前住房率</h4>
                    <div id="dash-occupancy" style="font-size: 2.5rem; font-weight: bold; color: var(--primary);">${occupancyRate}%</div>
                 </div>
            </div>
             <div class="stat-card" style="background: white; border: 1px solid var(--border); padding: 1.5rem; border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                 <div>
                    <h4 style="margin-bottom: 0.5rem; color: var(--text-secondary);">房務狀況</h4>
                    <div id="dash-dirty" style="font-size: 2.5rem; font-weight: bold; color: var(--warning);">${dirtyCount}</div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">待清掃</div>
                 </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
            <div class="card" style="background: var(--bg-card); padding: 1.5rem; border: 1px solid var(--border); border-radius: var(--radius-md);">
                <h4 style="margin-bottom: 1rem; color: var(--text-primary);">今日預抵名單</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>房客姓名</th>
                            <th>預定房型</th>
                            <th>電話</th>
                            <th>備註</th>
                            <th>狀態</th>
                        </tr>
                    </thead>
                    <tbody id="dash-arrivals-body">
                         ${arrivals.length > 0 ? arrivals.map(b => `
                            <tr>
                                <td style="font-weight:600;">${b.guest.name}</td>
                                <td>${b.roomName || '-'}</td>
                                <td>${b.guest.phone}</td>
                                <td style="font-size:0.9rem; color:var(--text-secondary);">${b.guest.note || '-'}</td>
                                <td><span style="color:var(--accent);">未入住</span></td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-secondary);">尚無資料</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="card" style="background: var(--bg-card); padding: 1.5rem; border: 1px solid var(--border); border-radius: var(--radius-md);">
                <h4 style="margin-bottom: 1rem; color: var(--text-primary);">待辦事項 / 備註</h4>
                <div id="dash-notes" style="display: flex; flex-direction: column; gap: 1rem;">
                    <!-- Notes -->
                </div>
            </div>
        </div>
    `;

    // Notes (aggregating notes from today's active bookings)
    const activeToday = store.bookings.filter(b =>
        (b.checkIn <= localTodayStr && b.checkOut >= localTodayStr) &&
        b.status !== 'cancelled' &&
        b.guest.note
    );

    const notesContainer = container.querySelector('#dash-notes');
    if (activeToday.length > 0) {
        notesContainer.innerHTML = activeToday.slice(0, 5).map(b => `
             <div style="background: #fff; padding: 0.8rem; border-left: 3px solid var(--primary); border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem;">
                    <span style="font-weight:600; font-size:0.9rem;">${b.roomNumber || '未排房'} - ${b.guest.name}</span>
                    <span style="font-size:0.8rem; color:#999;">${b.status}</span>
                </div>
                <div style="font-size:0.9rem; color:#555;">${b.guest.note}</div>
             </div>
        `).join('');
    } else {
        notesContainer.innerHTML = '<div style="color:var(--text-secondary); text-align:center;">無備註事項</div>';
    }
}
