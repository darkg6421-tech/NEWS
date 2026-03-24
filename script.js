// 🔥 MENU TOGGLE
function toggleMenu() {
  const menu = document.getElementById("menu");

  if (menu.style.left === "0px") {
    menu.style.left = "-220px";
  } else {
    menu.style.left = "0px";
  }
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
  }

  document.getElementById("menu").style.left = "-220px";
}

// 🔥 CATEGORY
let currentCategory = "all";

function setCategory(cat) {
  currentCategory = cat;
  fetchNews();
}

// 🔥 FETCH NEWS
async function fetchNews() {
  try {
    document.getElementById("news").innerHTML = "Loading news...";

    const res = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent("https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en") +
      "&t=" + new Date().getTime()
    );

    const data = await res.json();

    const container = document.getElementById("news");
    container.innerHTML = "";

    const searchInput = document.getElementById("search");
    const searchText = searchInput ? searchInput.value.toLowerCase() : "";

    data.items.forEach(item => {

      const title = item.title.toLowerCase();

      let isRelevant = false;

      if (currentCategory === "all") isRelevant = true;
      if (currentCategory === "india") isRelevant = title.includes("india");
      if (currentCategory === "defence") isRelevant = title.includes("army") || title.includes("defence") || title.includes("war");
      if (currentCategory === "world") isRelevant = title.includes("world") || title.includes("international") || title.includes("us") || title.includes("china");

      if (searchText && !title.includes(searchText)) return;
      if (!isRelevant) return;

      // 🔥 TITLE + SOURCE SPLIT
      const parts = item.title.split(" - ");
      const cleanTitle = parts[0];
      const source = parts.length > 1 ? parts[1] : "Unknown";

      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <img src="${item.thumbnail || ''}" onerror="this.remove()">

        <h3><a href="${item.link}" target="_blank">${cleanTitle}</a></h3>

        <p style="font-size:11px; color:#38bdf8;">
          📰 Source: ${source}
        </p>

        <button onclick="toggleSave('${item.link}', \`${cleanTitle}\`)">
          ⭐ Save
        </button>

        <p style="font-size:12px; opacity:0.7;">
          ${new Date(item.pubDate).toLocaleString()}
        </p>
      `;

      container.appendChild(div);
    });

    document.getElementById("last").innerText =
      "Last updated: " + new Date().toLocaleTimeString();

  } catch (e) {
    document.getElementById("news").innerHTML = "Error loading news";
  }
}

// 🔥 SAVE / REMOVE
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
      <button onclick="toggleSave('${item.link}', \`${item.title}\`)">
        ❌ Remove
      </button>
    `;

    container.appendChild(div);
  });
}

// 🔥 INIT
fetchNews();
loadSavedNews();
