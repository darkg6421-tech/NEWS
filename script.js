async function fetchNews() {
  try {
    const res = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"
    );

    const data = await res.json();

    const container = document.getElementById("news");
    container.innerHTML = "";

    data.items.slice(0, 10).forEach(item => {
      const div = document.createElement("div");

      div.innerHTML = `
  <img src="${item.thumbnail && item.thumbnail !== '' ? item.thumbnail : 'https://via.placeholder.com/300x180?text=No+Image'}" width="100%">
  <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
  <hr/>
`;

      container.appendChild(div);
    });
document.getElementById("last").innerText =
  "Last updated: " + new Date().toLocaleTimeString();
  } catch (e) {
    document.getElementById("news").innerHTML = "Error loading news";
  }
}

fetchNews();
