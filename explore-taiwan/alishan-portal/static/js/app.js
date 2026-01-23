document.addEventListener('DOMContentLoaded', () => {
    loadOperators();
    loadAttractions();
    loadDelicacies();
    loadHero();
});

let glData = [];

// --- Attractions Logic ---
async function loadAttractions() {
    try {
        const res = await fetch('/api/attractions');
        const data = await res.json();
        renderSimpleGrid(data, 'attractions-grid');
    } catch (e) {
        console.error("Failed to load attractions", e);
    }
}

// --- Delicacies Logic ---
async function loadDelicacies() {
    try {
        const res = await fetch('/api/delicacies');
        const data = await res.json();
        renderSimpleGrid(data, 'delicacies-grid', true); // true for delicacy mode (show price)
    } catch (e) {
        console.error("Failed to load delicacies", e);
    }
}

function renderSimpleGrid(items, containerId, isDelicacy = false) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';

    items.forEach(item => {
        // Handle image
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
                ${!isDelicacy ? `<div class="location"><i class="fas fa-map-marker-alt"></i> ${item.location || '阿里山'}</div>` : ''}
                <p>${item.description || ''}</p>
                ${isDelicacy ? `<div class="price" style="margin-top:auto; font-size:1.1rem; color:#D4AF37;">${item.price || ''}</div>` : ''}
            </div>
        `;
        // Simple hover effect for image
        const img = card.querySelector('img');
        card.addEventListener('mouseenter', () => img.style.transform = 'scale(1.1)');
        card.addEventListener('mouseleave', () => img.style.transform = 'scale(1)');

        grid.appendChild(card);
    });
}

// --- Operators Logic ---
async function loadOperators() {
    try {
        const res = await fetch('/api/operators');
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

    if (operators.length === 0) {
        grid.innerHTML = '<p class="no-results">沒有找到符合條件的旅宿。</p>';
        return;
    }

    operators.forEach(op => {
        // Create Tags HTML
        const tagsHtml = op.tags ? op.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : '';

        // Prepare Images (handle both string and array for backward compatibility)
        let images = [];
        if (Array.isArray(op.images) && op.images.length > 0) {
            images = op.images;
        } else if (op.image) {
            images = [op.image];
        } else {
            images = ['https://via.placeholder.com/400x300?text=No+Image'];
        }

        // Generate Slides HTML
        const slidesHtml = images.map(img => `
            <div class="carousel-slide">
                <img src="${img}" alt="${op.name}">
            </div>
        `).join('');

        // Generate Dots HTML
        const dotsHtml = images.length > 1 ? `
            <div class="carousel-dots">
                ${images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}
            </div>
        ` : '';

        // Generate Buttons HTML
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
                <div class="location"><i class="fas fa-map-marker-alt"></i> ${op.location || '阿里山'}</div>
                <p>${op.description || '暫無介紹'}</p>
                <div class="card-footer">
                    <span class="price">
                        <i class="fas fa-phone"></i> ${op.tel || '洽詢'}
                    </span>
                    <a href="${op.link || '#'}" target="_blank" class="book-btn">前往訂房</a>
                </div>
            </div>
        `;

        // Initialize Carousel Logic for this card if multiple images
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
        e.preventDefault(); // prevent triggering card click or link
        currentIndex = (currentIndex === 0) ? count - 1 : currentIndex - 1;
        updateCarousel();
    });

    nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentIndex = (currentIndex === count - 1) ? 0 : currentIndex + 1;
        updateCarousel();
    });

    // Optional: Click on dots
    dots.forEach((dot, idx) => {
        dot.addEventListener('click', (e) => {
            e.preventDefault();
            currentIndex = idx;
            updateCarousel();
        });
    });
}

// --- Hero Carousel Logic ---
async function loadHero() {
    try {
        let images = [];
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const settings = await res.json();
                if (settings.hero_images && settings.hero_images.length > 0) {
                    images = settings.hero_images;
                }
            }
        } catch (e) { console.warn('API error', e); }

        // Fallback if no images
        if (images.length === 0) {
            images = [
                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2670', // Fallback 1
                'https://images.unsplash.com/photo-1465433069123-ac47cd9308dc?q=80&w=2670'  // Fallback 2
            ];
        }

        const track = document.getElementById('heroTrack');
        if (!track) return;

        track.innerHTML = images.map((img, i) => `
            <div class="hero-slide ${i === 0 ? 'active' : ''}">
                <img src="${img}" alt="Alishan View" onerror="this.src='https://via.placeholder.com/1920x1080?text=Image+Load+Error'">
            </div>
        `).join('');

        // Auto play
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

// --- Filter Logic (Category based) ---
function setupFilters(data) {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Active State
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterType = btn.getAttribute('data-filter');

            if (filterType === 'all') {
                renderOperators(data);
            } else {
                // Filter by Category field
                const filtered = data.filter(op => op.category === filterType);
                renderOperators(filtered);
            }
        });
    });
}
