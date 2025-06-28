// URL of the count API
const apiUrl = "https://count.prigoana.com/prigoana.com/";

async function fetchVisitorCount() {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const count = data.count;
    document.getElementById("visitor-count").textContent = `You're visitor no. ${count}`;
  } catch (error) {
    document.getElementById("visitor-count").textContent = "Failed to load visitor count.";
    console.error("Error fetching visitor count:", error);
  }
}

fetchVisitorCount();
