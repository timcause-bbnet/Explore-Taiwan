// App Logic
import { renderDashboard } from './views/dashboard.js';
import { renderFrontDesk } from './views/front_desk.js';
import { renderBooking } from './views/booking.js';
import { renderSettings } from './views/settings.js';
import { renderReports } from './views/reports.js';
import { renderOrders } from './views/orders.js';
import { renderProjects } from './views/projects.js';
import { renderDateSettings } from './views/date_settings.js';
import { renderHousekeeping } from './views/housekeeping.js';
import { store } from './store.js';

const routes = {
    '/': { title: '大廳概況', render: renderDashboard },
    '/frontdesk': { title: '櫃台作業', render: renderFrontDesk },
    '/booking': { title: '新增預約', render: renderBooking },
    '/orders': { title: '訂單管理', render: renderOrders },
    '/settings': { title: '飯店設定', render: renderSettings },
    '/reports': { title: '報表分析', render: renderReports },
    '/projects': { title: '專案設定', render: renderProjects },
    '/dates': { title: '日期設定', render: renderDateSettings },
    '/housekeeping': { title: '房務管理', render: renderHousekeeping }
};

function router() {
    const hash = window.location.hash || '/';
    // Match base route e.g., /booking?id=123 matches /booking
    const path = hash.split('?')[0].replace('#', '') || '/';

    const route = routes[path] || routes['/'];

    // Update Title
    document.getElementById('page-title').textContent = route.title;

    // Update Active Nav
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('href') === '#' + path) el.classList.add('active');
        // Handle root
        if (path === '/' && el.getAttribute('href') === '#/') el.classList.add('active');
    });

    const container = document.getElementById('view-container');
    route.render(container);

    // Close mobile sidebar on route change
    document.querySelector('.sidebar').classList.remove('active');
}

// Mobile Menu Handler
const appEl = document.getElementById('app');
const menuBtn = document.createElement('button');
menuBtn.className = 'mobile-menu-btn';
menuBtn.innerHTML = '☰';
menuBtn.onclick = () => {
    document.querySelector('.sidebar').classList.toggle('active');
};
appEl.appendChild(menuBtn);

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const isMobile = window.innerWidth <= 768;
    if (isMobile && sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== menuBtn) {
        sidebar.classList.remove('active');
    }
});

// Init
store.init();
window.addEventListener('hashchange', router);
window.addEventListener('load', router);
window.addEventListener('data-loaded', router);
