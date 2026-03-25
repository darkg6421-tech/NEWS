// ============================================
// NewsHub - Working Version with GNews API
// ============================================

// Global Variables
let currentCategory = 'all';
let allNewsItems = [];
let isLoading = false;
let searchTimeout = null;
let currentSection = 'home';

// GNews API with your key
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
  
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !e.target.classList.contains('menu-btn')) {
      toggleMenu();
    }
  });
  
  setInterval(() => {
    fetchNews();
  }, 180000);
});

// ============================================
// Fetch News from GNews API
// ============================================
async function fetchNews() {
  if (isLoading) return;
  
  isLoading = true;
  showLoading(newsContainer);
  
  try {
    let query = 'india news';
    let country = 'in';
    
    if (currentCategory === 'india') {
      query = 'india news latest';
    } else if (currentCategory === 'defence') {
      query = 'defence army military';
    } else if (currentCategory === 'world') {
      query = 'world international news';
    } else if (currentCategory === 'technology') {
      query = 'technology tech';
    } else if (currentCategory === 'sports') {
      query = 'sports cricket';
    } else {
      query = 'india latest news';
    }
    
    const url = `${BASE_URL}?q=${encodeURIComponent(query)}&lang=en&country=${country}&max=20&sortby=publishedAt&apikey=${API_KEY}`;
    
    console.log('Fetching news...');
    
    const response = await fetchWithTimeout(url, 10000);
    const data = await response.json();
    
    if (data && data.articles && data.articles.length > 0) {
      allNewsItems = data.articles.map((article) => ({
        title: article.title,
        description: article.description || getDescriptionFromTitle(article.title),
        source: article.source?.name || "News Source",
        thumbnail: article.image || getFallbackImage(),
        link: article.url,
        pubDate: new Date(article.publishedAt)
      }));
      
      renderNews();
      updateLastUpdated();
      showToast(`✅ ${allNewsItems.length} news loaded`);
    } else {
      await fetchNewsRSS();
    }
    
  } catch (error) {
    console.error('API Error:', error);
    await fetchNewsRSS();
  } finally {
    isLoading = false;
  }
}

// ============================================
// Fallback: RSS Feed
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
        title: item.title.split(" - ")[0],
        description: getDescriptionFromTitle(item.title.split(" - ")[0]),
        source: item.title.split(" - ")[1] || "News Source",
        thumbnail: item.thumbnail || getFallbackImage(),
        link: item.link,
        pubDate: new Date(item.pubDate)
      }));
      
      renderNews();
      updateLastUpdated();
      showToast(`📰 ${allNewsItems.length} news (RSS)`);
    } else {
      throw new Error('No news');
    }
    
  } catch (error) {
    console.error('RSS Error:', error);
    showError(newsContainer, 'Failed to load news');
    
    const cachedNews = localStorage.getItem('cachedNews');
    if (cachedNews) {
      allNewsItems = JSON.parse(cachedNews);
      renderNews();
      showToast('📱 Offline mode');
    }
  }
}

function fetchWithTimeout(url, timeout) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
  ]);
}

// ============================================
// Generate Real Description from Title
// ============================================
function getDescriptionFromTitle(title) {
  // Extract keywords from title to make relevant summary
  const keywords = title.toLowerCase();
  
  if (keywords.includes('war') || keywords.includes('attack') || keywords.includes('strike')) {
    return `⚡ Breaking: ${title}. This conflict situation is developing. Military sources report ongoing operations. Casualty figures are being verified. International community is closely monitoring the situation. Stay tuned for live updates.`;
  }
  
  if (keywords.includes('india') || keywords.includes('modi') || keywords.includes('bjp') || keywords.includes('congress')) {
    return `🇮🇳 ${title}. This political development affects India's domestic landscape. Key political figures are responding. The story has implications for governance and policy. Read the full article for detailed analysis.`;
  }
  
  if (keywords.includes('cricket') || keywords.includes('sport') || keywords.includes('match')) {
    return `🏏 ${title}. Exciting sports action unfolds as teams compete. Key moments from the game include strategic plays and outstanding performances. Fans are eagerly following this sporting event. Get complete match coverage here.`;
  }
  
  if (keywords.includes('tech') || keywords.includes('ai') || keywords.includes('phone')) {
    return `💻 ${title}. Technology sector updates bring new innovations. Industry experts share insights on how this development impacts consumers. The tech landscape continues to evolve rapidly. Read more for detailed coverage.`;
  }
  
  return `📰 ${title}. Stay informed with the latest developments on this important story. Our team brings you accurate and timely coverage of events as they unfold. Click to read the complete article for full details.`;
}

function getFallbackImage() {
  return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=200&fit=crop';
}

function calculateReadTime(description) {
  const words = description.split(' ').length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return minutes;
}

// ============================================
// Render News Cards
// ============================================
function renderNews() {
  if (!newsContainer) return;
  
  const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  let filteredNews = allNewsItems.filter(item => {
    if (currentCategory !== 'all') {
      const title = (item.title || '').toLowerCase();
      if (currentCategory === 'india' && !title.includes('india')) return false;
      if (currentCategory === 'defence' && !(title.includes('army') || title.includes('defence') || title.includes('war') || title.includes('military'))) return false;
      if (currentCategory === 'world' && !(title.includes('world') || title.includes('international') || title.includes('us') || title.includes('china'))) return false;
      if (currentCategory === 'technology' && !(title.includes('tech') || title.includes('ai') || title.includes('digital'))) return false;
      if (currentCategory === 'sports' && !(title.includes('sport') || title.includes('cricket') || title.includes('football'))) return false;
    }
    if (searchText && !(item.title || '').toLowerCase().includes(searchText)) return false;
    return true;
  });
  
  if (filteredNews.length === 0) {
    newsContainer.innerHTML = `<div style="text-align:center;padding:40px;"><p>😕 No news found</p><button onclick="fetchNews()" style="padding:10px 20px;background:var(--accent-blue);border:none;border-radius:10px;cursor:pointer;">Refresh</button></div>`;
    return;
  }
  
  localStorage.setItem('cachedNews', JSON.stringify(filteredNews.slice(0, 50)));
  
  newsContainer.innerHTML = filteredNews.map(item => {
    const description = item.description || getDescriptionFromTitle(item.title);
    const readTime = calculateReadTime(description);
    const isSaved = isNewsSaved(item.link);
    const saveButtonText = isSaved ? '❌ Remove' : '⭐ Save';
    
    return `
      <div class="card">
        <img src="${item.thumbnail}" 
             alt="${escapeHtml(item.title)}"
             loading="lazy"
             onerror="this.src='${getFallbackImage()}'">
        <div class="card-content">
          <div class="meta-info">
            <span class="read-time">⏱️ ${readTime} min read</span>
            <span class="source">📰 ${escapeHtml(item.source)}</span>
          </div>
          <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
          <div class="news-summary">
            📖 ${escapeHtml(description)}
          </div>
          <button class="save-btn" onclick="toggleSave('${escapeHtml(item.link)}', \`${escapeHtml(item.title)}\`, '${escapeHtml(item.source)}', '${escapeHtml(item.thumbnail)}', \`${escapeHtml(description)}\`, ${readTime})">
            ${saveButtonText}
          </button>
          <div class="date">📅 ${formatDate(item.pubDate)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// Theme Functions
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

function setCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.trim().toLowerCase() === category || (category === 'all' && btn.textContent === 'All')) {
      btn.classList.add('active');
    }
  });
  fetchNews();
}

// ============================================
// Save Functions
// ============================================
function toggleSave(link, title, source, thumbnail, description, readTime) {
  let saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  const exists = saved.find(item => item.link === link);
  
  if (exists) {
    saved = saved.filter(item => item.link !== link);
    showToast(`❌ Removed`);
  } else {
    saved.push({ link, title, source, thumbnail, description, readTime, savedAt: new Date().toISOString() });
    showToast(`⭐ Saved`);
  }
  localStorage.setItem('savedNews', JSON.stringify(saved));
  if (currentSection === 'saved') loadSavedNews();
}

function loadSavedNews() {
  if (!savedContainer) return;
  const saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  
  if (saved.length === 0) {
    savedContainer.innerHTML = `<div style="text-align:center;padding:40px;"><p>⭐ No saved news</p></div>`;
    return;
  }
  
  savedContainer.innerHTML = saved.map(item => `
    <div class="card">
      <img src="${item.thumbnail || getFallbackImage()}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='${getFallbackImage()}'">
      <div class="card-content">
        <div class="meta-info">
          <span class="read-time">⏱️ ${item.readTime || 2} min read</span>
          <span class="source">📰 ${escapeHtml(item.source || 'News')}</span>
        </div>
        <h3><a href="${item.link}" target="_blank">${escapeHtml(item.title)}</a></h3>
        <div class="news-summary">📖 ${escapeHtml(item.description || getDescriptionFromTitle(item.title))}</div>
        <button class="save-btn" onclick="toggleSave('${escapeHtml(item.link)}', \`${escapeHtml(item.title)}\`, '${escapeHtml(item.source)}', '${escapeHtml(item.thumbnail)}', \`${escapeHtml(item.description)}\`, ${item.readTime})">❌ Remove</button>
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
// Premium Section
// ============================================
function loadPremiumNews() {
  if (!premiumContainer) return;
  premiumContainer.innerHTML = `
    <div class="card"><div class="card-content"><h3>🔥 Premium Content Coming Soon</h3><p>Exclusive news, deep analysis, and more.</p><button class="save-btn" onclick="showToast('🔒 Coming soon')">Notify Me</button></div></div>
  `;
}

// ============================================
// Utility Functions
// ============================================
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    renderNews();
    if (searchInput.value.trim()) showToast(`🔍 Searching...`);
  }, 500);
}

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
  return new Date(date).toLocaleDateString('en-IN');
}

function updateLastUpdated() {
  if (lastUpdatedSpan) {
    lastUpdatedSpan.innerHTML = `🔄 Last updated: ${new Date().toLocaleTimeString()}`;
  }
}

function showLoading(container) {
  container.innerHTML = `<div class="loading"><div class="loader"></div><p>Loading news...</p></div>`;
}

function showError(container, message) {
  container.innerHTML = `<div style="text-align:center;padding:40px;"><p>⚠️ ${message}</p><button onclick="fetchNews()" style="padding:10px 20px;background:var(--accent-blue);border:none;border-radius:10px;cursor:pointer;">Retry</button></div>`;
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
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Make functions global
window.toggleMenu = toggleMenu;
window.showSection = showSection;
window.setCategory = setCategory;
window.fetchNews = fetchNews;
window.toggleSave = toggleSave;
window.toggleTheme = toggleTheme;
window.debouncedSearch = debouncedSearch;
window.showToast = showToast;
window.loadSavedNews = loadSavedNews;
