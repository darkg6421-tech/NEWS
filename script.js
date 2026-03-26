// ============================================
// NewsHub Premium - Advanced Version 6
// ============================================

let currentCategory = 'all';
let allNewsItems = [];
let isLoading = false;
let searchTimeout = null;
let currentSection = 'home';
let newsSummaries = new Map();

const menu = document.getElementById('menu');
const newsContainer = document.getElementById('news');
const savedContainer = document.getElementById('saved');
const trendingContainer = document.getElementById('trending');
const premiumContainer = document.getElementById('premium');
const lastUpdatedSpan = document.getElementById('last');
const searchInput = document.getElementById('search');

// ============================================
// Initialize App
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  fetchNews();
  loadSavedNews();
  setupKeyboardShortcuts();
  detectSystemTheme();

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && 
        !menu.contains(e.target) && 
        !e.target.closest('.menu-btn')) {
      toggleMenu();
    }
  });
});

// ============================================
// Theme Management (Improved)
// ============================================
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = current === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  showToast(newTheme === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode');
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
}

function detectSystemTheme() {
  if (!localStorage.getItem('theme')) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}

// ============================================
// Menu & Navigation
// ============================================
function toggleMenu() {
  menu.classList.toggle('open');
}

function showSection(section) {
  currentSection = section;
  
  // Hide all sections
  document.getElementById('homeSection').style.display = 'none';
  document.getElementById('savedSection').style.display = 'none';
  document.getElementById('trendingSection').style.display = 'none';
  document.getElementById('premiumSection').style.display = 'none';
  
  // Show selected section
  if (section === 'home') {
    document.getElementById('homeSection').style.display = 'block';
  } else if (section === 'saved') {
    document.getElementById('savedSection').style.display = 'block';
    loadSavedNews();
  } else if (section === 'trending') {
    document.getElementById('trendingSection').style.display = 'block';
    loadTrendingNews();
  } else if (section === 'premium') {
    document.getElementById('premiumSection').style.display = 'block';
    loadPremiumNews();
  }
  
  toggleMenu(); // Close menu after navigation
}

// ============================================
// Keyboard Shortcuts
// ============================================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Prevent shortcuts when typing
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch(e.key.toLowerCase()) {
      case 'd':
        e.preventDefault();
        toggleTheme();
        break;
      case 's':
        e.preventDefault();
        searchInput.focus();
        showToast('🔍 Search opened');
        break;
      case 'r':
        e.preventDefault();
        fetchNews();
        break;
      case 'escape':
        if (menu.classList.contains('open')) toggleMenu();
        break;
    }
  });
}

// ============================================
// Fetch News (Google News RSS)
// ============================================
async function fetchNews() {
  if (isLoading) return;
  isLoading = true;

  showSkeletonLoading(newsContainer);

  try {
    const rssUrl = "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en";
    const response = await fetchWithTimeout(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&t=${Date.now()}`,
      12000
    );

    const data = await response.json();

    if (data?.items?.length) {
      allNewsItems = data.items.map((item, idx) => ({
        id: idx,
        title: item.title.split(" - ")[0] || item.title,
        cleanTitle: item.title.split(" - ")[0],
        source: item.author || item.title.split(" - ")[1] || "News Source",
        link: item.link,
        thumbnail: item.thumbnail || `https://picsum.photos/id/${100 + idx}/400/200`,
        pubDate: new Date(item.pubDate),
        description: item.description || item.content || "",
        readingTime: Math.max(2, Math.ceil((item.title.length || 100) / 35))
      }));

      updateBreakingTicker(allNewsItems.slice(0, 6));
      renderNews();
      updateLastUpdated();
      
      localStorage.setItem('cachedNews', JSON.stringify(allNewsItems));
      showToast(`✅ ${allNewsItems.length} stories loaded`);
    } else {
      throw new Error("No news data");
    }
  } catch (error) {
    console.error("Fetch error:", error);
    const cached = localStorage.getItem('cachedNews');
    
    if (cached) {
      allNewsItems = JSON.parse(cached);
      renderNews();
      showToast('📱 Using cached news (Offline)');
    } else {
      showError(newsContainer, "Failed to load news. Please check your connection.");
    }
  } finally {
    isLoading = false;
  }
}

function fetchWithTimeout(url, timeout) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeout))
  ]);
}

// ============================================
// Breaking Ticker
// ============================================
function updateBreakingTicker(items) {
  const ticker = document.getElementById('tickerContent');
  if (!ticker) return;

  const html = items.map(item => `
    <span class="ticker-item" style="margin-right:40px;">
      <strong>🔴</strong> ${escapeHtml(item.cleanTitle.substring(0, 85))}...
    </span>
  `).join('');

  ticker.innerHTML = html + html; // Duplicate for seamless loop
}

// ============================================
// Render News Cards
// ============================================
function renderNews() {
  if (!newsContainer) return;

  const searchText = searchInput.value.toLowerCase().trim();

  let filtered = allNewsItems.filter(item => {
    // Category Filter
    if (currentCategory !== 'all') {
      const titleLower = item.cleanTitle.toLowerCase();
      if (currentCategory === 'india' && !titleLower.includes('india') && !titleLower.includes('delhi') && !titleLower.includes('mumbai')) return false;
      if (currentCategory === 'world' && !titleLower.includes('world') && !titleLower.includes('international')) return false;
      if (currentCategory === 'technology' && !titleLower.includes('tech') && !titleLower.includes('ai') && !titleLower.includes('google')) return false;
      if (currentCategory === 'sports' && !titleLower.includes('cricket') && !titleLower.includes('ipl') && !titleLower.includes('football')) return false;
    }

    // Search Filter
    if (searchText && !item.cleanTitle.toLowerCase().includes(searchText)) return false;

    return true;
  });

  if (filtered.length === 0) {
    newsContainer.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:80px 20px;">
        <p style="font-size:1.2rem;">😕 No matching news found</p>
        <button onclick="fetchNews()" style="margin-top:20px;padding:12px 30px;background:var(--accent-blue);border:none;border-radius:50px;color:white;cursor:pointer;">Refresh News</button>
      </div>`;
    return;
  }

  newsContainer.innerHTML = filtered.map(item => createNewsCard(item)).join('');
}

function createNewsCard(item) {
  const isSaved = isNewsSaved(item.link);
  const summary = generateSummary(item.description, item.cleanTitle);

  return `
    <div class="card">
      <div class="card-img">
        <img src="${item.thumbnail}" alt="${escapeHtml(item.cleanTitle)}" loading="lazy" 
             onerror="this.src='https://picsum.photos/id/237/400/200'">
        <span class="reading-time">📖 ${item.readingTime} min</span>
      </div>
      <div class="card-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span class="source">📰 ${escapeHtml(item.source)}</span>
          ${item.id < 4 ? '<span style="color:#ef4444;font-weight:bold;">🔥 Trending</span>' : ''}
        </div>
        
        <h3 style="font-size:1.05rem;line-height:1.35;margin:10px 0;">
          <a href="${item.link}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">
            ${escapeHtml(item.cleanTitle)}
          </a>
        </h3>

        <div class="summary-section">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;color:var(--accent-blue);margin-bottom:6px;">
            <span>🤖 AI Summary</span>
            <button class="regenerate-summary" onclick="regenerateSummary(${item.id}, '${escapeHtml(item.cleanTitle)}', \`${escapeHtml(item.description)}\`)" style="background:none;border:none;color:var(--accent-blue);cursor:pointer;">↻</button>
          </div>
          <div class="summary-text" id="summary-${item.id}">
            ${escapeHtml(summary)}
          </div>
        </div>

        <div class="action-buttons">
          <button class="action-btn" onclick="shareArticle('${item.link}', '${escapeHtml(item.cleanTitle)}')">
            📤 Share
          </button>
          <button class="action-btn ${isSaved ? 'save-btn saved' : ''}" 
                  onclick="toggleSave('${item.link}', '${escapeHtml(item.cleanTitle)}', '${escapeHtml(item.source)}', '${item.thumbnail}', '${escapeHtml(item.description)}')">
            ${isSaved ? '⭐ Saved' : '⭐ Save'}
          </button>
        </div>
        
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:12px;">
          📅 ${formatDate(item.pubDate)}
        </div>
      </div>
    </div>
  `;
}

// ============================================
// AI Summary Generator (Improved)
// ============================================
function generateSummary(text, title) {
  if (newsSummaries.has(title)) return newsSummaries.get(title);

  let cleanText = (text || "").replace(/<[^>]*>/g, '').trim();
  let summary = title + ". ";

  if (cleanText.length > 30) {
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 15);
    if (sentences.length >= 2) {
      summary += sentences.slice(0, 2).join('. ') + '.';
    } else {
      summary += cleanText.substring(0, 140) + '...';
    }
  }

  summary = summary.replace(/\s+/g, ' ').trim();
  if (summary.length > 185) summary = summary.substring(0, 182) + '...';

  newsSummaries.set(title, summary);
  return summary;
}

function regenerateSummary(id, title, description) {
  newsSummaries.delete(title);
  const newSummary = generateSummary(description, title);
  const el = document.getElementById(`summary-${id}`);
  if (el) {
    el.textContent = newSummary;
    showToast('✨ Summary refreshed');
  }
}

// ============================================
// Save / Bookmark System
// ============================================
function toggleSave(link, title, source, thumbnail, description) {
  let saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  const existsIndex = saved.findIndex(item => item.link === link);

  if (existsIndex > -1) {
    saved.splice(existsIndex, 1);
    showToast('❌ Removed from saved');
  } else {
    saved.push({ link, title, source, thumbnail, description, savedAt: new Date().toISOString() });
    showToast('⭐ Saved successfully');
  }

  localStorage.setItem('savedNews', JSON.stringify(saved));

  // Refresh current view if needed
  if (currentSection === 'saved') loadSavedNews();
  else renderNews();
}

function loadSavedNews() {
  if (!savedContainer) return;
  const saved = JSON.parse(localStorage.getItem('savedNews')) || [];

  if (saved.length === 0) {
    savedContainer.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:80px;"><p>No saved articles yet</p></div>`;
    return;
  }

  savedContainer.innerHTML = saved.map(item => `
    <div class="card">
      <div class="card-img">
        <img src="${item.thumbnail || 'https://picsum.photos/id/237/400/200'}" loading="lazy">
      </div>
      <div class="card-content">
        <span class="source">📰 ${escapeHtml(item.source)}</span>
        <h3><a href="${item.link}" target="_blank">${escapeHtml(item.title)}</a></h3>
        <div class="summary-section">
          <div class="summary-text">${escapeHtml(generateSummary(item.description, item.title))}</div>
        </div>
        <button class="action-btn" onclick="toggleSave('${item.link}', '${escapeHtml(item.title)}', '${escapeHtml(item.source)}', '${item.thumbnail}', '${escapeHtml(item.description)}')">❌ Remove</button>
        <div style="font-size:0.75rem;margin-top:10px;color:var(--text-secondary);">Saved ${formatDate(new Date(item.savedAt))}</div>
      </div>
    </div>
  `).join('');
}

function isNewsSaved(link) {
  const saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  return saved.some(item => item.link === link);
}

// ============================================
// Trending & Premium Sections
// ============================================
function loadTrendingNews() {
  if (!trendingContainer || allNewsItems.length === 0) return;
  
  const trending = [...allNewsItems].sort((a, b) => b.pubDate - a.pubDate).slice(0, 12);
  
  trendingContainer.innerHTML = trending.map((item, idx) => `
    <div class="card">
      <div class="card-img">
        <img src="${item.thumbnail}" loading="lazy">
        <span class="reading-time">#${idx+1}</span>
      </div>
      <div class="card-content">
        <span class="source">📰 ${escapeHtml(item.source)}</span>
        <h3><a href="${item.link}" target="_blank">${escapeHtml(item.cleanTitle)}</a></h3>
        <div class="summary-section">
          <div class="summary-text">${escapeHtml(generateSummary(item.description, item.cleanTitle))}</div>
        </div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">${formatDate(item.pubDate)}</div>
      </div>
    </div>
  `).join('');
}

function loadPremiumNews() {
  if (!premiumContainer) return;

  const premiumNews = [
    { title: "Global Economy 2026-2030: Expert Predictions", source: "Premium Insights", desc: "Deep analysis of upcoming market shifts and investment opportunities." },
    { title: "Next-Gen AI Breakthroughs You Haven't Heard About", source: "Tech Insider", desc: "Exclusive coverage of secret AI projects from leading labs." },
    { title: "India's Space Program: Gaganyaan & Beyond", source: "Space & Defense", desc: "Inside story of India's ambitious manned space mission." }
  ];

  premiumContainer.innerHTML = premiumNews.map(item => `
    <div class="card">
      <div class="card-img">
        <img src="https://picsum.photos/id/1015/400/200" alt="${item.title}">
        <span class="reading-time" style="background:#f59e0b;color:#000;">💎 PREMIUM</span>
      </div>
      <div class="card-content">
        <span style="background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;padding:3px 12px;border-radius:20px;font-size:0.75rem;">EXCLUSIVE</span>
        <h3>${item.title}</h3>
        <p style="color:var(--text-secondary);margin:12px 0;">${item.desc}</p>
        <button class="action-btn" onclick="showPremiumInquiry()">🔓 Unlock Premium</button>
      </div>
    </div>
  `).join('');
}

// ============================================
// Search with Debounce
// ============================================
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    renderNews();
  }, 350);
}

// ============================================
// Share & Utilities
// ============================================
async function shareArticle(url, title) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch (err) {
      copyToClipboard(url);
    }
  } else {
    copyToClipboard(url);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('🔗 Link copied to clipboard');
  });
}

function formatDate(date) {
  if (!date) return 'Recently';
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins/60)}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function updateLastUpdated() {
  if (lastUpdatedSpan) {
    lastUpdatedSpan.innerHTML = `Last updated: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

// ============================================
// UI Helpers
// ============================================
function showSkeletonLoading(container) {
  container.innerHTML = Array(6).fill(0).map(() => `
    <div class="card">
      <div style="height:190px;background:linear-gradient(90deg,var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;"></div>
      <div style="padding:16px;">
        <div style="height:14px;background:var(--bg-tertiary);margin:8px 0;border-radius:6px;width:70%;"></div>
        <div style="height:14px;background:var(--bg-tertiary);margin:8px 0;border-radius:6px;"></div>
        <div style="height:14px;background:var(--bg-tertiary);margin:8px 0;border-radius:6px;width:85%;"></div>
      </div>
    </div>
  `).join('');
}

function showError(container, message) {
  container.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:80px 20px;">
      <p style="font-size:1.1rem;">⚠️ ${message}</p>
      <button onclick="fetchNews()" style="margin-top:20px;padding:12px 32px;background:var(--accent-blue);border:none;border-radius:50px;color:white;cursor:pointer;">Retry</button>
    </div>`;
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Premium Inquiry Popup
function showPremiumInquiry() {
  const popup = document.createElement('div');
  popup.className = 'premium-popup';
  popup.innerHTML = `
    <button onclick="this.parentElement.remove()" style="position:absolute;top:12px;right:15px;background:none;border:none;font-size:24px;cursor:pointer;">✕</button>
    <h2 style="margin-bottom:15px;">💎 Premium Access</h2>
    <p>Get exclusive stories, ad-free reading &amp; early access.</p>
    <p style="color:var(--accent-yellow);font-weight:bold;margin:15px 0;">📧 darkg6421@gmail.com</p>
    <input type="email" id="premiumEmail" placeholder="Your email" style="width:100%;padding:12px;margin:15px 0;border-radius:10px;border:1px solid #64748b;background:var(--bg-primary);color:var(--text-primary);">
    <button onclick="sendPremiumRequest()" style="width:100%;padding:14px;background:linear-gradient(135deg,var(--accent-yellow),#f97316);color:#000;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">Request Access</button>
  `;
  document.body.appendChild(popup);
}

function sendPremiumRequest() {
  const email = document.getElementById('premiumEmail')?.value.trim();
  if (email && email.includes('@')) {
    showToast(`✅ Request sent to ${email}`);
    document.querySelector('.premium-popup')?.remove();
    // Optional: open mail client
    // window.location.href = `mailto:darkg6421@gmail.com?subject=Premium Request&body=Email: ${email}`;
  } else {
    showToast('⚠️ Please enter a valid email');
  }
}

// Expose functions to window (for inline onclick)
window.toggleMenu = toggleMenu;
window.showSection = showSection;
window.setCategory = setCategory;
window.fetchNews = fetchNews;
window.toggleSave = toggleSave;
window.toggleTheme = toggleTheme;
window.debouncedSearch = debouncedSearch;
window.shareArticle = shareArticle;
window.regenerateSummary = regenerateSummary;
window.showPremiumInquiry = showPremiumInquiry;
window.sendPremiumRequest = sendPremiumRequest;
