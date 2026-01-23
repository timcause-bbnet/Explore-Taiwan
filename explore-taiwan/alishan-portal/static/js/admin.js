document.addEventListener('DOMContentLoaded', () => {
    // Basic Init
    setupTitles();
    switchTab('operators');
    loadHeroSettings();

    // Bindings
    document.getElementById('editForm').addEventListener('submit', handleSave);
    document.getElementById('deleteBtn').addEventListener('click', handleDelete);
    document.getElementById('heroForm').addEventListener('submit', handleHeroSave);
});

let currentDataType = 'operators'; // operators, attractions, delicacies
let currentData = [];

// Helper: Get params
function getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        region: urlParams.get('region'),
        title: urlParams.get('title')
    };
}

function setupTitles() {
    const { title } = getQueryParams();
    if (title) {
        document.querySelector('.logo').innerText = title + ' 管理系統';
        document.title = title + ' 管理後台';
    }
}

window.switchTab = function (tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.onclick.toString().includes(tabName));
    });

    // Hide all panels first
    document.getElementById('operatorsPanel').style.display = 'none';
    document.getElementById('attractionsPanel').style.display = 'none';
    document.getElementById('delicaciesPanel').style.display = 'none';
    document.getElementById('settingsPanel').style.display = 'none';
    document.getElementById('operatorEditPanel').style.display = 'none';

    if (tabName === 'settings') {
        document.getElementById('settingsPanel').style.display = 'block';
        loadHeroSettings();
        return;
    }

    // Show List Panel
    currentDataType = tabName;
    document.getElementById(tabName + 'Panel').style.display = 'flex';

    // Show Edit Panel
    document.getElementById('operatorEditPanel').style.display = 'block';

    loadList(tabName);
}

async function loadList(type) {
    try {
        const { region } = getQueryParams();
        let url = `/api/${type}`;
        if (region) url += `?region=${region}`;

        const res = await fetch(url);
        const data = await res.json();
        currentData = data;
        renderList(data, type);
    } catch (e) {
        console.error(e);
        // alert('無法讀取資料'); // Suppress alert for cleaner UX
    }
}

function renderList(data, type) {
    let listId = 'operatorList';
    if (type === 'attractions') listId = 'attractionList';
    if (type === 'delicacies') listId = 'delicacyList';

    const listEl = document.getElementById(listId);
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!data || data.length === 0) listEl.innerHTML = '<div style="padding:20px; color:#888;">暫無資料</div>';

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-item';

        // Image
        let displayImg = 'https://via.placeholder.com/50';
        if (Array.isArray(item.images) && item.images.length > 0) displayImg = item.images[0];
        else if (item.image) displayImg = item.image;

        // Badge
        let badge = '';
        if (type === 'operators' && item.category) badge = `<small style="background:#eee; padding:2px 5px; margin-left:5px;">${item.category}</small>`;
        if (type === 'delicacies' && item.price) badge = `<small style="background:#fff3cd; padding:2px 5px; margin-left:5px;">${item.price}</small>`;

        div.innerHTML = `
            <img src="${displayImg}" onerror="this.src='https://via.placeholder.com/50'">
            <div class="list-item-info">
                <h4>${item.name} ${badge}</h4>
                <span>${item.location || ''}</span>
            </div>
        `;
        div.onclick = () => selectItem(item.id, div);
        listEl.appendChild(div);
    });
}

function selectItem(id, itemEl) {
    document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
    if (itemEl) itemEl.classList.add('active');

    const item = currentData.find(o => o.id === id);
    if (!item) return;

    showForm(true);
    document.getElementById('formTitle').innerText = '編輯';
    document.getElementById('deleteBtn').style.display = 'inline-block';

    const form = document.getElementById('editForm');
    form.reset();
    form.id.value = item.id;
    form.dataType.value = currentDataType;
    form.name.value = item.name;
    form.description.value = item.description || '';

    toggleFields(currentDataType);

    if (currentDataType === 'operators') {
        form.category.value = item.category || '民宿';
        form.tel.value = item.tel || '';
        form.link.value = item.link || '';
        form.tags.value = item.tags ? item.tags.join(', ') : '';
        form.location.value = item.location || '森林遊樂區';
        form.address.value = item.address || ''; // Make sure this line exists
    } else if (currentDataType === 'attractions') {
        form.location.value = item.location || '';
    } else if (currentDataType === 'delicacies') {
        form.price.value = item.price || '';
    }

    // Images
    const imgContainer = document.getElementById('existingImages');
    imgContainer.innerHTML = '';

    let currentImages = [];
    if (Array.isArray(item.images)) currentImages = item.images;
    else if (item.image) currentImages = [item.image];

    currentImages.forEach(imgUrl => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position: relative; display: inline-block;';
        wrap.innerHTML = `
            <img src="${imgUrl}" style="width: 100px; height: 75px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
            <label style="display: block; font-size: 0.8rem; margin-top: 2px;">
                <input type="checkbox" name="keep_images" value="${imgUrl}" checked> 保留
            </label>
        `;
        imgContainer.appendChild(wrap);
    });

    document.querySelectorAll('.file-input').forEach(input => input.value = '');
}

window.prepareNew = function (type) {
    currentDataType = type;
    document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
    showForm(true);
    document.getElementById('formTitle').innerText = '新增';
    document.getElementById('deleteBtn').style.display = 'none';

    const form = document.getElementById('editForm');
    form.reset();
    form.id.value = '';
    form.dataType.value = type;

    toggleFields(type);
    document.getElementById('existingImages').innerHTML = '<p style="color:#888; font-size:0.9rem;">目前沒有照片，請在下方上傳。</p>';
}

function toggleFields(type) {
    document.querySelectorAll('.form-group[data-for]').forEach(el => {
        const forTypes = el.getAttribute('data-for').split(',');
        if (forTypes.includes(type)) {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    });
}

function showForm(show) {
    document.getElementById('welcomeMessage').style.display = show ? 'none' : 'block';
    document.getElementById('editForm').style.display = show ? 'block' : 'none';
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function handleSave(e) {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    const originalText = btn.innerText;
    btn.innerText = '儲存中...';
    btn.disabled = true;

    const formData = new FormData(e.target);
    const type = formData.get('dataType') || currentDataType;
    const data = {};

    data.id = formData.get('id');
    data.name = formData.get('name');
    data.description = formData.get('description');
    data.location = formData.get('location');

    if (type === 'operators') {
        data.category = formData.get('category');
        data.tel = formData.get('tel');
        data.link = formData.get('link');
        const tagStr = formData.get('tags');
        data.tags = tagStr ? tagStr.split(/[,，]/).map(t => t.trim()).filter(t => t.length > 0) : [];
        data.address = formData.get('address');
    } else if (type === 'attractions') {
    } else if (type === 'delicacies') {
        data.price = formData.get('price');
    }

    data.images = formData.getAll('keep_images');

    const formFileInputs = document.getElementById('editForm').querySelectorAll('.file-input');
    const files = [];
    formFileInputs.forEach(input => {
        if (input.files[0]) files.push(input.files[0]);
    });

    try {
        if (files.length > 0) {
            const encodedFiles = await Promise.all(files.map(toBase64));
            data.uploaded_images = encodedFiles;
        }

        const isNew = !data.id;
        const method = isNew ? 'POST' : 'PUT';

        const { region } = getQueryParams();
        let url = `/api/${type}`;
        if (region) url += `?region=${region}`;

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            // Reload list from server, which now contains the saved address.
            // THEN, update the form to reflect the new state?
            // Actually, for better UX for THIS user, let's keep the user on the item.
            // But usually reloadList refreshes "currentData".
            await loadList(type);

            // Re-select the item to refresh the form (so if user saves again, address isn't lost)
            if (!isNew && data.id) {
                // Find item in new Data
                const newItem = currentData.find(x => String(x.id) === String(data.id));
                // We need to find the DOM element to highlight it? 
                // For now just manually updating form logic or just rely on re-clicking.
                // Let's at least update currentData so if they click again it works.
            }

            alert('儲存成功！');
            if (isNew) prepareNew(type);
        } else {
            alert('儲存失敗');
        }
    } catch (e) {
        console.error(e);
        alert('發生錯誤: ' + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function handleDelete() {
    const id = document.querySelector('[name=id]').value;
    const type = document.querySelector('[name=dataType]').value || currentDataType;

    if (!id) return;
    if (!confirm('確定要刪除這筆資料嗎？')) return;

    try {
        const { region } = getQueryParams();
        let url = `/api/${type}?id=${id}`;
        if (region) url += `&region=${region}`;

        const res = await fetch(url, { method: 'DELETE' });
        if (res.ok) {
            await loadList(type);
            showForm(false);
            alert('刪除成功');
        } else {
            alert('刪除失敗');
        }
    } catch (e) {
        console.error(e);
        alert('發生錯誤');
    }
}

async function loadHeroSettings() {
    try {
        const res = await fetch('/api/settings'); // Global settings, maybe region specific in future?
        const settings = await res.json();
        const images = settings.hero_images || [];

        const container = document.getElementById('heroImagesList');
        container.innerHTML = '';

        images.forEach(imgUrl => {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'position: relative; display: inline-block;';
            wrap.innerHTML = `
                <img src="${imgUrl}" style="width: 160px; height: 90px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
                <label style="display: block; font-size: 0.8rem; margin-top: 2px;">
                    <input type="checkbox" name="keep_hero_images" value="${imgUrl}" checked> 保留
                </label>
            `;
            container.appendChild(wrap);
        });

    } catch (e) {
        console.warn('Failed to load settings', e);
    }
}

async function handleHeroSave(e) {
    e.preventDefault();
    const btn = document.getElementById('heroSaveBtn');
    const originalText = btn.innerText;
    btn.innerText = '上傳中...';
    btn.disabled = true;

    try {
        const formData = new FormData(e.target);
        const keptImages = formData.getAll('keep_hero_images');
        const fileInputs = document.querySelectorAll('.hero-file-input');
        const files = [];
        fileInputs.forEach(input => {
            if (input.files[0]) files.push(input.files[0]);
        });

        let newSettings = {
            hero_images: keptImages
        };

        if (files.length > 0) {
            const encodedFiles = await Promise.all(files.map(toBase64));
            newSettings.uploaded_hero_images = encodedFiles;
        }

        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });

        if (res.ok) {
            alert('首頁設定更新成功！');
            loadHeroSettings();
        } else {
            alert('更新失敗');
        }

    } catch (e) {
        console.error(e);
        alert('發生錯誤');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// IMPORT CSV FUNCTIONALITY
window.prepareImport = function (type) {
    // Inject Modal if not exists
    if (!document.getElementById('importModal')) {
        const modalHtml = `
            <div id="importModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; align-items:center; justify-content:center;">
                <div style="background:white; padding:30px; border-radius:12px; width:500px; max-width:90%; position:relative;">
                    <button onclick="closeImportModal()" style="position:absolute; right:15px; top:15px; border:none; background:none; font-size:1.2rem; cursor:pointer;">&times;</button>
                    <h2 style="margin-top:0; color:var(--primary);"><i class="fas fa-file-csv"></i> 匯入 CSV 資料</h2>
                    <p style="color:#666; font-size:0.9rem; line-height:1.5;">
                        請上傳符合格式的 CSV 檔案。第一列必須包含欄位名稱。<br>
                        支援欄位: name, category, location, address, tel, link, description, tags
                    </p>
                    
                    <textarea id="csvPreview" placeholder="CSV 內容預覽..." style="width:100%; height:100px; margin-bottom:15px; display:none;"></textarea>

                    <div style="background:#f9f9f9; padding:20px; text-align:center; border:2px dashed #ddd; border-radius:8px; margin-bottom:20px;">
                        <input type="file" id="importFile" accept=".csv" style="display:none;" onchange="previewCsv()">
                        <label for="importFile" style="cursor:pointer; display:block;">
                            <i class="fas fa-cloud-upload-alt" style="font-size:2rem; color:#ccc; margin-bottom:10px;"></i><br>
                            <span style="color:var(--primary); font-weight:bold;">點擊選擇 CSV 檔案</span>
                        </label>
                        <div id="fileName" style="margin-top:10px; font-size:0.9rem; color:#333;"></div>
                    </div>

                    <div style="text-align:right;">
                        <button onclick="closeImportModal()" style="padding:10px 20px; border:none; background:#eee; cursor:pointer; border-radius:6px; margin-right:10px;">取消</button>
                        <button onclick="handleImport()" id="doImportBtn" style="padding:10px 20px; border:none; background:var(--primary); color:white; cursor:pointer; border-radius:6px;" disabled>開始匯入</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    document.getElementById('importModal').style.display = 'flex';
    document.getElementById('doImportBtn').dataset.type = type; // Store type
}

window.closeImportModal = function () {
    document.getElementById('importModal').style.display = 'none';
    document.getElementById('importFile').value = '';
    document.getElementById('fileName').innerText = '';
    document.getElementById('doImportBtn').disabled = true;
}

window.previewCsv = function () {
    const file = document.getElementById('importFile').files[0];
    if (file) {
        document.getElementById('fileName').innerText = file.name;
        document.getElementById('doImportBtn').disabled = false;

        // Optional: Read first few lines for preview?
        const reader = new FileReader();
        reader.onload = function (e) {
            // console.log(e.target.result.substring(0, 200));
        };
        reader.readAsText(file);
    }
}

window.handleImport = async function () {
    const btn = document.getElementById('doImportBtn');
    const type = btn.dataset.type || currentDataType;
    const file = document.getElementById('importFile').files[0];

    if (!file) return;

    btn.innerText = '匯入中...';
    btn.disabled = true;

    try {
        const text = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });

        const { region } = getQueryParams();

        const payload = {
            csv_content: text,
            type: type,
            region: region
        };

        const res = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const respData = await res.json();

        if (res.ok) {
            alert(`匯入成功！共新增 ${respData.added || 0} 筆資料。`);
            closeImportModal();
            loadList(type);
        } else {
            alert('匯入失敗: ' + (respData.error || 'Unknown error'));
        }

    } catch (e) {
        alert('錯誤: ' + e);
        console.error(e);
    } finally {
        btn.innerText = '開始匯入';
        btn.disabled = false;
    }
}
