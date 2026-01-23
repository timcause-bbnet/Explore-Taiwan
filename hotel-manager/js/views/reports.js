import { store } from '../store.js';

export function renderReports(container) {
    container.innerHTML = `
        <h3 style="margin-bottom: 2rem;">營運報表</h3>
        
        <div class="dashboard-grid" style="margin-bottom: 3rem;">
            <div class="stat-card">
                 <div>
                    <h4 style="margin-bottom: 0.5rem; color: var(--text-secondary);">今日收款</h4>
                    <div id="report-today-rev" style="font-size: 2rem; font-weight: bold; color: var(--success);">$0</div>
                 </div>
            </div>
            <div class="stat-card">
                 <div>
                    <h4 style="margin-bottom: 0.5rem; color: var(--text-secondary);">總訂單數</h4>
                    <div id="report-total-orders" style="font-size: 2rem; font-weight: bold;">0</div>
                 </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            
            <div class="card" style="background: var(--bg-card); padding: 1.5rem; border: 1px solid var(--border); border-radius: var(--radius-md);">
                <h4 style="margin-bottom: 1rem;">今日收支明細 (依支付方式)</h4>
                <div id="payment-summary" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap:1rem; margin-bottom: 1.5rem;">
                    <!-- Generating Summary -->
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>時間</th>
                            <th>類型</th>
                            <th>方式</th>
                            <th>金額</th>
                        </tr>
                    </thead>
                    <tbody id="report-payments-body"></tbody>
                </table>
            </div>

            <div class="card" style="background: var(--bg-card); padding: 1.5rem; border: 1px solid var(--border); border-radius: var(--radius-md);">
                <h4 style="margin-bottom: 1rem;">專案熱門度分析</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>專案名稱</th>
                            <th>訂單數</th>
                            <th>營收貢獻</th>
                        </tr>
                    </thead>
                    <tbody id="report-projects-body"></tbody>
                </table>
            </div>
        </div>
    `;

    // Today's Payments
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPayments = store.payments.filter(p => p.date.startsWith(todayStr));
    const todayRevenue = todayPayments.reduce((acc, p) => acc + p.amount, 0);

    container.querySelector('#report-today-rev').textContent = `$${todayRevenue}`;
    container.querySelector('#report-total-orders').textContent = store.bookings.length;

    // Group by Method
    const methodSummary = {};
    store.paymentMethods.forEach(pm => methodSummary[pm.id] = 0);
    // Include hardcodes just in case
    methodSummary['cash'] = 0; methodSummary['card'] = 0; methodSummary['transfer'] = 0;

    todayPayments.forEach(p => {
        if (methodSummary[p.method] === undefined) methodSummary[p.method] = 0;
        methodSummary[p.method] += p.amount;
    });

    const summaryContainer = container.querySelector('#payment-summary');
    summaryContainer.innerHTML = Object.entries(methodSummary).map(([method, amt]) => {
        if (amt === 0 && method !== 'cash' && method !== 'card') return ''; // Clean up empty unless major
        if (amt === 0) return ''; // Actually hide all empty
        const mName = store.paymentMethods.find(x => x.id === method)?.name || method;
        return `
            <div style="background: var(--bg-card-hover); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
                 <div style="font-size: 0.8rem; color: var(--text-secondary);">${mName}</div>
                 <div style="font-size: 1.2rem; font-weight: bold; color: var(--primary);">$${amt}</div>
            </div>
        `;
    }).join('');

    // Render Payment Table
    const pmBody = container.querySelector('#report-payments-body');

    // Sort logic? User said "Cash to Cash, Card to Card". Maybe sort list by method?
    todayPayments.sort((a, b) => a.method.localeCompare(b.method));

    pmBody.innerHTML = todayPayments.map(p => {
        const mName = store.paymentMethods.find(x => x.id === p.method)?.name || p.method;
        return `
        <tr>
            <td>${new Date(p.date).toLocaleTimeString()}</td>
            <td>${p.type === 'deposit' ? '訂金' : '尾款'}</td>
            <td>${mName}</td>
            <td>$${p.amount}</td>
        </tr>
    `
    }).join('');

    // Project Stats
    const projectStats = {};
    store.bookings.forEach(b => {
        if (!projectStats[b.projectId]) {
            projectStats[b.projectId] = { name: b.projectName, count: 0, revenue: 0 };
        }
        projectStats[b.projectId].count++;
        projectStats[b.projectId].revenue += b.totalPrice;
    });

    const pjBody = container.querySelector('#report-projects-body');
    pjBody.innerHTML = Object.values(projectStats).sort((a, b) => b.revenue - a.revenue).map(s => `
        <tr>
            <td>${s.name}</td>
            <td>${s.count}</td>
            <td>$${s.revenue}</td>
        </tr>
    `).join('');
}
