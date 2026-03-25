// ============================================
// NewsHub Premium - Clean & Working Version
// Version: 4.0.0 - Fixed Summary & Share Button
// ============================================

// Global Variables
let currentCategory = 'all';
let allNewsItems = [];
let isLoading = false;
let searchTimeout = null;
let currentSection = 'home';
let newsSummaries = new Map();

// DOM Elements
const menu = document.getElementById('menu');
const newsContainer = document.getElementById('news');
const savedContainer = document.getElementById('saved');
const trendingContainer = document.getElementById('trending');
const premiumContainer = document.getElementById('premium');
const lastUpdatedSpan = document.getElementById('last');
const searchInput = document.getElementById('search');

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  fetchNews();
  loadSavedNews();
  setupKeyboardShortcuts();
  
  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !e.target.classList.contains('menu-btn')) {
      toggleMenu();
    }
  });
});

// ============================================
// Keyboard Shortcuts
// ============================================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      searchInput?.focus();
      showToast('🔍 Search mode');
    }
    if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      toggleTheme();
    }
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      toggleMenu();
    }
  });
}

// ============================================
// Theme
// ============================================
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  showToast(`${newTheme === 'light' ? '☀️ Light' : '🌙 Dark'} mode`);
}

function loadTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
}

// ============================================
// Menu
// ============================================
function toggleMenu() {
  menu.classList.toggle('open');
}

function showSection(section) {
  currentSection = section;
  
  document.getElementById('homeSection').style.display = 'none';
  document.getElementById('savedSection').style.display = 'none';
  document.getElementById('trendingSection').style.display = 'none';
  document.getElementById('premiumSection').style.display = 'none';
  
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
  
  menu.classList.remove('open');
}

// ============================================
// Category
// ============================================
function setCategory(category) {
  currentCategory = category;
  
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
    const btnText = btn.textContent.trim().toLowerCase();
    if (category === 'all' && btnText === 'all') btn.classList.add('active');
    if (btnText.includes(category)) btn.classList.add('active');
  });
  
  renderNews();
}

// ============================================
// Fetch News
// ============================================
async function fetchNews() {
  if (isLoading) return;
  isLoading = true;
  showSkeletonLoading(newsContainer);
  
  try {
    const response = await fetchWithTimeout(
      "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent("https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en") +
      "&t=" + Date.now(),
      10000
    );
    
    const data = await response.json();
    
    if (data?.items?.length) {
      allNewsItems = data.items.map((item, idx) => ({
        id: idx,
        title: item.title.split(" - ")[0] || item.title,
        cleanTitle: item.title.split(" - ")[0],
        source: item.title.split(" - ")[1] || "News Source",
        link: item.link,
        thumbnail: item.thumbnail || `https://via.placeholder.com/400x200/1e293b/3b82f6?text=News`,
        pubDate: new Date(item.pubDate),
        description: item.description || item.content || item.title,
        readingTime: Math.max(1, Math.ceil((item.title?.split(/\s+/).length || 50) / 200))
      }));
      
      updateBreakingTicker(allNewsItems.slice(0, 5));
      renderNews();
      updateLastUpdated();
      showToast(`✅ ${allNewsItems.length} news loaded`);
      localStorage.setItem('cachedNews', JSON.stringify(allNewsItems));
    } else {
      throw new Error('No news');
    }
  } catch (error) {
    console.error(error);
    const cached = localStorage.getItem('cachedNews');
    if (cached) {
      allNewsItems = JSON.parse(cached);
      renderNews();
      showToast('📱 Offline mode - cached news');
    } else {
      showError(newsContainer, 'Failed to load news. Check internet.');
    }
  } finally {
    isLoading = false;
  }
}

function fetchWithTimeout(url, timeout) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
  ]);
}

// ============================================
// Clean Summary Generator - NO HTML TAGS
// ============================================
function generateSummary(text, title) {
  if (newsSummaries.has(title)) {
    return newsSummaries.get(title);
  }
  
  let summary = '';
  
  // Clean text - remove HTML tags
  const cleanText = text?.replace(/<[^>]*>/g, '') || '';
  
  // Split into sentences
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  if (sentences.length >= 2) {
    // Get key sentences based on keywords from title
    const titleKeywords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const scored = sentences.map(sentence => {
      let score = 0;
      titleKeywords.forEach(kw => {
        if (sentence.toLowerCase().includes(kw)) score += 2;
      });
      score += Math.min(sentence.split(/\s+/).length / 15, 3);
      return { text: sentence.trim(), score };
    });
    
    const topSentences = scored.sort((a, b) => b.score - a.score).slice(0, 2);
    summary = topSentences.map(s => s.text).join('. ') + '.';
  } else {
    // Fallback summary from title
    summary = title + '. ' + (cleanText.substring(0, 120) || 'Read full article for details.');
  }
  
  // Clean up and limit length
  summary = summary.replace(/\s+/g, ' ').trim();
  if (summary.length > 200) {
    summary = summary.substring(0, 197) + '...';
  }
  
  newsSummaries.set(title, summary);
  return summary;
}

// ============================================
// Update Breaking Ticker
// ============================================
function updateBreakingTicker(items) {
  const ticker = document.getElementById('tickerContent');
  if (!ticker) return;
  
  const html = items.map(item => `
    <span class="ticker-item">
      <span class="ticker-badge">🔴 ${item.id < 3 ? 'BREAKING' : 'LATEST'}</span>
      ${escapeHtml(item.cleanTitle.substring(0, 70))}
    </span>
  `).join('');
  
  ticker.innerHTML = html + html;
}

// ============================================
// Render News Cards - CLEAN VERSION
// ============================================
function renderNews() {
  if (!newsContainer) return;
  
  const searchText = searchInput?.value.toLowerCase().trim() || '';
  
  let filtered = allNewsItems.filter(item => {
    if (currentCategory !== 'all') {
      const title = item.cleanTitle.toLowerCase();
      if (currentCategory === 'india' && !title.includes('india')) return false;
      if (currentCategory === 'defence' && !(title.includes('army') || title.includes('defence') || title.includes('military'))) return false;
      if (currentCategory === 'world' && !(title.includes('world') || title.includes('international') || title.includes('us') || title.includes('china'))) return false;
      if (currentCategory === 'technology' && !(title.includes('tech') || title.includes('ai') || title.includes('digital'))) return false;
      if (currentCategory === 'sports' && !(title.includes('sport') || title.includes('cricket') || title.includes('football'))) return false;
    }
    if (searchText && !item.cleanTitle.toLowerCase().includes(searchText)) return false;
    return true;
  });
  
  if (filtered.length === 0) {
    newsContainer.innerHTML = `<div style="text-align:center;padding:60px"><p>😕 No news found</p><button onclick="fetchNews()" style="margin-top:15px;padding:10px 20px;background:var(--accent-blue);border:none;border-radius:25px;color:white;cursor:pointer">Refresh</button></div>`;
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
        <img src="${item.thumbnail}" alt="${escapeHtml(item.cleanTitle)}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x200/1e293b/3b82f6?text=News'">
        <span class="reading-time">📖 ${item.readingTime} min</span>
      </div>
      <div class="card-content">
        <div class="card-header">
          <span class="source">📰 ${escapeHtml(item.source)}</span>
          ${item.id < 5 ? '<span class="trending-badge">🔥 Trending</span>' : ''}
        </div>
        <h3><a href="${item.link}" target="_blank" rel="noopener">${escapeHtml(item.cleanTitle)}</a></h3>
        
        <!-- CLEAN SUMMARY - NO HTML TAGS -->
        <div class="summary-section">
          <div class="summary-header">
            <span>🤖 AI Summary</span>
            <button class="regenerate-summary" onclick="regenerateSummary('${item.id}', '${escapeHtml(item.cleanTitle)}', \`${escapeHtml(item.description || item.cleanTitle)}\`)">↻</button>
          </div>
          <div class="summary-text" id="summary-${item.id}">
            ${escapeHtml(summary)}
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="action-btn" onclick="shareArticle('${item.link}', '${escapeHtml(item.cleanTitle)}')">
            📤 Share
          </button>
          <button class="action-btn ${isSaved ? 'save-btn saved' : ''}" onclick="toggleSave('${item.link}', \`${escapeHtml(item.cleanTitle)}\`, '${escapeHtml(item.source)}', '${item.thumbnail}', \`${escapeHtml(item.description || '')}\`)">
            ${isSaved ? '⭐ Saved' : '⭐ Save'}
          </button>
        </div>
        <div class="date">📅 ${formatDate(item.pubDate)}</div>
      </div>
    </div>
  `;
}

// ============================================
// Share Article - WORKING PROPERLY
// ============================================
function shareArticle(url, title) {
  if (navigator.share) {
    navigator.share({
      title: title,
      url: url
    }).catch(() => {
      copyToClipboard(url);
    });
  } else {
    copyToClipboard(url);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('🔗 Link copied!');
  }).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('🔗 Link copied!');
  });
}

// ============================================
// Regenerate Summary - CLEAN
// ============================================
function regenerateSummary(id, title, description) {
  newsSummaries.delete(title);
  const newSummary = generateSummary(description, title);
  const summaryDiv = document.getElementById(`summary-${id}`);
  if (summaryDiv) {
    summaryDiv.textContent = newSummary;
    showToast('✨ Summary refreshed');
  }
}

// ============================================
// Save/Load Saved News
// ============================================
function toggleSave(link, title, source, thumbnail, description) {
  let saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  const exists = saved.find(item => item.link === link);
  
  if (exists) {
    saved = saved.filter(item => item.link !== link);
    showToast('❌ Removed from saved');
  } else {
    saved.push({ link, title, source, thumbnail, description, savedAt: new Date().toISOString() });
    showToast('⭐ Saved to bookmarks');
  }
  
  localStorage.setItem('savedNews', JSON.stringify(saved));
  
  if (currentSection === 'saved') {
    loadSavedNews();
  } else {
    renderNews();
  }
}

function loadSavedNews() {
  if (!savedContainer) return;
  
  const saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  
  if (saved.length === 0) {
    savedContainer.innerHTML = `<div style="text-align:center;padding:60px"><p>⭐ No saved news</p><p style="font-size:0.8rem">Save articles to read later</p></div>`;
    return;
  }
  
  savedContainer.innerHTML = saved.map(item => `
    <div class="card">
      <div class="card-img">
        <img src="${item.thumbnail || 'https://via.placeholder.com/400x200/1e293b/3b82f6?text=News'}" alt="${escapeHtml(item.title)}" loading="lazy">
        <span class="reading-time">📖 ${Math.max(1, Math.ceil((item.title?.split(/\s+/).length || 50) / 200))} min</span>
      </div>
      <div class="card-content">
        <span class="source">📰 ${escapeHtml(item.source || 'News')}</span>
        <h3><a href="${item.link}" target="_blank">${escapeHtml(item.title)}</a></h3>
        <div class="summary-section">
          <div class="summary-header">🤖 AI Summary</div>
          <div class="summary-text">${escapeHtml(generateSummary(item.description || item.title, item.title))}</div>
        </div>
        <button class="action-btn" onclick="toggleSave('${item.link}', \`${escapeHtml(item.title)}\`, '${escapeHtml(item.source || '')}', '${item.thumbnail || ''}', '${escapeHtml(item.description || '')}')">❌ Remove</button>
        <div class="date">📅 Saved ${formatDate(new Date(item.savedAt))}</div>
      </div>
    </div>
  `).join('');
}

function isNewsSaved(link) {
  const saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  return saved.some(item => item.link === link);
}

// ============================================
// Trending News
// ============================================
function loadTrendingNews() {
  if (!trendingContainer) return;
  
  const trending = [...allNewsItems].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 10);
  
  if (trending.length === 0) {
    trendingContainer.innerHTML = `<div style="text-align:center;padding:60px"><p>🔥 Loading trending...</p></div>`;
    return;
  }
  
  trendingContainer.innerHTML = trending.map((item, idx) => `
    <div class="card">
      <div class="card-img">
        <img src="${item.thumbnail}" alt="${escapeHtml(item.cleanTitle)}" loading="lazy">
        <span class="reading-time">📖 ${item.readingTime} min</span>
      </div>
      <div class="card-content">
        <div class="card-header">
          <span class="source">📰 ${escapeHtml(item.source)}</span>
          <span class="trending-badge">🔥 #${idx + 1}</span>
        </div>
        <h3><a href="${item.link}" target="_blank">${escapeHtml(item.cleanTitle)}</a></h3>
        <div class="summary-section">
          <div class="summary-header">🤖 AI Summary</div>
          <div class="summary-text">${escapeHtml(generateSummary(item.description, item.cleanTitle))}</div>
        </div>
        <div class="date">📅 ${formatDate(item.pubDate)}</div>
      </div>
    </div>
  `).join('');
}

// ============================================
// Premium News
// ============================================
function loadPremiumNews() {
  if (!premiumContainer) return;
  
  const premium = [
    { title: "Exclusive: Global Economic Outlook 2026", source: "Premium Insights", desc: "In-depth analysis of market trends and investment opportunities for the coming year." },
    { title: "Inside Story: Secret AI Projects of Tech Giants", source: "Tech Insider", desc: "Behind the scenes of revolutionary AI developments at major tech companies." },
    { title: "Future of Space Exploration: Mars Mission 2030", source: "Space News", desc: "Exclusive coverage of upcoming NASA, SpaceX, and ISRO missions." },
    { title: "Investment Secrets: Building Wealth in 2026", source: "Finance Pro", desc: "Expert strategies for stock market, crypto, and real estate investments." }
  ];
  
  premiumContainer.innerHTML = premium.map(item => `
    <div class="card">
      <div class="card-img">
        <img src="https://via.placeholder.com/400x200/334155/f59e0b?text=Premium" alt="${item.title}">
        <span class="reading-time">💎 PREMIUM</span>
      </div>
      <div class="card-content">
        <span class="source" style="background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;">🔥 EXCLUSIVE</span>
        <h3>${item.title}</h3>
        <p style="color:var(--text-secondary);margin:10px 0;font-size:0.85rem">${item.desc}</p>
        <button class="action-btn" onclick="showToast('🔒 Premium subscription required. Contact support@newshub.com')">🔒 Unlock Premium</button>
      </div>
    </div>
  `).join('');
}

// ============================================
// Search
// ============================================
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    renderNews();
    if (searchInput?.value.trim()) {
      showToast(`🔍 "${searchInput.value}"`);
    }
  }, 400);
}

// ============================================
// Newsletter Popup
// ============================================
function showNewsletterPopup() {
  const existing = document.querySelector('.newsletter-popup');
  if (existing) return;
  
  const popup = document.createElement('div');
  popup.className = 'newsletter-popup';
  popup.innerHTML = `
    <button class="close-popup" onclick="this.parentElement.remove()">✕</button>
    <h4>📧 Get Daily Updates</h4>
    <p style="font-size:0.75rem">Subscribe for news summaries!</p>
    <input type="email" id="popupEmail" placeholder="Your email">
    <button class="subscribe-btn" onclick="subscribeNewsletter()">Subscribe Free</button>
  `;
  document.body.appendChild(popup);
  
  if (!localStorage.getItem('newsletterSeen')) {
    setTimeout(() => {}, 10000);
    localStorage.setItem('newsletterSeen', 'true');
  }
}

function subscribeNewsletter() {
  const email = document.getElementById('popupEmail')?.value;
  if (email && email.includes('@')) {
    let subs = JSON.parse(localStorage.getItem('subscribers')) || [];
    if (!subs.includes(email)) {
      subs.push(email);
      localStorage.setItem('subscribers', JSON.stringify(subs));
      showToast('✅ Subscribed!');
      document.querySelector('.newsletter-popup')?.remove();
    } else {
      showToast('Already subscribed');
    }
  } else {
    showToast('Enter valid email');
  }
}

// ============================================
// Utilities
// ============================================
function formatDate(date) {
  if (!date) return 'Recently';
  const now = new Date();
  const diff = now - new Date(date);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function updateLastUpdated() {
  if (lastUpdatedSpan) {
    lastUpdatedSpan.innerHTML = `🔄 ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

function showSkeletonLoading(container) {
  container.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-content">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>
    </div>
  `).join('');
}

function showError(container, msg) {
  container.innerHTML = `<div style="text-align:center;padding:60px"><p>⚠️ ${msg}</p><button onclick="fetchNews()" style="margin-top:15px;padding:10px 20px;background:var(--accent-blue);border:none;border-radius:25px;color:white;cursor:pointer">Retry</button></div>`;
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideUp 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Global exports
window.toggleMenu = toggleMenu;
window.showSection = showSection;
window.setCategory = setCategory;
window.fetchNews = fetchNews;
window.toggleSave = toggleSave;
window.toggleTheme = toggleTheme;
window.debouncedSearch = debouncedSearch;
window.showToast = showToast;
window.shareArticle = shareArticle;
window.regenerateSummary = regenerateSummary;
window.subscribeNewsletter = subscribeNewsletter;
window.showNewsletterPopup = showNewsletterPopup;
