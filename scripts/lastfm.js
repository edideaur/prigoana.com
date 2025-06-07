let lastTrackId = null;
let lastUts = null;
let updateInterval = null;

function formatTimeAgo(uts) {
    const playedDate = new Date(uts * 1000);
    const now = new Date();
    const diffMs = now - playedDate;
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedTime = playedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let timeAgo = `at ${formattedTime}, `;

    if (hours > 0) {
        timeAgo += `${hours} hour${hours !== 1 ? 's' : ''}, `;
    }
    if (minutes > 0) {
        timeAgo += `${minutes} minute${minutes !== 1 ? 's' : ''}, `;
    }

    timeAgo += `${seconds} second${seconds !== 1 ? 's' : ''} ago`;

    return `<p>${timeAgo}</p>`;
}

function updateTimer() {
    if (!lastUts) return;

    const nowPlaying = document.getElementById("now-playing");
    const timerEl = nowPlaying.querySelector(".played-info");
    if (timerEl) {
        timerEl.innerHTML = formatTimeAgo(lastUts);
    }
}

function fetchNowPlaying() {
    fetch("https://lastplayed.prigoana.com/eduardprigoana/")
        .then(response => response.json())
        .then(data => {
            const track = data.track;
            const trackId = track.mbid || (track.name + track.artist["#text"]);
            const uts = track.date?.uts;

            if (trackId === lastTrackId) return;

            lastTrackId = trackId;
            lastUts = uts;

            const name = track.name;
            const artist = track.artist["#text"];
            const album = track.album["#text"];
            const image = track.image.find(img => img.size === "extralarge")?.["#text"] || "";
            const url = track.url;

            const nowPlaying = document.getElementById("now-playing");
            nowPlaying.style.opacity = 0;

            setTimeout(() => {
                nowPlaying.innerHTML = `
                    <a href="${url}">
                        <p><strong>${name}</strong> by <strong>${artist}</strong></p>
                        <p><strong>${album}</strong></p>
                        ${image ? `<img src="${image}" alt="${name}" style="max-width:235px;">` : ""}
                        <div class="played-info">${uts ? formatTimeAgo(uts) : "<p><em>Now playing</em></p>"}</div>
                    </a>
                `;
                nowPlaying.style.opacity = 1;
            }, 300);
        })
        .catch(error => {
            document.getElementById("now-playing").textContent = "Could not load now playing info.";
            console.error("Now playing fetch error:", error);
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const nowPlaying = document.getElementById("now-playing");
    nowPlaying.style.transition = "opacity 0.3s ease";

    fetchNowPlaying();
    updateInterval = setInterval(updateTimer, 1000);
    setInterval(fetchNowPlaying, 10000);
});
