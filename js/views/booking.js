import { store } from '../store.js';

export function renderBooking(container) {
    // Parse URL Params
    const hash = window.location.hash; // #/booking?roomNumber=101&typeId=r1
    let preRoomNumber = null;
    let preTypeId = null;

    if (hash.includes('?')) {
        const query = hash.split('?')[1];
        const params = new URLSearchParams(query);
        preRoomNumber = params.get('roomNumber');
        preTypeId = params.get('typeId');
    }

    // Determine Mode
    const isWalkIn = !!preRoomNumber;

    container.innerHTML = `
        <div class="booking-container" style="max-width: 900px; margin: 0 auto; padding-bottom: 5rem;">
            
            <!-- Step 1: Config -->
            <div class="card header-card" style="position: sticky; top: 0; z-index: 10; margin-bottom: 2rem; background: var(--bg-card); padding: 1.5rem; border-bottom: 1px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                     ${isWalkIn ?
            `<h2 style="color: var(--primary); margin:0;">現場入住 (Walk-In)</h2>` :
            `<h2 style="color: var(--text-primary); margin:0;">新增預約</h2>`
        }
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 120px 100px; gap: 1rem; align-items: end;">
                    <div>
                        <label class="form-label">入住日期</label>
                        <input type="date" id="check-in" class="form-input">
                        <div id="check-in-holiday" style="font-size: 0.8rem; color: var(--accent); height: 1.2em;"></div>
                    </div>
                    <div>
                        <label class="form-label">退房日期</label>
                        <input type="date" id="check-out" class="form-input">
                        <div id="check-out-holiday" style="font-size: 0.8rem; color: var(--accent); height: 1.2em;"></div>
                    </div>
                    <div>
                        <label class="form-label">間數</label>
                        <input type="number" id="room-quantity" class="form-input" value="1" min="1" max="10" ${preRoomNumber ? 'disabled' : ''}>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">總天數</div>
                        <div id="total-days" style="font-size: 1.2rem; font-weight: bold; color: var(--primary);">1 晚</div>
                    </div>
                </div>
                ${preRoomNumber ? `<div style="margin-top:0.5rem; color:var(--primary); font-weight:600;">指定房號: ${preRoomNumber}</div>` : ''}
            </div>

            <!-- Step 2: Room Selection -->
            <div id="step-rooms">
                <h3 style="margin-bottom: 1.5rem;">選擇房型與專案</h3>
                 <!-- Room Type Filter -->
                <div id="booking-room-filter" style="display: flex; gap: 0.8rem; margin-bottom: 2rem; flex-wrap: wrap;">
                    <!-- Pills will be injected here -->
                </div>
                <div id="room-list-container" style="display: grid; gap: 1.5rem;">
                    <!-- Room Cards will go here -->
                </div>
            </div>

            <!-- Step 3: Guest & Payment -->
            <div id="step-guest" style="display: none; margin-top: 3rem; border-top: 1px solid var(--border); padding-top: 2rem;">
                <h3 style="margin-bottom: 1.5rem;">房客資料與結帳</h3>
                <div class="card" style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
                    <div id="selected-summary" style="background: #e3f2fd; padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 2rem; color: var(--text-primary); border: 1px solid #bbdefb;"></div>

                    <form id="guest-form">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                            <div class="form-group">
                                <label class="form-label">姓名 <span style="color:red">*</span></label>
                                <input type="text" name="name" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">電話 <span style="color:red">*</span></label>
                                <input type="tel" name="phone" class="form-input" required>
                            </div>
                        </div>
                         <div class="form-group">
                            <label class="form-label">Email (選填)</label>
                            <input type="email" name="email" class="form-input">
                        </div>

                         <div style="margin: 2rem 0; padding: 1.5rem; background: #f0f9ff; border-radius: var(--radius-sm); border: 1px solid var(--primary);">
                            <h4 style="margin-bottom: 1rem; color: var(--primary);">${isWalkIn ? '付款資訊 (全額結帳)' : '價格與訂金設定'}</h4>
                            
                            ${isWalkIn ? `
                            <div id="payment-list" style="margin-bottom: 1rem;">
                                <!-- Dynamic Payment Rows -->
                            </div>
                            
                            <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; background: white; padding: 1rem; border-radius: var(--radius-sm); border: 1px dashed var(--border);">
                                <select id="pay-method-new" class="form-input" style="width: 120px;">
                                    ${store.paymentMethods.map(pm => `<option value="${pm.id}">${pm.name}</option>`).join('')}
                                </select>
                                <input type="number" id="pay-amount-new" class="form-input" placeholder="金額" style="width: 120px;">
                                <button type="button" id="btn-add-pay" class="btn btn-sm" style="background: var(--bg-card-hover); border: 1px solid var(--border);">+ 加入</button>
                            </div>
                            ` : ''}

                            <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: bold; border-top: 1px solid var(--border); padding-top: 1rem;">
                            <!-- Final Price / Discount Section -->
                            <div style="background: var(--bg-card-hover); padding: 1rem; border-radius: var(--radius-sm); margin: 1rem 0;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                                    <span>原始總價:</span>
                                    <span id="txt-original-price">$0</span>
                                </div>
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                                    <label style="font-size: 0.9rem;">折扣/改價:</label>
                                    <select id="discount-select" class="form-input" style="width: 120px; padding: 2px 5px;">
                                        <option value="none">無折扣</option>
                                        <option value="0.95">95 折</option>
                                        <option value="0.9">9 折</option>
                                        <option value="0.8">8 折</option>
                                        <option value="custom">自訂金額</option>
                                    </select>
                                </div>
                                <div style="display: flex; align-items: center; justify-content: space-between; font-weight: bold; color: var(--primary);">
                                    <label>最終房價:</label>
                                    <input type="number" id="final-price-input" class="form-input" style="width: 100px; text-align: right; font-weight: bold; color: var(--primary);" value="0">
                                </div>
                            </div>
                            
                            <!-- Deposit Setting (Reservation Only) -->
                            ${!isWalkIn ? `
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem; font-size: 0.9rem;">
                                    <label>訂金比例 (%):</label>
                                    <input type="number" id="deposit-rate" class="form-input" value="30" style="width: 60px; padding: 2px 5px; text-align: right;">
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 0.2rem; font-size: 0.9rem; color: var(--warning);">
                                     <span>需付訂金:</span>
                                     <span id="txt-required-deposit">$0</span>
                                </div>
                            ` : ''}

                            <!-- Payment Info (Walk-in Only) -->
                             ${isWalkIn ? `
                            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-top: 1rem; border-top: 1px dotted var(--border); padding-top: 0.5rem;">
                                <span>已支付總額:</span>
                                <span id="txt-paid-total" style="color: var(--success);">$0</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--danger); margin-top: 0.5rem;" id="txt-remaining-container">
                                <span>尚需支付:</span>
                                <span id="txt-remaining">$0</span>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Invoice Section -->
                        <!-- Invoice Section -->
                        <!-- Invoice Section (Walk-In Only) -->
                         ${isWalkIn ? `
                         <div class="form-group" style="padding-top: 1rem; border-top: 1px dashed var(--border);">
                            <h4 style="margin-bottom: 1rem; color: var(--text-primary);">發票資訊</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                                <select name="invoiceType" class="form-input">
                                    <option value="personal">個人二聯</option>
                                    <option value="business">公司三聯</option>
                                    <option value="einvoice">電子發票</option>
                                </select>
                                <select name="carrierType" class="form-input">
                                    <option value="none">無 (紙本)</option>
                                    <option value="mobile">手機條碼</option>
                                    <option value="citizen">自然人憑證</option>
                                    <option value="member">會員載具</option>
                                </select>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                                <input type="text" name="invoiceTaxId" class="form-input" placeholder="統一編號 (三聯式必填)">
                                <input type="text" name="invoiceCarrierId" class="form-input" placeholder="載具編號 (如: /ABC-123)">
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                 <input type="text" name="invoiceTitle" class="form-input" placeholder="發票抬頭">
                                 <input type="email" name="invoiceEmail" class="form-input" placeholder="電子發票 Email">
                            </div>
                        </div>
                        ` : ''}

                        <div class="form-group" style="margin-top: 1rem;">
                            <label class="form-label">特殊需求備註 (前台關注)</label>
                            <textarea name="specialNote" class="form-input" rows="2" placeholder="例: 慶生、高樓層、需嬰兒澡盆..."></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">房務備註 (清潔關注)</label>
                            <textarea name="housekeepingNote" class="form-input" rows="2" placeholder="例: 加床、加枕頭、不需更換備品..."></textarea>
                        </div>
                        
                        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                            <button type="button" id="btn-back" class="btn" style="background: var(--bg-card-hover); color: var(--text-primary);">重新選擇</button>
                            <button type="submit" class="btn btn-primary" style="flex: 1;">${isWalkIn ? '確認入住並結帳' : '確認預定'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // State
    let state = {
        checkIn: store.getLocalTodayStr(),
        checkOut: new Date(new Date(store.getLocalTodayStr()).getTime() + 86400000).toISOString().slice(0, 10),
        quantity: 1,
        selection: null,
        payments: [], // For Split Payment
        depositRate: 0.3, // Default 30%
        filterType: 'all' // New: Room filter
    };

    // Refs
    const checkInInput = container.querySelector('#check-in');
    const checkOutInput = container.querySelector('#check-out');
    const quantityInput = container.querySelector('#room-quantity');
    const totalDaysEl = container.querySelector('#total-days');
    const roomContainer = container.querySelector('#room-list-container');
    const stepRooms = container.querySelector('#step-rooms');
    const stepGuest = container.querySelector('#step-guest');
    const summaryEl = container.querySelector('#selected-summary');
    const guestForm = container.querySelector('#guest-form');
    const btnBack = container.querySelector('#btn-back');

    // Force Qty to 1 for Grid Walk-in
    if (preRoomNumber) {
        quantityInput.value = 1;
        state.quantity = 1;
        // Disabled in HTML already
    }
    const checkInHoliday = container.querySelector('#check-in-holiday');
    const checkOutHoliday = container.querySelector('#check-out-holiday');

    // Init Values
    checkInInput.value = state.checkIn;
    checkOutInput.value = state.checkOut;

    // Helper: Pricing logic for new Project fields
    function calculatePrice(roomId, project, dates) {
        if (!project.roomPricing || !project.roomPricing[roomId]) return null;
        let total = 0;
        const prices = project.roomPricing[roomId];

        // Apply Room Scope Check
        // If project.applyRoomIds exists and doesn't include roomId, return null
        if (project.applyRoomIds && !project.applyRoomIds.includes(roomId)) return null;

        dates.forEach(date => {
            const dateType = store.getDateType(date); // 'weekday', 'weekend', 'sp1'...
            let dailyPrice = 0;

            // Check if price defined for this dateType
            if (prices[dateType] !== undefined) {
                dailyPrice = prices[dateType];
            } else {
                // Fallback to room standard price if project doesn't define it?
                // Or fallback to weekday/weekend logic if not sp?
                const originalRoom = store.rooms.find(r => r.id === roomId);
                // Simple Fallback:
                if (dateType === 'weekend') dailyPrice = originalRoom.price + 500; // rough default
                else dailyPrice = originalRoom.price;
            }
            total += dailyPrice;
        });

        // Return Total Price for ALL rooms (unit price * qty)
        return total * state.quantity;
    }

    // Helper: Check Availability
    function getRoomAvailability(roomId, checkIn, checkOut) {
        // Find total physical rooms for this type
        const totalRooms = store.rooms.find(r => r.id === roomId).roomNumbers.length;

        // Find bookings that overlap with this range for this room TYPE
        // Overlap: (StartA <= EndB) and (EndA >= StartB)
        // CheckIn is inclusive, CheckOut is exclusive usually? 
        // Our system uses checkOut as the day they leave. 
        // So a booking on 2025-01-01 to 2025-01-02 occupies the night of 2025-01-01.
        // A requested range 2025-01-01 to 2025-01-02 overlaps.

        // More precise: booking [in, out) vs request [in, out)
        // Overlap if (req.checkIn < booking.checkOut) && (req.checkOut > booking.checkIn)

        const typeBookings = store.bookings.filter(b =>
            b.roomId === roomId &&
            b.status !== 'cancelled' &&
            b.status !== 'checked-out' // Checked-out rooms are free? 
            // Wait, past bookings are irrelevant. Future bookings matter.
            // If status is 'checked-out', they are gone. Space is free.
            // If status is 'checked-in' or 'confirmed', space is taken.
        );

        // We need to find the max occupancy on any single night in the range
        // Because "Available" means "Available for the whole duration"
        // So availability = Total - Max(Occupied on any night of range)

        const dates = getDatesInRange(checkIn, checkOut); // [d1, d2...]
        let maxOccupied = 0;

        dates.forEach(date => {
            // Count bookings that cover this date
            // A booking covers 'date' if checkIn <= date < checkOut
            const occupiedCount = typeBookings.filter(b =>
                b.checkIn <= date && b.checkOut > date
            ).length;
            if (occupiedCount > maxOccupied) maxOccupied = occupiedCount;
        });

        return Math.max(0, totalRooms - maxOccupied);
    }

    function getDatesInRange(startDate, endDate) {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        let curr = new Date(start);
        while (curr < end) {
            dates.push(curr.toISOString().slice(0, 10));
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    }

    // Helper: Holiday
    function getHolidayName(dateStr) {
        for (const sp of store.dateSettings.specialPeriods) {
            if (sp.dates.includes(dateStr)) return sp.name;
        }
        const day = new Date(dateStr).getDay();
        if (store.dateSettings.weekendDays.includes(day)) return '假日';
        return '平日';
    }

    function paymentMethodName(val) {
        // Use store lookup first, then fallback
        const pm = store.paymentMethods.find(m => m.id === val);
        if (pm) return pm.name;
        // Legacy fallback
        const map = { cash: '現金', card: '信用卡', transfer: '轉帳', epay: '電子支付', voucher: '折價券' };
        return map[val] || val;
    }

    function updateView() {
        // ... same logic as before ...
        checkInHoliday.textContent = getHolidayName(state.checkIn);
        checkOutHoliday.textContent = getHolidayName(state.checkOut);

        const dates = getDatesInRange(state.checkIn, state.checkOut);
        const nights = dates.length;
        totalDaysEl.textContent = `${nights} 晚`;

        if (nights <= 0) {
            roomContainer.innerHTML = '<div style="padding: 2rem; text-align: center;">請選擇正確的日期範圍</div>';
            return;
        }

        roomContainer.innerHTML = '';

        // Render Filters
        const filterContainer = container.querySelector('#booking-room-filter');
        if (filterContainer) {
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
                btn.onclick = (e) => {
                    e.preventDefault(); // Prevent form submit
                    state.filterType = btn.dataset.type;
                    updateView(); // Rerender
                };
            });
        }

        let displayRooms = store.rooms;
        // Apply Filter
        if (state.filterType !== 'all') {
            displayRooms = displayRooms.filter(r => r.id === state.filterType);
        }
        // Force Pre-Booking Filter overlay
        if (preTypeId) displayRooms = displayRooms.filter(r => r.id === preTypeId);

        displayRooms.forEach(room => {
            // Check project applicability
            const validProjects = store.projects.filter(p => {
                // Check room scope
                if (p.applyRoomIds && !p.applyRoomIds.includes(room.id)) return false;
                // Check if valid pricing exists (safety)
                return p.roomPricing && p.roomPricing[room.id];
            });

            const available = getRoomAvailability(room.id, state.checkIn, state.checkOut);

            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = `background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.5rem; display: flex; gap: 2rem; align-items: start;`;

            const ratesHtml = validProjects.map(proj => {
                const price = calculatePrice(room.id, proj, dates);
                if (price === null) return '';

                return `
                     <div style="border: 1px solid var(--border); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 0.8rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;"
                         class="rate-option"
                         onmouseover="this.style.background='var(--bg-card-hover)'; this.style.borderColor='var(--primary)'"
                         onmouseout="this.style.background='transparent'; this.style.borderColor='var(--border)'">
                        <div>
                            <div style="font-weight: 600; color: var(--primary);">${proj.name}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">${proj.description || ''}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.2rem; font-weight: bold;">$${price}</div>
                             <div style="font-size: 0.8rem; color: var(--text-secondary);">${state.quantity} 間 x ${nights} 晚</div>
                            <button class="btn btn-primary btn-sm" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; margin-top: 0.5rem;" 
                                data-room="${room.id}" data-project="${proj.id}" data-price="${price}">
                                ${isWalkIn ? '排房入住' : '預定'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            card.innerHTML = `
                <div style="flex: 1;">
                    <h3 style="font-size: 1.4rem; margin-bottom: 0.5rem; color: var(--text-primary);">${room.name}</h3>
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                         <span>${room.capacity} 人房</span>
                         <span style="margin-left:auto; font-weight:bold; color: ${available < state.quantity ? 'var(--danger)' : 'var(--success)'}">
                            剩餘: ${available} 間
                         </span>
                    </div>
                </div>
                <div style="flex: 1.5;">
                    ${available < state.quantity ?
                    '<div style="color:var(--danger); padding:1rem; border:1px solid var(--danger); border-radius:var(--radius-sm); text-align:center;">庫存不足</div>' :
                    (ratesHtml.length ? ratesHtml : '<div style="color:var(--text-secondary);">無適用專案</div>')
                }
                </div>
            `;

            card.querySelectorAll('button').forEach(btn => {
                btn.onclick = () => selectBooking(
                    store.rooms.find(r => r.id === btn.dataset.room),
                    store.projects.find(p => p.id === btn.dataset.project),
                    parseInt(btn.dataset.price)
                );
            });
            roomContainer.appendChild(card);
        });
    }

    // Logic: Render details
    // Logic: Render details
    function renderPaymentList() {
        const payListEl = container.querySelector('#payment-list');
        const txtPaid = container.querySelector('#txt-paid-total');
        const txtRemaining = container.querySelector('#txt-remaining');
        const txtReqDeposit = container.querySelector('#txt-required-deposit');

        // New Price Els
        const txtOrigInfo = container.querySelector('#txt-original-price');
        const finalPriceInput = container.querySelector('#final-price-input');

        let originalPrice = state.selection ? state.selection.price : 0;
        let finalPrice = parseInt(finalPriceInput ? finalPriceInput.value : originalPrice);

        // Update Remaining/Deposit Calcs based on Final Price
        let totalPaid = state.payments.reduce((sum, p) => sum + p.amount, 0);
        let balance = finalPrice - totalPaid;

        if (payListEl) {
            payListEl.innerHTML = state.payments.map((p, idx) => `
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.3rem;">
                    <span>${getPaymentMethodName(p.method)}</span>
                    <span>$${p.amount} <span style="color: #aaa; cursor: pointer; margin-left: 0.5rem;" onclick="removePayment(${idx})">×</span></span>
                </div>
            `).join('');
        }

        if (txtPaid) txtPaid.textContent = `$${totalPaid}`;
        if (txtRemaining) {
            txtRemaining.textContent = `$${balance}`;
            if (balance <= 0) {
                txtRemaining.parentElement.style.color = 'var(--success)';
                txtRemaining.textContent = '已結清';
            } else {
                txtRemaining.parentElement.style.color = 'var(--danger)';
            }
        }

        if (txtReqDeposit) {
            const depInput = container.querySelector('#deposit-rate');
            const rate = depInput ? (parseInt(depInput.value) || 0) : 30;
            const req = Math.round(finalPrice * (rate / 100));
            txtReqDeposit.textContent = `$${req}`;
        }
    }

    // Attach removePayment globally (hack for innerHTML)
    window.removePayment = (idx) => {
        state.payments.splice(idx, 1);
        renderPaymentList();
    };

    // New Event Listeners for Price
    const discountSel = container.querySelector('#discount-select');
    const finalPriceIn = container.querySelector('#final-price-input');

    if (discountSel && finalPriceIn) {
        // Init logic when view loads (step 2)
        // But elements might be re-created? The `renderPaymentList` is called.
        // We need to initialize values somewhere.
        // `selectBooking` sets `state.selection`.
    }

    // Since `selectBooking` is where Price is first known, we hook there.
    // We need to override selectBooking to init the inputs.

    // Logic: Select Room
    function selectBooking(room, project, price) {
        state.selection = { room, project, price };
        stepRooms.style.display = 'none';
        stepGuest.style.display = 'block';

        summaryEl.innerHTML = `
            <div style="font-size:1.1rem; font-weight:bold; margin-bottom:0.5rem;">${room.name} - ${project.name}</div>
            <div style="display:flex; gap:2rem; font-size:0.95rem; color:var(--text-secondary);">
                <div>入住: ${state.checkIn}</div>
                <div>退房: ${state.checkOut}</div>
                <div>數量: ${state.quantity} 間</div>
            </div>
            ${preRoomNumber ? `<div style="text-align:right; font-size:0.9rem; color:var(--success);">指定房號: ${preRoomNumber}</div>` : ''}
        `;

        // Initialize Price Controls
        const txtOrig = container.querySelector('#txt-original-price');
        const finalIn = container.querySelector('#final-price-input');
        const discSel = container.querySelector('#discount-select');

        if (txtOrig) txtOrig.textContent = `$${price}`;
        if (finalIn) finalIn.value = price;
        if (discSel) {
            discSel.value = 'none';
            discSel.onchange = () => {
                const val = discSel.value;
                if (val === 'custom') {
                    // Do nothing, let user edit
                } else if (val === 'none') {
                    finalIn.value = price;
                } else {
                    const rate = parseFloat(val);
                    finalIn.value = Math.round(price * rate);
                }
                renderPaymentList(); // Recalc totals
            };
        }
        if (finalIn) {
            finalIn.oninput = () => {
                discSel.value = 'custom';
                renderPaymentList();
            };
        }

        renderPaymentList();
    }


    // Events
    checkInInput.onchange = (e) => { state.checkIn = e.target.value; updateView(); };
    checkOutInput.onchange = (e) => { state.checkOut = e.target.value; updateView(); };
    quantityInput.onchange = (e) => {
        state.quantity = parseInt(e.target.value) || 1;

        // If already selected, update price summary
        if (state.selection) {
            const dates = getDatesInRange(state.checkIn, state.checkOut);
            const newTotal = calculatePrice(state.selection.room.id, state.selection.project, dates);
            if (newTotal !== null) {
                // Re-run selection logic to update summary and price inputs
                selectBooking(state.selection.room, state.selection.project, newTotal);
            }
        }

        updateView();
    };

    btnBack.onclick = () => {
        stepRooms.style.display = 'block';
        stepGuest.style.display = 'none';
        state.selection = null;
        state.payments = [];
    };

    // Add Payment Button Logic (Universal now)
    const btnAddPay = container.querySelector('#btn-add-pay');
    if (btnAddPay) btnAddPay.onclick = () => {
        const amt = parseInt(container.querySelector('#pay-amount-new').value);
        const method = container.querySelector('#pay-method-new').value;
        if (amt > 0) {
            state.payments.push({ amount: amt, method: method, type: 'balance' });
            container.querySelector('#pay-amount-new').value = '';
            renderPaymentList();
        }
    };

    // Deposit Rate Change Listener
    // Note: Since renderPaymentList is called on selection, and elements are static in DOM (just hidden/shown stepGuest),
    // we can attach listener once? No, renderPaymentList reads value.
    // The input #deposit-rate is inside stepGuest, which is static.
    const depRateInput = container.querySelector('#deposit-rate');
    if (depRateInput) {
        depRateInput.onchange = () => renderPaymentList();
        depRateInput.oninput = () => renderPaymentList();
    }

    guestForm.onsubmit = async (e) => {
        e.preventDefault();
        const btnSubmit = guestForm.querySelector('button[type="submit"]');
        if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = '處理中...'; }

        const formData = new FormData(guestForm);

        // Get Final Price from View
        const finalIn = container.querySelector('#final-price-input');
        const finalTotal = parseInt(finalIn.value);
        const unitPrice = Math.round(finalTotal / state.quantity); // Distribute final price back to units

        // Check deposit input
        const depInput = container.querySelector('#deposit-rate');
        let reqDeposit = 0;
        if (depInput) {
            const rate = parseInt(depInput.value) || 0;
            reqDeposit = Math.round(unitPrice * (rate / 100)); // Per room required
        }

        // Deposits are now just payments typed 'deposit'? Or 'balance'?
        // The user asked for "Reservation Order Checkout" to use multi-payment.
        // Usually,reservation creation takes Deposit. "Check-in" takes Balance.
        // We are treating all initial payments here as 'balance' (paid).

        const invoiceData = {
            type: formData.get('invoiceType'),
            taxId: formData.get('invoiceTaxId'),
            title: formData.get('invoiceTitle')
        };

        for (let i = 0; i < state.quantity; i++) {
            const newBooking = store.addBooking({
                roomId: state.selection.room.id,
                roomName: state.selection.room.name,
                projectId: state.selection.project.id,
                projectName: state.selection.project.name,
                roomNumber: (i === 0 && preRoomNumber) ? preRoomNumber : null, // Only assign pre-selected room to the first booking
                checkIn: state.checkIn,
                checkOut: state.checkOut,
                totalPrice: unitPrice,
                requiredDeposit: reqDeposit,
                status: isWalkIn ? 'checked-in' : 'confirmed',
                guest: {
                    name: state.quantity > 1 ? `${formData.get('name')} (${i + 1})` : formData.get('name'),
                    phone: formData.get('phone'),
                    email: formData.get('email'),
                    specialNote: formData.get('specialNote'),
                    housekeepingNote: formData.get('housekeepingNote'),
                    note: formData.get('specialNote') + (formData.get('housekeepingNote') ? ' / ' + formData.get('housekeepingNote') : ''), // Fallback for old views
                    invoice: invoiceData
                }
            });

            // Distribute payments
            if (state.payments.length > 0) {
                state.payments.forEach(pay => {
                    store.addPayment(newBooking.id, pay.amount, pay.method, 'balance');
                });
            }
        }

        await store.save(); // Ensure all data is synced to server before navigating

        alert(isWalkIn ? '入住手續完成！' : `成功新增 ${state.quantity} 筆訂單!`);
        window.location.hash = '/frontdesk';
    };

    updateView();
}
