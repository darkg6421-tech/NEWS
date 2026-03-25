// ============================================
// NewsHub Premium - Fully Fixed Version
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
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  fetchNews();
  loadSavedNews();
  setupKeyboardShortcuts();
  
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !e.target.classList.contains('menu-btn')) {
      toggleMenu();
    }
  });
});

// ============================================
// Keyboard Shortcuts - FIXED (No interference with typing)
// ============================================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only trigger shortcuts when NOT typing in input fields
    const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
    
    if (!isTyping) {
      // Theme toggle on 'D' key (not while typing)
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        toggleTheme();
      }
    }
    
    // Search focus on 'S' - works even from anywhere
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        showToast('🔍 Type to search');
      }
    }
    
    // Escape to close menu
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
// Premium Inquiry Popup with YOUR EMAIL
// ============================================
function showPremiumInquiry() {
  const existing = document.querySelector('.premium-popup');
  if (existing) existing.remove();
  
  const popup = document.createElement('div');
  popup.className = 'premium-popup';
  popup.innerHTML = `
    <button class="close" onclick="this.parentElement.remove()">✕</button>
    <h2>💎 Premium Access</h2>
    <p style="margin: 15px 0;">Get exclusive news, AI summaries, and ad-free experience!</p>
    <p style="color: var(--accent-yellow); font-weight: bold;">📧 Contact: darkg6421@gmail.com</p>
    <input type="email" id="premiumEmail" placeholder="Your email address">
    <button class="premium-btn" onclick="sendPremiumRequest()">Request Premium Access</button>
    <p style="font-size: 0.7rem; margin-top: 15px;">We'll contact you within 24 hours</p>
  `;
  document.body.appendChild(popup);
}

function sendPremiumRequest() {
  const email = document.getElementById('premiumEmail')?.value;
  if (email && email.includes('@')) {
    // Save inquiry
    let inquiries = JSON.parse(localStorage.getItem('premiumInquiries')) || [];
    inquiries.push({ email, date: new Date().toISOString() });
    localStorage.setItem('premiumInquiries', JSON.stringify(inquiries));
    
    showToast('✅ Request sent! We\'ll contact you at ' + email);
    document.querySelector('.premium-popup')?.remove();
    
    // Optional: You can also send to your email via mailto
    window.location.href = `mailto:darkg6421@gmail.com?subject=Premium%20Access%20Request&body=Email:%20${email}`;
  } else {
    showToast('⚠️ Please enter a valid email');
  }
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
      showToast('📱 Offline mode');
    } else {
      showError(newsContainer, 'Failed to load news');
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
// Clean Summary Generator
// ============================================
function generateSummary(text, title) {
  if (newsSummaries.has(title)) {
    return newsSummaries.get(title);
  }
  
  let summary = '';
  const cleanText = text?.replace(/<[^>]*>/g, '') || '';
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  if (sentences.length >= 2) {
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
    summary = title + '. ' + (cleanText.substring(0, 120) || 'Read full article for details.');
  }
  
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
// Render News
// ============================================
function renderNews() {
  if (!newsContainer) return;
  
  const searchText = searchInput?.value.toLowerCase().trim() || '';
  
  let filtered = allNewsItems.filter(item => {
    if (currentCategory !== 'all') {
      const title = item.cleanTitle.toLowerCase();
      if (currentCategory === 'india' && !title.includes('india')) return false;
      if (currentCategory === 'world' && !(title.includes('world') || title.includes('international'))) return false;
      if (currentCategory === 'technology' && !(title.includes('tech') || title.includes('ai'))) return false;
      if (currentCategory === 'sports' && !(title.includes('sport') || title.includes('cricket'))) return false;
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
// Share
// ============================================
function shareArticle(url, title) {
  if (navigator.share) {
    navigator.share({ title: title, url: url }).catch(() => copyToClipboard(url));
  } else {
    copyToClipboard(url);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('🔗 Link copied!');
  }).catch(() => {
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
// Regenerate Summary
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
// Save/Load
// ============================================
function toggleSave(link, title, source, thumbnail, description) {
  let saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  const exists = saved.find(item => item.link === link);
  
  if (exists) {
    saved = saved.filter(item => item.link !== link);
    showToast('❌ Removed');
  } else {
    saved.push({ link, title, source, thumbnail, description, savedAt: new Date().toISOString() });
    showToast('⭐ Saved');
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
    savedContainer.innerHTML = `<div style="text-align:center;padding:60px"><p>⭐ No saved news</p></div>`;
    return;
  }
  
  savedContainer.innerHTML = saved.map(item => `
    <div class="card">
      <div class="card-img">
        <img src="${item.thumbnail || 'https://via.placeholder.com/400x200/1e293b/3b82f6?text=News'}" alt="${escapeHtml(item.title)}">
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
// Trending
// ============================================
function loadTrendingNews() {
  if (!trendingContainer) return;
  
  const trending = [...allNewsItems].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 10);
  
  if (trending.length === 0) {
    trendingContainer.innerHTML = `<div style="text-align:center;padding:60px"><p>🔥 Loading...</p></div>`;
    return;
  }
  
  trendingContainer.innerHTML = trending.map((item, idx) => `
    <div class="card">
      <div class="card-img">
        <img src="${item.thumbnail}" alt="${escapeHtml(item.cleanTitle)}">
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
// Premium
// ============================================
function loadPremiumNews() {
  if (!premiumContainer) return;
  
  const premium = [
    { title: "Exclusive: Global Economic Outlook 2026", source: "Premium Insights", desc: "In-depth analysis of market trends and investment opportunities." },
    { title: "Inside Story: Secret AI Projects of Tech Giants", source: "Tech Insider", desc: "Behind the scenes of revolutionary AI developments." },
    { title: "Future of Space Exploration: Mars Mission 2030", source: "Space News", desc: "Exclusive coverage of upcoming NASA and ISRO missions." }
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
        <button class="action-btn" onclick="showPremiumInquiry()">🔒 Get Premium Access</button>
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
  }, 400);
}

// ============================================
// Newsletter
// ============================================
function showNewsletterPopup() {
  const existing = document.querySelector('.premium-popup');
  if (existing) existing.remove();
  
  const popup = document.createElement('div');
  popup.className = 'premium-popup';
  popup.innerHTML = `
    <button class="close" onclick="this.parentElement.remove()">✕</button>
    <h4>📧 Get Daily Updates</h4>
    <input type="email" id="newsletterEmail" placeholder="Your email">
    <button class="premium-btn" onclick="subscribeNewsletter()">Subscribe</button>
  `;
  document.body.appendChild(popup);
}

function subscribeNewsletter() {
  const email = document.getElementById('newsletterEmail')?.value;
  if (email && email.includes('@')) {
    let subs = JSON.parse(localStorage.getItem('subscribers')) || [];
    if (!subs.includes(email)) {
      subs.push(email);
      localStorage.setItem('subscribers', JSON.stringify(subs));
      showToast('✅ Subscribed!');
      document.querySelector('.premium-popup')?.remove();
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
window.shareArticle = shareArticle;
window.regenerateSummary = regenerateSummary;
window.showPremiumInquiry = showPremiumInquiry;
window.sendPremiumRequest = sendPremiumRequest;
window.showNewsletterPopup = showNewsletterPopup;
window.subscribeNewsletter = subscribeNewsletter;
