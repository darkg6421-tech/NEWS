let currentCategory = "all";

function setCategory(cat) {
  currentCategory = cat;
  fetchNews();
}
async function fetchNews() {
  try { 
    document.getElementById("news").innerHTML = "⏳ Loading news...";
    const res = await fetch(
  "https://api.rss2json.com/v1/api.json?rss_url=" +
  encodeURIComponent("https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en") +
  "&t=" + new Date().getTime()
);

    const data = await res.json();

    const container = document.getElementById("news");
    container.innerHTML = "";

    const keywords = ["defence", "army", "nda", "government", "education", "policy", "india", "international"];
let count = 0;
    const seen = new Set();
data.items.forEach(item => {
  const title = item.title.toLowerCase();
  if (seen.has(item.link)) return;
seen.add(item.link);
  const pubTime = new Date(item.pubDate).getTime();
const now = Date.now();

if (seen.has(item.link)) return;
seen.add(item.link);
const parts = item.title.split(" - ");
const cleanTitle = parts[0];
  const searchText = document.getElementById("search").value.toLowerCase();
  let isRelevant = false;

// ALL
if (currentCategory === "all") {
  isRelevant = keywords.some(k => title.includes(k));
}

// INDIA
if (currentCategory === "india") {
  isRelevant = title.includes("india");
}

// DEFENCE
if (currentCategory === "defence") {
  isRelevant = title.includes("army") 
            || title.includes("defence") 
            || title.includes("military") 
            || title.includes("war");
}

// WORLD
if (currentCategory === "world") {
  isRelevant = title.includes("world") 
            || title.includes("international") 
            || title.includes("us") 
            || title.includes("china");
}
if (searchText && !title.includes(searchText)) return;
if (!isRelevant) return;
      const div = document.createElement("div");
div.className = "card";
      const date = new Date(item.pubDate).toLocaleString();

div.innerHTML = `
  <img src="${item.thumbnail || ''}" onerror="this.remove()">

  <h3><a href="${item.link}" target="_blank">${cleanTitle}</a></h3>
<p style="font-size:11px; color:#94a3b8;">
  Source: ${parts.length > 1 ? parts[1] : "Unknown"}
</p>
  <p style="font-size:13px; opacity:0.8;">
    ${(item.description || "").replace(/<[^>]+>/g, "").slice(0, 120)}...
  </p>
count++;
  <p style="font-size:12px; opacity:0.6;">${date}</p>
`;
if (count < 3) {
  div.style.border = "2px solid #38bdf8";
  div.style.background = "#1e3a5f";

  div.innerHTML = `
    <p style="color:#38bdf8; font-size:12px;">🔥 Important</p>
  ` + div.innerHTML;

}
      if (count >= 10) return;
  container.appendChild(div);
  count++;
    });
    if (container.innerHTML === "") {
  container.innerHTML = "⚠️ No news found in this category";
}
document.getElementById("last").innerText =
  "Last updated: " + new Date().toLocaleTimeString();
  } catch (e) {
    document.getElementById("news").innerHTML = "Error loading news";
  }
}

fetchNews();

setInterval(fetchNews, 300000);
