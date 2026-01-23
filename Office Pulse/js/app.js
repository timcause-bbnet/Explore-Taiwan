/**
 * Office Pulse - Main Application Logic
 * V7: Company Events, Full Calendar Avatars, Inline Trip Details, Password Logic, Nav Fixes
 */

// Enhanced Default Users
const DEFAULT_USERS = [
    { id: 'u1', username: 'Alex', password: '123', name: 'Alex M.', chiname: '陳亞歷', nickname: 'Alex', shortname: '歷', birthday: '1990-01-01', avatarColor: '#8b5cf6', avatarUrl: '', permissions: { approve: false, schedule: false, manageUser: false } },
    { id: 'u2', username: 'Sarah', password: '123', name: 'Sarah K.', chiname: '林莎拉', nickname: 'Sarah', shortname: '莎', birthday: '1992-05-15', avatarColor: '#ec4899', avatarUrl: '', permissions: { approve: false, schedule: false, manageUser: false } },
    { id: 'u3', username: 'David', password: '123', name: 'David L.', chiname: '李大衛', nickname: 'David', shortname: '衛', birthday: '1988-11-20', avatarColor: '#10b981', avatarUrl: '', permissions: { approve: false, schedule: false, manageUser: false } },
    { id: 'u4', username: 'Emily', password: '123', name: 'Emily R.', chiname: '張艾蜜', nickname: 'Emily', shortname: '蜜', birthday: '1995-03-10', avatarColor: '#f59e0b', avatarUrl: '', permissions: { approve: false, schedule: false, manageUser: false } },
    { id: 'u5', username: 'Chris', password: '123', name: 'Chris T.', chiname: '王克里斯', nickname: 'Chris', shortname: '克', birthday: '1993-07-08', avatarColor: '#3b82f6', avatarUrl: '', permissions: { approve: false, schedule: false, manageUser: false } },
    { id: 'u6', username: 'Brian', password: '123', name: 'Brian L.', chiname: '黃布萊恩', nickname: 'Brian', shortname: '恩', birthday: '1991-09-12', avatarColor: '#6366f1', avatarUrl: '', permissions: { approve: true, schedule: true, manageUser: true } },
    { id: 'u7', username: 'Bryam', password: '123', name: 'Bryam K.', chiname: '柯布萊姆', nickname: 'Bryam', shortname: '姆', birthday: '1994-12-05', avatarColor: '#8b5cf6', avatarUrl: '', permissions: { approve: false, schedule: false, manageUser: false } }
];

const STATUS_TYPES = { OFFICE: 'office', REMOTE: 'remote', TRIP: 'trip', AWAY: 'away', OTHER: 'other' };
const SUB_OPTIONS = { remote: ['台北', '台中', '高雄', '台南', '台東', '桃園'], away: ['特休', '病假', '事假'] };

class AppState {
    constructor() {
        this.currentUser = null;
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.isBatchMode = false;
        this.multiSelectedDates = new Set();
        this.isAdminMode = false;
        this.adminTargetUserId = null;

        // Init with defaults
        this.users = DEFAULT_USERS;
        this.attendanceData = {};
        this.companyEvents = {};
        this.clockRecords = {}; // New: Store clock records
        this.applications = []; // New: Store applications [{id, userId, type, date, data, status, timestamp}]

        // --- Persistence Strategy: Firebase Realtime Database ---
        // User Config from FIREBASE_SETUP

        // constructor() { // This constructor was duplicated in the original, removing the first one.
        // this.currentUser = null;
        // this.currentDate = new Date();
        // this.selectedDate = new Date();
        // this.isBatchMode = false;
        // this.multiSelectedDates = new Set();
        // this.isAdminMode = false;
        // this.adminTargetUserId = null;

        // Init with defaults
        // this.users = DEFAULT_USERS;
        // this.attendanceData = {};
        // this.companyEvents = {};
        // this.clockRecords = {}; 
        // this.applications = []; 

        this.initFirebase();
    }

    initFirebase() {
        // 1. Config
        const firebaseConfig = {
            apiKey: "AIzaSyCOfrlTr77A7Z_UEbHs8lpUYzmi5WtI7Ps",
            authDomain: "office-pulse-171e8.firebaseapp.com",
            databaseURL: "https://office-pulse-171e8-default-rtdb.firebaseio.com",
            projectId: "office-pulse-171e8",
            storageBucket: "office-pulse-171e8.firebasestorage.app",
            messagingSenderId: "179101803060",
            appId: "1:179101803060:web:d145631b2c458fce386061",
            measurementId: "G-Q1EGG9K6VS"
        };

        // 2. Initialize
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        } else if (typeof firebase === 'undefined') {
            console.error("Firebase SDK not loaded!");
            return;
        }

        // 3. Setup Listener (Realtime)
        const dbRef = firebase.database().ref('/');

        dbRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log("🔥 Firebase Data Updated", data);
                if (data.users) this.users = data.users;
                if (data.attendance) this.attendanceData = data.attendance;
                if (data.events) this.companyEvents = data.events;
                if (data.clock) this.clockRecords = data.clock || {};
                if (data.applications) this.applications = data.applications || [];

                // Ensure Admin
                this.users.forEach(u => {
                    if (u.username === 'Brian') u.permissions = { approve: true, schedule: true, manageUser: true, superAdmin: true };
                });

                // Refresh UI if logged in
                if (this.currentUser) {
                    // Update current user ref just in case perms changed
                    const freshUser = this.users.find(u => u.id === this.currentUser.id);
                    if (freshUser) this.currentUser = freshUser;

                    if (typeof updateSidebar === 'function') updateSidebar();
                    if (typeof renderCalendar === 'function') renderCalendar();
                } else {
                    // Try auto-login if users loaded for the first time
                    this.checkPersistentLogin();
                }
            } else {
                // First time load (Empty DB)?
                console.log("⚠️ Firebase is empty. uploading defaults...");
                this.syncToServer();
                // Also check persistent login here just in case local defaults connect
                this.checkPersistentLogin();
            }
        });
    }

    // Replace Save Method
    async syncToServer() {
        const payload = {
            users: this.users,
            attendance: this.attendanceData,
            events: this.companyEvents,
            clock: this.clockRecords,
            applications: this.applications
        };
        try {
            await firebase.database().ref('/').set(payload);
            console.log("✅ Saved to Firebase");
        } catch (e) {
            console.error("Sync failed", e);
            alert("連線儲存失敗，請檢查網路或是 Firebase 權限設定");
        }
    }

    // Legacy method stubs
    async loadFromServer() { /* Auto-handled by on('value') listener */ }

    // Clock Ops
    // Clock Ops
    getClockRecord(date, userId) {
        const key = this.formatDate(date);
        if (!this.clockRecords[key]) return null;
        return this.clockRecords[key][userId];
    }

    // Explicit Clock In
    clockIn(date, userId) {
        const key = this.formatDate(date);
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });

        if (!this.clockRecords[key]) this.clockRecords[key] = {};
        if (!this.clockRecords[key][userId]) {
            this.clockRecords[key][userId] = { in: timeStr, out: null };
        }
        this.syncToServer();
        return timeStr;
    }

    // Explicit Clock Out
    clockOut(date, userId) {
        const key = this.formatDate(date);
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });

        if (this.clockRecords[key] && this.clockRecords[key][userId]) {
            this.clockRecords[key][userId].out = timeStr;
            this.syncToServer();
            return timeStr;
        }
        return null;
    }

    toggleClock() {
        // Deprecated but kept for compatibility if needed
        if (!this.currentUser) return;
        const key = this.formatDate(new Date());
        const rec = this.clockRecords[key]?.[this.currentUser.id];
        if (!rec || !rec.in) this.clockIn(new Date(), this.currentUser.id);
        else if (!rec.out) this.clockOut(new Date(), this.currentUser.id);
    }


    generateMockData() {
        return {};
    }

    saveAttendance() { this.syncToServer(); }
    saveUsers() {
        this.syncToServer();
        if (this.currentUser) this.currentUser = this.users.find(u => u.id === this.currentUser.id);
    }
    saveEvents() { this.syncToServer(); }


    // Auth & Basic
    // Auth & Basic
    login(username, password) {
        const user = this.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
        // Verify Password
        if (user && user.password === password) {
            this.loginSuccess(user);
            return true;
        }
        return false;
    }

    loginSuccess(user) {
        this.currentUser = user;
        this.adminTargetUserId = user.id;

        // Persistent Login: Save ID
        localStorage.setItem('op_current_user_id', user.id);

        // Ensure Admin Perms
        if (user.username === 'Brian') {
            user.permissions = { approve: true, schedule: true, manageUser: true, superAdmin: true };
        }
    }

    logout() {
        this.currentUser = null;
        this.isAdminMode = false;
        localStorage.removeItem('op_current_user_id');
        location.reload(); // Force reload to clear state
    }

    // Check local storage for persistent login
    checkPersistentLogin() {
        const savedId = localStorage.getItem('op_current_user_id');
        if (savedId && this.users.length > 0) {
            const user = this.users.find(u => u.id === savedId);
            if (user) {
                console.log("🔄 Auto-login restored for:", user.username);
                this.loginSuccess(user);

                // Switch Screens
                const loginScreen = document.getElementById('login-screen');
                const dashboardScreen = document.getElementById('dashboard-screen');

                if (loginScreen) loginScreen.classList.remove('active');
                if (dashboardScreen) dashboardScreen.classList.add('active');

                // Initialize UI
                if (typeof updateUI === 'function') updateUI();
                else {
                    if (typeof updateSidebar === 'function') updateSidebar();
                    if (typeof renderCalendar === 'function') renderCalendar();
                }
            }
        }
    }

    // Data Ops
    getSegments(date, userId) {
        const dateKey = this.formatDate(date);
        return (this.attendanceData[dateKey] && this.attendanceData[dateKey][userId]) || [];
    }
    addSegment(date, segment, userId = null) {
        if (!this.currentUser) return;
        let targetId = this.isAdminMode ? this.adminTargetUserId : this.currentUser.id;
        if (userId) targetId = userId; // Override target if explicitly provided
        const dateKey = typeof date === 'string' ? date : this.formatDate(date);
        if (!this.attendanceData[dateKey]) this.attendanceData[dateKey] = {};
        if (!this.attendanceData[dateKey][targetId]) this.attendanceData[dateKey][targetId] = [];
        this.attendanceData[dateKey][targetId].push({ id: Date.now() + Math.random(), ...segment });
        this.attendanceData[dateKey][targetId].sort((a, b) => (a.isAllDay === b.isAllDay) ? a.start.localeCompare(b.start) : (a.isAllDay ? -1 : 1));
        this.saveAttendance();
    }
    removeSegment(date, segmentId) {
        if (!this.currentUser) return;
        const targetId = this.isAdminMode ? this.adminTargetUserId : this.currentUser.id;
        const dateKey = this.formatDate(date);
        if (!this.attendanceData[dateKey] || !this.attendanceData[dateKey][targetId]) return;
        this.attendanceData[dateKey][targetId] = this.attendanceData[dateKey][targetId].filter(s => s.id !== segmentId);
        this.saveAttendance();
    }

    // Event Ops
    setEvent(date, text) {
        const key = this.formatDate(date);
        if (!text.trim()) delete this.companyEvents[key];
        else this.companyEvents[key] = text;
        this.saveEvents();
    }
    getEvent(date) { return this.companyEvents[this.formatDate(date)] || ''; }

    // User Ops
    addUser(userData) {
        const newId = 'u' + (Date.now());
        const newUser = {
            id: newId,
            username: userData.username,
            password: userData.password || '1234',
            name: userData.name || userData.username,
            chiname: userData.chiname,
            email: userData.email || '',
            nickname: userData.nickname,
            shortname: userData.shortname,
            birthday: userData.birthday,
            avatarColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
            avatarUrl: userData.avatarUrl || ''
        };
        this.users.push(newUser);
        this.saveUsers();
        return newUser;
    }
    updateUser(id, data) {
        const u = this.users.find(x => x.id === id);
        if (!u) return;
        Object.assign(u, data); // Simplified update
        this.saveUsers();
    }
    deleteUser(id) {
        this.users = this.users.filter(u => u.id !== id);
        this.saveUsers();
    }

    // Helpers
    formatDate(date) { return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; }
    toggleBatchDate(date) { const key = this.formatDate(date); if (this.multiSelectedDates.has(key)) this.multiSelectedDates.delete(key); else this.multiSelectedDates.add(key); }
    clearBatchSelection() { this.multiSelectedDates.clear(); }
    getHoliday(date) {
        const y = date.getFullYear(); const m = date.getMonth() + 1; const d = date.getDate();
        const holidays = {
            '1-1': '元旦',
            '2-16': '小年夜', '2-17': '除夕', '2-18': '春節', '2-19': '初二', '2-20': '初三', '2-21': '初四', '2-22': '初五',
            '2-28': '和平紀念日', '4-4': '兒童節', '4-5': '清明節', '5-1': '勞動節', '6-19': '端午節', '9-25': '中秋節', '10-10': '國慶日', '12-25': '行憲紀念日(假)'
        };
        const holidays25 = { '1-1': '元旦', '2-28': '和平紀念日', '4-4': '兒童節', '4-5': '清明節', '5-1': '勞動節', '5-31': '端午節', '10-6': '中秋節', '10-10': '國慶日', '12-25': '行憲紀念日(假)' };
        const key = `${m}-${d}`;
        if (y === 2026) return holidays[key]; if (y === 2025) return holidays25[key];
        return null;
    }

    // Application Ops
    addApplication(type, data) {
        const id = 'app_' + Date.now();
        const record = {
            id,
            userId: this.currentUser.id,
            type, // 'correction' or 'expense'
            date: new Date().toISOString().split('T')[0], // submission date
            data, // { date, in, out, reason, amount, desc, note }
            status: 'pending', // pending, approved, rejected
            timestamp: Date.now()
        };
        this.applications.push(record);
        this.syncToServer();
        return record;
    }

    updateApplicationStatus(appId, status) {
        const app = this.applications.find(a => a.id === appId);
        if (app) {
            app.status = status;
            if (status === 'approved') {
                if (app.type === 'correction') {
                    const key = app.data.date;
                    if (!this.clockRecords[key]) this.clockRecords[key] = {};
                    if (!this.clockRecords[key][app.userId]) this.clockRecords[key][app.userId] = {};

                    if (app.data.in) this.clockRecords[key][app.userId].in = app.data.in;
                    if (app.data.out) this.clockRecords[key][app.userId].out = app.data.out;
                } else if (app.type === 'segment') {
                    const dateKey = app.data.date;
                    const userId = app.userId;
                    if (!this.attendanceData[dateKey]) this.attendanceData[dateKey] = {};
                    if (!this.attendanceData[dateKey][userId]) this.attendanceData[dateKey][userId] = [];

                    const newSeg = {
                        id: Date.now() + Math.random(),
                        type: app.data.type,
                        detail: app.data.detail,
                        note: app.data.note,
                        isAllDay: app.data.isAllDay,
                        start: app.data.start,
                        end: app.data.end
                    };
                    this.attendanceData[dateKey][userId].push(newSeg);
                    this.attendanceData[dateKey][userId].sort((a, b) => (a.isAllDay === b.isAllDay) ? a.start.localeCompare(b.start) : (a.isAllDay ? -1 : 1));
                    this.saveAttendance();
                }
            }
            this.syncToServer();
        }
    }
}

const appState = new AppState();

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const DOM = {
        screens: { login: document.getElementById('login-screen'), dashboard: document.getElementById('dashboard-screen') },
        loginForm: document.getElementById('login-form'),
        usernameInput: document.getElementById('username'),
        loginPasswordInput: document.getElementById('password'), // Access password field
        userDisplay: {
            name: document.getElementById('current-user-name'),
            avatar: document.getElementById('current-user-avatar'),
            logoutBtn: document.getElementById('logout-btn'),
            settingsBtn: document.getElementById('settings-btn')
        },
        // Applications
        apps: {
            btn: document.getElementById('btn-app-header'),
            modal: document.getElementById('applications-modal'),
            closeBtn: document.getElementById('close-applications-btn'),
            tabBtns: document.querySelectorAll('#applications-modal .tab-btn'),
            tabContents: document.querySelectorAll('#applications-modal .tab-content'),
            // Inputs
            correctDate: document.getElementById('app-correct-date'),
            correctIn: document.getElementById('app-correct-in'),
            correctOut: document.getElementById('app-correct-out'),
            correctReason: document.getElementById('app-correct-reason'),
            btnSubmitCorrect: document.getElementById('btn-submit-correction'),

            expenseDatesContainer: document.getElementById('app-expense-dates-container'),
            expenseMainReason: document.getElementById('app-expense-main-reason'),
            // Item Inputs
            expItemDate: document.getElementById('exp-item-date'),
            expItemCat: document.getElementById('exp-item-cat'),
            expItemDesc: document.getElementById('exp-item-desc'),
            expItemAmount: document.getElementById('exp-item-amount'),
            btnAddExpItem: document.getElementById('btn-add-exp-item'),
            expItemsTbody: document.getElementById('app-expense-items-tbody'),
            expTotalDisplay: document.getElementById('exp-total-display'),
            btnSubmitExpense: document.getElementById('btn-submit-expense'),

            historyTbody: document.getElementById('app-history-tbody')
        },
        calendar: {
            header: document.getElementById('current-month-year'),
            grid: document.getElementById('calendar-days'),
            yearSelect: document.getElementById('calendar-year-select'),
            monthSelect: document.getElementById('calendar-month-select'),
            prevBtn: document.getElementById('calendar-prev-btn'),
            nextBtn: document.getElementById('calendar-next-btn'),
            todayBtn: document.getElementById('today-btn'),
            batchBtn: document.getElementById('batch-mode-btn'),
            batchStatus: document.getElementById('batch-status')
        },
        sidebar: {
            headerH3: document.querySelector('.status-widget h3'),
            locContainer: document.getElementById('location-inputs-container'),
            locStart: document.getElementById('status-loc-start'),
            locEnd: document.getElementById('status-loc-end'),
            eventInput: document.getElementById('day-event-input'),
            adminSelectorDiv: document.getElementById('admin-user-selector'),
            targetUserSelect: document.getElementById('target-user-select'),
            btns: document.querySelectorAll('.status-btn'),
            subOptionsContainer: document.getElementById('sub-options-container'),
            timeWrapper: document.getElementById('time-inputs-wrapper'),
            checkAllDay: document.getElementById('all-day-check'),
            // New Selectors
            startHour: document.getElementById('start-hour'),
            startMin: document.getElementById('start-min'),
            endHour: document.getElementById('end-hour'),
            endMin: document.getElementById('end-min'),
            noteInput: document.getElementById('status-note'),
            addBtn: document.getElementById('add-status-btn'),
            segmentList: document.getElementById('my-segments-list'),
            lists: {
                office: document.getElementById('list-office'),
                remote: document.getElementById('list-remote'),
                trip: document.getElementById('list-trip'),
                away: document.getElementById('list-away'),
                other: document.getElementById('list-other')
            },
            counts: {
                office: document.getElementById('count-office'),
                remote: document.getElementById('count-remote'),
                trip: document.getElementById('count-trip'),
                away: document.getElementById('count-away'),
                other: document.getElementById('count-other')
            }
        },
        stats: {
            btn: document.getElementById('stats-btn'),
            modal: document.getElementById('stats-modal'),
            closeBtn: document.getElementById('close-stats-btn'),
            tbody: document.getElementById('stats-table-body')
        },
        settings: {
            modal: document.getElementById('settings-modal'),
            closeBtn: document.getElementById('close-settings-btn'),
            tabBtns: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            nicknameInput: document.getElementById('settings-nickname'),
            passwordInput: document.getElementById('settings-password'),
            saveProfileBtn: document.getElementById('save-profile-btn'),
            avatarPreview: document.getElementById('settings-avatar-preview'),
            avatarInput: document.getElementById('avatar-upload'),
            removeAvatarBtn: document.getElementById('remove-avatar-btn'),
            adminCheck: document.getElementById('admin-mode-check'),
            teamList: document.getElementById('team-settings-list'),
            teamListView: document.getElementById('team-list-view'),
            teamEditorView: document.getElementById('team-member-editor'),
            btnAddMember: document.getElementById('btn-add-member'),
            btnBackTeam: document.getElementById('btn-back-team'),
            btnSaveMember: document.getElementById('btn-save-member'),
            btnCancelEdit: document.getElementById('btn-cancel-edit'),
            btnDeleteMember: document.getElementById('btn-delete-member'),
            editorTitle: document.getElementById('editor-title'),
            editUsername: document.getElementById('edit-username'),
            editPassword: document.getElementById('edit-password'),
            editChiname: document.getElementById('edit-chiname'),
            editEmail: document.getElementById('edit-email'),
            editBirthday: document.getElementById('edit-birthday'),
            editNickname: document.getElementById('edit-nickname'),
            editShortname: document.getElementById('edit-shortname'),
            editDepartment: document.getElementById('edit-department'),
            editManagerSelect: document.getElementById('edit-manager-select'),
            // Geofencing Inputs
            editLoc1Label: document.getElementById('edit-loc1-label'),
            editLoc1Lat: document.getElementById('edit-loc1-lat'),
            editLoc1Lng: document.getElementById('edit-loc1-lng'),
            editLoc2Label: document.getElementById('edit-loc2-label'),
            editLoc2Lat: document.getElementById('edit-loc2-lat'),
            editLoc2Lng: document.getElementById('edit-loc2-lng'),
            editLoc3Label: document.getElementById('edit-loc3-label'),
            editLoc3Lat: document.getElementById('edit-loc3-lat'),
            editLoc3Lng: document.getElementById('edit-loc3-lng'),
            permApprove: document.getElementById('edit-perm-approve'),
            permSchedule: document.getElementById('edit-perm-schedule'),
            permManage: document.getElementById('edit-perm-manage'),
            permSuper: document.getElementById('edit-perm-super'),
            editorAvatarPreview: document.getElementById('editor-avatar-preview'),
            editorAvatarInput: document.getElementById('editor-avatar-upload'),
            editorRemoveAvatar: document.getElementById('editor-remove-avatar'),
            // Reports Tab
            tabBtnReports: document.getElementById('tab-btn-reports'),
            reportMonth: document.getElementById('report-month-select'),
            reportUser: document.getElementById('report-user-select'),
            btnGenerateReport: document.getElementById('btn-generate-report'),
            btnExportExcel: document.getElementById('btn-export-excel'),
            reportPreviewTable: document.getElementById('report-preview-table')
        },
        newFormState: { type: 'office', detail: '' }
    };

    // Helper Functions
    function switchScreen(screenName) { Object.values(DOM.screens).forEach(el => el.classList.remove('active')); DOM.screens[screenName].classList.add('active'); }
    function getInitials(user) { return user.shortname || (user.nickname ? user.nickname.substring(0, 3) : user.name.substring(0, 2)); }
    function translateType(type) { const map = { office: '辦公室', remote: '居家', trip: '出差', away: '請假', other: '會議' }; return map[type] || type; }
    function isSameDay(d1, d2) { return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); }

    function renderDashboard() {
        if (!appState.currentUser) return;
        const user = appState.currentUser;
        DOM.userDisplay.name.textContent = user.chiname || user.name;
        const avatarEl = DOM.userDisplay.avatar;
        if (user.avatarUrl) {
            avatarEl.style.backgroundImage = `url(${user.avatarUrl})`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.textContent = '';
            avatarEl.style.backgroundColor = 'transparent';
        } else {
            avatarEl.style.backgroundImage = 'none';
            avatarEl.style.background = user.avatarColor;
            avatarEl.textContent = getInitials(user);
        }

        // [Fix] Populate Admin Target User Select
        const amSelect = document.getElementById('target-user-select');
        if (amSelect) {
            // Keep existing selection if any
            const currentVal = amSelect.value;
            amSelect.innerHTML = ''; // Clear to rebuild (in case users changed)

            // Add Self first? Or just list all.
            appState.users.forEach(u => {
                const op = document.createElement('option');
                op.value = u.id;
                op.textContent = u.chiname || u.name;
                amSelect.appendChild(op);
            });

            // Restore selection or default to current user
            if (currentVal && Array.from(amSelect.options).some(o => o.value === currentVal)) {
                amSelect.value = currentVal;
            } else {
                amSelect.value = appState.currentUser.id;
            }
        }

        if (DOM.sidebar.btns[0]) DOM.sidebar.btns[0].click();
        renderCalendar();
        updateSidebar();
    }

    function renderCalendar() {
        const year = appState.currentDate.getFullYear();
        const month = appState.currentDate.getMonth();

        // Sync Dropdowns
        if (DOM.calendar.yearSelect) {
            // Populate if empty (Just once usually)
            if (DOM.calendar.yearSelect.options.length === 0) {
                const currentYear = new Date().getFullYear();
                for (let y = currentYear - 5; y <= currentYear + 5; y++) {
                    const op = document.createElement('option');
                    op.value = y;
                    op.textContent = `${y}年`;
                    DOM.calendar.yearSelect.appendChild(op);
                }
            }
            DOM.calendar.yearSelect.value = year;
        }
        if (DOM.calendar.monthSelect) {
            DOM.calendar.monthSelect.value = month;
        }

        // Remove old header text content setting
        if (DOM.calendar.header) DOM.calendar.header.style.display = 'none';

        DOM.calendar.grid.innerHTML = '';
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) { DOM.calendar.grid.appendChild(document.createElement('div')); }
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateKey = appState.formatDate(date);
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';

            if (isSameDay(new Date(), date)) dayEl.classList.add('current-day');

            // Selection logic
            if (appState.isBatchMode && appState.multiSelectedDates.has(dateKey)) dayEl.classList.add('multi-selected');
            else if (!appState.isBatchMode && isSameDay(appState.selectedDate, date)) dayEl.classList.add('selected');

            // Header
            const headerDiv = document.createElement('div');
            headerDiv.className = 'day-header';
            const numEl = document.createElement('div');
            numEl.className = 'day-number';
            numEl.textContent = d;
            headerDiv.appendChild(numEl);

            // Holiday
            const holidayName = appState.getHoliday(date);
            if (holidayName) {
                const holEl = document.createElement('div');
                holEl.className = 'holiday-label';
                holEl.textContent = holidayName;
                headerDiv.appendChild(holEl);
            }
            dayEl.appendChild(headerDiv);

            // Company Event
            const eventText = appState.getEvent(date);
            if (eventText) {
                const eventLabel = document.createElement('div');
                eventLabel.className = 'event-label';
                eventLabel.textContent = eventText;
                dayEl.appendChild(eventLabel);
            }

            // Avatars Logic
            let hasOffice = false;
            if (appState.attendanceData[dateKey]) {
                const avatarsDiv = document.createElement('div');
                avatarsDiv.className = 'day-avatars';

                Object.keys(appState.attendanceData[dateKey]).forEach(userId => {
                    const u = appState.users.find(user => user.id === userId);
                    const segments = appState.attendanceData[dateKey][userId];
                    if (u && segments && segments.length > 0) {
                        let bestSeg = null;
                        const hasWork = segments.some(s => ['trip', 'office', 'remote', 'other'].includes(s.type));
                        if (hasWork) {
                            bestSeg = segments.find(s => s.type === 'trip') ||
                                segments.find(s => s.type === 'office') ||
                                segments.find(s => s.type === 'remote') ||
                                segments.find(s => s.type === 'other');
                        } else {
                            return;
                        }

                        if (bestSeg) {
                            if (bestSeg.type === 'office') hasOffice = true;

                            const bubble = document.createElement('div');
                            bubble.className = `mini-avatar ${bestSeg.type}`;
                            if (u.avatarUrl) {
                                bubble.style.backgroundImage = `url(${u.avatarUrl})`;
                                bubble.style.backgroundSize = 'cover';
                                bubble.textContent = '';
                                bubble.style.color = 'transparent';
                            } else {
                                bubble.textContent = u.shortname;
                                bubble.style.backgroundImage = 'none';
                            }

                            let dispName = u.chiname || u.nickname;
                            let tip = `${dispName}: ${translateType(bestSeg.type)}`;
                            if (bestSeg.detail) tip += ` (${bestSeg.detail})`;
                            if (!bestSeg.isAllDay) tip += ` ${bestSeg.start}-${bestSeg.end}`;
                            bubble.title = tip;
                            avatarsDiv.appendChild(bubble);
                        }
                    }
                });
                dayEl.appendChild(avatarsDiv);
            }

            // Warning Logic (Workday but no one in office)
            const isWeekend = (new Date(year, month, d).getDay() % 6 === 0);
            if (!isWeekend && !holidayName && !hasOffice) {
                dayEl.classList.add('warning-alert');
                const warnIcon = document.createElement('i');
                warnIcon.className = 'fa-solid fa-triangle-exclamation warning-icon';
                dayEl.appendChild(warnIcon);
            }

            dayEl.addEventListener('click', () => {
                if (appState.isBatchMode) { appState.toggleBatchDate(date); renderCalendar(); updateSidebar(); }
                else { appState.selectedDate = date; renderCalendar(); updateSidebar(); }
            });
            DOM.calendar.grid.appendChild(dayEl);
        }
    }

    function updateSidebar(typeArg) {
        // 1. Resolve Effective Type
        let effectiveType = typeArg;
        if (!effectiveType) {
            effectiveType = (DOM.newFormState && DOM.newFormState.type) ? DOM.newFormState.type : 'office';
        }

        // 2. Meeting Input Visibility (Priority Update)
        // STRICTLY control display based on effectiveType. 
        const meetContainer = document.getElementById('meeting-inputs-container');
        if (meetContainer) {
            if (effectiveType === 'other') {
                meetContainer.style.display = 'flex';

                // Populate Attendees if empty
                const list = document.getElementById('meet-attendees-list');
                const checkAll = document.getElementById('meet-check-all');
                if (list && list.children.length === 0) {
                    const sortedUsers = [...appState.users].sort((a, b) => (a.department || '').localeCompare(b.department || ''));
                    sortedUsers.forEach(u => {
                        if (u.id === appState.currentUser.id) return;
                        const div = document.createElement('div');
                        div.style.width = "48%";
                        div.className = 'check-group-item';
                        div.style.marginBottom = '5px';
                        div.innerHTML = `<label style="cursor:pointer; display:flex; align-items:center; gap:5px; font-size: 14px; color: #334155;"><input type="checkbox" value="${u.id}" class="meet-attendee-check" style="width:16px; height:16px;"> ${u.chiname || u.name}</label>`;
                        list.appendChild(div);
                    });
                    if (checkAll) {
                        checkAll.onclick = (e) => {
                            const checks = list.querySelectorAll('.meet-attendee-check');
                            checks.forEach(c => c.checked = e.target.checked);
                        };
                    }
                }
            } else {
                meetContainer.style.display = 'none';
            }
        }

        // 3. Handle State Updates and Other UI
        if (typeArg) {
            DOM.newFormState.type = typeArg;
            document.querySelectorAll('.status-btn').forEach(btn => {
                const btnStatus = btn.dataset.status || btn.dataset.type;
                if (btnStatus === typeArg) btn.classList.add('active');
                else btn.classList.remove('active');
            });
            DOM.newFormState.detail = '';
            // Safe call to sub-options
            try {
                if (typeof renderSubOptions === 'function') renderSubOptions(typeArg);
            } catch (e) { console.error('Error rendering sub options', e); }
        } else {
            // Sync UI Active Class
            const current = DOM.newFormState.type;
            document.querySelectorAll('.status-btn').forEach(btn => {
                const btnStatus = btn.dataset.status || btn.dataset.type;
                if (btnStatus === current) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        }

        // 4. Batch Mode / Standard UI
        if (appState.isBatchMode) {
            const titleText = `已選取 ${appState.multiSelectedDates.size} 天`;
            DOM.sidebar.headerH3.innerHTML = `我的狀態：<span class="highlight-text">${titleText}</span>`;
            DOM.sidebar.segmentList.innerHTML = '<li class="my-segment-item"><div class="info"><span class="type">批次編輯模式中...</span></div></li>';
            Object.keys(DOM.sidebar.lists).forEach(key => { DOM.sidebar.lists[key].innerHTML = ''; DOM.sidebar.counts[key].textContent = '-'; });
            if (DOM.sidebar.eventInput) DOM.sidebar.eventInput.value = '';
            if (DOM.sidebar.eventInput) DOM.sidebar.eventInput.disabled = true;
        } else {
            const isToday = isSameDay(new Date(), appState.selectedDate);
            const dateStr = isToday ? "今天" : `${appState.selectedDate.getMonth() + 1}月${appState.selectedDate.getDate()}日`;


            // Event Input Sync
            if (DOM.sidebar.eventInput) {
                DOM.sidebar.eventInput.disabled = false;
                DOM.sidebar.eventInput.value = appState.getEvent(appState.selectedDate);
            }

            // --- Clock UI Handling ---
            const clockSection = document.querySelector('.clock-section');
            if (isToday && !appState.isAdminMode) { // Only show clock on Today and Not Admin Mode (Self)
                clockSection.style.display = 'flex';
                // Check status
                const rec = appState.getClockRecord(new Date(), appState.currentUser.id);
                const btn = document.getElementById('btn-clock-action');
                const statusText = document.getElementById('clock-status-text');
                const timeDisplay = document.getElementById('clock-time-display');

                if (!rec) {
                    statusText.textContent = "尚未打卡";
                    timeDisplay.textContent = "--:--";
                    btn.innerHTML = '<i class="fa-solid fa-stopwatch"></i> 上班';
                    btn.className = 'btn-primary';
                    btn.disabled = false;
                    // btn.onclick removed to prevent bypass
                } else if (!rec.out) {
                    statusText.textContent = "工作中";
                    timeDisplay.textContent = `上班: ${rec.in}`;
                    btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> 下班';
                    btn.className = 'btn-text-danger';
                    btn.style.border = '1px solid #ef4444';
                    btn.disabled = false;
                    // btn.onclick removed to prevent bypass
                } else {
                    statusText.textContent = "今日已結束";
                    timeDisplay.textContent = `${rec.in} - ${rec.out}`;
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> 完成';
                    btn.disabled = true;
                    btn.className = 'btn-secondary';
                    btn.style.border = 'none';
                }
            } else {
                clockSection.style.display = 'none';
            }

            const targetId = appState.isAdminMode ? appState.adminTargetUserId : appState.currentUser.id;
            const targetUser = appState.users.find(u => u.id === targetId);

            let htmlHTML = "";
            if (appState.isAdminMode && targetId !== appState.currentUser.id) {
                const name = targetUser.chiname || targetUser.nickname || targetUser.name;
                htmlHTML = `編輯 ${name}：<span class="highlight-text">${dateStr}</span>`;
            } else {
                htmlHTML = `我的狀態：<span class="highlight-text">${dateStr}</span>`;
            }
            DOM.sidebar.headerH3.innerHTML = htmlHTML;

            DOM.sidebar.segmentList.innerHTML = '';
            const mySegments = appState.getSegments(appState.selectedDate, targetId);

            // Group segments by type for "One Line, One X" display
            const groupedSegs = {};
            mySegments.forEach(seg => {
                if (!groupedSegs[seg.type]) groupedSegs[seg.type] = [];
                groupedSegs[seg.type].push(seg);
            });

            Object.keys(groupedSegs).forEach(type => {
                const group = groupedSegs[type];
                const li = document.createElement('li');
                li.className = `my-segment-item ${type}`;

                // Combine details: "Detail1, Detail2"
                // Hide "全天" if redundant? User said for *Team List*, maybe here too?
                // "我不用打x兩次" is the main goal.
                const details = group.map(seg => {
                    let d = translateType(seg.type);
                    if (seg.detail) d += ` (${seg.detail})`;
                    if (seg.note) d += ` : ${seg.note}`;
                    return d;
                }).join(' / ');

                // Time? If mixed, show "多個時段"? Or just first?
                // Provide simple summary
                const timeStr = group.every(s => s.isAllDay) ? '全天' : '多時段';

                li.innerHTML = `
                    <div class="info"><span class="type">${details}</span><span class="time"><i class="fa-regular fa-clock"></i> ${timeStr}</span></div>
                    <div class="btn-del" title="刪除全部"><i class="fa-solid fa-xmark"></i></div>
                `;
                li.querySelector('.btn-del').addEventListener('click', () => {
                    // Delete ALL in group
                    if (confirm('確定刪除此類別的所有行程嗎?')) {
                        group.forEach(s => appState.removeSegment(appState.selectedDate, s.id));
                        updateSidebar(); renderCalendar();
                    }
                });
                DOM.sidebar.segmentList.appendChild(li);
            });
            updateTeamList();
        }
    }

    function updateTeamList() {
        Object.keys(DOM.sidebar.lists).forEach(key => { DOM.sidebar.lists[key].innerHTML = ''; DOM.sidebar.counts[key].textContent = '0'; });
        const dateKey = appState.formatDate(appState.selectedDate);
        if (!appState.attendanceData[dateKey]) return;

        const counts = { office: 0, remote: 0, trip: 0, away: 0, other: 0 };

        // Helper: Parse time "HH:MM" to minutes
        const toMins = (t) => {
            if (!t) return 0;
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        // Helper: Mins to "HH:MM"
        const toStr = (m) => {
            const h = Math.floor(m / 60).toString().padStart(2, '0');
            const mn = (m % 60).toString().padStart(2, '0');
            return `${h}:${mn}`;
        };

        const WORK_START = 9 * 60;
        const WORK_END = 18 * 60;

        Object.keys(appState.attendanceData[dateKey]).forEach(userId => {
            const user = appState.users.find(u => u.id === userId);
            const allSegments = appState.attendanceData[dateKey][userId];
            if (!user || !allSegments || allSegments.length === 0) return;

            const segmentsByType = { office: [], remote: [], trip: [], away: [], other: [] };
            allSegments.forEach(s => { if (segmentsByType[s.type]) segmentsByType[s.type].push(s); });

            // Identify Interruptions (Trip/Away)
            const interruptions = [];
            [...segmentsByType.trip, ...segmentsByType.away].forEach(s => {
                let sStart = 0, sEnd = 0;
                if (s.isAllDay) { sStart = WORK_START; sEnd = WORK_END; }
                else if (s.start && s.end) { sStart = toMins(s.start); sEnd = toMins(s.end); }

                if (sStart < sEnd) {
                    interruptions.push({ start: sStart, end: sEnd, type: s.type, detail: s.detail });
                }
            });

            // Process per type
            Object.keys(segmentsByType).forEach(type => {
                const segs = segmentsByType[type];
                if (segs.length === 0) return;

                counts[type]++;

                const li = document.createElement('li');
                li.className = 'user-item';

                let displayStr = '';

                if (type === 'office' || type === 'remote') {
                    // Time Slicing Logic
                    const hasAllDay = segs.some(s => s.isAllDay);
                    let timeBlocks = [];
                    if (hasAllDay) {
                        timeBlocks = [{ start: WORK_START, end: WORK_END }];
                    } else {
                        segs.forEach(s => {
                            if (!s.isAllDay && s.start && s.end) timeBlocks.push({ start: toMins(s.start), end: toMins(s.end) });
                        });
                    }

                    // Subtract Interruptions
                    timeBlocks.sort((a, b) => a.start - b.start);
                    interruptions.forEach(int => {
                        const newBlocks = [];
                        timeBlocks.forEach(b => {
                            if (int.end <= b.start || int.start >= b.end) {
                                newBlocks.push(b);
                            } else {
                                if (int.start > b.start) newBlocks.push({ start: b.start, end: int.start });
                                if (int.end < b.end) newBlocks.push({ start: int.end, end: b.end });
                            }
                        });
                        timeBlocks = newBlocks;
                    });

                    // Build Main Time String
                    const timeStrs = timeBlocks.map(b => {
                        if (Math.abs(b.start - WORK_START) < 5 && Math.abs(b.end - WORK_END) < 5) return '全天';
                        return `${toStr(b.start)}-${toStr(b.end)}`;
                    });

                    // Build Interrupt String
                    const interruptStrs = interruptions.map(i => {
                        let label = i.type === 'trip' ? '出差' : '請假';
                        if (i.type === 'trip') label = '出差';
                        if (i.type === 'away') {
                            // Use detail if available, e.g. "特休"
                            // We don't have direct access to 'translateType' helper easily here unless global? 
                            // It is defined in global scope or inside updateSidebar?
                            // Assuming we should stick to simple labels or map properly.
                            // Let's use detail if it exists for Away
                            if (i.detail) label = i.detail;
                        }

                        const tStr = (Math.abs(i.start - WORK_START) < 5 && Math.abs(i.end - WORK_END) < 5) ? '全天' : `${toStr(i.start)}-${toStr(i.end)}`;
                        return `${label} ${tStr}`;
                    });
                    const uniqueInterrupts = [...new Set(interruptStrs)];

                    if (timeStrs.length > 0) {
                        displayStr = timeStrs.join(' / ');
                        if (uniqueInterrupts.length > 0) {
                            displayStr += ` ; ${uniqueInterrupts.join(' ')}`;
                        }
                    } else {
                        // Completely overwritten
                        displayStr = uniqueInterrupts.join(' ');
                    }

                } else {
                    // Simple Dedup for others (Remote, Trip, Away, Other)
                    const uniqueTexts = new Set();

                    if (type === 'other') {
                        // Consolidate by Time for Meetings
                        const timeMap = {};
                        segs.forEach(s => {
                            const t = s.isAllDay ? '全天' : `${s.start}-${s.end}`;
                            if (!timeMap[t]) timeMap[t] = new Set();
                            // Prefer Note -> Detail -> Default
                            let d = s.note || s.detail || '會議';
                            timeMap[t].add(d);
                        });
                        Object.keys(timeMap).forEach(t => {
                            const details = [...timeMap[t]].join('、');
                            uniqueTexts.add(`${details} ${t}`);
                        });
                    } else {
                        segs.forEach(s => {
                            let t = s.isAllDay ? '全天' : `${s.start}-${s.end}`;
                            let d = s.detail || '';
                            if (s.type === 'trip') d = '';
                            if (s.type === 'away' && !d) d = '請假';

                            let combined = d ? `${d} ${t}` : t;
                            uniqueTexts.add(combined);
                        });
                    }
                    displayStr = [...uniqueTexts].join(' / ');
                }

                let avatarStyle = `background: ${user.avatarColor}; color: white;`;
                let avatarContent = getInitials(user);
                if (user.avatarUrl) {
                    avatarStyle = `background-image: url(${user.avatarUrl}); background-size: cover; color: transparent;`;
                    avatarContent = '';
                }

                li.innerHTML = `
                    <div class="user-avatar" style="${avatarStyle}">${avatarContent}</div>
                    <div class="user-info">
                        <div class="user-name-line">
                            <span class="user-name">${user.nickname || user.chiname || user.name}</span>
                            <span class="user-time">${displayStr}</span>
                        </div>
                    </div>
                `;
                DOM.sidebar.lists[type].appendChild(li);
            });
        });

        Object.keys(counts).forEach(key => { if (DOM.sidebar.counts[key]) DOM.sidebar.counts[key].textContent = counts[key]; });
    }

    // [Fix] Ensure updateSidebar is exposed globally for inline onclick handlers
    window.updateSidebar = updateSidebar;

    // Safety: Attach listeners again in case DOM was ready earlier
    setTimeout(() => {
        document.querySelectorAll('.status-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.status || btn.dataset.type;
                if (type) updateSidebar(type);
            });
        });
    }, 500);

    // --- Detailed Stats Logic ---
    function renderStats() {
        // Init Inputs
        const summaryMonth = document.getElementById('summary-month-select');
        const btnQuerySummary = document.getElementById('btn-query-summary');

        if (summaryMonth) {
            if (!summaryMonth.value) {
                const my = appState.selectedDate.getFullYear() + '-' + String(appState.selectedDate.getMonth() + 1).padStart(2, '0');
                summaryMonth.value = my;
            }
            // Bind Query Button
            if (btnQuerySummary) btnQuerySummary.onclick = () => renderSummaryTable();
            // Bind Auto Change (Force)
            summaryMonth.onchange = () => renderSummaryTable();
        }

        // Init Detailed Tab Inputs
        const detailSelect = document.getElementById('detail-user-select');
        const detailMonth = document.getElementById('detail-month-select');
        const btnQueryDetail = document.getElementById('btn-query-detail');

        // Bind Auto-Update for Summary
        if (summaryMonth) {
            summaryMonth.onchange = () => renderSummaryTable();
        }

        if (detailSelect) {
            // Populate if empty
            if (detailSelect.options.length === 0) {
                detailSelect.innerHTML = appState.users.map(u => `<option value="${u.id}">${u.chiname || u.name}</option>`).join('');
                if (appState.users.length > 0) detailSelect.value = appState.users[0].id;
            }
            // FORCE BINDING - Remove old listeners by cloning or just reassigning
            detailSelect.onchange = function () { renderDetailedStats(); };
        }

        if (detailMonth) {
            if (!detailMonth.value) {
                const my = appState.selectedDate.getFullYear() + '-' + String(appState.selectedDate.getMonth() + 1).padStart(2, '0');
                detailMonth.value = my;
            }
            // FORCE BINDING
            detailMonth.onchange = function () { renderDetailedStats(); };
        }

        if (btnQueryDetail) {
            btnQueryDetail.onclick = () => renderDetailedStats();
        }

        // Tab Listeners - Aggressive Re-bind
        const tabSummaryBtn = document.getElementById('tab-btn-summary');
        const tabDetailBtn = document.getElementById('tab-btn-detail');

        if (tabSummaryBtn) {
            tabSummaryBtn.addEventListener('click', () => { setTimeout(renderSummaryTable, 10); });
        }
        if (tabDetailBtn) {
            tabDetailBtn.addEventListener('click', () => { setTimeout(renderDetailedStats, 10); });
        }

        // Initial Layout Render
        renderSummaryTable();
        // Force render detail immediately too so it's ready
        renderDetailedStats();
    }

    function renderSummaryTable() {
        const tbody = document.getElementById('stats-table-body');
        const summaryMonth = document.getElementById('summary-month-select');
        if (!tbody || !summaryMonth) return;

        tbody.innerHTML = '';

        const [yStr, mStr] = summaryMonth.value.split('-');
        const y = parseInt(yStr);
        const m = parseInt(mStr);
        const daysInMonth = new Date(y, m, 0).getDate();

        // Prepare data container
        const stats = {};
        appState.users.forEach(u => {
            stats[u.id] = { user: u, office: 0, remote: 0, trip: 0, away: 0 };
        });

        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = `${y}-${m}-${d}`;
            if (appState.attendanceData[dateKey]) {
                Object.keys(appState.attendanceData[dateKey]).forEach(uid => {
                    const segs = appState.attendanceData[dateKey][uid];
                    if (stats[uid] && segs) {
                        const types = new Set(segs.map(s => s.type));
                        if (types.has('office')) stats[uid].office++;
                        if (types.has('remote')) stats[uid].remote++;
                        if (types.has('trip')) stats[uid].trip++;
                        if (types.has('away')) stats[uid].away++;
                    }
                });
            }
        }

        Object.values(stats).forEach(s => {
            const tr = document.createElement('tr');
            // Calc business days roughly
            let businessDays = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const day = new Date(y, m - 1, d).getDay();
                if (day !== 0 && day !== 6) businessDays++;
            }
            if (businessDays === 0) businessDays = 20;

            const rate = Math.round((s.office / businessDays) * 100);
            tr.innerHTML = `
                <td><div class="user-cell"><div class="user-avatar-small" style="background:${s.user.avatarColor}">${getInitials(s.user)}</div><span>${s.user.chiname || s.user.name}</span></div></td>
                <td>${s.office}</td>
                <td>${s.remote}</td>
                <td>${s.trip}</td>
                <td>${s.away}</td>
                <td>${rate}%</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderDetailedStats() {
        const tbody = document.getElementById('detail-table-body');
        const detailSelect = document.getElementById('detail-user-select');
        const detailMonth = document.getElementById('detail-month-select');

        if (!tbody || !detailSelect || !detailMonth) return;

        // Ensure dropdown is populated has been moved to init, but double check here.
        if (detailSelect.options.length === 0 && appState.users.length > 0) {
            detailSelect.innerHTML = appState.users.map(u => `<option value="${u.id}">${u.chiname || u.name}</option>`).join('');
            detailSelect.value = appState.users[0].id;
        }

        const userId = detailSelect.value;
        // console.log("Rendering for User:", userId); // Debug
        if (!userId) return;

        tbody.innerHTML = '';

        // Safety check for empty month value
        if (!detailMonth.value) {
            const now = new Date();
            detailMonth.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        }

        const [yStr, mStr] = detailMonth.value.split('-');
        const y = parseInt(yStr);
        const m = parseInt(mStr);
        const daysInMonth = new Date(y, m, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            // ... rest of loop logic using userId variable ...
            // Be absolutely sure to use 'userId' variable here, NOT reading from Select inside loop.
            const dateObj = new Date(y, m - 1, d);
            const dateKey = `${y}-${m}-${d}`;
            const dayName = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()];

            // Get Holiday
            const holiday = appState.getHoliday(dateObj);
            const isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);

            // Get Plan
            let statusText = '-';
            let statusClass = '';
            let isRequiredWork = false;
            let isLeave = false;
            let isTrip = false;
            // Use userId captured above
            if (appState.attendanceData[dateKey] && appState.attendanceData[dateKey][userId]) {
                const segs = appState.attendanceData[dateKey][userId];
                const types = segs.map(s => s.type);

                if (types.includes('trip')) { statusText = '出差'; statusClass = 'text-purple'; isTrip = true; }
                else if (types.includes('office')) { statusText = '辦公室'; statusClass = 'text-blue'; isRequiredWork = true; }
                else if (types.includes('remote')) { statusText = '居家'; statusClass = 'text-green'; isRequiredWork = true; }
                else if (types.includes('away')) { statusText = '請假'; statusClass = 'text-red'; isLeave = true; }
            }

            // Logic: Requires Clock In if: Not Weekend AND Not Holiday AND (Office OR Remote) AND Not Trip AND Not Leave
            // Note: If no status set but it's a weekday, usually considered absent or undefined. 
            // User req: "不管是居家 或是辦公室都一律要打卡" ->Implies if status is One of these.
            // If status is empty on a weekday, technicially they should be working? Let's stick to status triggers first or fallback to weekday check if intended.
            // Simplified: If status says Office/Remote, MUST clock.
            const needClock = isRequiredWork && !isWeekend && !holiday && !isTrip && !isLeave;

            // Get Clock
            let clockInRaw = null;
            let clockOutRaw = null;
            let clockInDisplay = '--:--';
            let clockOutDisplay = '--:--';
            let durationDisplay = '-';
            let note = '';

            const rec = appState.getClockRecord(dateObj, userId);
            if (rec) {
                if (rec.in) {
                    clockInRaw = rec.in;
                    clockInDisplay = rec.in;
                    // Late Check > 09:00
                    const [h, m] = rec.in.split(':').map(Number);
                    if (h > 9 || (h === 9 && m > 0)) {  // Strict > 09:00
                        clockInDisplay = `<span style="color:red; font-weight:bold;">${rec.in} (遲到)</span>`;
                    }
                }
                if (rec.out) {
                    clockOutRaw = rec.out;
                    clockOutDisplay = rec.out;
                }
            }

            // Work Hours Calc
            let hasCompletedHours = false;
            if (clockInRaw && clockOutRaw) {
                const [h1, m1] = clockInRaw.split(':').map(Number);
                const [h2, m2] = clockOutRaw.split(':').map(Number);

                // Total Minutes Worked
                let totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);

                // Lunch Deduct: 12:30-13:30 (60 mins)
                // Logic: check overlap with 12:30-13:30
                // Simplify: If worked across lunch period, deduct 60.
                // Assuming standard shift. If start < 12:30 and end > 13:30, deduct 60.
                const tStart = h1 * 60 + m1;
                const tEnd = h2 * 60 + m2;
                const lunchStart = 12 * 60 + 30;
                const lunchEnd = 13 * 60 + 30;

                if (tStart < lunchStart && tEnd > lunchEnd) {
                    totalMins -= 60;
                } else if (tStart < lunchStart && tEnd > lunchStart) {
                    // Partial overlap logic complex, simplify to standard deduct if cross
                    // User said "12:30-13:30 為休息時間 不算工時"
                    // We will deduct intersection.
                    const overlapStart = Math.max(tStart, lunchStart);
                    const overlapEnd = Math.min(tEnd, lunchEnd);
                    if (overlapEnd > overlapStart) totalMins -= (overlapEnd - overlapStart);
                } else if (tStart >= lunchStart && tStart < lunchEnd) {
                    const overlapStart = Math.max(tStart, lunchStart);
                    const overlapEnd = Math.min(tEnd, lunchEnd);
                    if (overlapEnd > overlapStart) totalMins -= (overlapEnd - overlapStart);
                }

                if (totalMins < 0) totalMins = 0;

                const dh = Math.floor(totalMins / 60);
                const dm = totalMins % 60;
                durationDisplay = `${dh}h ${dm}m`;

                if (dh >= 8) hasCompletedHours = true;
            }

            // Check Missing Out / Early Leave
            // Rule: "18點要打下班卡 不然會顯示下班未打卡" UNLESS "工時超過8小時"
            if (needClock) {
                // Check IN
                if (!clockInRaw) {
                    clockInDisplay = `<span style="color:red;">未打卡</span>`;
                }

                // Check OUT
                if (!clockOutRaw) {
                    // Only flag if day is passed (simple logic: if has clock in but no clock out and date != today)
                    // Or if today and time > 18:00?
                    // Let's assume for historical data
                    if (clockInRaw) clockOutDisplay = `<span style="color:red; font-weight:bold;">未打卡</span>`;
                } else {
                    // Has Out, check time
                    const [h, m] = clockOutRaw.split(':').map(Number);
                    // If < 18:00 AND Work < 8Hr -> Early Leave
                    if ((h < 18) && !hasCompletedHours) {
                        clockOutDisplay = `<span style="color:#ef4444; font-weight:bold;">${clockOutRaw} (早退)</span>`;
                    }
                }
            }

            // Render
            const rowStyle = (isWeekend || holiday) ? 'background: #f8fafc; color: #94a3b8;' : '';
            if (holiday) statusText = holiday + (statusText !== '-' ? ' / ' + statusText : '');

            const tr = document.createElement('tr');
            tr.style = rowStyle;
            tr.innerHTML = `
                <td>${m}/${d}</td>
                <td>${dayName}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${clockInDisplay}</td>
                <td>${clockOutDisplay}</td>
                <td>${durationDisplay}</td>
            `;
            tbody.appendChild(tr);
        }
    }

    // Tab Logic
    const tabSummary = document.getElementById('tab-btn-summary');
    const tabDetail = document.getElementById('tab-btn-detail');
    const viewSummary = document.getElementById('stats-summary-view');
    const viewDetail = document.getElementById('stats-detail-view');

    if (tabSummary && tabDetail) {
        tabSummary.addEventListener('click', () => {
            tabSummary.classList.add('active'); tabDetail.classList.remove('active');
            viewSummary.classList.remove('hidden'); viewDetail.classList.add('hidden');
        });
        tabDetail.addEventListener('click', () => {
            tabDetail.classList.add('active'); tabSummary.classList.remove('active');
            viewDetail.classList.remove('hidden'); viewSummary.classList.add('hidden');
            const sel = document.getElementById('detail-user-select');
            if (sel) renderDetailedStats(sel.value);
        });
    }

    // --- Sub Options & Interaction ---
    function renderSubOptions() {
        DOM.sidebar.subOptionsContainer.innerHTML = '';
        const status = DOM.newFormState.type;
        if (SUB_OPTIONS[status]) {
            DOM.sidebar.subOptionsContainer.classList.remove('hidden');
            SUB_OPTIONS[status].forEach(opt => {
                const chip = document.createElement('div');
                chip.className = 'detail-chip';
                chip.textContent = opt;
                if (DOM.newFormState.detail === opt) chip.classList.add('active');
                chip.addEventListener('click', () => { DOM.newFormState.detail = opt; renderSubOptions(); });
                DOM.sidebar.subOptionsContainer.appendChild(chip);
            });
        } else { DOM.sidebar.subOptionsContainer.classList.add('hidden'); }
    }

    // --- Team Manager Logic (Same as V5) ---
    // (Consolidated into AppState methods above, UI handlers below)
    let editingUserId = null;
    let tempAvatarUrl = '';

    function showTeamList() {
        if (DOM.settings.teamListView) DOM.settings.teamListView.classList.remove('hidden');
        if (DOM.settings.teamEditorView) DOM.settings.teamEditorView.classList.add('hidden');
        renderTeamSettings();
    }

    function showTeamEditor(userId = null) {
        if (DOM.settings.teamListView) DOM.settings.teamListView.classList.add('hidden');
        if (DOM.settings.teamEditorView) DOM.settings.teamEditorView.classList.remove('hidden');
        editingUserId = userId;
        tempAvatarUrl = '';

        // Populate Manager Select
        if (DOM.settings.editManagerSelect) {
            DOM.settings.editManagerSelect.innerHTML = '<option value="">(無)</option>';
            appState.users.forEach(mu => {
                if (userId && mu.id === userId) return;
                const op = document.createElement('option');
                op.value = mu.id;
                op.textContent = mu.chiname ? `${mu.chiname} (${mu.username})` : mu.username;
                DOM.settings.editManagerSelect.appendChild(op);
            });
        }

        if (userId) { // Edit
            const u = appState.users.find(x => x.id === userId);
            DOM.settings.editorTitle.textContent = "編輯成員資料";
            DOM.settings.editUsername.value = u.username;
            DOM.settings.editPassword.value = '';
            DOM.settings.editChiname.value = u.chiname || '';
            if (DOM.settings.editEmail) DOM.settings.editEmail.value = u.email || '';
            DOM.settings.editBirthday.value = u.birthday || '';
            DOM.settings.editNickname.value = u.nickname || '';
            DOM.settings.editShortname.value = u.shortname || '';
            DOM.settings.editDepartment.value = u.title || '';

            if (DOM.settings.editManagerSelect) DOM.settings.editManagerSelect.value = u.managerId || '';

            // Populate Locations
            const locs = u.locations || [{}, {}, {}];
            if (DOM.settings.editLoc1Label) {
                DOM.settings.editLoc1Label.value = locs[0]?.label || '';
                document.getElementById('edit-loc1-addr').value = locs[0]?.addr || '';
                DOM.settings.editLoc1Lat.value = locs[0]?.lat || '';
                DOM.settings.editLoc1Lng.value = locs[0]?.lng || '';
            }
            if (DOM.settings.editLoc2Label) {
                DOM.settings.editLoc2Label.value = locs[1]?.label || '';
                document.getElementById('edit-loc2-addr').value = locs[1]?.addr || '';
                DOM.settings.editLoc2Lat.value = locs[1]?.lat || '';
                DOM.settings.editLoc2Lng.value = locs[1]?.lng || '';
            }
            if (DOM.settings.editLoc3Label) {
                DOM.settings.editLoc3Label.value = locs[2]?.label || '';
                document.getElementById('edit-loc3-addr').value = locs[2]?.addr || '';
                DOM.settings.editLoc3Lat.value = locs[2]?.lat || '';
                DOM.settings.editLoc3Lng.value = locs[2]?.lng || '';
            }

            // Permissions
            const perms = u.permissions || {};
            if (DOM.settings.permApprove) DOM.settings.permApprove.checked = perms.approve || false;
            if (DOM.settings.permSchedule) DOM.settings.permSchedule.checked = perms.schedule || false;
            if (DOM.settings.permManage) DOM.settings.permManage.checked = perms.manageUser || false;
            if (DOM.settings.permSuper) DOM.settings.permSuper.checked = perms.superAdmin || false;

            tempAvatarUrl = u.avatarUrl || '';
            if (tempAvatarUrl) { DOM.settings.editorAvatarPreview.style.backgroundImage = `url(${tempAvatarUrl})`; }
            else {
                DOM.settings.editorAvatarPreview.style.background = u.avatarColor;
                DOM.settings.editorAvatarPreview.style.backgroundImage = 'none';
                DOM.settings.editorAvatarPreview.textContent = u.shortname;
            }
            DOM.settings.btnDeleteMember.classList.remove('hidden');
        } else { // Add
            DOM.settings.editorTitle.textContent = "新增成員";
            DOM.settings.editUsername.value = '';
            DOM.settings.editPassword.value = '';
            DOM.settings.editChiname.value = '';
            if (DOM.settings.editEmail) DOM.settings.editEmail.value = '';

            // Clear Locations
            if (DOM.settings.editLoc1Label) {
                DOM.settings.editLoc1Label.value = ''; document.getElementById('edit-loc1-addr').value = ''; DOM.settings.editLoc1Lat.value = ''; DOM.settings.editLoc1Lng.value = '';
                DOM.settings.editLoc2Label.value = ''; document.getElementById('edit-loc2-addr').value = ''; DOM.settings.editLoc2Lat.value = ''; DOM.settings.editLoc2Lng.value = '';
                DOM.settings.editLoc3Label.value = ''; document.getElementById('edit-loc3-addr').value = ''; DOM.settings.editLoc3Lat.value = ''; DOM.settings.editLoc3Lng.value = '';
            }
            DOM.settings.editBirthday.value = '';
            DOM.settings.editNickname.value = '';
            DOM.settings.editShortname.value = '';
            DOM.settings.editDepartment.value = '';
            if (DOM.settings.editManagerSelect) DOM.settings.editManagerSelect.value = '';

            // Permissions
            if (DOM.settings.permApprove) DOM.settings.permApprove.checked = false;
            if (DOM.settings.permSchedule) DOM.settings.permSchedule.checked = false;
            if (DOM.settings.permManage) DOM.settings.permManage.checked = false;
            if (DOM.settings.permSuper) DOM.settings.permSuper.checked = false;

            DOM.settings.editorAvatarPreview.style.background = '#cbd5e1';
            DOM.settings.editorAvatarPreview.style.backgroundImage = 'none';
            DOM.settings.editorAvatarPreview.textContent = '';
            DOM.settings.btnDeleteMember.classList.add('hidden');
        }
    }

    function renderTeamSettings() {
        if (!DOM.settings.teamList) return;
        DOM.settings.teamList.innerHTML = '';
        appState.users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'settings-item';
            let avatarHtml = `<div class="user-avatar" style="background: ${user.avatarColor}">${user.shortname || user.nickname?.substring(0, 1) || 'U'}</div>`;
            if (user.avatarUrl) avatarHtml = `<div class="user-avatar" style="background-image: url(${user.avatarUrl}); background-size: cover; color: transparent;"></div>`;

            li.innerHTML = `
                <div class="settings-user-info">
                    ${avatarHtml}
                    <div>
                        <div style="font-weight:600">${user.chiname || user.name}</div>
                        <div style="font-size:0.8rem; color:#64748b;">${user.username}${user.title ? ' | ' + user.title : ''}</div>
                    </div>
                </div>
                <div class="settings-actions">
                    <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.85rem;" id="btn-edit-${user.id}">編輯</button>
                </div>
            `;
            li.querySelector(`#btn-edit-${user.id}`).addEventListener('click', () => showTeamEditor(user.id));
            DOM.settings.teamList.appendChild(li);
        });
    }

    // --- Init & Event Listeners ---
    if (DOM.loginForm) DOM.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = DOM.usernameInput.value;
        const password = DOM.loginPasswordInput.value;
        if (appState.login(username, password)) { switchScreen('dashboard'); renderDashboard(); }
        else { alert('登入失敗：找不到使用者或密碼錯誤'); }
    });
    if (DOM.userDisplay.logoutBtn) DOM.userDisplay.logoutBtn.addEventListener('click', () => { appState.logout(); switchScreen('login'); });
    if (DOM.userDisplay.settingsBtn) DOM.userDisplay.settingsBtn.addEventListener('click', () => {
        openSettings();
    });

    if (DOM.settings.btnGenerateReport) DOM.settings.btnGenerateReport.addEventListener('click', generateReportPreview);
    if (DOM.settings.btnExportExcel) DOM.settings.btnExportExcel.addEventListener('click', exportReportToExcel);

    function generateReportPreview() {
        const monthVal = DOM.settings.reportMonth.value;
        const userId = DOM.settings.reportUser.value;
        if (!monthVal) { alert('請選擇月份'); return; }

        const data = getReportData(monthVal, userId);
        renderReportTable(data);
        DOM.settings.btnExportExcel.style.display = data.length > 0 ? 'block' : 'none';

        // Store for export
        appState.currentReportData = data;
        appState.currentReportMeta = { month: monthVal, userId };
    }

    function getReportData(monthStr, userId) {
        // monthStr is "YYYY-MM"
        const rows = [];

        appState.applications.forEach(app => {
            if (app.type !== 'expense') return; // Include pending? Maybe. Let's default to all expense apps for now so they can see progress. Or filter approved.
            // Screenshot shows confirmed expenses. Let's assume Valid applications (Approved or Pending). Rejected should be excluded.
            if (app.status === 'rejected') return;

            if (userId && app.userId !== userId) return;

            const u = appState.users.find(x => x.id === app.userId);
            const userName = u ? (u.chiname || u.name) : 'Unknown';

            if (app.data.items) {
                app.data.items.forEach(item => {
                    // item.date is "YYYY-MM-DD" or similar
                    if (item.date && item.date.startsWith(monthStr)) {
                        // Build Row

                        // Format Description: Traffic "A-B" or "A到B" -> "(A-->B)"
                        let desc = item.desc || '';
                        if (item.cat === 'traffic') {
                            // 1. Regex matches "X-Y" or "X到Y"
                            // Group 1: Start, Group 2: End (Ignoring spaces/commas)
                            // Replacing with "(X-->Y)"
                            desc = desc.replace(/([^\s\uff0c,\-]+)(?:\s*[-到]\s*)([^\s\uff0c,\-]+)/g, '($1-->$2)');
                        }

                        rows.push({
                            date: item.date,
                            amount: item.amount,
                            income: 0,
                            // Format: "Name, Reason, Desc, Amount"
                            note: `${userName}, ${app.data.reason || ''}, ${desc} ,${item.amount}元`,
                            voucherId: '',
                            voucherType: item.voucherType || ''
                        });
                    }
                });
            }
        });

        // Sort by Date
        rows.sort((a, b) => a.date.localeCompare(b.date));
        return rows;
    }

    function renderReportTable(rows) {
        const tbody = DOM.settings.reportPreviewTable.querySelector('tbody');
        tbody.innerHTML = '';
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">尚無資料</td></tr>';
            return;
        }

        let total = 0;
        rows.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.date}</td>
                <td>${parseInt(r.amount).toLocaleString()}</td>
                <td>0</td>
                <td style="font-size:0.9rem;">${r.note}</td>
                <td></td>
                <td>${r.voucherType}</td>
            `;
            tbody.appendChild(tr);
            total += parseInt(r.amount);
        });

        // Total Row
        const trTotal = document.createElement('tr');
        trTotal.style.fontWeight = 'bold';
        trTotal.style.background = '#f1f5f9';
        trTotal.innerHTML = `
            <td></td>
            <td style="color:#b91c1c;">${total.toLocaleString()}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        `;
        tbody.appendChild(trTotal);
    }

    function exportReportToExcel() {
        const data = appState.currentReportData;
        if (!data || data.length === 0) return;

        const { month, userId } = appState.currentReportMeta;
        let title = `${month.replace('-', '年')}月`;
        if (userId) {
            const u = appState.users.find(x => x.id === userId);
            if (u) title += ` ${u.chiname || u.name}`;
        } else {
            title += ' 全體出差費用彙整';
        }

        // Generate HTML for Excel
        let tableHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <!--[if gte mso 9]>
                <xml>
                <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                <x:Name>Expense Report</x:Name>
                <x:WorksheetOptions>
                <x:DisplayGridlines/>
                </x:WorksheetOptions>
                </x:ExcelWorksheet>
                </x:ExcelWorksheets>
                </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    th { background-color: #fef08a; font-weight: bold; border: 1px solid #000; text-align: center; }
                    td { border: 1px solid #000; vertical-align: middle; }
                </style>
            </head>
            <body>
            <table>
                <tr>
                   <th colspan="6" style="font-size:16px; background-color:yellow; text-align:center;">${title}</th>
                </tr>
                <tr>
                    <th>日期</th>
                    <th>支出</th>
                    <th>收入</th>
                    <th>備註</th>
                    <th>憑證編號</th>
                    <th>取得<br>憑證種類</th>
                </tr>
        `;

        let total = 0;
        data.forEach(r => {
            tableHtml += `
                <tr>
                    <td style='mso-number-format:"Short Date";'>${r.date.replace(/-/g, '/')}</td>
                    <td style='mso-number-format:"#,##0";'>${r.amount}</td>
                    <td></td>
                    <td>${r.note}</td>
                    <td>${r.voucherId}</td>
                    <td>${r.voucherType}</td>
                </tr>
            `;
            total += parseInt(r.amount);
        });

        tableHtml += `
            <tr>
                <td></td>
                <td style="color:red; font-weight:bold; mso-number-format:'#\,##0';">${total}</td>
                <td></td><td></td><td></td><td></td>
            </tr>
        `;
        tableHtml += `</table></body></html>`;

        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `出差費用_${title}.xls`;
        a.click();
    }

    // Calendar Navigation (Restored)
    if (DOM.calendar.prevBtn) DOM.calendar.prevBtn.addEventListener('click', () => {
        appState.currentDate.setMonth(appState.currentDate.getMonth() - 1);
        renderCalendar();
    });
    if (DOM.calendar.nextBtn) DOM.calendar.nextBtn.addEventListener('click', () => {
        appState.currentDate.setMonth(appState.currentDate.getMonth() + 1);
        renderCalendar();
    });
    DOM.calendar.todayBtn.addEventListener('click', () => {
        appState.currentDate = new Date();
        appState.selectedDate = new Date();
        renderCalendar();
        updateSidebar();
    });

    // Settings Tabs
    DOM.settings.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.settings.tabBtns.forEach(b => b.classList.remove('active'));
            DOM.settings.tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    function openSettings() {
        try {
            console.log("Opening Settings...");
            const u = appState.currentUser;

            // --- 1. Basic Profile Population ---
            if (u) {
                if (DOM.settings.nicknameInput) DOM.settings.nicknameInput.value = u.nickname || '';
                if (DOM.settings.adminCheck) DOM.settings.adminCheck.checked = appState.isAdminMode;

                // Avatar Preview
                if (DOM.settings.avatarPreview) {
                    if (u.avatarUrl) {
                        DOM.settings.avatarPreview.style.backgroundImage = `url(${u.avatarUrl})`;
                        DOM.settings.avatarPreview.textContent = '';
                    } else {
                        DOM.settings.avatarPreview.style.background = u.avatarColor;
                        DOM.settings.avatarPreview.style.backgroundImage = 'none';
                        DOM.settings.avatarPreview.textContent = u.shortname || u.nickname?.substring(0, 1) || 'U';
                    }
                }
            }

            showTeamList();

            // --- 2. Reports Tab Logic ---
            if (DOM.settings.reportUser) {
                // Save current selection if rewriting
                const currentSel = DOM.settings.reportUser.value;
                DOM.settings.reportUser.innerHTML = '<option value="">全部人員</option>';
                if (appState.users) {
                    appState.users.forEach(u => {
                        const op = document.createElement('option');
                        op.value = u.id;
                        op.textContent = `${u.chiname || u.name}`;
                        DOM.settings.reportUser.appendChild(op);
                    });
                }
                if (currentSel) DOM.settings.reportUser.value = currentSel;

                // Set Default Month
                const now = new Date();
                const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                if (DOM.settings.reportMonth && !DOM.settings.reportMonth.value) DOM.settings.reportMonth.value = mStr;
            }

            // --- 3. Permissions Enforcement ---
            if (u) {
                const perms = u.permissions || { approve: false, schedule: false, manageUser: false };

                // Team Tab & Backup
                const teamTabBtn = document.querySelector('.tab-btn[data-tab="tab-team"]');
                if (teamTabBtn) {
                    teamTabBtn.style.display = perms.manageUser ? 'block' : 'none';
                    if (!perms.manageUser && teamTabBtn.classList.contains('active')) {
                        const profileBtn = document.querySelector('.tab-btn[data-tab="tab-profile"]');
                        if (profileBtn) profileBtn.click();
                    }
                }

                // Reports Tab
                if (DOM.settings.tabBtnReports) {
                    DOM.settings.tabBtnReports.style.display = (perms.manageUser || perms.superAdmin) ? 'block' : 'none';
                }

                // Admin/Schedule Mode
                if (DOM.settings.adminCheck) {
                    const container = DOM.settings.adminCheck.closest('.form-group');
                    if (container) container.style.display = perms.schedule ? 'flex' : 'none';
                }

                // Backup Section
                const backupSec = document.getElementById('backup-section');
                if (backupSec) {
                    backupSec.style.display = perms.manageUser ? 'block' : 'none';
                }
            }

            DOM.settings.modal.classList.add('active');
        } catch (err) {
            console.error(err);
            alert('開啟設定時發生錯誤: ' + err.message);
        }
    }

    window.openSettings = openSettings;

    if (DOM.settings.closeBtn) DOM.settings.closeBtn.addEventListener('click', () => DOM.settings.modal.classList.remove('active'));

    // Team Manager Events
    if (DOM.settings.btnAddMember) DOM.settings.btnAddMember.addEventListener('click', () => showTeamEditor(null));
    if (DOM.settings.btnBackTeam) DOM.settings.btnBackTeam.addEventListener('click', showTeamList);
    if (DOM.settings.btnCancelEdit) DOM.settings.btnCancelEdit.addEventListener('click', showTeamList);

    if (DOM.settings.btnSaveMember) DOM.settings.btnSaveMember.addEventListener('click', () => {
        const username = DOM.settings.editUsername.value.trim();
        const chiname = DOM.settings.editChiname.value.trim();
        if (!username || !chiname) { alert('請填寫帳號與中文姓名'); return; }

        const passwordVal = DOM.settings.editPassword.value.trim();
        const data = {
            username, chiname,
            email: DOM.settings.editEmail ? DOM.settings.editEmail.value.trim() : '',
            birthday: DOM.settings.editBirthday.value,
            nickname: DOM.settings.editNickname.value.trim(),
            shortname: DOM.settings.editShortname.value.trim(),
            title: DOM.settings.editDepartment.value,
            managerId: DOM.settings.editManagerSelect ? DOM.settings.editManagerSelect.value : '',
            avatarUrl: tempAvatarUrl,
            locations: [
                {
                    label: DOM.settings.editLoc1Label.value.trim(),
                    addr: document.getElementById('edit-loc1-addr').value.trim(),
                    lat: DOM.settings.editLoc1Lat.value.trim(),
                    lng: DOM.settings.editLoc1Lng.value.trim()
                },
                {
                    label: DOM.settings.editLoc2Label.value.trim(),
                    addr: document.getElementById('edit-loc2-addr').value.trim(),
                    lat: DOM.settings.editLoc2Lat.value.trim(),
                    lng: DOM.settings.editLoc2Lng.value.trim()
                },
                {
                    label: DOM.settings.editLoc3Label.value.trim(),
                    addr: document.getElementById('edit-loc3-addr').value.trim(),
                    lat: DOM.settings.editLoc3Lat.value.trim(),
                    lng: DOM.settings.editLoc3Lng.value.trim()
                }
            ],
            permissions: {
                approve: DOM.settings.permApprove ? DOM.settings.permApprove.checked : false,
                schedule: DOM.settings.permSchedule ? DOM.settings.permSchedule.checked : false,
                manageUser: DOM.settings.permManage ? DOM.settings.permManage.checked : false,
                superAdmin: DOM.settings.permSuper ? DOM.settings.permSuper.checked : false
            }
        };

        if (passwordVal) {
            data.password = passwordVal;
        }

        if (editingUserId) { appState.updateUser(editingUserId, data); alert('更新成功'); }
        else { appState.addUser(data); alert('新增成功'); }
        showTeamList(); renderDashboard();
    });
    if (DOM.settings.btnDeleteMember) DOM.settings.btnDeleteMember.addEventListener('click', () => {
        if (confirm('確定要刪除此成員嗎？此動作無法復原。')) { appState.deleteUser(editingUserId); showTeamList(); renderDashboard(); }
    });

    // Geocoding Helper
    window.getGeo = async function (index) {
        const addrInput = document.getElementById(`edit-loc${index}-addr`);
        const latInput = document.getElementById(`edit-loc${index}-lat`);
        const lngInput = document.getElementById(`edit-loc${index}-lng`);

        // Initial setup
        const originalAddress = addrInput.value.trim();
        if (!originalAddress) { alert('請先輸入地址'); return; }

        const btn = document.getElementById(`btn-geo-${index}`);
        const oldText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 查詢中...';

        // Helper for fetch
        const searchOSM = async (q) => {
            try {
                // Add limit=1 to speed up
                const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
                const res = await fetch(url);
                return await res.json();
            } catch (e) { return []; }
        };

        try {
            // 1. Try Exact Match
            let data = await searchOSM(originalAddress);
            let resultAddress = originalAddress;
            let note = "";

            // 2. Fallback: Try removing specific House Number (e.g. 12號, 12-1號)
            if (!data || data.length === 0) {
                // Regex to remove trailing numbers + char (號/樓/F)
                const fallbackAddress = originalAddress.replace(/\d+[-~\d]*[號樓Ff].*$/, '');
                if (fallbackAddress && fallbackAddress !== originalAddress) {
                    data = await searchOSM(fallbackAddress);
                    if (data && data.length > 0) {
                        resultAddress = fallbackAddress;
                        note = ` (已為您定位至附近: ${fallbackAddress})`;
                    }
                }
            }

            // 3. Fallback: Try removing Alley/Lane numbers if still empty
            if (!data || data.length === 0) {
                const roadOnly = originalAddress.replace(/\d+[-~\d]*[巷弄].*$/, '');
                if (roadOnly && roadOnly !== originalAddress && roadOnly !== resultAddress) {
                    data = await searchOSM(roadOnly);
                    if (data && data.length > 0) {
                        resultAddress = roadOnly;
                        note = ` (已為您定位至路段: ${roadOnly})`;
                    }
                }
            }

            if (data && data.length > 0) {
                latInput.value = parseFloat(data[0].lat).toFixed(6);
                lngInput.value = parseFloat(data[0].lon).toFixed(6);
                if (note) alert(`提示: 找不到精確門牌，${note}。請確認位置是否正確。`);
            } else {
                alert('找不到此地址的座標，請嘗試只輸入路名或附近地標。');
            }
        } catch (e) {
            console.error(e);
            alert('抓取座標失敗，請檢查網路連線或稍後再試');
        } finally {
            btn.disabled = false;
            btn.innerHTML = oldText;
        }
    }

    // Attach listeners to geo buttons
    for (let i = 1; i <= 3; i++) {
        const btn = document.getElementById(`btn-geo-${i}`);
        if (btn) btn.onclick = () => getGeo(i);
    }
    // Avatar Inputs
    if (DOM.settings.editorAvatarInput) {
        DOM.settings.editorAvatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    tempAvatarUrl = evt.target.result;
                    DOM.settings.editorAvatarPreview.style.backgroundImage = `url(${tempAvatarUrl})`;
                    DOM.settings.editorAvatarPreview.textContent = '';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    if (DOM.settings.editorRemoveAvatar) {
        DOM.settings.editorRemoveAvatar.addEventListener('click', () => {
            tempAvatarUrl = '';
            DOM.settings.editorAvatarPreview.style.backgroundImage = 'none';
            DOM.settings.editorAvatarPreview.style.background = '#cbd5e1';
        });
    }

    // Standard Events
    if (DOM.stats.btn) DOM.stats.btn.addEventListener('click', () => { renderStats(); DOM.stats.modal.classList.add('active'); });
    if (DOM.stats.closeBtn) DOM.stats.closeBtn.addEventListener('click', () => DOM.stats.modal.classList.remove('active'));

    // Data Backup Logic
    if (document.getElementById('btn-export-data')) {
        document.getElementById('btn-export-data').addEventListener('click', () => {
            const data = {
                users: localStorage.getItem('officePulse_users_v4'),
                attendance: localStorage.getItem('officePulse_attendance_v4'),
                events: localStorage.getItem('officePulse_events_v1')
            };
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `office_pulse_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        });
    }

    if (document.getElementById('btn-import-data')) {
        document.getElementById('btn-import-data').addEventListener('click', () => document.getElementById('import-file-input').click());
        document.getElementById('import-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = JSON.parse(evt.target.result);
                    if (data.users) localStorage.setItem('officePulse_users_v4', data.users);
                    if (data.attendance) localStorage.setItem('officePulse_attendance_v4', data.attendance);
                    if (data.events) localStorage.setItem('officePulse_events_v1', data.events);
                    alert('資料匯入成功！系統將重新整理...');
                    location.reload();
                } catch (err) {
                    alert('匯入失敗：檔案格式錯誤');
                }
            };
            reader.readAsText(file);
        });
    }

    // --- Clock In Logic with Geolocation (Visual Map) ---
    const rawBtnClock = document.getElementById('btn-clock-action');
    if (rawBtnClock) {
        // [Security Fix] Remove any duplicate/legacy listeners by recreating the element
        const btnClockAction = rawBtnClock.cloneNode(true);
        rawBtnClock.parentNode.replaceChild(btnClockAction, rawBtnClock);

        btnClockAction.addEventListener('click', () => {
            // [Feature] Desktop / Laptop Direct Clock-In Bypassing Map
            // Logic: If screen width > 768px (Non-mobile), skip map.
            const isDesktop = window.innerWidth > 768;

            // Determine intention (In or Out?) - Always use NOW
            const nowTime = new Date();
            const todayStr = appState.formatDate(nowTime);
            let rec = appState.clockRecords[todayStr]?.[appState.currentUser.id];

            // If checking intentionally, determine logic state
            const isClockingOut = (rec && rec.in && !rec.out);
            const isFinished = (rec && rec.out);

            if (isFinished) {
                alert("今日已完成上下班打卡！");
                return;
            }

            if (isDesktop) {
                // Direct Clock In for Desktop
                if (!isClockingOut) {
                    // Clock IN
                    const timeStr = appState.clockIn(nowTime, appState.currentUser.id);
                    appState.addSegment(nowTime, {
                        type: 'office',
                        start: timeStr,
                        end: '18:00',
                        isAllDay: false,
                        note: `打卡: 電腦版 (${timeStr})`
                    });

                    document.getElementById('clock-status-text').textContent = "上班中";
                    document.getElementById('clock-status-text').style.color = "#059669";
                    document.getElementById('clock-time-display').textContent = timeStr;
                    btnClockAction.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> 下班';
                    btnClockAction.style.background = '#64748b';
                    alert(`電腦版打卡成功！時間: ${timeStr}`);
                } else {
                    // Clock OUT
                    const timeStr = appState.clockOut(nowTime, appState.currentUser.id);
                    document.getElementById('clock-status-text').textContent = "已下班";
                    document.getElementById('clock-status-text').style.color = "#64748b";
                    document.getElementById('clock-time-display').textContent = `${rec.in} - ${timeStr}`; // Update to range
                    btnClockAction.innerHTML = '<i class="fa-solid fa-check"></i> 完成';
                    btnClockAction.disabled = true;
                    btnClockAction.className = 'btn-secondary';
                    btnClockAction.style.background = '';
                    alert(`下班打卡成功！時間: ${timeStr}`);
                }

                renderCalendar();
                updateSidebar();
                return;
            }

            // --- Mobile Flow (Map Required) ---

            // 1. Check Geolocation Support
            if (!navigator.geolocation) { alert('您的裝置不支援地理位置功能，無法使用打卡功能。'); return; }


            // Open Map Modal
            const mapModal = document.getElementById('map-modal');
            const mapFrame = document.getElementById('map-frame');
            const statusText = document.getElementById('map-status-text');
            const confirmBtn = document.getElementById('btn-confirm-clock');

            mapModal.classList.add('active');
            statusText.textContent = '🚀 正在獲取您的位置...';
            statusText.style.color = '#334155';
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.onclick = null; // Reset previous listeners
            mapFrame.src = 'about:blank'; // Reset frame

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;

                    // Show Map (OpenStreetMap)
                    mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${userLng - 0.005},${userLat - 0.005},${userLng + 0.005},${userLat + 0.005}&layer=mapnik&marker=${userLat},${userLng}`;

                    // 2. Check Distances
                    let matchedLoc = null;
                    let minDistance = 999999;

                    const u = appState.currentUser;
                    const locs = u.locations || [];
                    const targetLocs = locs.filter(l => l.lat && l.lng);

                    if (targetLocs.length === 0) {
                        statusText.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 您尚未設定打卡地點！<br><span style="font-size:0.8rem">請至設定頁面新增地點</span>';
                        statusText.style.color = '#aa4a44';
                        return;
                    }

                    // Haversine Calc
                    const getDistance = (lat1, lon1, lat2, lon2) => {
                        const R = 6371e3;
                        const φ1 = lat1 * Math.PI / 180;
                        const φ2 = lat2 * Math.PI / 180;
                        const Δφ = (lat2 - lat1) * Math.PI / 180;
                        const Δλ = (lon2 - lon1) * Math.PI / 180;
                        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        return R * c;
                    };

                    targetLocs.forEach(loc => {
                        const dist = getDistance(userLat, userLng, loc.lat, loc.lng);
                        if (dist < minDistance) minDistance = dist;
                        if (dist <= 150) matchedLoc = loc;
                    });

                    if (matchedLoc) {
                        statusText.innerHTML = `<i class="fa-solid fa-circle-check"></i> 確認位置：${matchedLoc.label}<br><span style="font-size:0.8rem; color:#059669;">距離 ${Math.round(minDistance)} 公尺 (符合)</span>`;
                        statusText.style.color = '#059669';

                        // Enable Confirm Button
                        confirmBtn.disabled = false;
                        confirmBtn.style.opacity = '1';

                        // Update button text contextually
                        confirmBtn.textContent = isClockingOut ? "📍 確認下班" : "📍 確認上班";

                        // Bind Confirm Action
                        confirmBtn.onclick = function () {
                            // Re-evaluate state just in case, but local scope is safe enough
                            if (!isClockingOut) {
                                // CLOCK IN
                                const tStr = appState.clockIn(nowTime, appState.currentUser.id);
                                appState.addSegment(nowTime, {
                                    type: 'office',
                                    start: tStr,
                                    end: '18:00',
                                    isAllDay: false,
                                    note: `打卡: ${matchedLoc.label}`
                                });

                                alert(`打卡成功！\n地點: ${matchedLoc.label}\n時間: ${tStr}`);

                                // UI Updates Logic (Sync with Desktop flow)
                                document.getElementById('clock-status-text').textContent = "上班中";
                                document.getElementById('clock-status-text').style.color = "#059669";
                                document.getElementById('clock-time-display').textContent = tStr;
                                btnClockAction.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> 下班';
                                btnClockAction.style.background = '#64748b';

                            } else {
                                // CLOCK OUT
                                const tStr = appState.clockOut(nowTime, appState.currentUser.id);

                                alert(`下班打卡成功！\n時間: ${tStr}`);

                                document.getElementById('clock-status-text').textContent = "已下班";
                                document.getElementById('clock-status-text').style.color = "#64748b";
                                document.getElementById('clock-time-display').textContent = `${rec.in} - ${tStr}`;
                                btnClockAction.innerHTML = '<i class="fa-solid fa-check"></i> 完成';
                                btnClockAction.disabled = true;
                                btnClockAction.className = 'btn-secondary';
                                btnClockAction.style.background = '';
                                btnClockAction.style.border = 'none';
                            }

                            mapModal.classList.remove('active');
                            renderCalendar();
                            updateSidebar();
                        };

                    } else {
                        statusText.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> 位置不符！<br><span style="font-size:0.8rem">最近打卡點距離 ${Math.round(minDistance)} 公尺 (需 < 150)</span>`;
                        statusText.style.color = '#dc2626';

                        // Disable Confirm Button explicitly
                        confirmBtn.disabled = true;
                        confirmBtn.style.opacity = '0.5';
                        confirmBtn.onclick = null; // Prevent accidental clicks
                    }
                },
                (error) => {
                    statusText.textContent = '❌ 無法獲取位置：' + error.message;
                    statusText.style.color = '#dc2626';
                    console.error(error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }


    if (DOM.calendar.batchBtn) DOM.calendar.batchBtn.addEventListener('click', () => {
        appState.isBatchMode = !appState.isBatchMode;
        if (appState.isBatchMode) { DOM.calendar.batchBtn.classList.add('active'); DOM.calendar.batchStatus.textContent = "開"; appState.clearBatchSelection(); }
        else { DOM.calendar.batchBtn.classList.remove('active'); DOM.calendar.batchStatus.textContent = "關"; appState.clearBatchSelection(); }
        renderCalendar(); updateSidebar();
    });

    DOM.sidebar.addBtn.addEventListener('click', () => {
        const isAllDay = DOM.sidebar.checkAllDay.checked;
        const segment = { type: DOM.newFormState.type, detail: DOM.newFormState.detail, note: DOM.sidebar.noteInput.value, isAllDay: isAllDay, start: DOM.sidebar.startTime.value, end: DOM.sidebar.endTime.value };
        if (appState.isBatchMode && appState.multiSelectedDates.size > 0) { appState.multiSelectedDates.forEach(dateKey => { appState.addSegment(dateKey, segment); }); }
        else { appState.addSegment(appState.selectedDate, segment); }
        updateSidebar(); renderCalendar(); DOM.sidebar.noteInput.value = '';
    });

    // --- Sidebar Logic ---
    DOM.sidebar.btns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.sidebar.btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            DOM.newFormState.type = btn.dataset.status;
            DOM.newFormState.detail = '';

            // Toggle Location Inputs
            if (DOM.sidebar.locContainer) {
                DOM.sidebar.locContainer.style.display = (btn.dataset.status === 'trip') ? 'flex' : 'none';
                if (btn.dataset.status !== 'trip') {
                    if (DOM.sidebar.locStart) DOM.sidebar.locStart.value = '';
                    if (DOM.sidebar.locEnd) DOM.sidebar.locEnd.value = '';
                }
            }

            renderSubOptions();
        });
    });

    // --- Helper to init Time Selects ---
    function populateTimeSelects() {
        // Hours 00 - 23
        const hours = [];
        for (let i = 0; i < 24; i++) hours.push(String(i).padStart(2, '0'));

        // Mins 00 - 59 (5 min intervals for better UX?) 
        // Let's do 1 minute intervals if precise control needed, but dropdown is long.
        // Usually 5 is standard for attendance. User didn't specify interval, just separated buttons.
        const mins = [];
        for (let i = 0; i < 60; i += 5) mins.push(String(i).padStart(2, '0'));

        const ids = ['start-hour', 'start-min', 'end-hour', 'end-min'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = '';

            const arr = id.includes('hour') ? hours : mins;
            arr.forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                el.appendChild(opt);
            });
        });

        // Defaults
        if (DOM.sidebar.startHour) {
            DOM.sidebar.startHour.value = "09";
            DOM.sidebar.startMin.value = "00";
            DOM.sidebar.endHour.value = "18";
            DOM.sidebar.endMin.value = "00";
        }
    }

    // Call init
    populateTimeSelects();

    const btnAddStatus = document.getElementById('add-status-btn');
    if (btnAddStatus) {
        btnAddStatus.onclick = () => {
            const note = document.getElementById('status-note').value.trim();

            // Construct Time Strings from Selects
            const sH = document.getElementById('start-hour').value;
            const sM = document.getElementById('start-min').value;
            const eH = document.getElementById('end-hour').value;
            const eM = document.getElementById('end-min').value;

            const startT = `${sH}:${sM}`;
            const endT = `${eH}:${eM}`;

            const isAllDay = document.getElementById('all-day-check').checked;
            const type = DOM.newFormState.type;

            // Get Location if explicit input exists
            let detail = '';
            if (type === 'trip') {
                const s = document.getElementById('status-loc-start').value.trim();
                const e = document.getElementById('status-loc-end').value.trim();
                if (s && e) detail = `${s}-${e}`;
                else if (s) detail = s;
                else if (e) detail = e;
                else detail = '出差';
            } else if (type === 'other') {
                // Meeting Logic
                const link = document.getElementById('status-meet-link') ? document.getElementById('status-meet-link').value.trim() : '';
                if (link) detail = link;
            } else {
                detail = DOM.newFormState.detail;
            }

            const segment = { type, detail, note, isAllDay, start: startT, end: endT };

            // Logic Switch: If it's Trip/Away, create APPLICATION instead
            const isSensitive = (type === 'trip' || type === 'away');

            // Check Meeting Logic
            if (type === 'other') {
                const link = detail;
                const attendees = [];
                const checks = document.querySelectorAll('.meet-attendee-check:checked');
                checks.forEach(c => attendees.push(c.value));

                if (attendees.length > 0) {
                    // Add to attendees
                    const currentUser = appState.currentUser;
                    const subject = note || '會議';

                    const addSegForUser = (uid) => {
                        // We need to use dateKey logic if batch?
                        // Assuming single date for simplicity as "Meeting" implies specific time slot usually.
                        // But if batch mode is on? Meeting everyday? Allow it.
                        if (appState.isBatchMode && appState.multiSelectedDates.size > 0) {
                            appState.multiSelectedDates.forEach(dKey => {
                                // We need to pass Date object or Key?
                                // appState.addSegment uses Date object usually, or key?
                                // addSegment(dateObjOrKey, seg, userId)
                                // Let's check addSegment signature.
                                // It usually takes (date, segment).
                                // Let's rely on standard logic but we need to inject user ID.
                                // appState.addSegment signature: addSegment(dateInput, segment, targetUserId = null)
                                appState.addSegment(dKey, { ...segment, id: Date.now() + Math.random() }, uid);
                            });
                        } else {
                            appState.addSegment(appState.selectedDate, { ...segment, id: Date.now() + Math.random() }, uid);
                        }
                    };

                    attendees.forEach(uid => addSegForUser(uid));

                    // Send Email Simulation
                    const emails = [];
                    attendees.forEach(uid => {
                        const u = appState.users.find(User => User.id === uid);
                        if (u && u.email) emails.push(u.email);
                    });

                    if (emails.length > 0) {
                        const mailSubject = `[會議通知] ${subject}`;
                        const mailBody = `會議時間: ${appState.formatDate(appState.selectedDate)} ${startT}-${endT}\n會議連結: ${link}\n備註: ${note}\n\n請務必準時參加。`;
                        const mailto = `mailto:${emails.join(';')}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
                        window.open(mailto, '_blank');
                    } else if (confirm('已新增會議行程，但未找到與會者的 Email。是否僅儲存行程？')) {
                        // OK
                    }
                }
            }

            if (isSensitive) {
                if (appState.isBatchMode && appState.multiSelectedDates.size > 0) {
                    if (confirm('您新增的是「出差/請假」行程，將會送出簽核申請。\n確定要送出 ' + appState.multiSelectedDates.size + ' 筆申請嗎？')) {
                        appState.multiSelectedDates.forEach(dateKey => {
                            appState.addApplication('segment', { ...segment, date: dateKey });
                        });
                        alert('已送出簽核申請');
                    }
                } else {
                    if (confirm('您新增的是「出差/請假」行程，將會送出簽核申請。')) {
                        appState.addApplication('segment', { ...segment, date: appState.formatDate(appState.selectedDate) });
                        alert('已送出簽核申請');
                    }
                }
            } else {
                // Direct Add (Office/Remote/Other)
                if (appState.isBatchMode && appState.multiSelectedDates.size > 0) {
                    appState.multiSelectedDates.forEach(dateKey => appState.addSegment(dateKey, segment));
                } else {
                    appState.addSegment(appState.selectedDate, segment);
                }
            }

            updateSidebar();
            renderCalendar();
            // Clear inputs
            document.getElementById('status-note').value = '';
            if (DOM.sidebar.locStart) DOM.sidebar.locStart.value = '';
            if (DOM.sidebar.locEnd) DOM.sidebar.locEnd.value = '';
        };
    }

    // --- Applications Logic ---
    let currentExpenseItems = []; // Store items for current session

    function openApplicationsModal() {
        DOM.apps.modal.classList.add('active');
        currentExpenseItems = []; // Reset
        renderTripCheckboxes();
        renderExpenseItemsTable();
        renderAppHistory();
    }

    function renderTripCheckboxes() {
        const container = DOM.apps.expenseDatesContainer;
        if (!container) return;
        container.innerHTML = '';

        // Find trips: Scan last 2 months + next 1 month
        const start = new Date(appState.currentDate);
        start.setMonth(start.getMonth() - 2);

        let found = false;

        for (let i = 0; i < 120; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const dateKey = appState.formatDate(d);

            if (appState.attendanceData[dateKey] && appState.attendanceData[dateKey][appState.currentUser.id]) {
                const segs = appState.attendanceData[dateKey][appState.currentUser.id];
                const tripSeg = segs.find(s => s.type === 'trip');
                if (tripSeg) {
                    found = true;
                    const div = document.createElement('div');
                    div.className = 'check-group';
                    div.style.marginBottom = '4px';

                    const chk = document.createElement('input');
                    chk.type = 'checkbox';
                    chk.value = dateKey;
                    chk.dataset.note = tripSeg.note || ''; // Store note for auto-fill
                    chk.id = `chk_exp_${dateKey}`;

                    chk.addEventListener('change', () => {
                        updateExpenseUI();
                    });

                    const lbl = document.createElement('label');
                    lbl.htmlFor = chk.id;
                    lbl.style.marginLeft = '8px';
                    lbl.textContent = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} (${tripSeg.detail || '出差'})`;

                    div.appendChild(chk);
                    div.appendChild(lbl);
                    container.appendChild(div);
                }
            }
        }
        if (!found) container.innerHTML = '<div style="color:#aaa; padding:10px;">查無近期出差紀錄</div>';

        // Init UI
        updateExpenseUI();
    }

    function updateExpenseUI() {
        // 1. Update Date Dropdown
        const container = DOM.apps.expenseDatesContainer;
        const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
        const dateSelect = DOM.apps.expItemDate;

        // Save current selection if still valid
        const oldVal = dateSelect.value;
        dateSelect.innerHTML = '';

        if (checkedBoxes.length === 0) {
            dateSelect.innerHTML = '<option value="">(先選取左側日期)</option>';
            DOM.apps.btnAddExpItem.disabled = true;
        } else {
            DOM.apps.btnAddExpItem.disabled = false;
            checkedBoxes.forEach(chk => {
                const opt = document.createElement('option');
                opt.value = chk.value;
                opt.textContent = chk.value;
                dateSelect.appendChild(opt);
            });
            if (Array.from(dateSelect.options).some(o => o.value === oldVal)) dateSelect.value = oldVal;
        }

        // 2. Auto-fill Reason (Deduplicated, No Date)
        const activeNotes = new Set();
        checkedBoxes.forEach(chk => {
            if (chk.dataset.note) activeNotes.add(chk.dataset.note);
        });
        const reasons = Array.from(activeNotes);

        if (reasons.length > 0) {
            DOM.apps.expenseMainReason.value = reasons.join('\n');
        } else {
            // Only clear if empty, don't overwrite user manual input if they typed something? 
            // Requirement says "Auto populate". Let's overwrite safely or just append.
            // Simple: Overwrite.
            DOM.apps.expenseMainReason.value = '';
        }
    }

    function renderExpenseItemsTable() {
        const tbody = DOM.apps.expItemsTbody;
        tbody.innerHTML = '';
        let total = 0;

        currentExpenseItems.forEach((item, index) => {
            const tr = document.createElement('tr');
            const catMap = { traffic: '交通費', accommodation: '住宿費', meal: '膳雜費', other: '其他' };
            const voucherType = item.voucherType || '';
            const catDisplay = voucherType ? `${catMap[item.cat]} <br/><small style='color:#64748b;'>(${voucherType})</small>` : catMap[item.cat];

            tr.innerHTML = `
                <td>${item.date}</td>
                <td>${catDisplay}</td>
                <td>${item.desc}</td>
                <td>$${item.amount}</td>
                <td><button onclick="removeExpItem(${index})" style="color:#ef4444; background:none; border:none; cursor:pointer;"><i class="fa-solid fa-trash"></i></button></td>
            `;
            tbody.appendChild(tr);
            total += parseInt(item.amount || 0);
        });

        DOM.apps.expTotalDisplay.textContent = `$${total.toLocaleString()}`;
    }

    // Global expose
    window.removeExpItem = function (index) {
        currentExpenseItems.splice(index, 1);
        renderExpenseItemsTable();
    };

    function renderAppHistory() {
        const tbody = DOM.apps.historyTbody;
        if (!tbody) return;
        tbody.innerHTML = '';
        const apps = [...appState.applications].sort((a, b) => b.timestamp - a.timestamp);
        const currentUser = appState.currentUser;

        // Visibility Filter Logic
        const isSuperAdmin = currentUser.permissions.superAdmin;

        apps.forEach(app => {
            const applicant = appState.users.find(u => u.id === app.userId);
            const applicantName = applicant ? (applicant.chiname || applicant.name) : 'Unknown';
            const isMyOwn = (app.userId === currentUser.id);

            // Visibility Rules:
            // 1. Super Admin -> See All
            // 2. My Own -> See All
            // 3. I am the Direct Manager -> See
            // 4. Same Department & I am Manager -> See (Legacy/Fallback)

            let isVisible = false;
            let canApprove = false;

            if (isSuperAdmin || isMyOwn) {
                isVisible = true;
            }

            const isDirectManager = (applicant && applicant.managerId === currentUser.id);

            if (currentUser.permissions.approve) {
                // 1. Direct Assignment
                if (isDirectManager) {
                    isVisible = true;
                    canApprove = true;
                }

                // 2. Department Logic (Fallback)
                if (!isMyOwn) {
                    const appTitle = applicant ? (applicant.title || '') : '';
                    const myTitle = currentUser.title || '';

                    const getDept = (t) => {
                        if (t.includes('工程')) return '工程';
                        if (t.includes('業務')) return '業務';
                        if (t.includes('客服')) return '客服';
                        if (t.includes('人事')) return '人事';
                        return '其他';
                    };
                    const appDept = getDept(appTitle);
                    const myDept = getDept(myTitle);

                    // Logic: I am Manager of SAME dept AND they are NOT Manager
                    const isMyDeptMatch = (appDept !== '其他') && (appDept === myDept) && (myTitle.includes('主管'));

                    if (isMyDeptMatch) {
                        isVisible = true;
                        canApprove = true;
                    }

                    // 'bb' Override
                    if (currentUser.username.toLowerCase() === 'bb' || currentUser.username === 'Brian') {
                        isVisible = true;
                        canApprove = true;
                    }
                }
            }

            // Super Admin Approves All
            if (isSuperAdmin) {
                isVisible = true;
                canApprove = true;
            }

            if (!isVisible) return; // Skip

            const tr = document.createElement('tr');
            let content = '';

            if (app.type === 'correction') {
                content = `<div><strong>補卡日期:</strong> ${app.data.date}</div><div>上班: ${app.data.in || '--'} / 下班: ${app.data.out || '--'}</div><div style="color:#666; font-size:0.85rem;">理由: ${app.data.reason}</div>`;
            } else if (app.type === 'segment') {
                const mapType = { trip: '出差', away: '請假' };
                const label = mapType[app.data.type] || '行程';
                const time = app.data.isAllDay ? '全天' : `${app.data.start}-${app.data.end}`;
                content = `<div><strong>${label}申請:</strong> ${app.data.date}</div>
                           <div>時間: ${time}</div>
                           <div style="color:#666; font-size:0.85rem;">${app.data.note || ''}</div>`;
            } else {
                // Expense
                const total = app.data.totalAmount || app.data.amount;
                const reason = app.data.reason || app.data.desc;
                const dates = app.data.dates ? app.data.dates.join(', ') : app.data.date;

                content = `<div><strong>日期:</strong> ${dates}</div>
                           <div style="font-weight:bold; color:#2563eb;">總額: $${total}</div>
                           <div style="color:#666; font-size:0.85rem;">${reason}</div>`;
                if (app.data.items && app.data.items.length > 0) {
                    content += `<div style="font-size:0.8rem; color:#64748b; margin-top:4px;">包含 ${app.data.items.length} 筆明細</div>`;
                }
            }

            let statusBadge = '';
            let actionButtons = '';

            if (app.status === 'pending') {
                statusBadge = `<span class="status-badge pending">🔴 待簽核</span>`;
                if (canApprove) {
                    actionButtons = `
                        <div style="display:flex; gap:5px;">
                            <button class="btn-primary" style="padding:2px 8px; font-size:0.8rem; background:#16a34a;" onclick="approveApp('${app.id}')">核准</button>
                            <button class="btn-secondary" style="padding:2px 8px; font-size:0.8rem; background:#fee2e2; color:#991b1b; border:none;" onclick="rejectApp('${app.id}')">駁回</button>
                        </div>
                    `;
                } else {
                    actionButtons = `<span style="color:#f59e0b; font-size:0.85rem;">等待審核</span>`;
                }
            } else if (app.status === 'approved') {
                statusBadge = `<span class="status-badge approved">🟢 已核准</span>`;
                actionButtons = `<span style="color:#aaa; font-size:0.8rem;">已結案</span>`;
            } else if (app.status === 'rejected') {
                statusBadge = `<span class="status-badge rejected">🔴 已駁回</span>`;
                actionButtons = `<span style="color:#aaa; font-size:0.8rem;">已結案</span>`;
            }

            tr.innerHTML = `<td>${statusBadge}</td><td><div style="font-weight:600">${applicantName}</div><div style="font-size:0.8rem; color:#94a3b8;">${new Date(app.timestamp).toLocaleDateString()}</div></td><td>${content}</td><td>${actionButtons}</td>`;
            tbody.appendChild(tr);
        });
    }

    // Global expose
    window.approveApp = function (id) {
        if (confirm('確定核准此申請嗎？(補打卡將自動修正考勤紀錄)')) {
            appState.updateApplicationStatus(id, 'approved');
            renderAppHistory();
            renderStats(); renderCalendar(); alert('✅ 已核准並生效');
        }
    };
    window.rejectApp = function (id) {
        if (confirm('確定駁回嗎？')) {
            appState.updateApplicationStatus(id, 'rejected');
            renderAppHistory();
        }
    };
    window.openApplicationsModal = openApplicationsModal;

    // Listeners
    if (DOM.apps.btn) DOM.apps.btn.onclick = function () { window.openApplicationsModal(); };
    if (DOM.apps.closeBtn) DOM.apps.closeBtn.addEventListener('click', () => DOM.apps.modal.classList.remove('active'));

    if (DOM.apps.tabBtns) {
        DOM.apps.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                DOM.apps.tabBtns.forEach(b => b.classList.remove('active'));
                DOM.apps.tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const tid = btn.getAttribute('data-tab');
                const t = document.getElementById(tid);
                if (t) t.classList.add('active');
            });
        });
    }

    // Correction Submit
    if (DOM.apps.btnSubmitCorrect) {
        DOM.apps.btnSubmitCorrect.addEventListener('click', () => {
            const date = DOM.apps.correctDate.value;
            const tIn = DOM.apps.correctIn.value;
            const tOut = DOM.apps.correctOut.value;
            const reason = DOM.apps.correctReason.value;
            if (!date || (!tIn && !tOut)) { alert('請選擇日期並至少填寫一個時間'); return; }
            appState.addApplication('correction', { date, in: tIn, out: tOut, reason });
            alert('✅ 補打卡申請已送出！');
            DOM.apps.correctReason.value = '';
            renderAppHistory();
            DOM.apps.tabBtns[2].click();
        });
    }

    // Expense Item Add
    if (DOM.apps.btnAddExpItem) {
        DOM.apps.btnAddExpItem.addEventListener('click', () => {
            const dateSelect = DOM.apps.expItemDate;
            const date = dateSelect.value;
            if (!date || date.includes('請先選')) { alert('請先選擇日期'); return; }
            const cat = DOM.apps.expItemCat.value;
            const desc = DOM.apps.expItemDesc.value.trim();
            const amount = DOM.apps.expItemAmount.value.trim();
            const voucherType = document.getElementById('exp-item-type').value;

            if (!desc) { alert('請填寫說明'); return; }
            if (!amount || parseInt(amount) <= 0) { alert('請填寫有效金額'); return; }

            currentExpenseItems.push({
                date, cat, desc, amount, voucherType,
                id: Date.now() + Math.random() // Temp ID
            });

            // Reset Item Inputs
            DOM.apps.expItemDesc.value = '';
            DOM.apps.expItemAmount.value = '';
            document.getElementById('exp-item-type').value = '購票證明';
            renderExpenseItemsTable();
        });
    }

    // Expense Submit (Updated)
    if (DOM.apps.btnSubmitExpense) {
        DOM.apps.btnSubmitExpense.addEventListener('click', () => {
            const container = DOM.apps.expenseDatesContainer;
            const checkedBoxes = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
            const reason = DOM.apps.expenseMainReason.value;

            if (checkedBoxes.length === 0) { alert('請至少勾選一個出差日期'); return; }
            if (currentExpenseItems.length === 0) { alert('請至少新增一筆費用明細'); return; }

            const total = currentExpenseItems.reduce((sum, item) => sum + parseInt(item.amount || 0), 0);

            appState.addApplication('expense', {
                dates: checkedBoxes,
                reason: reason,
                items: currentExpenseItems,
                totalAmount: total
            });

            alert('✅ 出差費申請已送出！');
            currentExpenseItems = []; // clear
            renderExpenseItemsTable();
            DOM.apps.expenseMainReason.value = '';
            // Reset logic or UI?
            renderTripCheckboxes(); // re-init
            renderAppHistory();
            DOM.apps.tabBtns[2].click();
        });
    }

    // PDF Generation
    const btnPdf = document.getElementById('btn-generate-pdf');
    if (btnPdf) {
        btnPdf.addEventListener('click', () => {
            if (currentExpenseItems.length === 0) { alert('請先新增費用明細才能產生報表'); return; }
            generateExpensePDF(currentExpenseItems, DOM.apps.expenseMainReason.value);
        });
    }

    function generateExpensePDF(items, mainReason) {
        // 1. Data Prep
        const user = appState.currentUser;
        const sortedItems = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));
        const startDate = sortedItems[0].date;
        const endDate = sortedItems[sortedItems.length - 1].date;

        let totalTraffic = 0, totalAccom = 0, totalMeal = 0, totalOther = 0;
        let grandTotal = 0;

        // 2. Build Rows
        let rowsHtml = '';
        sortedItems.forEach(item => {
            const amt = parseInt(item.amount);
            grandTotal += amt;

            let traffic = '', accom = '', meal = '';
            if (item.cat === 'traffic') { traffic = amt; totalTraffic += amt; }
            else if (item.cat === 'accommodation') { accom = amt; totalAccom += amt; }
            else { meal = amt; totalMeal += amt; }

            // Get Calendar Data for this date
            // Parse YYYY-MM-DD manually to avoid timezone shifts
            const [y, m, d] = item.date.split('-');
            const dateKey = `${parseInt(y)}-${parseInt(m)}-${parseInt(d)}`;

            let location = '-';
            let workSummary = '-';

            if (appState.attendanceData[dateKey] && appState.attendanceData[dateKey][user.id]) {
                const segs = appState.attendanceData[dateKey][user.id];
                const tripSegs = segs.filter(s => s.type === 'trip');

                // Find any segment that has location detail
                const locSeg = tripSegs.find(s => s.detail);
                if (locSeg) location = locSeg.detail;

                // Find any segment that has note
                // Deduplicate notes if multiple segments
                const notes = [...new Set(tripSegs.map(s => s.note).filter(n => n))];
                if (notes.length > 0) workSummary = notes.join('、');
            }

            rowsHtml += `
                <tr style="height: 30px;">
                    <td style="border:1px solid #000; text-align:center;">${item.date}</td>
                    <td style="border:1px solid #000; text-align:center;">${location}</td>
                    <td style="border:1px solid #000; text-align:center; padding:0 5px;">${workSummary}</td>
                    <td style="border:1px solid #000; text-align:center; padding:0 5px;">${traffic}</td>
                    <td style="border:1px solid #000; text-align:center; padding:0 5px;">${accom}</td>
                    <td style="border:1px solid #000; text-align:center; padding:0 5px;">${meal}</td>
                    <td style="border:1px solid #000; text-align:center;"></td>
                    <td style="border:1px solid #000; text-align:center; padding:0 5px;">${amt}</td>
                    <td style="border:1px solid #000; text-align:left; padding:0 5px;">${item.desc}</td>
                </tr>
            `;
        });

        // Fill empty rows to make it look full (approx 8 rows total usually)
        for (let i = sortedItems.length; i < 8; i++) {
            rowsHtml += `
                <tr style="height: 30px;">
                    <td style="border:1px solid #000;">&nbsp;</td>
                    <td style="border:1px solid #000;"></td>
                    <td style="border:1px solid #000;"></td>
                    <td style="border:1px solid #000;"></td>
                    <td style="border:1px solid #000;"></td>
                    <td style="border:1px solid #000;"></td>
                    <td style="border:1px solid #000;"></td>
                    <td style="border:1px solid #000;"></td>
                    <td style="border:1px solid #000;"></td>
                </tr>
            `;
        }

        const moneyText = numberToChinese(grandTotal);

        // 3. HTML Template
        const printContent = `
            <html>
            <head>
                <title>出差旅費報告表</title>
                <style>
                    body { font-family: "Microsoft JhengHei", sans-serif !important; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 14px; }
                    td, th { border: 1px solid #000; padding: 4px; }
                    .center { text-align: center; }
                    .header-title { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
                    .no-border-bottom { border-bottom: none; }
                    .no-border-top { border-top: none; }
                </style>
            </head>
            <body>
                <div class="header-title">森福德有限公司 出差旅費報告表</div>
                
                <table>
                    <tr>
                        <td class="center" width="100" style="background:#f0f0f0;">員工姓名</td>
                        <td class="center">${user.chiname || user.name}</td>
                        <td class="center" width="100" style="background:#f0f0f0;">服務單位</td>
                        <td class="center">業務用</td>
                        <td class="center" width="100" style="background:#f0f0f0;">填表日期</td>
                        <td class="center">${appState.formatDate(new Date())}</td>
                    </tr>
                    <tr>
                        <td class="center" style="background:#f0f0f0;">員工編號</td>
                        <td class="center">${user.id}</td>
                        <td class="center" style="background:#f0f0f0;">職稱</td>
                        <td class="center">工程師</td> <!-- Mock -->
                        <td class="center" style="background:#f0f0f0;">職等</td>
                        <td class="center"></td>
                    </tr>
                    <tr>
                        <td class="center" style="background:#f0f0f0;">出差事由</td>
                        <td colspan="5">${mainReason || '業務拜訪'}</td>
                    </tr>
                    <tr>
                        <td class="center" style="background:#f0f0f0;">起訖時間</td>
                        <td colspan="5">
                            自 ${startDate || 'YYYY-MM-DD'} 09:00 起 至 ${endDate || 'YYYY-MM-DD'} 18:00 分止<br>
                        </td>
                    </tr>
                </table>

                <table style="margin-top: -2px;">
                    <thead>
                        <tr style="background:#f0f0f0; height: 40px;">
                            <td rowspan="2" class="center" width="80">日期</td>
                            <td rowspan="2" class="center" width="100">起訖<br>地點</td>
                            <td rowspan="2" class="center">工作摘要</td>
                            <td class="center" width="60">交通費</td>
                            <td rowspan="2" class="center" width="60">住宿費</td>
                            <td rowspan="2" class="center" width="60">膳雜費</td>
                            <td rowspan="2" class="center" width="50">單據<br>號數</td>
                            <td rowspan="2" class="center" width="60">合計</td>
                            <td rowspan="2" class="center" width="100">備註</td>
                        </tr>
                        <tr style="background:#f0f0f0;">
                            <td class="center" style="font-size:11px;">飛機/高鐵<br>捷運/計程車</td>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        <tr style="font-weight:bold; background:#f9f9f9;">
                            <td colspan="3" class="center">總計</td>
                            <td class="center" style="text-align:center;">${totalTraffic}</td>
                            <td class="center" style="text-align:center;">${totalAccom}</td>
                            <td class="center" style="text-align:center;">${totalMeal}</td>
                            <td></td>
                            <td class="center" style="text-align:center;">${grandTotal}</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td class="center" style="background:#f0f0f0;">旅費總額</td>
                            <td colspan="8" style="padding: 10px; text-align: left;">
                                旅費新台幣 <span style="font-weight:bold; font-size: 16px;">${moneyText}</span> 。已如數領訖。
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div style="text-align:right; margin-top:5px; font-size:12px;">( 領款人簽章 )</div>

                <table style="margin-top: 20px;">
                    <tr>
                        <td class="center" style="height: 30px; background:#f0f0f0;">申請人</td>
                        <td class="center" style="background:#f0f0f0;">主管</td>
                        <td class="center" style="background:#f0f0f0;">財務單位</td>
                    </tr>
                    <tr>
                        <td style="height: 80px;"></td>
                        <td></td>
                        <td></td>
                    </tr>
                </table>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        const newWin = window.open('', '_blank');
        newWin.document.write(printContent);
        newWin.document.close();
    }

    function numberToChinese(n) {
        if (n === 0) return "零元整";
        if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(n)) return "";
        let unit = "仟佰拾億仟佰拾萬仟佰拾元角分", str = "";
        n += "00";
        const p = n.indexOf('.');
        if (p >= 0) n = n.substring(0, p) + n.substr(p + 1, 2);
        unit = unit.substr(unit.length - n.length);
        for (let i = 0; i < n.length; i++) str += '零壹貳參肆伍陸柒捌玖'.charAt(n.charAt(i)) + unit.charAt(i);
        return str.replace(/零(仟|佰|拾|角)/g, "零").replace(/(零)+/g, "零").replace(/零(萬|億|元)/g, "$1").replace(/(億)萬|壹(拾)/g, "$1$2").replace(/^元零?|零分/g, "").replace(/元$/g, "元整");
    }

    if (DOM.settings.adminCheck) {
        DOM.settings.adminCheck.addEventListener('change', (e) => {
            appState.isAdminMode = e.target.checked;
            if (appState.isAdminMode) { DOM.sidebar.adminSelectorDiv.classList.remove('hidden'); renderAdminSelector(); alert('已開啟管理者模式'); }
            else { DOM.sidebar.adminSelectorDiv.classList.add('hidden'); appState.adminTargetUserId = appState.currentUser.id; }
            updateSidebar();
        });
    }

    if (DOM.sidebar.targetUserSelect) DOM.sidebar.targetUserSelect.addEventListener('change', (e) => { appState.adminTargetUserId = e.target.value; updateSidebar(); });

    // Event Input Listener
    if (DOM.sidebar.eventInput) {
        DOM.sidebar.eventInput.addEventListener('change', (e) => {
            if (!appState.isBatchMode) {
                appState.setEvent(appState.selectedDate, e.target.value);
                renderCalendar();
            }
        });
    }

    // --- Perpetual Calendar & Month Nav Logic ---
    window.changeMonth = function (id, offset) {
        const input = document.getElementById(id);
        if (!input) return;

        let date;
        if (offset === 0) {
            date = new Date(); // Reset to today
        } else {
            // Parse current value or use appState current
            if (input.value) {
                date = new Date(input.value + "-01");
            } else {
                date = new Date();
            }
            date.setMonth(date.getMonth() + offset);
        }

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        input.value = `${y}-${m}`;
    };

    // --- Login Logic (Restored) ---
    if (DOM.loginForm) {
        DOM.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = DOM.usernameInput.value;
            const password = DOM.loginPasswordInput.value;

            if (appState.login(username, password)) {
                switchScreen('dashboard');
                renderDashboard();
            } else {
                alert('登入失敗，請檢查帳號密碼 (預設: Alex / 123)');
                DOM.loginForm.classList.add('shake');
                setTimeout(() => DOM.loginForm.classList.remove('shake'), 500);
            }
        });
    }

    // Logout Logic
    if (DOM.userDisplay.logoutBtn) {
        DOM.userDisplay.logoutBtn.addEventListener('click', () => {
            appState.logout();
        });
    }

    // Perpetual Calendar Listeners
    if (DOM.calendar.yearSelect) {
        DOM.calendar.yearSelect.addEventListener('change', (e) => {
            appState.currentDate.setFullYear(parseInt(e.target.value));
            renderCalendar();
            updateSidebar();
        });
    }
    if (DOM.calendar.monthSelect) {
        DOM.calendar.monthSelect.addEventListener('change', (e) => {
            appState.currentDate.setMonth(parseInt(e.target.value));
            renderCalendar();
            updateSidebar();
        });
    }

    // Final Safety Check for Apps Button binding
    const safeAppBtn = document.getElementById('btn-app-header');
    if (safeAppBtn) {
        safeAppBtn.onclick = function () { window.openApplicationsModal(); };
        safeAppBtn.addEventListener('click', window.openApplicationsModal); // Double bind
    }

    if (appState.currentUser) { switchScreen('dashboard'); renderDashboard(); }
});
