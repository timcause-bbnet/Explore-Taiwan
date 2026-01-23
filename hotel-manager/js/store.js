export const store = {
    rooms: JSON.parse(localStorage.getItem('pms_rooms')) || [
        { id: 'r_std', name: '標準雙人房', capacity: 2, price: 2000, roomNumbers: ['101', '102', '103', '104', '105', '106'] },
        { id: 'r_fam', name: '家庭四人房', capacity: 4, price: 4800, roomNumbers: ['201', '202', '203'] },
        { id: 'r_vip', name: 'VIP 套房', capacity: 2, price: 6000, roomNumbers: ['501'] }
    ],
    projects: JSON.parse(localStorage.getItem('pms_projects')) || [
        {
            id: 'p1',
            name: '一般訂房',
            description: '標準價格',
            roomPricing: {
                'r1': { weekday: 2000, weekend: 2500 },
                'r2': { weekday: 3500, weekend: 4000 },
                'r3': { weekday: 4800, weekend: 5500 }
            }
        },
        {
            id: 'p_latebird',
            name: '晚鳥晚睡專案',
            description: '20:00 後入住享優惠',
            roomPricing: {
                'r1': { weekday: 1600, weekend: 2000 },
                'r2': { weekday: 3000, weekend: 3600 },
                'r3': { weekday: 4200, weekend: 5000 }
            },
            applicableDateTypes: ['weekday', 'weekend'],
            applicableRooms: ['r1', 'r2', 'r3']
        }
    ],
    bookings: JSON.parse(localStorage.getItem('pms_bookings')) || [],
    dateSettings: JSON.parse(localStorage.getItem('pms_dates')) || {
        weekendDays: [5, 6],
        specialPeriods: [
            { id: 'sp1', name: '跨年', dates: ['2025-12-31', '2026-01-01'] },
            { id: 'sp2', name: '春節', dates: ['2026-02-17', '2026-02-18'] },
            { id: 'sp_long_weekend', name: '連續假日', dates: ['2026-02-28', '2026-03-01', '2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06'] }
        ]
    },
    payments: JSON.parse(localStorage.getItem('pms_payments')) || [],
    paymentMethods: JSON.parse(localStorage.getItem('pms_pay_methods')) || [
        { id: 'cash', name: '現金' },
        { id: 'card', name: '信用卡' },
        { id: 'transfer', name: '轉帳' }
    ],
    roomStatuses: JSON.parse(localStorage.getItem('pms_room_statuses')) || {},

    // --- Methods ---

    // Rooms
    addRoom(room) {
        this.rooms.push({
            ...room,
            id: Date.now().toString(),
            roomNumbers: room.roomNumbers || []
        });
        this.save();
    },
    updateRoom(updatedRoom) {
        const idx = this.rooms.findIndex(r => r.id === updatedRoom.id);
        if (idx !== -1) {
            this.rooms[idx] = updatedRoom;
            this.save();
        }
    },
    deleteRoom(id) {
        this.rooms = this.rooms.filter(r => r.id !== id);
        this.save();
    },

    // Projects
    addProject(project) {
        this.projects.push({ ...project, id: 'p' + Date.now() });
        this.save();
    },
    updateProject(project) {
        const index = this.projects.findIndex(p => p.id === project.id);
        if (index !== -1) {
            this.projects[index] = project;
            this.save();
        }
    },
    deleteProject(id) {
        this.projects = this.projects.filter(p => p.id !== id);
        this.save();
    },

    // Dates
    saveDateSettings(settings) {
        this.dateSettings = settings;
        this.save();
    },
    addSpecialPeriodRange(periodIndex, startStr, endStr) {
        const dates = [];
        let curr = new Date(startStr);
        const end = new Date(endStr);
        while (curr <= end) {
            dates.push(curr.toISOString().slice(0, 10));
            curr.setDate(curr.getDate() + 1);
        }

        const period = this.dateSettings.specialPeriods[periodIndex];
        // Add unique
        dates.forEach(d => {
            if (!period.dates.includes(d)) period.dates.push(d);
        });
        period.dates.sort();
        this.save();
    },

    // Bookings
    addBooking(booking) {
        // booking: { roomId, roomName, quantity?? No, creating multiple bookings handled in View }
        const newBooking = {
            ...booking,
            id: 'b' + Date.now() + Math.floor(Math.random() * 100),
            createdAt: this.getLocalDateISOString(), // Use local time
            status: booking.status || 'confirmed', // Respect passed status or default
            paid: 0,
            requiredDeposit: booking.requiredDeposit || 0,
            payments: [],
            guest: booking.guest || {}
        };

        // Auto assign logic? Keep it simple for now, allow Manual or Auto in FrontDesk
        // If we want auto assign immediately:
        // if (!newBooking.roomNumber) { const num = this.autoAssignRoom(newBooking); if(num) newBooking.roomNumber = num; }

        this.bookings.push(newBooking);
        this.save();
        return newBooking;
    },
    updateBooking(updatedBooking) {
        const idx = this.bookings.findIndex(b => b.id === updatedBooking.id);
        if (idx !== -1) {
            this.bookings[idx] = updatedBooking;
            this.save();
        }
    },
    deleteBooking(id) {
        this.bookings = this.bookings.filter(b => b.id !== id);
        this.save();
    },

    // Payments
    addPayment(bookingId, amount, method, type, date = null) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const payment = {
            id: 'pay' + Date.now(),
            bookingId,
            amount: parseInt(amount),
            method,
            type,
            date: date || new Date().toISOString()
        };

        this.payments.push(payment);

        booking.paid = (booking.paid || 0) + payment.amount;
        if (!booking.payments) booking.payments = [];
        booking.payments.push(payment);

        this.updateBooking(booking);
        this.updateBooking(booking);
        localStorage.setItem('pms_payments', JSON.stringify(this.payments));
    },

    // Payment Methods Management
    addPaymentMethod(name) {
        this.paymentMethods.push({ id: 'pm' + Date.now(), name });
        this.savePaymentMethods();
    },
    deletePaymentMethod(id) {
        this.paymentMethods = this.paymentMethods.filter(pm => pm.id !== id);
        this.savePaymentMethods();
    },
    savePaymentMethods() {
        localStorage.setItem('pms_pay_methods', JSON.stringify(this.paymentMethods));
    },

    // Helpers


    getAvailableRooms(startDate, endDate, roomTypeId) {
        // Find bookings that overlap
        const occupied = this.bookings.filter(b =>
            b.status !== 'cancelled' && b.status !== 'checked-out' &&
            b.roomNumber && // Only count assigned rooms? Or unassigned too?
            // If unassigned, we don't know which physical room it takes, but it consumes quota.
            // Simplified: Available Physical Rooms
            (startDate < b.checkOut && endDate > b.checkIn)
        ).map(b => b.roomNumber);

        const allOfThisType = this.rooms.find(r => r.id === roomTypeId).roomNumbers;
        return allOfThisType.filter(num => !occupied.includes(num));
    },

    // Get all physical rooms flat list (helper)
    // Get Unassigned Bookings for a specific date (or today)
    getUnassignedBookings(dateStr) {
        if (!dateStr) dateStr = this.getLocalTodayStr();
        return this.bookings.filter(b => {
            // Only active bookings
            if (b.status === 'cancelled' || b.status === 'checked-out') return false;
            // Unassigned
            if (b.roomNumber) return false;
            // Overlaps with date (Booking covers this date)
            // Logic: checkIn <= date < checkOut
            // e.g. Book 12-26 to 12-27. Date 12-26. 12-26 <= 12-26 < 12-27. True.
            // e.g. Book 12-26 to 12-27. Date 12-27. 12-26 <= 12-27 < 12-27. False. (Checkout day doesn't count)
            return b.checkIn <= dateStr && dateStr < b.checkOut;
        });
    },

    getPhysicalRooms() {
        if (!this.rooms) return [];
        let allRooms = [];
        this.rooms.forEach(type => {
            if (type.roomNumbers) {
                type.roomNumbers.forEach(num => {
                    allRooms.push({
                        number: num,
                        typeId: type.id,
                        typeName: type.name,
                        capacity: type.capacity,
                        price: type.price
                    });
                });
            }
        });
        return allRooms;
    },

    getDateType(dateStr) {
        if (this.dateSettings.specialPeriods) {
            for (const sp of this.dateSettings.specialPeriods) {
                if (sp.dates.includes(dateStr)) return sp.id;
            }
        }
        const day = new Date(dateStr).getDay();
        if (this.dateSettings.weekendDays.includes(day)) return 'weekend';
        return 'weekday';
    },

    init() {
        // Try to load from Server first (Async)
        this.loadFromServer();

        // Fallback or Initial Load from LocalStorage (Sync)
        this.loadFromLocalStorage();

        // Ensure defaults if nothing loaded
        if (this.rooms.length === 0) this.initRooms();
        if (this.projects.length === 0) this.initProjects();
        if (this.dateSettings.weekendDays.length === 0 && this.dateSettings.specialPeriods.length === 0) this.initDateSettings();
        if (this.paymentMethods.length === 0) this.initPaymentMethods();

        // Ensure defaults are saved if we just initialized them
        this.save();
    },

    loadFromLocalStorage() {
        if (localStorage.getItem('pms_rooms')) this.rooms = JSON.parse(localStorage.getItem('pms_rooms'));
        if (localStorage.getItem('pms_projects')) this.projects = JSON.parse(localStorage.getItem('pms_projects'));
        if (localStorage.getItem('pms_bookings')) this.bookings = JSON.parse(localStorage.getItem('pms_bookings'));
        if (localStorage.getItem('pms_dates')) this.dateSettings = JSON.parse(localStorage.getItem('pms_dates'));
        if (localStorage.getItem('pms_payments')) this.payments = JSON.parse(localStorage.getItem('pms_payments'));
        if (localStorage.getItem('pms_pay_methods')) this.paymentMethods = JSON.parse(localStorage.getItem('pms_pay_methods'));
    },

    async loadFromServer() {
        try {
            const res = await fetch('/api/db?t=' + Date.now(), { headers: { 'Cache-Control': 'no-cache' } });
            if (res.ok) {
                const data = await res.json();
                if (data && Object.keys(data).length > 0) {
                    console.log('Loaded data from Server', data);
                    if (data.rooms) this.rooms = data.rooms;
                    if (data.projects) this.projects = data.projects;
                    if (data.bookings) this.bookings = data.bookings;
                    if (data.dateSettings) this.dateSettings = data.dateSettings;
                    if (data.payments) this.payments = data.payments;
                    if (data.paymentMethods) this.paymentMethods = data.paymentMethods;
                    if (data.roomStatuses) this.roomStatuses = data.roomStatuses;

                    // Sync back to local to keep them in sync
                    this.saveToLocalStorage();

                    // Refresh View if app is already running
                    // A crude way to refresh: dispatch event or reload?
                    // Better to just let the user see it on next click, or reload page.
                    // But init() runs on page load. So it should differ.
                    // Since fetch is async, it might overwrite initial local data AFTER render.
                    // We should trigger a re-render.
                    window.dispatchEvent(new Event('data-loaded'));
                }
            }
        } catch (e) {
            console.log('Server mode not available or offline', e);
        }
    },

    save() {
        this.saveToLocalStorage();
        return this.saveToServer();
    },

    saveToLocalStorage() {
        localStorage.setItem('pms_rooms', JSON.stringify(this.rooms));
        localStorage.setItem('pms_projects', JSON.stringify(this.projects));
        localStorage.setItem('pms_bookings', JSON.stringify(this.bookings));
        localStorage.setItem('pms_dates', JSON.stringify(this.dateSettings));
        localStorage.setItem('pms_payments', JSON.stringify(this.payments));
        localStorage.setItem('pms_pay_methods', JSON.stringify(this.paymentMethods));
        localStorage.setItem('pms_room_statuses', JSON.stringify(this.roomStatuses));
    },

    async saveToServer() {
        try {
            const data = {
                rooms: this.rooms,
                projects: this.projects,
                bookings: this.bookings,
                dateSettings: this.dateSettings,
                payments: this.payments,
                paymentMethods: this.paymentMethods,
                roomStatuses: this.roomStatuses
            };
            const res = await fetch('/api/db?t=' + Date.now(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Server returned ' + res.status);
        } catch (e) {
            console.error('Save failed:', e);
            alert('⚠️ 資料儲存失敗！請檢查伺服器連線。\n錯誤: ' + e.message);
            throw e; // Propagate error
        }
    },

    // Default initializers
    initRooms() {
        this.rooms = [
            {
                id: 'r1',
                name: '標準單人房',
                capacity: 1,
                price: 1000,
                roomNumbers: ['101', '102']
            },
            {
                id: 'r2',
                name: '標準雙人房',
                capacity: 2,
                price: 2000,
                roomNumbers: ['201', '202', '203']
            },
            {
                id: 'r3',
                name: '豪華家庭房',
                capacity: 4,
                price: 3500,
                roomNumbers: ['301']
            }
        ];
    },
    initProjects() {
        this.projects = [
            {
                id: 'p1',
                name: '一般訂房',
                description: '標準價格',
                roomPricing: {
                    'r1': { weekday: 2000, weekend: 2500 },
                    'r2': { weekday: 3500, weekend: 4000 },
                    'r3': { weekday: 4800, weekend: 5500 }
                }
            },
            {
                id: 'p_latebird',
                name: '晚鳥晚睡專案',
                description: '20:00 後入住享優惠',
                roomPricing: {
                    'r1': { weekday: 1600, weekend: 2000 },
                    'r2': { weekday: 3000, weekend: 3600 },
                    'r3': { weekday: 4200, weekend: 5000 }
                },
                applicableDateTypes: ['weekday', 'weekend'],
                applicableRooms: ['r1', 'r2', 'r3']
            }
        ];
    },
    initDateSettings() {
        this.dateSettings = {
            weekendDays: [5, 6],
            specialPeriods: [
                { id: 'sp1', name: '跨年', dates: ['2025-12-31', '2026-01-01'] },
                { id: 'sp2', name: '春節', dates: ['2026-02-17', '2026-02-18'] },
                { id: 'sp_long_weekend', name: '連續假日', dates: ['2026-02-28', '2026-03-01', '2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06'] }
            ]
        };
    },
    initPaymentMethods() {
        this.paymentMethods = [
            { id: 'cash', name: '現金' },
            { id: 'card', name: '信用卡' },
            { id: 'transfer', name: '轉帳' }
        ];
    },

    getLocalTodayStr() {
        return this.getLocalDateISOString().slice(0, 10);
    },

    getLocalDateISOString() {
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        return new Date(today.getTime() - offset).toISOString();
    },

    resetData() {
        this.bookings = [];
        this.payments = [];
        this.save();
        // Also clear dirty keys
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('dirty_')) localStorage.removeItem(k);
        });
        window.location.reload();
    },

    async checkoutBooking(booking) {
        booking.status = 'checked-out';

        // Manual update to avoid double save if we just used updateBooking()
        const idx = this.bookings.findIndex(b => b.id === booking.id);
        if (idx !== -1) {
            this.bookings[idx] = booking;
        }

        if (!this.roomStatuses) this.roomStatuses = {};
        if (booking.roomNumber) this.roomStatuses[booking.roomNumber] = 'dirty';

        await this.save();
    },

    checkoutAllActive() {
        let count = 0;
        console.log('Starting checkoutAllActive');
        this.bookings.forEach(b => {
            // More permissive check (trim strings)
            if (b.status === 'checked-in' || b.status.trim() === 'checked-in') {
                b.status = 'checked-out';
                if (!this.roomStatuses) this.roomStatuses = {};
                this.roomStatuses[b.roomNumber] = 'dirty';
                count++;
            }
        });
        console.log(`Checked out ${count} bookings`);
        if (count >= 0) { // Always save to be safe
            this.save();
            return count;
        }
        return 0;
    },

    // Get Backup Data as String (for Modal)
    getBackupDataString() {
        const data = {
            rooms: this.rooms,
            projects: this.projects,
            bookings: this.bookings,
            dateSettings: this.dateSettings,
            payments: this.payments,
            paymentMethods: this.paymentMethods,
            roomStatuses: this.roomStatuses,
            timestamp: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    },

    // Data Backup (Legacy/Server Download) - Kept for reference but UI will use Modal now
    exportData() {
        // Use server-side download to avoid browser permission issues with Blobs
        // Ensure latest state is saved first
        this.save().then(() => {
            window.location.href = '/api/backup';
        });
    },

    async importData(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            if (data.rooms) this.rooms = data.rooms;
            if (data.projects) this.projects = data.projects;
            if (data.bookings) this.bookings = data.bookings;
            if (data.dateSettings) this.dateSettings = data.dateSettings;
            if (data.payments) this.payments = data.payments;
            if (data.paymentMethods) this.paymentMethods = data.paymentMethods;
            if (data.roomStatuses) this.roomStatuses = data.roomStatuses;

            await this.save();

            localStorage.setItem('pms_pay_methods', JSON.stringify(this.paymentMethods));
            localStorage.setItem('pms_payments', JSON.stringify(this.payments));
            localStorage.setItem('pms_room_statuses', JSON.stringify(this.roomStatuses));

            alert('資料匯入成功！系統將自動重新整理。');
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('匯入失敗：檔案格式錯誤');
        }
    }
};

window.store = store;
