// Global State
let currentCategory = "all";
let allNews = []; // Master data from API
let filteredNews = []; // Data after category/search filter
let visibleCount = 10;
let lastRenderedIndex = 0;
let isLoadingMore = false;

// 1. INITIAL FETCH & REFRESH
async function fetchNews() {
  try {
    const container = document.getElementById("news");
    if (allNews.length === 0) container.innerHTML = "<div class='loading'>Fetching latest updates...</div>";

    const feeds = [
      "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=india",
      "https://news.google.com/rss/search?q=defence"
    ];

    let combined = [];
    for (let url of feeds) {
      try {
        const res = await fetch(
          "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url) + "&t=" + Date.now()
        );
        const data = await res.json();
        if (data.items) combined = combined.concat(data.items);
      } catch (err) { console.warn("Feed failed:", url); }
    }

    // Sort by date (Latest first)
    combined.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Remove duplicates based on URL
    allNews = Array.from(new Map(combined.map(item => [item.link, item])).values());

    // Trigger filtering and display
    applyFilters(true); 

  } catch (e) {
    document.getElementById("news").innerHTML = "<div class='error'>Unable to connect to news servers.</div>";
  }
}

// 2. FILTER LOGIC (Decides what to show)
function applyFilters(isNewLoad = false) {
  const searchText = document.getElementById("search").value.toLowerCase();
  const keywords = ["defence", "army", "nda", "government", "education", "policy", "india", "international"];

  filteredNews = allNews.filter(item => {
    const title = item.title.toLowerCase();
    
    // 24-hour freshness check
    const pubTime = new Date(item.pubDate).getTime();
    if (Date.now() - pubTime > 24 * 60 * 60 * 1000) return false;

    // Search filter
    if (searchText && !title.includes(searchText)) return false;

    // Category filter
    if (currentCategory === "all") return keywords.some(k => title.includes(k));
    if (currentCategory === "india") return title.includes("india");
    if (currentCategory === "defence") return (title.includes("army") || title.includes("defence") || title.includes("war"));
    if (currentCategory === "world") return (title.includes("world") || title.includes("international") || title.includes("us") || title.includes("china"));
    
    return true;
  });

  if (isNewLoad) {
    document.getElementById("news").innerHTML = "";
    lastRenderedIndex = 0;
    visibleCount = 10;
  }
  
  renderNews();
}

// 3. RENDERING ENGINE (Draws the cards)
function renderNews() {
  const container = document.getElementById("news");
  const saved = JSON.parse(localStorage.getItem("savedNews")) || [];

  // Slice ONLY the next batch of items
  const itemsToAppend = filteredNews.slice(lastRenderedIndex, visibleCount);

  if (itemsToAppend.length === 0 && lastRenderedIndex === 0) {
    container.innerHTML = "<p class='empty'>No matching news for this category today.</p>";
    return;
  }

  itemsToAppend.forEach(item => {
    const parts = item.title.split(" - ");
    const cleanTitle = parts[0];
    const source = parts[1] || "News Feed";
    const isSaved = saved.some(s => s.link === item.link);
    
    const isBreaking = ["breaking", "war", "attack", "crisis"].some(w => item.title.toLowerCase().includes(w));

    const div = document.createElement("div");
    div.className = "card";

    // Build Card HTML
    div.innerHTML = `
      ${item.thumbnail ? `<img src="${item.thumbnail}" onerror="this.remove()">` : ''}
      <div class="card-content">
        <h3><a href="${item.link}" target="_blank">${cleanTitle}</a></h3>
        <div class="meta">
          <span class="source">${source}</span> • 
          <span class="date">${new Date(item.pubDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <p class="desc">${(item.description || "").replace(/<[^>]+>/g, "").slice(0, 110)}...</p>
        <button class="save-btn" onclick="toggleSave('${item.link}', \`${cleanTitle.replace(/'/g, "\\'")}\`)">
          ${isSaved ? "❌ Remove" : "⭐ Save"}
        </button>
      </div>
    `;

    // Apply special styles
    if (isBreaking) {
      div.classList.add("breaking-news");
      div.style.borderLeft = "4px solid #ff4b2b";
      div.style.background = "rgba(255, 75, 43, 0.05)";
    }

    container.appendChild(div);
  });

  lastRenderedIndex = visibleCount;
  document.getElementById("last").innerText = "Updated: " + new Date().toLocaleTimeString();
}

// 4. INFINITE SCROLL (Optimized)
window.addEventListener("scroll", () => {
  if (isLoadingMore) return;

  // Trigger when 300px from bottom
  if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 300)) {
    if (visibleCount < filteredNews.length) {
      isLoadingMore = true;
      visibleCount += 10;
      
      // Artificial delay for smooth UX
      setTimeout(() => {
        renderNews();
        isLoadingMore = false;
      }, 400);
    }
  }
});

// 5. UTILITIES
function setCategory(cat) {
  if (currentCategory === cat) return;
  currentCategory = cat;
  applyFilters(true); // Reset and re-render
}

function toggleSave(link, title) {
  let saved = JSON.parse(localStorage.getItem("savedNews")) || [];
  const exists = saved.findIndex(s => s.link === link);

  if (exists > -1) {
    saved.splice(exists, 1);
  } else {
    saved.push({ link, title });
  }

  localStorage.setItem("savedNews", JSON.stringify(saved));
  loadSavedNews(); // Sync the sidebar/saved list
  
  // Instant button feedback
  event.target.innerText = exists > -1 ? "⭐ Save" : "❌ Remove";
}

function loadSavedNews() {
  const savedContainer = document.getElementById("saved");
  if (!savedContainer) return;
  const saved = JSON.parse(localStorage.getItem("savedNews")) || [];
  
  savedContainer.innerHTML = saved.length ? "" : "<p>Empty</p>";
  saved.forEach(item => {
    const div = document.createElement("div");
    div.className = "saved-item";
    div.innerHTML = `
      <a href="${item.link}" target="_blank">${item.title}</a>
      <button onclick="toggleSave('${item.link}', \`${item.title.replace(/'/g, "\\'")}\`)">×</button>
    `;
    savedContainer.appendChild(div);
  });
}

// Start
fetchNews();
loadSavedNews();
setInterval(fetchNews, 300000); // 5-minute auto-refresh
