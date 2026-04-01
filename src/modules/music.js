document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("now-playing");
    const elArt = document.getElementById("np-art");
    const elTrack = document.getElementById("np-track");
    const elArtist = document.getElementById("np-artist");
    const elAlbum = document.getElementById("np-album");
    const elTime = document.getElementById("np-time");
    const elPlayBtn = document.getElementById("inline-play-button");
    const audioEls = [document.getElementById("bg-audio-1"), document.getElementById("bg-audio-2")];
    let activeAudioIdx = 0;

    let lastTrackKey = null;
    let currentTrackInfo = {};
    let isPlaying = false;
    let workingServerIndex = null;
    let trackIdCache = {};
    let audioLoading = false;
    let crossfadeTimer = null;

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
    }

    const textEls = [elTrack, elArtist, elAlbum, elTime];
    const artContainer = document.querySelector('.player-art-container');
    let isFirstRender = true;

    // Preload image, returns promise that resolves with loaded Image (or null)
    function preloadImage(src) {
        if (!src) return Promise.resolve(null);
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    // Run the visual crossfade — call this only when everything is ready
    function crossfadeVisuals(info, newImg) {
        const artistEnc = encodeURIComponent(info.artist);
        const albumEnc = encodeURIComponent(info.album);
        const wasFirst = isFirstRender;
        isFirstRender = false;

        // Art crossfade
        if (newImg) {
            if (!wasFirst && elArt.src && elArt.naturalWidth > 0) {
                const old = document.createElement('img');
                old.className = 'player-art-old';
                old.src = elArt.src;
                old.style.opacity = '1';
                artContainer.appendChild(old);
                elArt.style.opacity = '0';
                elArt.src = newImg.src;
                void elArt.offsetWidth;
                elArt.style.opacity = '1';
                old.style.opacity = '0';
                setTimeout(() => old.remove(), 650);
            } else {
                elArt.src = newImg.src;
                elArt.style.opacity = '1';
            }
        }

        const applyText = () => {
            elTrack.textContent = info.name;
            elTrack.href = info.url;
            elArtist.textContent = info.artist;
            elArtist.href = `https://www.last.fm/music/${artistEnc}`;
            elAlbum.textContent = info.album;
            elAlbum.href = `https://www.last.fm/music/${artistEnc}/${albumEnc}`;
            updateTimer();
            textEls.forEach(el => {
                el.classList.remove('fade-out');
                void el.offsetWidth;
                el.classList.add('fade-in');
            });
        };

        if (!wasFirst) {
            // Fade out old text, then swap and fade in
            textEls.forEach(el => {
                el.classList.remove('fade-in');
                void el.offsetWidth;
                el.classList.add('fade-out');
            });
            setTimeout(applyText, 350);
        } else {
            applyText();
        }
    }

    function renderMetadata(info) {
        container.classList.remove('skeleton');
        elPlayBtn.classList.add('visible');
        updatePlayBtnState();

        if (isFirstRender) {
            // First load: preload image then show everything at once
            preloadImage(info.image).then(img => {
                crossfadeVisuals(info, img);
            });
        }
        // Subsequent renders are triggered by handleTrackUpdate after audio is ready
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

    function activeAudio() { return audioEls[activeAudioIdx]; }
    function inactiveAudio() { return audioEls[1 - activeAudioIdx]; }

    function stopCrossfade() {
        if (crossfadeTimer) { clearInterval(crossfadeTimer); crossfadeTimer = null; }
    }

    // Crossfade from active → inactive, then swap which is active
    function audioCrossfade(newUrl) {
        stopCrossfade();
        const old = activeAudio();
        const next = inactiveAudio();
        activeAudioIdx = 1 - activeAudioIdx;

        next.src = newUrl;
        next.volume = 0;
        next.play().then(() => {
            const steps = 20;
            const stepTime = 40; // 800ms total
            let step = 0;
            const oldStartVol = old.volume;
            crossfadeTimer = setInterval(() => {
                step++;
                const t = step / steps;
                next.volume = Math.min(1, t);
                old.volume = Math.max(0, oldStartVol * (1 - t));
                if (step >= steps) {
                    stopCrossfade();
                    old.pause();
                    old.removeAttribute('src');
                    old.load();
                }
            }, stepTime);
            setupMediaSession();
        }).catch(() => {
            // Fallback: just hard-switch
            old.pause();
            old.removeAttribute('src');
            old.load();
            next.volume = 1;
            next.play().catch(() => {});
        });
    }

    async function togglePlayback() {
        if (!lastTrackKey) return;
        const audio = activeAudio();

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

    // Track play/pause on both audio elements
    audioEls.forEach(a => {
        a.addEventListener('play', () => {
            isPlaying = true;
            updatePlayBtnState();
            document.dispatchEvent(new CustomEvent('sidebar-audio-play'));
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        });
        a.addEventListener('pause', () => {
            // Only mark as not playing if the active audio is paused
            if (a === activeAudio()) {
                isPlaying = false;
                updatePlayBtnState();
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
            }
        });
    });

    function setupMediaSession() {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrackInfo.name,
            artist: currentTrackInfo.artist,
            album: currentTrackInfo.album,
        });
        navigator.mediaSession.setActionHandler('play', () => activeAudio().play());
        navigator.mediaSession.setActionHandler('pause', () => activeAudio().pause());
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

        if (wasPlaying && !audioLoading) {
            // Preload image + audio URL + buffer new track, then crossfade everything
            audioLoading = true;
            updatePlayBtnState();

            Promise.all([
                preloadImage(currentTrackInfo.image),
                findAudioUrl(trackKey)
            ]).then(([newImg, audioUrl]) => {
                // Buffer the new track on the inactive element
                const next = inactiveAudio();
                next.preload = 'auto';
                next.src = audioUrl;

                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => resolve([newImg, audioUrl]), 5000);
                    next.addEventListener('canplaythrough', () => {
                        clearTimeout(timeout);
                        resolve([newImg, audioUrl]);
                    }, { once: true });
                    next.addEventListener('error', () => {
                        clearTimeout(timeout);
                        reject(new Error('Buffer failed'));
                    }, { once: true });
                    next.load();
                });
            }).then(([newImg, audioUrl]) => {
                // Everything buffered — crossfade all at once
                crossfadeVisuals(currentTrackInfo, newImg);
                audioCrossfade(audioUrl);
            }).catch(err => {
                console.warn('Audio crossfade failed:', err.message);
                preloadImage(currentTrackInfo.image).then(img => {
                    crossfadeVisuals(currentTrackInfo, img);
                });
            }).finally(() => {
                audioLoading = false;
                updatePlayBtnState();
            });
        } else {
            // Not playing — preload image, then crossfade visuals only
            container.classList.remove('skeleton');
            elPlayBtn.classList.add('visible');

            preloadImage(currentTrackInfo.image).then(img => {
                crossfadeVisuals(currentTrackInfo, img);
            });

            // Reset both audio elements
            audioEls.forEach(a => {
                a.pause();
                a.removeAttribute('src');
                a.load();
            });
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
            stopCrossfade();
            audioEls.forEach(a => a.pause());
            isPlaying = false;
            updatePlayBtnState();
        }
    });

    setInterval(updateTimer, 5000);
});
