// ============================================
// NewsHub Premium - Advanced News Application
// Version: 3.0.0 - Premium Edition
// Features: AI Summary, Trending, Keyboard Shortcuts, Newsletter
// ============================================

// Global Variables
let currentCategory = 'all';
let allNewsItems = [];
let isLoading = false;
let searchTimeout = null;
let currentSection = 'home';
let newsSummaries = new Map(); // Cache for summaries
let trendingStories = [];

// ============================================
// DOM Elements
// ============================================
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
  loadTrendingNews();
  setupServiceWorker();
  setupKeyboardShortcuts();
  showNewsletterPopup();
  
  // Close menu when clicking outside
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
    // Press 'S' or '/' to focus search
    if (e.key === 's' || e.key === 'S' || e.key === '/') {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        showToast('🔍 Search mode activated');
      }
    }
    
    // Press 'D' for dark mode
    if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      toggleTheme();
    }
    
    // Press '?' for help
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      showKeyboardHelp();
    }
    
    // Press 'ESC' to close menu
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      toggleMenu();
    }
  });
}

function showKeyboardHelp() {
  showToast('⌨️ Shortcuts: S=Search | D=Dark Mode | ESC=Close Menu');
}

// ============================================
// Theme Management
// ============================================
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  showToast(`🌓 ${newTheme === 'light' ? 'Light' : 'Dark'} mode activated`);
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
  
  // Close menu
  menu.classList.remove('open');
}

// ============================================
// Category Management
// ============================================
function setCategory(category) {
  currentCategory = category;
  
  // Update active button styles
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.trim().toLowerCase().includes(category) || 
        (category === 'all' && btn.textContent === 'All')) {
      btn.classList.add('active');
    }
  });
  
  renderNews();
}

// ============================================
// Fetch News from API
// ============================================
async function fetchNews() {
  if (isLoading) return;
  
  isLoading = true;
  showSkeletonLoading(newsContainer);
  
  try {
    const response = await fetchWithTimeout(
      "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent("https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en") +
      "&t=" + new Date().getTime(),
      10000
    );
    
    const data = await response.json();
    
    if (data && data.items && data.items.length > 0) {
      allNewsItems = data.items.map((item, index) => ({
        ...item,
        id: index,
        cleanTitle: item.title.split(" - ")[0],
        source: item.title.split(" - ")[1] || "News Source",
        thumbnail: item.thumbnail || getFallbackImage(),
        pubDate: new Date(item.pubDate),
        description: item.description || item.content || item.cleanTitle,
        readingTime: calculateReadingTime(item.cleanTitle),
        isTrending: index < 5 // First 5 are trending
      }));
      
      // Update breaking ticker
      updateBreakingTicker(allNewsItems.slice(0, 5));
      
      renderNews();
      updateLastUpdated();
      showToast(`✅ Loaded ${allNewsItems.length} news articles`);
      
      // Cache for offline
      localStorage.setItem('cachedNews', JSON.stringify(allNewsItems));
    } else {
      throw new Error('No news found');
    }
    
  } catch (error) {
    console.error('Error fetching news:', error);
    showError(newsContainer, 'Failed to load news. Please check your internet connection.');
    
    // Try to load cached news
    const cachedNews = localStorage.getItem('cachedNews');
    if (cachedNews) {
      allNewsItems = JSON.parse(cachedNews);
      renderNews();
      showToast('📱 Showing cached news (offline mode)');
    }
  } finally {
    isLoading = false;
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
  return 'https://via.placeholder.com/400x200/1e293b/60a5fa?text=NewsHub+Premium';
}

// ============================================
// Calculate Reading Time
// ============================================
function calculateReadingTime(text) {
  const wordsPerMinute = 200;
  const wordCount = (text || '').split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(1, minutes);
}

// ============================================
// AI-Powered Summary Generator
// ============================================
function generateSummary(text, title) {
  // Intelligent summary generation without external API
  // This simulates AI summarization with smart extraction
  
  if (newsSummaries.has(title)) {
    return newsSummaries.get(title);
  }
  
  let summary = '';
  
  // Clean the text
  const cleanText = text.replace(/[^\w\s]/g, '').toLowerCase();
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 30);
  
  if (sentences.length >= 3) {
    // Extract key sentences based on keyword importance
    const keywords = extractKeywords(title);
    const scoredSentences = sentences.map(sentence => ({
      text: sentence,
      score: calculateSentenceScore(sentence, keywords)
    }));
    
    // Get top 2-3 sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(s => s.text.trim());
    
    summary = topSentences.join('. ') + '.';
  } else {
    // Fallback summary
    summary = title + '. ' + (text.substring(0, 150) || 'Read the full article for more details.');
  }
  
  // Ensure summary isn't too long
  if (summary.length > 250) {
    summary = summary.substring(0, 250) + '...';
  }
  
  newsSummaries.set(title, summary);
  return summary;
}

function extractKeywords(text) {
  // Extract important keywords from title
  const stopWords = ['a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to'];
  const words = text.toLowerCase().split(/\s+/);
  return words.filter(word => word.length > 3 && !stopWords.includes(word));
}

function calculateSentenceScore(sentence, keywords) {
  let score = 0;
  const words = sentence.toLowerCase().split(/\s+/);
  
  // Score based on keyword presence
  keywords.forEach(keyword => {
    if (sentence.toLowerCase().includes(keyword)) {
      score += 2;
    }
  });
  
  // Longer sentences often contain more information
  score += Math.min(words.length / 10, 3);
  
  // Sentences with numbers or percentages are often important
  if (/\d+/.test(sentence)) score += 1;
  if(/[%\$]/.test(sentence)) score += 1;
  
  return score;
}

// ============================================
// Update Breaking News Ticker
// ============================================
function updateBreakingTicker(newsItems) {
  const tickerContent = document.getElementById('tickerContent');
  if (!tickerContent) return;
  
  const tickerHTML = newsItems.map(item => `
    <span class="ticker-item">
      <span class="ticker-badge">🔴 ${item.isTrending ? 'BREAKING' : 'LATEST'}</span>
      ${escapeHtml(item.cleanTitle.substring(0, 80))}
    </span>
  `).join('');
  
  tickerContent.innerHTML = tickerHTML + tickerHTML; // Duplicate for seamless loop
}

// ============================================
// Render News
// ============================================
function renderNews() {
  if (!newsContainer) return;
  
  const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  let filteredNews = allNewsItems.filter(item => {
    // Category filter
    if (currentCategory !== 'all') {
      const title = item.cleanTitle.toLowerCase();
      if (currentCategory === 'india' && !title.includes('india')) return false;
      if (currentCategory === 'defence' && !(title.includes('army') || title.includes('defence') || title.includes('war') || title.includes('military'))) return false;
      if (currentCategory === 'world' && !(title.includes('world') || title.includes('international') || title.includes('us') || title.includes('china'))) return false;
      if (currentCategory === 'technology' && !(title.includes('tech') || title.includes('ai') || title.includes('digital') || title.includes('software') || title.includes('app'))) return false;
      if (currentCategory === 'sports' && !(title.includes('sport') || title.includes('cricket') || title.includes('football') || title.includes('match'))) return false;
      if (currentCategory === 'business' && !(title.includes('business') || title.includes('market') || title.includes('economy') || title.includes('stock'))) return false;
    }
    
    // Search filter
    if (searchText && !item.cleanTitle.toLowerCase().includes(searchText)) return false;
    
    return true;
  });
  
  if (filteredNews.length === 0) {
    newsContainer.innerHTML = `
      <div style="text-align: center; padding: 60px;">
        <p style="font-size: 3rem;">😕</p>
        <p style="font-size: 1.2rem; margin-top: 20px;">No news found matching your criteria</p>
        <button onclick="fetchNews()" style="margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); border: none; border-radius: 10px; cursor: pointer; color: white;">Refresh</button>
      </div>
    `;
    return;
  }
  
  // Cache news for offline use
  localStorage.setItem('cachedNews', JSON.stringify(filteredNews.slice(0, 50)));
  
  // Render cards with animation
  newsContainer.innerHTML = filteredNews.map((item, idx) => createNewsCard(item, idx)).join('');
  
  // Add animation to cards
  document.querySelectorAll('.card').forEach((card, index) => {
    card.style.animationDelay = `${index * 0.05}s`;
  });
}

function createNewsCard(item, index) {
  const isSaved = isNewsSaved(item.link);
  const saveButtonText = isSaved ? '❌ Remove' : '⭐ Save';
  const saveButtonClass = isSaved ? 'action-btn save-btn' : 'action-btn';
  const summary = generateSummary(item.description || item.cleanTitle, item.cleanTitle);
  
  return `
    <div class="card" data-id="${item.id}">
      <div class="card-img">
        <img src="${item.thumbnail || getFallbackImage()}" 
             alt="${escapeHtml(item.cleanTitle)}"
             loading="lazy"
             onerror="this.src='${getFallbackImage()}'">
        <div class="reading-time">📖 ${item.readingTime} min read</div>
      </div>
      <div class="card-content">
        <div class="card-header">
          <span class="source">📰 ${escapeHtml(item.source)}</span>
          ${item.isTrending ? '<span class="trending-indicator">🔥 Trending</span>' : ''}
        </div>
        <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.cleanTitle)}</a></h3>
        
        <!-- AI Summary Section -->
        <div class="summary-section">
          <div class="summary-header">
            <span>🤖 AI Summary</span>
            <button class="generate-summary-btn" onclick="regenerateSummary('${item.id}', '${escapeHtml(item.cleanTitle)}', \`${escapeHtml(item.description || item.cleanTitle)}\`)">
              🔄 Refresh
            </button>
          </div>
          <div class="summary-text" id="summary-${item.id}">
            ${escapeHtml(summary)}
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="action-btn" onclick="shareArticle('${escapeHtml(item.link)}', '${escapeHtml(item.cleanTitle)}')">
            📤 Share
          </button>
          <button class="${saveButtonClass}" onclick="toggleSave('${escapeHtml(item.link)}', \`${escapeHtml(item.cleanTitle)}\`, '${escapeHtml(item.source)}', '${escapeHtml(item.thumbnail || '')}', '${item.description || ''}')">
            ${saveButtonText}
          </button>
        </div>
        <div class="date">📅 ${formatDate(item.pubDate)}</div>
      </div>
    </div>
  `;
}

// Regenerate summary for specific article
function regenerateSummary(id, title, description) {
  newsSummaries.delete(title);
  const newSummary = generateSummary(description, title);
  const summaryDiv = document.getElementById(`summary-${id}`);
  if (summaryDiv) {
    summaryDiv.textContent = newSummary;
    showToast('✨ Summary regenerated');
  }
}

// ============================================
// Share Article
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
    showToast('🔗 Link copied to clipboard!');
  }).catch(() => {
    showToast('⚠️ Could not copy link');
  });
}

// ============================================
// Save/Load Saved News
// ============================================
function toggleSave(link, title, source, thumbnail, description) {
  let saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  const exists = saved.find(item => item.link === link);
  
  if (exists) {
    saved = saved.filter(item => item.link !== link);
    showToast(`❌ Removed from saved`);
  } else {
    saved.push({ 
      link, 
      title, 
      source, 
      thumbnail, 
      description,
      savedAt: new Date().toISOString() 
    });
    showToast(`⭐ Saved to bookmarks`);
  }
  
  localStorage.setItem('savedNews', JSON.stringify(saved));
  
  // Re-render current view if in saved section
  if (currentSection === 'saved') {
    loadSavedNews();
  } else {
    // Update button in current view
    const buttons = document.querySelectorAll('.action-btn');
    buttons.forEach(btn => {
      if (btn.textContent.includes('Save') && btn.parentElement?.parentElement?.querySelector('a')?.href === link) {
        btn.textContent = exists ? '⭐ Save' : '❌ Remove';
      }
    });
  }
}

function loadSavedNews() {
  if (!savedContainer) return;
  
  const saved = JSON.parse(localStorage.getItem('savedNews')) || [];
  
  if (saved.length === 0) {
    savedContainer.innerHTML = `
      <div style="text-align: center; padding: 60px;">
        <p style="font-size: 3rem;">⭐</p>
        <p style="font-size: 1.2rem;">No saved news yet</p>
        <p style="margin-top: 10px;">Save interesting articles to read them later</p>
      </div>
    `;
    return;
  }
  
  savedContainer.innerHTML = saved.map((item, idx) => `
    <div class="card">
      <div class="card-img">
        <img src="${item.thumbnail || getFallbackImage()}" 
             alt="${escapeHtml(item.title)}"
             loading="lazy"
             onerror="this.src='${getFallbackImage()}'">
        <div class="reading-time">📖 ${calculateReadingTime(item.title)} min read</div>
      </div>
      <div class="card-content">
        <span class="source">📰 ${escapeHtml(item.source || 'News Source')}</span>
        <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
        <div class="summary-section">
          <div class="summary-header">
            <span>🤖 AI Summary</span>
          </div>
          <div class="summary-text">
            ${escapeHtml(generateSummary(item.description || item.title, item.title))}
          </div>
        </div>
        <button class="action-btn save-btn" onclick="toggleSave('${escapeHtml(item.link)}', \`${escapeHtml(item.title)}\`, '${escapeHtml(item.source || '')}', '${escapeHtml(item.thumbnail || '')}', '${escapeHtml(item.description || '')}')">
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
// Trending News
// ============================================
function loadTrendingNews() {
  if (!trendingContainer) return;
  
  // Generate trending based on recency and keywords
  const trending = [...allNewsItems]
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, 10);
  
  if (trending.length === 0) {
    trendingContainer.innerHTML = `
      <div style="text-align: center; padding: 60px;">
        <p style="font-size: 3rem;">🔥</p>
        <p style="font-size: 1.2rem;">Loading trending news...</p>
      </div>
    `;
    return;
  }
  
  trendingContainer.innerHTML = trending.map((item, idx) => `
    <div class="card">
      <div class="card-img">
        <img src="${item.thumbnail || getFallbackImage()}" 
             alt="${escapeHtml(item.cleanTitle)}"
             loading="lazy"
             onerror="this.src='${getFallbackImage()}'">
        <div class="reading-time">📖 ${item.readingTime} min read</div>
      </div>
      <div class="card-content">
        <div class="card-header">
          <span class="source">📰 ${escapeHtml(item.source)}</span>
          <span class="trending-indicator">🔥 #${idx + 1} Trending</span>
        </div>
        <h3><a href="${item.link}" target="_blank">${escapeHtml(item.cleanTitle)}</a></h3>
        <div class="summary-section">
          <div class="summary-header">
            <span>🤖 AI Summary</span>
          </div>
          <div class="summary-text">
            ${escapeHtml(generateSummary(item.description || item.cleanTitle, item.cleanTitle))}
          </div>
        </div>
        <div class="date">📅 ${formatDate(item.pubDate)}</div>
      </div>
    </div>
  `).join('');
}

// ============================================
// Premium News Section
// ============================================
function loadPremiumNews() {
  if (!premiumContainer) return;
  
  const premiumNews = [
    {
      title: "Exclusive: Deep Analysis of Global Economy 2026",
      source: "Premium Insights",
      link: "#",
      thumbnail: "https://via.placeholder.com/400x200/334155/60a5fa?text=Premium+Economic+Report",
      description: "In-depth analysis of market trends, economic forecasts, and investment opportunities for the coming year. Expert opinions from leading economists."
    },
    {
      title: "Inside Story: Tech Giants' Secret AI Projects Revealed",
      source: "Tech Insider Premium",
      link: "#",
      thumbnail: "https://via.placeholder.com/400x200/334155/8b5cf6?text=AI+Exclusive",
      description: "Behind the scenes of revolutionary AI developments at Google, Microsoft, and OpenAI. Exclusive access to confidential documents."
    },
    {
      title: "Premium Report: Future of Space Exploration 2030",
      source: "Space News Premium",
      link: "#",
      thumbnail: "https://via.placeholder.com/400x200/334155/ec489a?text=Space+Report",
      description: "Exclusive coverage of upcoming NASA, SpaceX, and ISRO missions. Detailed analysis of Mars colonization plans."
    },
    {
      title: "Investment Secrets: How to Build Wealth in 2026",
      source: "Finance Premium",
      link: "#",
      thumbnail: "https://via.placeholder.com/400x200/334155/f59e0b?text=Wealth+Guide",
      description: "Expert investment strategies, stock market predictions, and cryptocurrency insights for maximum returns."
    }
  ];
  
  premiumContainer.innerHTML = premiumNews.map(item => `
    <div class="card">
      <div class="card-img">
        <img src="${item.thumbnail}" alt="${item.title}">
        <div class="reading-time">💎 Premium</div>
      </div>
      <div class="card-content">
        <span class="source" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000;">🔥 PREMIUM EXCLUSIVE</span>
        <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
        <p style="color: var(--text-secondary); margin: 10px 0;">${item.description}</p>
        <button class="action-btn" onclick="showToast('🔒 Premium content requires subscription. Contact support@newshub.com for access.')">
          🔒 Unlock Premium (₹999/year)
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
      showToast(`🔍 Searching: "${searchInput.value}" (${document.querySelectorAll('.card').length} results)`);
    }
  }, 500);
}

// ============================================
// Newsletter Popup
// ============================================
function showNewsletterPopup() {
  // Show popup after 10 seconds or if user hasn't seen it
  const hasSeenPopup = localStorage.getItem('newsletterSeen');
  if (!hasSeenPopup) {
    setTimeout(() => {
      const popup = document.createElement('div');
      popup.className = 'newsletter-popup';
      popup.innerHTML = `
        <button class="close-popup" onclick="this.parentElement.remove()">✕</button>
        <h4>📧 Get Premium News Daily</h4>
        <p style="font-size: 0.8rem; margin-bottom: 10px;">Subscribe for exclusive news summaries and updates!</p>
        <input type="email" id="popupEmail" placeholder="Your email address">
        <button onclick="subscribeNewsletter()" style="width: 100%; padding: 10px; background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); border: none; border-radius: 10px; color: white; cursor: pointer;">Subscribe Free</button>
      `;
      document.body.appendChild(popup);
      localStorage.setItem('newsletterSeen', 'true');
    }, 10000);
  }
}

function subscribeNewsletter() {
  const email = document.getElementById('popupEmail')?.value;
  if (email && email.includes('@')) {
    // Save to localStorage for demo
    let subscribers = JSON.parse(localStorage.getItem('subscribers')) || [];
    if (!subscribers.includes(email)) {
      subscribers.push(email);
      localStorage.setItem('subscribers', JSON.stringify(subscribers));
      showToast('✅ Subscribed successfully! Check your inbox.');
      document.querySelector('.newsletter-popup')?.remove();
    } else {
      showToast('📧 Already subscribed!');
    }
  } else {
    showToast('⚠️ Please enter a valid email');
  }
}

function showNewsletter() {
  showNewsletterPopup();
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
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
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

function showSkeletonLoading(container) {
  const skeletonHTML = Array(6).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-img skeleton"></div>
      <div class="skeleton-content">
        <div class="skeleton-line short skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line short skeleton"></div>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = skeletonHTML;
}

function showError(container, message) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <p style="font-size: 3rem;">⚠️</p>
      <p style="font-size: 1.2rem;">${message}</p>
      <button onclick="fetchNews()" style="margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); border: none; border-radius: 10px; cursor: pointer; color: white;">Retry</button>
    </div>
  `;
}

function showToast(message) {
  // Remove existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideUp 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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

// ============================================
// Service Worker for PWA Support
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
window.shareArticle = shareArticle;
window.regenerateSummary = regenerateSummary;
window.subscribeNewsletter = subscribeNewsletter;
window.showNewsletter = showNewsletter;
