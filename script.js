// ============================================
// NewsHub - Fast News with GNews API
// Version: 3.0.0 - Real-time Updates
// API Key: Configured ✅
// ============================================

// Global Variables
let currentCategory = 'all';
let allNewsItems = [];
let isLoading = false;
let searchTimeout = null;
let currentSection = 'home';

// GNews API - Configured with your API Key
const API_KEY = '97ad9f7fc4a7d7e29611ee9858eb48bb';
const BASE_URL = 'https://gnews.io/api/v4/search';

// DOM Elements
const menu = document.getElementById('menu');
const newsContainer = document.getElementById('news');
const savedContainer = document.getElementById('saved');
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
  setupServiceWorker();
  
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !e.target.classList.contains('menu-btn')) {
      toggleMenu();
    }
  });
  
  // Auto refresh every 3 minutes (faster updates)
  setInterval(() => {
    fetchNews();
  }, 180000);
});

// ============================================
// Fetch News from GNews API (Fast & Fresh)
// ============================================
async function fetchNews() {
  if (isLoading) return;
  
  isLoading = true;
  showLoading(newsContainer);
  
  try {
    let query = 'news';
    let country = 'in';
    
    // Category-based search with better keywords
    if (currentCategory === 'india') {
      query = 'india news latest';
    } else if (currentCategory === 'defence') {
      query = 'defence army military india';
    } else if (currentCategory === 'world') {
      query = 'world international news';
    } else if (currentCategory === 'technology') {
      query = 'technology tech AI gadgets';
    } else if (currentCategory === 'sports') {
      query = 'sports cricket football ipl';
    } else {
      query = 'latest news india world';
    }
    
    // Build URL with API key
    const url = `${BASE_URL}?q=${encodeURIComponent(query)}&lang=en&country=${country}&max=30&sortby=publishedAt&apikey=${API_KEY}`;
    
    console.log('Fetching fresh news...');
    
    const response = await fetchWithTimeout(url, 10000);
    const data = await response.json();
    
    if (data && data.articles && data.articles.length > 0) {
      allNewsItems = data.articles.map((article, index) => ({
        title: article.title,
        cleanTitle: article.title.split(" - ")[0],
        source: article.source?.name || "News Source",
        thumbnail: article.image || getFallbackImage(),
        link: article.url,
        description: article.description || generateSummaryFromTitle(article.title),
        pubDate: new Date(article.publishedAt),
        content: article.content || article.description
      }));
      
      renderNews();
      updateLastUpdated();
      showToast(`✅ ${allNewsItems.length} fresh news loaded!`);
    } else {
      // Fallback if no results
      showToast('🔄 Trying alternative news source...');
      await fetchNewsRSS();
    }
    
  } catch (error) {
    console.error('API Error:', error);
    showToast('⚠️ Using backup news source...');
    await fetchNewsRSS();
  } finally {
    isLoading = false;
  }
}

// ============================================
// Fallback: RSS Feed (Backup)
// ============================================
async function fetchNewsRSS() {
  try {
    const response = await fetchWithTimeout(
      "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent("https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en") +
      "&t=" + new Date().getTime(),
      10000
    );
    
    const data = await response.json();
    
    if (data && data.items && data.items.length > 0) {
      allNewsItems = data.items.map(item => ({
        ...item,
        cleanTitle: item.title.split(" - ")[0],
        source: item.title.split(" - ")[1] || "News Source",
        thumbnail: item.thumbnail || getFallbackImage(),
        description: item.description || generateSummaryFromTitle(item.title),
        pubDate: new Date(item.pubDate)
      }));
      
      renderNews();
      updateLastUpdated();
      showToast(`📰 ${allNewsItems.length} news (RSS backup)`);
    } else {
      throw new Error('No news found');
    }
    
  } catch (error) {
    console.error('RSS Error:', error);
    showError(newsContainer, 'Unable to load news. Please check your connection.');
    
    const cachedNews = localStorage.getItem('cachedNews');
    if (cachedNews) {
      allNewsItems = JSON.parse(cachedNews);
      renderNews();
      showToast('📱 Showing cached news (offline mode)');
    }
  }
}

function fetchWithTimeout(url, timeout) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

function getFallbackImage() {
  return 'https://via.placeholder.com/400x200/1e293b/60a5fa?text=NewsHub';
}

// ============================================
// Generate Summary from Title
// ============================================
function generateSummaryFromTitle(title) {
  const summaries = [
    `📰 ${title}. This breaking news covers the latest developments and key insights. According to sources, this story highlights important events that matter to you. Click to read the complete article for full details and expert analysis.`,
    
    `🔴 BREAKING: ${title}. Stay informed with our comprehensive coverage of this developing story. We bring you the facts, official statements, and what this means for you. Read the full article for in-depth coverage.`,
    
    `📢 UPDATE: ${title}. Here's everything you need to know about this important news. From key highlights to expert opinions, get complete coverage of this story. Tap to read more and stay updated.`,
    
    `⚡ LATEST: ${title}. This news is making headlines across India. Our team brings you accurate and timely information. Check the full article for detailed coverage and analysis.`
  ];
  
  return summaries[Math.floor(Math.random() * summaries.length)];
}

function calculateReadTime(title) {
  const wordsPerMinute = 200;
  const titleWords = title.split(' ').length;
  const estimatedWords = titleWords + 120;
  const minutes = Math.max(1, Math.ceil(estimatedWords / wordsPerMinute));
  return minutes;
}

// ============================================
// Render News with Summary
// ============================================
function renderNews() {
  if (!newsContainer) return;
  
  const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  let filteredNews = allNewsItems.filter(item => {
    if (currentCategory !== 'all') {
      const title = item.cleanTitle.toLowerCase();
      if (currentCategory === 'india' && !title.includes('india')) return false;
      if (currentCategory === 'defence' && !(title.includes('army') || title.includes('defence') || title.includes('war') || title.includes('military'))) return false;
      if (currentCategory === 'world' && !(title.includes('world') || title.includes('international') || title.includes('us') || title.includes('china'))) return false;
      if (currentCategory === 'technology' && !(title.includes('tech') || title.includes('ai') || title.includes('digital') || title.includes('app'))) return false;
      if (currentCategory === 'sports' && !(title.includes('sport') || title.includes('cricket') || title.includes('football') || title.includes('match'))) return false;
    }
    
    if (searchText && !item.cleanTitle.toLowerCase().includes(searchText)) return false;
    
    return true;
  });
  
  if (filteredNews.length === 0) {
    newsContainer.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <p>😕 No news found matching "${searchText || currentCategory}"</p>
        <button onclick="fetchNews()" style="margin-top: 20px; padding: 10px 20px; background: var(--accent-blue); border: none; border-radius: 10px; cursor: pointer;">🔄 Refresh</button>
      </div>
    `;
    return;
  }
  
  // Cache for offline
  localStorage.setItem('cachedNews', JSON.stringify(filteredNews.slice(0, 50)));
  
  newsContainer.innerHTML = filteredNews.map(item => {
    const summary = item.description || generateSummaryFromTitle(item.cleanTitle);
    const readTime = calculateReadTime(item.cleanTitle);
    const isSaved = isNewsSaved(item.link);
    const saveButtonText = isSaved ? '❌ Remove' : '⭐ Save';
    
    return `
      <div class="card">
        <img src="${item.thumbnail}" 
             alt="${escapeHtml(item.cleanTitle)}"
             loading="lazy"
             onerror="this.src='${getFallbackImage()}'">
        <div class="card-content">
          <div class="meta-info">
            <span class="read-time">⏱️ ${readTime} min read</span>
            <span class="source">📰 ${escapeHtml(item.source)}</span>
          </div>
          <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.cleanTitle)}</a></h3>
          <div class="news-summary">
            📖 ${escapeHtml(summary.substring(0, 400))}...
          </div>
          <button class="save-btn" onclick="toggleSave('${escapeHtml(item.link)}', \`${escapeHtml(item.cleanTitle)}\`, '${escapeHtml(item.source)}', '${escapeHtml(item.thumbnail)}', \`${escapeHtml(summary)}\`, ${readTime})">
            ${saveButtonText}
          </button>
          <div class="date">📅 ${formatDate(item.pubDate)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// Theme Management
// ============================================
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  showToast(`🌓 ${newTheme === 'light' ? 'Light' : 'Dark'} mode`);
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

// ============================================
// Menu Functions
// ============================================
function toggleMenu() {
  menu.classList.toggle('open');
}

function showSection(section) {
  currentSection = section;
  
  document.getElementById('homeSection').style.display = 'none';
  document.getElementById('savedSection').style.display = 'none';
  document.getElementById('premiumSection').style.display = 'none';
  
  if (section === 'home') {
    document.getElementById('homeSection').style.display = 'block';
  } else if (section === 'saved') {
    document.getElementById('savedSection').style.display = 'block';
    loadSavedNews();
  } else if (section === 'premium') {
    document.getElementById('premiumSection').style.display = 'block';
    loadPremiumNews();
  }
  
  menu.classList.remove('open');
}

// ============================================
// Category Management
// ============================================
function setCategory(category) {
  currentCategory = category;
  
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.trim().toLowerCase() === category || 
        (category === 'all' && btn.textContent === 'All')) {
      btn.classList.add('active');
    }
  });
  
  fetchNews();
}

// ============================================
// Save/Load Saved News
// ============================================
function toggleSave(link, title, source, thumbnail, summary, readTime) {
  let saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  const exists = saved.find(item => item.link === link);
  
  if (exists) {
    saved = saved.filter(item => item.link !== link);
    showToast(`❌ Removed from saved`);
  } else {
    saved.push({ 
      link, title, source, thumbnail, 
      summary: summary || generateSummaryFromTitle(title),
      readTime: readTime || calculateReadTime(title),
      savedAt: new Date().toISOString() 
    });
    showToast(`⭐ Saved to bookmarks`);
  }
  
  localStorage.setItem('savedNews', JSON.stringify(saved));
  
  if (currentSection === 'saved') {
    loadSavedNews();
  }
}

function loadSavedNews() {
  if (!savedContainer) return;
  
  const saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  
  if (saved.length === 0) {
    savedContainer.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <p>⭐ No saved news yet</p>
        <p style="font-size: 0.9rem; margin-top: 10px;">Save interesting articles to read them later</p>
      </div>
    `;
    return;
  }
  
  savedContainer.innerHTML = saved.map(item => `
    <div class="card">
      <img src="${item.thumbnail || getFallbackImage()}" 
           alt="${escapeHtml(item.title)}"
           loading="lazy"
           onerror="this.src='${getFallbackImage()}'">
      <div class="card-content">
        <div class="meta-info">
          <span class="read-time">⏱️ ${item.readTime || 2} min read</span>
          <span class="source">📰 ${escapeHtml(item.source || 'News Source')}</span>
        </div>
        <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
        <div class="news-summary">
          📖 ${escapeHtml(item.summary || generateSummaryFromTitle(item.title))}
        </div>
        <button class="save-btn" onclick="toggleSave('${escapeHtml(item.link)}', \`${escapeHtml(item.title)}\`, '${escapeHtml(item.source || '')}', '${escapeHtml(item.thumbnail || '')}', \`${escapeHtml(item.summary || '')}\`, ${item.readTime || 2})">
          ❌ Remove
        </button>
        <div class="date">📅 Saved on ${formatDate(new Date(item.savedAt))}</div>
      </div>
    </div>
  `).join('');
}

function isNewsSaved(link) {
  const saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  return saved.some(item => item.link === link);
}

// ============================================
// Premium News Section
// ============================================
function loadPremiumNews() {
  if (!premiumContainer) return;
  
  const premiumNews = [
    {
      title: "🔥 Exclusive: Deep Analysis of Global Economy 2024",
      source: "Premium Insights",
      link: "#",
      thumbnail: getFallbackImage(),
      description: "In-depth analysis of market trends and economic forecasts from top experts"
    },
    {
      title: "🤖 Inside Story: Tech Giants' Secret AI Projects",
      source: "Tech Insider Premium",
      link: "#",
      thumbnail: getFallbackImage(),
      description: "Behind the scenes of revolutionary AI developments that will shape our future"
    },
    {
      title: "🚀 Premium Report: Future of Space Exploration",
      source: "Space News Premium",
      link: "#",
      thumbnail: getFallbackImage(),
      description: "Exclusive coverage of upcoming space missions and discoveries"
    }
  ];
  
  premiumContainer.innerHTML = premiumNews.map(item => `
    <div class="card">
      <img src="${item.thumbnail}" alt="${item.title}">
      <div class="card-content">
        <span class="source" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000;">🔥 PREMIUM</span>
        <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
        <p style="color: var(--text-secondary); margin: 10px 0;">${item.description}</p>
        <button class="save-btn" onclick="showToast('🔒 Premium content - Subscribe to unlock')">
          🔒 Unlock Premium
        </button>
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
    if (searchInput.value.trim()) {
      showToast(`🔍 Searching: "${searchInput.value}"`);
    }
  }, 500);
}

// ============================================
// Utility Functions
// ============================================
function formatDate(date) {
  if (!date) return 'Recently';
  
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  return new Date(date).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

function updateLastUpdated() {
  if (lastUpdatedSpan) {
    lastUpdatedSpan.innerHTML = `🔄 Last updated: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
}

function showLoading(container) {
  container.innerHTML = `
    <div class="loading">
      <div class="loader"></div>
      <p style="margin-top: 20px;">Loading latest news...</p>
    </div>
  `;
}

function showError(container, message) {
  container.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <p>⚠️ ${message}</p>
      <button onclick="fetchNews()" style="margin-top: 20px; padding: 10px 20px; background: var(--accent-blue); border: none; border-radius: 10px; cursor: pointer;">🔄 Retry</button>
    </div>
  `;
}

function showToast(message) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================
// Service Worker
// ============================================
function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  }
}

// ============================================
// Export for global access
// ============================================
window.toggleMenu = toggleMenu;
window.showSection = showSection;
window.setCategory = setCategory;
window.fetchNews = fetchNews;
window.toggleSave = toggleSave;
window.toggleTheme = toggleTheme;
window.debouncedSearch = debouncedSearch;
window.showToast = showToast;
window.loadSavedNews = loadSavedNews;
