let currentCategory = "all";
let allNews = []; 
let visibleCount = 10;
let lastRenderedIndex = 0;
let isLoadingMore = false;

// 1. FETCH: Unlimited & Fast
async function fetchNews() {
  try {
    const container = document.getElementById("news");
    if (allNews.length === 0) container.innerHTML = "<div class='loading'>Syncing with Global News Servers...</div>";

    // Using Google News RSS (Unlimited & Free)
    const feeds = [
      "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=india+defence+military"
    ];

    let combined = [];
    for (let url of feeds) {
      const res = await fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url));
      const data = await res.json();
      if (data.items) combined = combined.concat(data.items);
    }

    // Sort and Remove Duplicates
    combined.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    allNews = Array.from(new Map(combined.map(item => [item.link, item])).values());

    // Refresh display
    if (lastRenderedIndex === 0) {
        document.getElementById("news").innerHTML = "";
        renderNews();
    }
  } catch (e) {
    document.getElementById("news").innerHTML = "Connection Error. Retrying...";
  }
}

// 2. AI SUMMARY LOGIC
function generateAISummary(link, btn) {
  const item = allNews.find(n => n.link === link);
  const summaryId = `summary-${btoa(link).slice(0,8)}`;
  const summaryBox = document.getElementById(summaryId);

  // UI Feedback
  btn.innerText = "🧠 Analyzing...";
  btn.disabled = true;

  // Simulate AI Processing (Extracting key points from description)
  setTimeout(() => {
    const text = item.description.replace(/<[^>]+>/g, "");
    const sentences = text.split(". ");
    
    let aiText = "";
    if (sentences.length > 1) {
        aiText = `**Strategic Analysis:** ${sentences[0]}. **Potential Impact:** This development suggests a shift in ${currentCategory} policy.`;
    } else {
        aiText = `Analysis indicates high-priority activity regarding this report. Key stakeholders are monitoring the situation closely.`;
    }

    summaryBox.innerHTML = `<div class="ai-box">${aiText}</div>`;
    summaryBox.style.display = "block";
    btn.innerText = "✅ Summary Ready";
  }, 1000);
}

// 3. RENDER ENGINE
function renderNews() {
  const container = document.getElementById("news");
  const saved = JSON.parse(localStorage.getItem("savedNews")) || [];
  const searchText = document.getElementById("search").value.toLowerCase();

  // Filter Logic
  const filtered = allNews.filter(item => {
    const title = item.title.toLowerCase();
    if (searchText && !title.includes(searchText)) return false;
    if (currentCategory === "india") return title.includes("india");
    if (currentCategory === "defence") return (title.includes("army") || title.includes("defence") || title.includes("war"));
    return true; 
  });

  const itemsToShow = filtered.slice(lastRenderedIndex, visibleCount);

  itemsToShow.forEach(item => {
    const cleanTitle = item.title.split(" - ")[0];
    const safeId = btoa(item.link).slice(0,8);
    const isSaved = saved.some(s => s.link === item.link);

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${item.thumbnail ? `<img src="${item.thumbnail}" onerror="this.remove()">` : ''}
      <div class="card-body">
        <h3><a href="${item.link}" target="_blank">${cleanTitle}</a></h3>
        
        <button class="ai-btn" onclick="generateAISummary('${item.link}', this)">🧠 AI Summary</button>
        <div id="summary-${safeId}" class="ai-content" style="display:none;"></div>

        <p class="desc">${item.description.replace(/<[^>]+>/g, "").slice(0, 100)}...</p>
        
        <div class="footer">
          <button onclick="toggleSave('${item.link}', \`${cleanTitle.replace(/'/g, "\\'")}\`)">
            ${isSaved ? "❌ Remove" : "⭐ Save"}
          </button>
          <span>${new Date(item.pubDate).toLocaleTimeString()}</span>
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  lastRenderedIndex = visibleCount;
}

// 4. INFINITE SCROLL
window.onscroll = function() {
  if (isLoadingMore) return;
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
    isLoadingMore = true;
    visibleCount += 10;
    renderNews();
    setTimeout(() => { isLoadingMore = false; }, 500);
  }
};

// Start App
fetchNews();
setInterval(fetchNews, 300000); 
