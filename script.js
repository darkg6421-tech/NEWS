// ============================================
// NewsHub Premium - Advanced Version 6.1 (Category Fixed)
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
  detectSystemTheme();

  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !e.target.closest('.menu-btn')) {
      toggleMenu();
    }
  });
});

// ============================================
// Theme
// ============================================
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  showToast(newTheme === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode');
}

function loadTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
}

function detectSystemTheme() {
  if (!localStorage.getItem('theme')) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
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

  document.getElementById(section + 'Section').style.display = 'block';

  if (section === 'saved') loadSavedNews();
  if (section === 'trending') loadTrendingNews();
  if (section === 'premium') loadPremiumNews();

  toggleMenu();
}

// ============================================
// Category - FIXED & IMPROVED
// ============================================
function setCategory(category) {
  currentCategory = category;

  // Update active button
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
    if (category === 'all' && btn.textContent.trim() === 'All') {
      btn.classList.add('active');
    } else if (btn.textContent.toLowerCase().includes(category)) {
      btn.classList.add('active');
    }
  });

  renderNews();        // Important: Re-render with new category
  showToast(`📂 Showing ${category === 'all' ? 'All News' : category.charAt(0).toUpperCase() + category.slice(1)}`);
}

// ============================================
// Keyboard Shortcuts
// ============================================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (e.key.toLowerCase() === 'd') toggleTheme();
    if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key.toLowerCase() === 'r') fetchNews();
    if (e.key === 'Escape' && menu.classList.contains('open')) toggleMenu();
  });
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
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent("https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en")}&t=${Date.now()}`,
      10000
    );

    const data = await response.json();

    if (data?.items?.length) {
      allNewsItems = data.items.map((item, idx) => ({
        id: idx,
        title: item.title.split(" - ")[0] || item.title,
        cleanTitle: item.title.split(" - ")[0],
        source: item.author || "Google News",
        link: item.link,
        thumbnail: item.thumbnail || `https://picsum.photos/id/${100 + idx}/400/220`,
        pubDate: new Date(item.pubDate),
        description: item.description || item.content || item.title,
        readingTime: Math.max(2, Math.ceil(item.title.length / 40))
      }));

      updateBreakingTicker(allNewsItems.slice(0, 6));
      renderNews();
      updateLastUpdated();
      localStorage.setItem('cachedNews', JSON.stringify(allNewsItems));
      showToast(`✅ ${allNewsItems.length} news loaded`);
    }
  } catch (err) {
    console.error(err);
    const cached = localStorage.getItem('cachedNews');
    if (cached) {
      allNewsItems = JSON.parse(cached);
      renderNews();
      showToast('📱 Offline - Showing cached news');
    } else {
      showError(newsContainer, "Failed to load news");
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
// Breaking Ticker
// ============================================
function updateBreakingTicker(items) {
  const ticker = document.getElementById('tickerContent');
  if (!ticker) return;

  const html = items.map(item => `
    <span style="margin-right:40px;">
      🔴 ${escapeHtml(item.cleanTitle.substring(0, 80))}...
    </span>
  `).join('');

  ticker.innerHTML = html + html;
}

// ============================================
// Render News - Category Filter FIXED
// =========================================
