document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("now-playing");
    const elArt = document.getElementById("np-art");
    const elTrack = document.getElementById("np-track");
    const elArtist = document.getElementById("np-artist");
    const elAlbum = document.getElementById("np-album");
    const elTime = document.getElementById("np-time");
    const elPlayBtn = document.getElementById("inline-play-button");
    const audio = document.getElementById("bg-audio-1");

    let lastTrackKey = null;
    let currentTrackInfo = {};
    let isPlaying = false;
    let workingServerIndex = null;
    let trackIdCache = {};
    let audioLoading = false;

    const servers = [
        "https://hifi.geeked.wtf",
        "https://hifi-one.spotisaver.net",
        "https://hifi-two.spotisaver.net"
    ];

    function fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
    }

    function formatTimeAgo(uts) {
        if (!uts) return "Now playing";
        const diffSeconds = Math.floor((Date.now() / 1000) - uts);
        if (diffSeconds < 60) return "Just now";
        const minutes = Math.floor(diffSeconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }

    function updateTimer() {
        if (!currentTrackInfo.uts) {
            elTime.textContent = "Now playing";
        } else {
            elTime.textContent = formatTimeAgo(currentTrackInfo.uts);
        }
        elTime.classList.remove('fade-in');
        void elTime.offsetWidth;
        elTime.classList.add('fade-in');
    }

    function renderMetadata(info) {
        container.classList.remove('skeleton');

        const artistEnc = encodeURIComponent(info.artist);
        const albumEnc = encodeURIComponent(info.album);

        const updateText = (el, text, href) => {
            el.classList.remove('fade-in');
            setTimeout(() => {
                el.textContent = text;
                if (href) el.href = href;
                void el.offsetWidth;
                el.classList.add('fade-in');
            }, 100);
        };

        updateText(elTrack, info.name, info.url);
        updateText(elArtist, info.artist, `https://www.last.fm/music/${artistEnc}`);
        updateText(elAlbum, info.album, `https://www.last.fm/music/${artistEnc}/${albumEnc}`);

        elArt.classList.remove('loaded');
        if (info.image) {
            const newImg = new Image();
            newImg.src = info.image;
            newImg.onload = () => { elArt.src = newImg.src; elArt.classList.add('loaded'); };
            newImg.onerror = () => { elArt.classList.add('loaded'); };
        } else {
            elArt.classList.add('loaded');
        }

        // Always show play button once we have metadata
        elPlayBtn.classList.add('visible');
        updatePlayBtnState();
        updateTimer();
    }

    function updatePlayBtnState() {
        if (audioLoading) {
            elPlayBtn.textContent = "...";
            elPlayBtn.title = "Loading...";
        } else if (isPlaying) {
            elPlayBtn.textContent = "❚❚";
            elPlayBtn.title = "Pause";
        } else {
            elPlayBtn.textContent = "▶";
            elPlayBtn.title = "Play Preview";
        }
    }

    // ── Audio ──

    async function checkServerForTrack(server, trackId) {
        const url = `${server}/track/?id=${trackId}&quality=LOW`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error("Track fetch failed");
        const data = await res.json();
        if (data?.data?.manifest) {
            const manifest = JSON.parse(atob(data.data.manifest));
            if (manifest.urls?.length > 0) return manifest.urls[0];
        }
        if (data?.length >= 3 && data[2]?.OriginalTrackUrl) return data[2].OriginalTrackUrl;
        throw new Error("Invalid track data");
    }

    async function searchAndGetUrl(server, term) {
        const res = await fetchWithTimeout(`${server}/search/?s=${encodeURIComponent(term)}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        const items = data.data?.items || data.items;
        if (items?.length > 0) {
            const id = items[0].id;
            const audioUrl = await checkServerForTrack(server, id);
            if (audioUrl) { trackIdCache[term] = id; return audioUrl; }
        }
        return null;
    }

    async function findAudioUrl(trackKey) {
        if (trackIdCache[trackKey] && workingServerIndex !== null) {
            try { const url = await checkServerForTrack(servers[workingServerIndex], trackIdCache[trackKey]); if (url) return url; } catch (e) {}
        }
        if (workingServerIndex !== null) {
            try { const url = await searchAndGetUrl(servers[workingServerIndex], trackKey); if (url) return url; } catch (e) { workingServerIndex = null; }
        }
        for (let i = 0; i < servers.length; i++) {
            try { const url = await searchAndGetUrl(servers[i], trackKey); if (url) { workingServerIndex = i; return url; } } catch (e) { continue; }
        }
        throw new Error("Audio not found on any server");
    }

    async function togglePlayback() {
        if (!lastTrackKey) return;

        // If already playing, just pause/resume
        if (audio.src && audio.src !== '' && !audioLoading) {
            if (isPlaying) {
                audio.pause();
            } else {
                audio.play().catch(() => {});
            }
            return;
        }

        // First click — fetch streaming link now
        if (audioLoading) return;
        audioLoading = true;
        updatePlayBtnState();

        try {
            const url = await findAudioUrl(lastTrackKey);
            audio.src = url;
            audio.volume = 1;
            await audio.play();
            setupMediaSession();
        } catch (err) {
            console.warn('Audio not available:', err.message);
            elPlayBtn.textContent = "✕";
            setTimeout(() => { updatePlayBtnState(); }, 1500);
        } finally {
            audioLoading = false;
            updatePlayBtnState();
        }
    }

    audio.addEventListener('play', () => {
        isPlaying = true;
        updatePlayBtnState();
        document.dispatchEvent(new CustomEvent('sidebar-audio-play'));
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });
    audio.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayBtnState();
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    });

    function setupMediaSession() {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrackInfo.name,
            artist: currentTrackInfo.artist,
            album: currentTrackInfo.album,
        });
        navigator.mediaSession.setActionHandler('play', () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    }

    // ── Track updates from shared poller ──

    function handleTrackUpdate(track) {
        const trackKey = `${track.artist["#text"]} ${track.name}`.replace(/\s+/g, '+');
        const isNowPlaying = track['@attr']?.nowplaying === 'true';
        const uts = isNowPlaying ? null : track.date?.uts;

        if (trackKey === lastTrackKey) {
            currentTrackInfo.uts = uts;
            updateTimer();
            return;
        }

        const wasPlaying = isPlaying;
        const img = track.image?.find(i => i.size === "extralarge")?.["#text"] || track.image?.at(-1)?.["#text"] || "";

        currentTrackInfo = {
            name: track.name,
            artist: track.artist["#text"],
            album: track.album["#text"],
            image: img,
            url: track.url,
            uts: uts
        };

        lastTrackKey = trackKey;
        renderMetadata(currentTrackInfo);

        // If track changed and was playing, auto-load new track audio
        if (wasPlaying && !audioLoading) {
            audioLoading = true;
            updatePlayBtnState();
            findAudioUrl(trackKey)
                .then(url => {
                    audio.src = url;
                    audio.volume = 1;
                    return audio.play();
                })
                .then(() => setupMediaSession())
                .catch(err => console.warn('Audio not available:', err.message))
                .finally(() => { audioLoading = false; updatePlayBtnState(); });
        } else {
            // Reset audio state for new track — will fetch on click
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            isPlaying = false;
            updatePlayBtnState();
        }
    }

    elPlayBtn.addEventListener('click', togglePlayback);

    document.addEventListener('lastfm-update', (e) => {
        if (e.detail?.track) handleTrackUpdate(e.detail.track);
    });

    // Stop sidebar audio when scrobbles list starts playing
    document.addEventListener('scrobbles-audio-play', () => {
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            updatePlayBtnState();
        }
    });

    setInterval(updateTimer, 5000);
});
