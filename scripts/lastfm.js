let lastTrackId = null;
let lastTrackKey = null;  // artist + song name
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

    const timeStringWithZone = playedDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZoneName: 'short'
    });

    const match = timeStringWithZone.match(/^(\d{2}:\d{2})\s*(\w{2,5})$/);
    const formattedTime = match ? match[1] : playedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const tzAbbr = match ? match[2] : "";

    let timeAgo = `at ${formattedTime} ${tzAbbr}, `;

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

function updateMediaSessionMetadata(track) {
    if (!('mediaSession' in navigator)) return;

    const name = track.name;
    const artist = track.artist["#text"];
    const album = track.album["#text"];
    const image = track.image.find(img => img.size === "extralarge")?.["#text"] || "";

    navigator.mediaSession.metadata = new MediaMetadata({
        title: name,
        artist: artist,
        album: album,
        artwork: image ? [
            { src: image, sizes: '300x300', type: 'image/png' }
        ] : []
    });
}

function fetchNowPlaying() {
    fetch("https://lastplayed.prigoana.com/eduardprigoana/")
        .then(response => response.json())
        .then(data => {
            const track = data.track;
            const trackId = track.mbid || (track.name + track.artist["#text"]);
            const trackKey = [...track.artist["#text"].split(' '), ...track.name.split(' ')].join('+');

            const uts = track.date?.uts;

            if (trackId === lastTrackId) return;

            lastTrackId = trackId;
            lastTrackKey = trackKey;  // Update here every time song changes
            lastUts = uts;

            // Expose lastTrackKey globally for music.js
            window.lastTrackKey = lastTrackKey;

            const name = track.name;
            const artist = track.artist["#text"];
            const album = track.album["#text"];
            const image = track.image.find(img => img.size === "extralarge")?.["#text"] || "";
            const url = track.url;

            // Expose current track info globally for music.js metadata update
            window.currentTrackInfo = {
                name,
                artist,
                album,
                image,
                url
            };

            const nowPlaying = document.getElementById("now-playing");
            nowPlaying.style.opacity = 0;

            const updateDOM = () => {
                nowPlaying.innerHTML = `
                    <a href="${url}">
                        <p><strong>${name}</strong> by <strong>${artist}</strong></p>
                        <p><strong>${album}</strong></p>
                        ${image ? `<img src="${image}" alt="${name}" style="max-width:235px;">` : ""}
                        <div class="played-info">${uts ? formatTimeAgo(uts) : "<p><em>Now playing</em></p>"}</div>
                    </a>
                `;
                nowPlaying.style.opacity = 1;

                //updateMediaSessionMetadata(track);
            };

            if (image) {
                const img = new Image();
                img.src = image;
                img.onload = () => setTimeout(updateDOM, 300);
                img.onerror = () => setTimeout(updateDOM, 300);
            } else {
                setTimeout(updateDOM, 300);
            }
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
