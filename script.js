// ============================================
// NewsHub - RSS Direct with Working Images
// ============================================

let currentCategory = 'all';
let allNewsItems = [];
let isLoading = false;
let searchTimeout = null;
let currentSection = 'home';

const menu = document.getElementById('menu');
const newsContainer = document.getElementById('news');
const savedContainer = document.getElementById('saved');
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
  
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !e.target.classList.contains('menu-btn')) {
      toggleMenu();
    }
  });
  
  setInterval(() => fetchNews(), 300000);
});

// ============================================
// Fetch News from RSS (Working)
// ============================================
async function fetchNews() {
  if (isLoading) return;
  isLoading = true;
  showLoading(newsContainer);
  
  try {
    let rssUrl = 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en';
    
    if (currentCategory === 'india') {
      rssUrl = 'https://news.google.com/rss/search?q=india&hl=en-IN&gl=IN&ceid=IN:en';
    } else if (currentCategory === 'defence') {
      rssUrl = 'https://news.google.com/rss/search?q=defence+army+military&hl=en-IN&gl=IN&ceid=IN:en';
    } else if (currentCategory === 'world') {
      rssUrl = 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en';
    } else if (currentCategory === 'technology') {
      rssUrl = 'https://news.google.com/rss/search?q=technology&hl=en-IN&gl=IN&ceid=IN:en';
    } else if (currentCategory === 'sports') {
      rssUrl = 'https://news.google.com/rss/search?q=sports+cricket&hl=en-IN&gl=IN&ceid=IN:en';
    }
    
    const url = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(rssUrl) + "&t=" + new Date().getTime();
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.items && data.items.length > 0) {
      allNewsItems = data.items.map(item => {
        let cleanTitle = item.title;
        let source = "News Source";
        
        if (item.title.includes(" - ")) {
          const parts = item.title.split(" - ");
          cleanTitle = parts[0];
          source = parts[1];
        }
        
        // Extract image from description
        let imageUrl = item.thumbnail || getImageFromDescription(item.description);
        
        return {
          title: cleanTitle,
          source: source,
          thumbnail: imageUrl,
          link: item.link,
          description: generateDescription(cleanTitle),
          pubDate: new Date(item.pubDate)
        };
      });
      
      renderNews();
      updateLastUpdated();
      showToast(`✅ ${allNewsItems.length} news loaded`);
    } else {
      throw new Error('No news');
    }
    
  } catch (error) {
    console.error('Error:', error);
    showError(newsContainer, 'Failed to load news');
  } finally {
    isLoading = false;
  }
}

// ============================================
// Extract image from description
// ============================================
function getImageFromDescription(description) {
  if (!description) return getFallbackImage();
  
  const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  
  return getFallbackImage();
}

function getFallbackImage() {
  return 'https://picsum.photos/400/200?random=' + Math.random();
}

// ============================================
// Generate meaningful description
// ============================================
function generateDescription(title) {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('war') || lowerTitle.includes('attack') || lowerTitle.includes('strike')) {
    return `🔴 BREAKING: ${title}. Tensions escalate as military operations continue. Officials are monitoring the situation closely. International response is being coordinated. Stay tuned for live updates on this developing story.`;
  }
  
  if (lowerTitle.includes('india') || lowerTitle.includes('modi') || lowerTitle.includes('bjp') || lowerTitle.includes('congress')) {
    return `🇮🇳 ${title}. This political development has significant implications. Key political figures have responded. The story is evolving with new details emerging. Read the full coverage for complete analysis.`;
  }
  
  if (lowerTitle.includes('cricket') || lowerTitle.includes('sport') || lowerTitle.includes('match') || lowerTitle.includes('ipl')) {
    return `🏏 ${title}. Exciting sports action unfolds as teams compete. Key moments include strategic plays and outstanding individual performances. Fans are eagerly following this sporting event. Get complete match highlights here.`;
  }
  
  if (lowerTitle.includes('tech') || lowerTitle.includes('ai') || lowerTitle.includes('phone') || lowerTitle.includes('app')) {
    return `💻 ${title}. Technology sector sees major developments. Industry experts share insights on how this impacts consumers and businesses. The tech landscape continues to evolve rapidly. Read more for detailed coverage.`;
  }
  
  return `📰 ${title}. Stay informed with the latest developments on this important story. Our team brings you accurate and timely coverage of events as they unfold. Click to read the complete article for full details and expert analysis.`;
}

function calculateReadTime(description) {
  const words = description.split(' ').length;
  return Math.max(1, Math.ceil(words / 200));
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
    newsContainer.innerHTML = `<div style="text-align:center;padding:40px;"><p>😕 No news found</p><button onclick="fetchNews()" style="padding:10px 20px;background:#60a5fa;border:none;border-radius:10px;cursor:pointer;">Refresh</button></div>`;
    return;
  }
  
  localStorage.setItem('cachedNews', JSON.stringify(filteredNews.slice(0, 50)));
  
  newsContainer.innerHTML = filteredNews.map(item => {
    const description = item.description || generateDescription(item.title);
    const readTime = calculateReadTime(description);
    const isSaved = isNewsSaved(item.link);
    const saveText = isSaved ? '❌ Remove' : '⭐ Save';
    
    return `
      <div class="card">
        <img src="${item.thumbnail}" 
             alt="${escapeHtml(item.title)}"
             loading="lazy"
             onerror="this.src='https://picsum.photos/400/200?random=${Math.random()}'">
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
            ${saveText}
          </button>
          <div class="date">📅 ${formatDate(item.pubDate)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// Theme
// ============================================
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  showToast(`🌓 ${newTheme === 'light' ? 'Light' : 'Dark'} mode`);
}

function loadTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
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
        <div class="news-summary">📖 ${escapeHtml(item.description || generateDescription(item.title))}</div>
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
// Premium
// ============================================
function loadPremiumNews() {
  if (!premiumContainer) return;
  premiumContainer.innerHTML = `
    <div class="card"><div class="card-content"><h3>🔥 Premium Content</h3><p>Exclusive news, deep analysis, and more coming soon.</p><button class="save-btn" onclick="showToast('🔒 Coming soon')">Notify Me</button></div></div>
  `;
}

// ============================================
// Utilities
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
  container.innerHTML = `<div style="text-align:center;padding:40px;"><p>⚠️ ${message}</p><button onclick="fetchNews()" style="padding:10px 20px;background:#60a5fa;border:none;border-radius:10px;cursor:pointer;">Retry</button></div>`;
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
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

// Make global
window.toggleMenu = toggleMenu;
window.showSection = showSection;
window.setCategory = setCategory;
window.fetchNews = fetchNews;
window.toggleSave = toggleSave;
window.toggleTheme = toggleTheme;
window.debouncedSearch = debouncedSearch;
window.showToast = showToast;
window.loadSavedNews = loadSavedNews;
