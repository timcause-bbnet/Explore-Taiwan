
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const regionName = params.get('name');

    if (regionName) {
        document.title = `${regionName} | 旅宿精選`;
        // Update Hero Title
        const heroTitle = document.querySelector('.hero-content h1');
        const heroSubtitle = document.querySelector('.hero-content p');
        if (heroTitle) heroTitle.innerText = `探索 ${regionName}`;
        if (heroSubtitle) heroSubtitle.innerText = `精選${regionName}頂級民宿、飯店與露營體驗`;
    }

    loadOperators(regionName);
    loadAttractions(regionName);
    loadDelicacies(regionName);
    loadHero(regionName); // Maybe load specific hero or generic
});

let glData = [];

// --- Attractions Logic ---
async function loadAttractions(region) {
    try {
        let url = '/api/attractions';
        if (region) url += `?region=${encodeURIComponent(region)}`;
        const res = await fetch(url);
        const data = await res.json();
        renderSimpleGrid(data, 'attractions-grid');
    } catch (e) {
        console.error("Failed to load attractions", e);
    }
}

// --- Delicacies Logic ---
async function loadDelicacies(region) {
    try {
        let url = '/api/delicacies';
        if (region) url += `?region=${encodeURIComponent(region)}`;
        const res = await fetch(url);
        const data = await res.json();
        renderSimpleGrid(data, 'delicacies-grid', true);
    } catch (e) {
        console.error("Failed to load delicacies", e);
    }
}

function renderSimpleGrid(items, containerId, isDelicacy = false) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';

    if (!items || items.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color:#888; width:100%;">暫無資料。</p>';
        return;
    }

    items.forEach(item => {
        let imgUrl = item.image;
        if (Array.isArray(item.images) && item.images.length > 0) imgUrl = item.images[0];
        if (!imgUrl) imgUrl = 'https://via.placeholder.com/400x300';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="height: 200px; overflow: hidden;">
                <img src="${imgUrl}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;">
            </div>
            <div class="card-content">
                <h2>${item.name}</h2>
                ${!isDelicacy ? `<div class="location"><i class="fas fa-map-marker-alt"></i> ${item.location || ''}</div>` : ''}
                <p>${item.description || ''}</p>
                ${isDelicacy ? `<div class="price" style="margin-top:auto; font-size:1.1rem; color:#D4AF37;">${item.price || ''}</div>` : ''}
            </div>
        `;
        const img = card.querySelector('img');
        card.addEventListener('mouseenter', () => img.style.transform = 'scale(1.1)');
        card.addEventListener('mouseleave', () => img.style.transform = 'scale(1)');

        grid.appendChild(card);
    });
}

// --- Operators Logic ---
async function loadOperators(region) {
    try {
        let url = '/api/operators';
        if (region) url += `?region=${encodeURIComponent(region)}`;
        const res = await fetch(url);
        const data = await res.json();
        glData = data;
        renderOperators(data);
        setupFilters(data);
    } catch (e) {
        console.error("Failed to load data", e);
        document.getElementById('operators-grid').innerHTML = '<p style="text-align:center; width:100%;">無法載入資料，請稍後再試。</p>';
    }
}

function renderOperators(operators) {
    const grid = document.getElementById('operators-grid');
    grid.innerHTML = '';

    if (!operators || operators.length === 0) {
        grid.innerHTML = '<p class="no-results" style="width:100%; text-align:center; padding:50px 0; color:#888; font-size:1.1rem;">目前尚無此區域的旅宿資料。<br><small>請至後台新增資料。</small></p>';
        return;
    }

    operators.forEach(op => {
        const tagsHtml = op.tags ? op.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : '';

        let images = [];
        if (Array.isArray(op.images) && op.images.length > 0) {
            images = op.images;
        } else if (op.image) {
            images = [op.image];
        } else {
            images = ['https://via.placeholder.com/400x300?text=No+Image'];
        }

        const slidesHtml = images.map(img => `
            <div class="carousel-slide">
                <img src="${img}" alt="${op.name}">
            </div>
        `).join('');

        const dotsHtml = images.length > 1 ? `
            <div class="carousel-dots">
                ${images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}
            </div>
        ` : '';

        const bntsHtml = images.length > 1 ? `
            <button class="carousel-btn prev-btn"><i class="fas fa-chevron-left"></i></button>
            <button class="carousel-btn next-btn"><i class="fas fa-chevron-right"></i></button>
        ` : '';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-carousel" id="carousel-${op.id}">
                <div class="carousel-track">
                    ${slidesHtml}
                </div>
                ${bntsHtml}
                ${dotsHtml}
            </div>
            <div class="card-content">
                <div class="tags">${tagsHtml}</div>
                <h2>${op.name}</h2>
                <div class="location"><i class="fas fa-map-marker-alt"></i> ${op.location || ''}</div>
                <p>${op.description || '暫無介紹'}</p>
                <div class="card-footer">
                    <span class="price">
                        <i class="fas fa-phone"></i> ${op.tel || '洽詢'}
                    </span>
                    <a href="${op.link || '#'}" target="_blank" class="book-btn">前往訂房</a>
                </div>
            </div>
        `;

        if (images.length > 1) {
            initCarousel(card, images.length);
        }

        grid.appendChild(card);
    });
}

function initCarousel(card, count) {
    let currentIndex = 0;
    const track = card.querySelector('.carousel-track');
    const dots = card.querySelectorAll('.dot');
    const prevBtn = card.querySelector('.prev-btn');
    const nextBtn = card.querySelector('.next-btn');

    function updateCarousel() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentIndex = (currentIndex === 0) ? count - 1 : currentIndex - 1;
        updateCarousel();
    });

    nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentIndex = (currentIndex === count - 1) ? 0 : currentIndex + 1;
        updateCarousel();
    });

    dots.forEach((dot, idx) => {
        dot.addEventListener('click', (e) => {
            e.preventDefault();
            currentIndex = idx;
            updateCarousel();
        });
    });
}

// --- Hero Carousel Logic ---
async function loadHero(regionName) {
    // Try to find if this region has specific images in portal_config.json
    try {
        let images = [];

        // Load Global Config
        const res = await fetch('/api/settings');
        if (res.ok) {
            const config = await res.json();

            // Try to find the region group
            // We need to search in all regions
            let foundRegion = null;
            if (config.regions) {
                // Find deeply? No, usually regionName matches an item name or a big region name?
                // Actually usually user clicks "Tainan" (City). 
                // We don't distinctly have "Tainan" images stored unless we check the Big Region which contains Tainan.
                // Or if we implemented recursive image inheritance.
                // For now, let's just use the Big Region images if the name matches a Big Region,
                // Or if the name is a sub-item, try to find parent Big Region images.

                for (const r of config.regions) {
                    // Check if name matches Big Region
                    if (r.name.includes(regionName)) {
                        foundRegion = r;
                        break;
                    }
                    // Check sub items
                    for (const g of r.groups) {
                        for (const item of g.items) {
                            if (item.name === regionName) {
                                foundRegion = r; // Use parent region images
                                break;
                            }
                        }
                    }
                    if (foundRegion) break;
                }
            }

            if (foundRegion && foundRegion.images && foundRegion.images.length > 0) {
                images = foundRegion.images;
            } else if (config.hero && config.hero.images) {
                // Fallback to global hero
                images = config.hero.images;
            }
        }

        // Hard Fallback
        if (images.length === 0) {
            images = ['https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'];
        }

        const track = document.getElementById('heroTrack');
        if (!track) return;

        track.innerHTML = images.map((img, i) => `
            <div class="hero-slide ${i === 0 ? 'active' : ''}">
                <img src="${img}" style="object-fit:cover; width:100%; height:100%; filter: brightness(0.6);" onerror="this.src='https://via.placeholder.com/1920x1080?text=View'">
            </div>
        `).join('');

        let current = 0;
        const slides = track.querySelectorAll('.hero-slide');
        if (slides.length > 1) {
            setInterval(() => {
                slides[current].classList.remove('active');
                current = (current + 1) % slides.length;
                slides[current].classList.add('active');
            }, 5000);
        }

    } catch (e) {
        console.warn('Hero load failed', e);
    }
}

function setupFilters(data) {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filterType = btn.getAttribute('data-filter');
            if (filterType === 'all') {
                renderOperators(data);
            } else {
                const filtered = data.filter(op => op.category === filterType);
                renderOperators(filtered);
            }
        });
    });
}
