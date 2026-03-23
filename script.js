let currentCategory = "all";

function setCategory(cat) {
  currentCategory = cat;
  fetchNews();
}
async function fetchNews() {
  try {
    const res = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"
    );

    const data = await res.json();

    const container = document.getElementById("news");
    container.innerHTML = "";

    const keywords = ["defence", "army", "nda", "government", "education", "policy", "india", "international"];
let count = 0;
data.items.forEach(item => {
  const title = item.title.toLowerCase();

  let isRelevant = keywords.some(k => title.includes(k));

if (currentCategory === "india") {
  isRelevant = title.includes("india");
}

if (currentCategory === "defence") {
  isRelevant = title.includes("army") || title.includes("defence");
}

if (currentCategory === "world") {
  isRelevant = title.includes("world") || title.includes("international");
}

if (!isRelevant) return;

  if (!isRelevant) return;
      const div = document.createElement("div");
div.className = "card";
      const date = new Date(item.pubDate).toLocaleString();

div.innerHTML = `
  <img src="${item.thumbnail || ''}" onerror="this.remove()">

  <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>

  <p style="font-size:13px; opacity:0.8;">
    ${(item.description || "").replace(/<[^>]+>/g, "").slice(0, 120)}...
  </p>

  <p style="font-size:12px; opacity:0.6;">${date}</p>
`;
if (count < 3) {
  div.style.border = "2px solid #38bdf8";
  div.style.background = "#1e3a5f";

  div.innerHTML = `
    <p style="color:#38bdf8; font-size:12px;">🔥 Important</p>
  ` + div.innerHTML;

  count++;
}
      container.appendChild(div);
    });
document.getElementById("last").innerText =
  "Last updated: " + new Date().toLocaleTimeString();
  } catch (e) {
    document.getElementById("news").innerHTML = "Error loading news";
  }
}

fetchNews();

setInterval(fetchNews, 300000);
