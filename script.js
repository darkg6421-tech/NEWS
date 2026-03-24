// --- GLOBAL STATE ---
let currentCategory = "all";
let visibleCount = 10;
let allNews = [];
let lastRenderedIndex = 0;
let isLoadingMore = false;

// 1. FETCH NEWS (Unlimited RSS Engine)
async function fetchNews() {
  try {
    const container = document.getElementById("news");
    if (allNews.length === 0) {
      container.innerHTML = "<div class='loading-text'>Connecting to Global News Network...</div>";
    }

    const feeds = [
      "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=india",
      "https://news.google.com/rss/search?q=defence+army+military"
    ];

    let combined = [];

    for (let url of feeds) {
      const res = await fetch(
        "https://api.rss2json.com/v1/api.json?rss_url=" +
        encodeURIComponent(url) +
        "&t=" + new Date().getTime()
      );
      const data = await res.json();
      if (data.items) {
        combined = combined.concat(data.items);
      }
    }

    // Sort: Latest first (Your original logic)
    combined.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Remove duplicates based on URL to keep it clean
    allNews = Array.from(new Map(combined.map(item => [item.link, item])).values());

    // If it's the first load or a category change, clear and render
    if (lastRenderedIndex === 0) {
      container.innerHTML = "";
      renderNews();
    }

  } catch (e) {
    console.error("Fetch error:", e);
    document.getElementById("news").innerHTML = "<div class='error'>System Offline. Check Connection.</div>";
  }
}

// 2. SMART AI SUMMARY LOGIC
function generateAISummary(link, btn) {
  const item = allNews.find(n => n.link === link);
  const safeId = btoa(link).slice(0, 12).replace(/[^a-zA-Z0-0]/g, "");
  const summaryBox = document.getElementById(`ai-${safeId}`);

  btn.innerHTML = "<span>🧠 Analyzing...</span>";
  btn.disabled = true;

  setTimeout(() => {
    const text = (item.description || "").replace(/<[^>]+>/g, "");
    const title = item.title.toLowerCase();
    
    // Pattern Recognition for "Intelligence"
    let analysis = "";
    if (title.includes("defence") || title.includes("army") || title.includes("border")) {
      analysis = "Strategic security update. Military analysts are observing shifts in regional tactical positions.";
    } else if (title.includes("market") || title.includes("stock") || title.includes("economy")) {
      analysis = "Economic volatility detected. This development may impact sectoral growth and trade volumes.";
    } else if (title.includes("government") || title.includes("modi") || title.includes("bill")) {
      analysis = "Policy structural shift. Administrative changes aimed at long-term governance stability detected.";
    } else {
      analysis = "General intelligence brief. Situation is under observation by relevant stakeholders.";
    }

    const snippet = text.split(". ")[0] || "Details unfolding.";
    
    summaryBox.innerHTML = `
      <div class="ai-summary-box">
        <p><strong>Insight:</strong> ${analysis}</p>
        <p style="margin-top:8px; font-style:italic;"><strong>Core Fact:</strong> ${snippet}.</p>
      </div>
    `;
    summaryBox.style.display = "block";
    btn.innerHTML = "✅ Analysis Complete";
    btn.style.background = "#059669"; // Green success
  }, 1000);
}

// 3. RENDER NEWS (Original Logic + AI Integration)
function renderNews() {
  const container = document.getElementById("news");
  const keywords = ["defence", "army", "nda", "government", "education", "policy", "india", "international"];
  const saved = JSON.parse(localStorage.getItem("savedNews")) || [];
  const searchText = document.getElementById("search").value.toLowerCase();

  // Filter based on your original rules
  const filtered = allNews.filter(item => {
    const title = item.title.toLowerCase();
    
    // 24-hour freshness (Your original logic)
    const pubTime = new Date(item.pubDate).getTime();
    if (Date.now() - pubTime > 24 * 60 * 60 * 1000) return false;

    // Search filtering
    if (searchText && !title.includes(searchText)) return false;

    // Category filtering
    if (currentCategory === "all") return keywords.some(k => title.includes(k));
    if (currentCategory === "india") return title.includes("india");
    if (currentCategory === "defence") return (title.includes("army") || title.includes("defence") || title.includes("war"));
    if (currentCategory === "world") return (title.includes("world") || title.includes("international") || title.includes("us") || title.includes("china"));
    
    return true;
  });

  const itemsToAppend = filtered.slice(lastRenderedIndex, visibleCount);

  itemsToAppend.forEach((item, index) => {
    const parts = item.title.split(" - ");
    const cleanTitle = parts[0];
    const safeId = btoa(item.link).slice(0, 12).replace(/[^a-zA-Z0-0]/g, "");
    const isSaved = saved.some(s => s.link === item.link);

    // Breaking words logic (Your original logic)
    const breakingWords = ["breaking", "alert", "war", "attack", "crisis"];
    const isBreaking = breakingWords.some(word => item.title.toLowerCase().includes(word));

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      ${item.thumbnail ? `<img src="${item.thumbnail}" onerror="this.remove()">` : ''}
      <div class="card-content">
        <h3><a href="${item.link}" target="_blank">${cleanTitle}</a></h3>
        
        <div style="margin: 12px 0;">
            <button class="ai-btn" onclick="generateAISummary('${item.link}', this)">🧠 AI Summary</button>
            <div id="ai-${safeId}" style="display:none; margin-top:10px;"></div>
        </div>

        <div class="actions">
            <button class="save-btn" onclick="toggleSave('${item.link}', \`${cleanTitle.replace(/'/g, "\\'")}\`)">
                ${isSaved ? "❌ Remove" : "⭐ Save"}
            </button>
        </div>

        <p class="source-text">Source: ${parts[1] || "News Service"}</p>
        <p class="desc-text">${(item.description || "").replace(/<[^>]+>/g, "").slice(0, 115)}...</p>
        <p class="date-text">${new Date(item.pubDate).toLocaleString()}</p>
      </div>
    `;

    // Special styling (Your original logic)
    if (isBreaking) {
      div.classList.add("breaking-card");
      div.style.border = "2px solid #ff4444";
      div.style.background = "#2a0000";
      div.insertAdjacentHTML('afterbegin', `<p style="color:#ff4444; font-weight:bold; padding:10px 15px 0;">🚨 Breaking News</p>`);
    } else if (lastRenderedIndex + index < 3) {
      div.style.border = "2px solid #38bdf8";
      div.style.background = "#0f172a";
      div.insertAdjacentHTML('afterbegin', `<p style="color:#38bdf8; font-weight:bold; padding:10px 15px 0;">🔥 Priority Update</p>`);
    }

    container.appendChild(div);
  });

  lastRenderedIndex = visibleCount;
  document.getElementById("last").innerText = "Last sync: " + new Date().toLocaleTimeString();
}

// 4. INFINITE SCROLL & CATEGORY SWITCHING
window.addEventListener("scroll", () => {
  if (isLoadingMore) return;
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
    isLoadingMore = true;
    visibleCount += 10;
    renderNews();
    setTimeout(() => { isLoadingMore = false; }, 600);
  }
});

function setCategory(cat) {
  if (currentCategory === cat) return;
  currentCategory = cat;
  visibleCount = 10;
  lastRenderedIndex = 0;
  document.getElementById("news").innerHTML = "";
  renderNews();
}

// 5. SAVE & LOAD LOGIC
function toggleSave(link, title) {
  let saved = JSON.parse(localStorage.getItem("savedNews")) || [];
  const exists = saved.find(item => item.link === link);

  if (exists) {
    saved = saved.filter(item => item.link !== link);
  } else {
    saved.push({ link, title });
  }

  localStorage.setItem("savedNews", JSON.stringify(saved));
  loadSavedNews();
  
  // Instant UI refresh for the button
  event.target.innerText = exists ? "⭐ Save" : "❌ Remove";
}

function loadSavedNews() {
  const savedContainer = document.getElementById("saved");
  if (!savedContainer) return;

  const saved = JSON.parse(localStorage.getItem("savedNews")) || [];
  savedContainer.innerHTML = saved.length === 0 ? "<p class='empty-text'>No bookmarks yet.</p>" : "";

  saved.forEach(item => {
    const div = document.createElement("div");
    div.className = "saved-card";
    div.innerHTML = `
      <p><a href="${item.link}" target="_blank">${item.title}</a></p>
      <button onclick="toggleSave('${item.link}', \`${item.title.replace(/'/g, "\\'")}\`)">Remove</button>
    `;
    savedContainer.appendChild(div);
  });
}

// --- INITIALIZE APP ---
fetchNews();
loadSavedNews();
setInterval(fetchNews, 300000); // Background refresh every 5 mins
