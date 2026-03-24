let currentCategory = "all";
let visibleCount = 10;
let allNews = [];
let lastRenderedIndex = 0;
let isLoadingMore = false;

// 🔥 MENU
function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.left = menu.style.left === "0px" ? "-220px" : "0px";
}

function showSection(section) {
  document.getElementById("homeSection").style.display = "none";
  document.getElementById("savedSection").style.display = "none";
  document.getElementById("premiumSection").style.display = "none";

  if (section === "home") document.getElementById("homeSection").style.display = "block";

  if (section === "saved") {
    document.getElementById("savedSection").style.display = "block";
    loadSavedNews();
  }

  if (section === "premium") {
    document.getElementById("premiumSection").style.display = "block";
    loadPremiumNews();
  }

  toggleMenu();
}

// 🔥 CATEGORY
function setCategory(cat) {
  currentCategory = cat;
  visibleCount = 10;
  lastRenderedIndex = 0;
  document.getElementById("news").innerHTML = "";
  fetchNews();
}

// 🔥 FETCH NEWS
async function fetchNews() {
  try { 
    document.getElementById("news").innerHTML = "Loading news...";

    const feeds = [
      "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=india",
      "https://news.google.com/rss/search?q=defence"
    ];

    let combined = [];

    for (let url of feeds) {
      const res = await fetch(
        "https://api.rss2json.com/v1/api.json?rss_url=" +
        encodeURIComponent(url) +
        "&t=" + new Date().getTime()
      );
      const data = await res.json();
      combined = combined.concat(data.items);
    }

    // 🔥 sort latest
    combined.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    allNews = combined;

    document.getElementById("news").innerHTML = "";
    lastRenderedIndex = 0;

    renderNews();

  } catch (e) {
    document.getElementById("news").innerHTML = "Error loading news";
  }
}

// 🔥 RENDER
function renderNews() {
  const container = document.getElementById("news");

  const keywords = ["defence", "army", "nda", "government", "education", "policy", "india", "international"];
  const saved = JSON.parse(localStorage.getItem("savedNews")) || [];

  let count = 0;
  const searchText = document.getElementById("search").value.toLowerCase();

  const items = allNews.slice(lastRenderedIndex, visibleCount);

  items.forEach(item => {

    const title = item.title.toLowerCase();

    const pubTime = new Date(item.pubDate).getTime();
    if (Date.now() - pubTime > 24 * 60 * 60 * 1000) return;

    let isRelevant = false;

    if (currentCategory === "all") {
      isRelevant = keywords.some(k => title.includes(k));
    }

    if (currentCategory === "india") {
      isRelevant = title.includes("india");
    }

    if (currentCategory === "defence") {
      isRelevant = title.includes("army") || title.includes("defence") || title.includes("war");
    }

    if (currentCategory === "world") {
      isRelevant = title.includes("world") || title.includes("international") || title.includes("us") || title.includes("china");
    }

    if (searchText && !title.includes(searchText)) return;
    if (!isRelevant) return;

    const parts = item.title.split(" - ");
    const cleanTitle = parts[0];
    const isSaved = saved.some(s => s.link === item.link);

    const breakingWords = ["breaking", "alert", "war", "attack", "crisis"];
    const isBreaking = breakingWords.some(word => title.includes(word));

    const div = document.createElement("div");
    div.className = "card";

    const date = new Date(item.pubDate).toLocaleString();

    div.innerHTML = `
      <img src="${item.thumbnail || ''}" onerror="this.remove()">
      <h3><a href="${item.link}" target="_blank">${cleanTitle}</a></h3>

      <button onclick="toggleSave('${item.link}', \`${cleanTitle}\`)">
        ${isSaved ? "❌ Remove" : "⭐ Save"}
      </button>

      <p style="font-size:11px; color:#94a3b8;">
        Source: ${parts.length > 1 ? parts[1] : "Unknown"}
      </p>

      <p style="font-size:13px; opacity:0.8;">
        ${(item.description || "").replace(/<[^>]+>/g, "").slice(0, 120)}...
      </p>

      <p style="font-size:12px; opacity:0.6;">${date}</p>
    `;

    if (isBreaking) {
      div.style.border = "2px solid red";
      div.style.background = "#3f1d1d";
      div.innerHTML = `<p style="color:red;">🚨 Breaking</p>` + div.innerHTML;
    } else if (count < 3) {
      div.style.border = "2px solid #38bdf8";
      div.style.background = "#1e3a5f";
      div.innerHTML = `<p style="color:#38bdf8;">🔥 Important</p>` + div.innerHTML;
      count++;
    }

    container.appendChild(div);
  });

  lastRenderedIndex = visibleCount;

  document.getElementById("last").innerText =
    "Last updated: " + new Date().toLocaleTimeString();
}

// 🔥 SAVE TOGGLE
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
}

// 🔥 LOAD SAVED
function loadSavedNews() {
  const savedContainer = document.getElementById("saved");
  if (!savedContainer) return;

  const saved = JSON.parse(localStorage.getItem("savedNews")) || [];

  savedContainer.innerHTML = "";

  if (saved.length === 0) {
    savedContainer.innerHTML = "<p class='empty'>No saved news yet</p>";
    return;
  }

  saved.forEach(item => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
      <button onclick="toggleSave('${item.link}', \`${item.title}\`)">
        ❌ Remove
      </button>
    `;

    savedContainer.appendChild(div);
  });
}

// 🔥 PREMIUM (OIL NEWS)
async function loadPremiumNews() {
  const container = document.getElementById("premium");
  container.innerHTML = "Loading premium news...";

  const res = await fetch(
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent("https://news.google.com/rss/search?q=oil")
  );

  const data = await res.json();

  container.innerHTML = "";

  data.items.slice(0, 10).forEach(item => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
    `;

    container.appendChild(div);
  });
}

// 🔥 INFINITE SCROLL
window.addEventListener("scroll", () => {
  if (isLoadingMore) return;

  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    isLoadingMore = true;
    visibleCount += 5;

    requestAnimationFrame(() => {
      renderNews();
      isLoadingMore = false;
    });
  }
});

// INIT
fetchNews();
loadSavedNews();
setInterval(fetchNews, 300000);
