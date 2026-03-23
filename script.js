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
  <img src="${item.thumbnail}" style="width:100%; height:180px; object-fit:cover;" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x180?text=No+Image';">
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
