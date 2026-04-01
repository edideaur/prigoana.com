const apiUrl = "https://121124.prigoana.com/prigoana.com/";
const countElement = document.getElementById("visitor-count");

async function fetchVisitorCount() {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20000);
    const response = await fetch(apiUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const formattedCount = new Intl.NumberFormat().format(data.count);

    countElement.textContent = `You're visitor no. ${formattedCount}`;
  } catch (error) {
    countElement.innerHTML = `<span class="placeholder">Visitor count unavailable.</span>`;
    console.error("Error fetching visitor count:", error);
  }
}

fetchVisitorCount();
