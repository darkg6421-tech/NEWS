// 🔥 GLOBAL STATE
let currentCategory = "all";
let allNews = [];
let visibleCount = 10;
let isLoading = false;

// 🔥 MENU
function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.left = (menu.style.left === "0px") ? "-220px" : "0px";
}

// 🔥 SECTION SWITCH
function showSection(section) {
  document.getElementById("homeSection").style.display = "none";
  document.getElementById("savedSection").style.display = "none";
  document.getElementById("premiumSection").style.display = "none";

  if (section === "home") {
    document.getElementById("homeSection").style.display = "block";
  }
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
  renderNews(true);
}

// 🔥 FETCH MULTI SOURCE NEWS
async function fetchNews() {
  try {
    document.getElementById("news").innerHTML = "Loading news...";

    const feeds = [
      "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
      "https://news.google.com/rss/search?q=india",
      "https://news.google.com/rss/search?q=defence",
      "https://news.google.com/rss/search?q=oil"
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

    // 🔥 REMOVE DUPLICATE
    const seen = new Set();
    allNews = combined.filter(item => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    });

    // 🔥 SORT LATEST
    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    renderNews(true);

  } catch (e) {
    document.getElementById("news").innerHTML = "Error loading news";
  }
}

// 🔥 RENDER NEWS (NO SCROLL JUMP)
function renderNews(reset = false) {
  const container = document.getElementById("news");
  if (reset) container.innerHTML = "";

  const saved = JSON.parse(localStorage.getItem("savedNews")) || [];
  const search = document.getElementById("search").value.toLowerCase();

  let count = 0;

  const items = allNews.slice(0, visibleCount);

  items.forEach(item => {

    const title = item.title.toLowerCase();

    // 🔥 FILTER
    let ok = false;

    if (currentCategory === "all") ok = true;
    if (currentCategory === "india") ok = title.includes("india");
    if (currentCategory === "defence") ok = title.includes("army") || title.includes("defence") || title.includes("war");
    if (currentCategory === "world") ok = title.includes("world") || title.includes("international");

    if (!ok) return;
    if (search && !title.includes(search)) return;

    const parts = item.title.split(" - ");
    const clean = parts[0];
    const isSaved = saved.some(s => s.link === item.link);

    const breaking = ["breaking","war","attack","crisis"].some(w => title.includes(w));

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <img src="${item.thumbnail || ''}" onerror="this.remove()">

      <h3><a href="${item.link}" target="_blank">${clean}</a></h3>

      <button onclick="toggleSave('${item.link}', \`${clean}\`)">
        ${isSaved ? "❌ Remove" : "⭐ Save"}
      </button>

      <p style="font-size:12px;opacity:0.7;">
        ${new Date(item.pubDate).toLocaleString()}
      </p>
    `;

    // 🔥 BREAKING
    if (breaking) {
      div.style.border = "2px solid red";
      div.innerHTML = `<p style="color:red;">🚨 Breaking</p>` + div.innerHTML;
    }

    // 🔥 IMPORTANT TOP 3
    else if (count < 3) {
      div.style.border = "2px solid #38bdf8";
      div.innerHTML = `<p style="color:#38bdf8;">🔥 Important</p>` + div.innerHTML;
      count++;
    }

    container.appendChild(div);
  });

  document.getElementById("last").innerText =
    "Last updated: " + new Date().toLocaleTimeString();
}

// 🔥 INFINITE SCROLL FIXED
window.addEventListener("scroll", () => {
  if (isLoading) return;

  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 150) {
    isLoading = true;
    visibleCount += 5;

    setTimeout(() => {
      renderNews(true);
      isLoading = false;
    }, 300);
  }
});

// 🔥 SAVE
function toggleSave(link, title) {
  let saved = JSON.parse(localStorage.getItem("savedNews")) || [];

  const exists = saved.find(x => x.link === link);

  if (exists) {
    saved = saved.filter(x => x.link !== link);
  } else {
    saved.push({ link, title });
  }

  localStorage.setItem("savedNews", JSON.stringify(saved));

  loadSavedNews();
  renderNews(true);
}

// 🔥 LOAD SAVED
function loadSavedNews() {
  const container = document.getElementById("saved");
  if (!container) return;

  const saved = JSON.parse(localStorage.getItem("savedNews")) || [];

  container.innerHTML = "";

  if (saved.length === 0) {
    container.innerHTML = "<p>No saved news</p>";
    return;
  }

  saved.forEach(item => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
      <button onclick="toggleSave('${item.link}', \`${item.title}\`)">❌ Remove</button>
    `;

    container.appendChild(div);
  });
}

// 🔥 PREMIUM (OIL NEWS)
function loadPremiumNews() {
  const container = document.getElementById("premium");
  container.innerHTML = "";

  const oilNews = allNews.filter(n =>
    n.title.toLowerCase().includes("oil")
  ).slice(0, 10);

  oilNews.forEach(item => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
    `;

    container.appendChild(div);
  });
}

// 🔥 INIT
fetchNews();
loadSavedNews();
