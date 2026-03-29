(() => {
    document.addEventListener("DOMContentLoaded", () => {
        const audio1 = document.getElementById("bg-audio-1");
        const audio2 = document.getElementById("bg-audio-2");
        const container = document.getElementById("now-playing");
        const elArt = document.getElementById("np-art");
        const elTrack = document.getElementById("np-track");
        const elArtist = document.getElementById("np-artist");
        const elAlbum = document.getElementById("np-album");
        const elTime = document.getElementById("np-time");
        const elPlayBtn = document.getElementById("inline-play-button");

        audio1.muted = true;
        audio2.muted = true;
        audio1.volume = 0;
        audio2.volume = 0;

        let activeAudioEl = audio1;
        let nextAudioEl = audio2;
        let lastTrackKey = null;
        let isPlaying = false;
        let isInitialized = false;
        let currentTrackInfo = {};
        let workingServerIndex = null;
        let trackIdCache = {};
        let hasAudioSource = false;
        let audioUrl = null;
        let fadeTimer = null;
        let isFirstLoad = true;

        const FADE_DURATION_MS = 2000;
        const FADE_INTERVAL_MS = 50;
        const FADE_STEP = FADE_INTERVAL_MS / FADE_DURATION_MS;
        const LASTFM_USER = "eduardprigoana";
        const LASTFM_API_KEY = "816cfe50ddeeb73c9987b85de5c19e71";
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
            const playedDate = new Date(uts * 1000);
            const now = new Date();
            const diffSeconds = Math.floor((now - playedDate) / 1000);

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
                newImg.onload = () => {
                    elArt.src = newImg.src;
                    elArt.classList.add('loaded');
                };
                newImg.onerror = () => {
                    elArt.classList.add('loaded');
                };
            } else {
                elArt.classList.add('loaded');
            }

            updateTimer();
        }

        function setPlayButtonState(available) {
            if (available) {
                elPlayBtn.classList.add('visible');
                elPlayBtn.textContent = isPlaying ? "❚❚" : "▶";
                elPlayBtn.title = isPlaying ? "Pause" : "Play Preview";
            } else {
                elPlayBtn.classList.remove('visible');
            }
        }

        async function findAudioUrl(trackKey) {
            if (trackIdCache[trackKey] && workingServerIndex !== null) {
                try {
                    const url = await checkServerForTrack(servers[workingServerIndex], trackIdCache[trackKey]);
                    if (url) return url;
                } catch (e) {
                    console.warn('Cached track failed:', e);
                }
            }

            if (workingServerIndex !== null) {
                try {
                    const url = await searchAndGetUrl(servers[workingServerIndex], trackKey);
                    if (url) return url;
                } catch (e) {
                    workingServerIndex = null;
                }
            }

            for (let i = 0; i < servers.length; i++) {
                try {
                    const url = await searchAndGetUrl(servers[i], trackKey);
                    if (url) {
                        workingServerIndex = i;
                        return url;
                    }
                } catch (e) {
                    continue;
                }
            }
            throw new Error("Audio not found on any server");
        }

        async function checkServerForTrack(server, trackId) {
            const url = `${server}/track/?id=${trackId}&quality=LOW`;
            const res = await fetchWithTimeout(url);
            if (!res.ok) throw new Error("Track fetch failed");
            const data = await res.json();

            if (data && data.data && data.data.manifest) {
                const manifestJson = atob(data.data.manifest);
                const manifest = JSON.parse(manifestJson);
                if (manifest.urls && manifest.urls.length > 0) {
                    return manifest.urls[0];
                }
            }

            if (data && data.length >= 3 && data[2]?.OriginalTrackUrl) {
                return data[2].OriginalTrackUrl;
            }

            throw new Error("Invalid track data");
        }

        async function searchAndGetUrl(server, term) {
            const searchUrl = `${server}/search/?s=${encodeURIComponent(term)}`;
            const res = await fetchWithTimeout(searchUrl);
            if (!res.ok) throw new Error("Search failed");
            const data = await res.json();
            
            const items = data.data?.items || data.items;
            
            if (items && items.length > 0) {
                const id = items[0].id;
                const audioUrl = await checkServerForTrack(server, id);
                if (audioUrl) {
                    trackIdCache[term] = id;
                    return audioUrl;
                }
            }
            return null;
        }

        async function prepareAudio(url) {
            return new Promise((resolve, reject) => {
                nextAudioEl.src = url;
                nextAudioEl.load();

                const onCanPlay = () => {
                    cleanup();
                    resolve();
                };
                const onError = (e) => {
                    cleanup();
                    reject(e);
                };
                const cleanup = () => {
                    nextAudioEl.removeEventListener('canplaythrough', onCanPlay);
                    nextAudioEl.removeEventListener('error', onError);
                };

                nextAudioEl.addEventListener('canplaythrough', onCanPlay, { once: true });
                nextAudioEl.addEventListener('error', onError, { once: true });
            });
        }

        function togglePlayback() {
            if (!hasAudioSource || !audioUrl) return;

            if (!isInitialized) {
                [activeAudioEl, nextAudioEl] = [nextAudioEl, activeAudioEl];

                activeAudioEl.volume = 1;
                activeAudioEl.muted = false;
                activeAudioEl.play()
                    .then(() => {
                        isPlaying = true;
                        isInitialized = true;
                        setPlayButtonState(true);
                        setupMediaSession();
                    })
                    .catch(e => console.error('Playback failed:', e));
            } else {
                if (isPlaying) {
                    activeAudioEl.pause();
                } else {
                    activeAudioEl.play().catch(e => console.error('Play failed:', e));
                }
            }
        }

        function performCrossfade() {
            if (fadeTimer) {
                clearInterval(fadeTimer);
                fadeTimer = null;
            }

            const fadingOut = activeAudioEl;
            const fadingIn = nextAudioEl;

            fadingIn.volume = 0;
            fadingIn.muted = false;
            fadingIn.play().catch(e => console.error('Crossfade play failed:', e));

            let vol = 0;

            fadeTimer = setInterval(() => {
                vol += FADE_STEP;
                if (vol >= 1) {
                    vol = 1;
                    clearInterval(fadeTimer);
                    fadeTimer = null;
                    fadingOut.pause();
                    fadingOut.currentTime = 0;
                    fadingOut.muted = true;
                    fadingOut.volume = 0;

                    activeAudioEl = fadingIn;
                    nextAudioEl = fadingOut;

                    isPlaying = true;
                    setPlayButtonState(true);
                }
                fadingIn.volume = vol;
                fadingOut.volume = Math.max(0, 1 - vol);
            }, FADE_INTERVAL_MS);
        }

        async function fetchLastFmData(forcePlay = false) {
            try {
                const url = `https://ws.audioscrobbler.com/2.0/?method=User.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json&limit=1`;
                const res = await fetchWithTimeout(url);
                const data = await res.json();

                if (!data.recenttracks || !data.recenttracks.track.length) return;

                const track = data.recenttracks.track[0];
                const trackKey = `${track.artist["#text"]} ${track.name}`.replace(/\s+/g, '+');
                const isNowPlaying = track['@attr']?.nowplaying === 'true';
                const uts = isNowPlaying ? null : track.date?.uts;

                if (trackKey === lastTrackKey) {
                    currentTrackInfo.uts = uts;
                    updateTimer();
                    return;
                }

                const wasPlaying = isPlaying;

                let img = track.image.find(i => i.size === "extralarge")?.["#text"] || track.image.at(-1)?.["#text"];

                const trackInfo = {
                    name: track.name,
                    artist: track.artist["#text"],
                    album: track.album["#text"],
                    image: img,
                    url: track.url,
                    uts: uts
                };

                async function loadTrackAudio() {
                    const audioUrlFound = await findAudioUrl(trackKey);
                    await prepareAudio(audioUrlFound);
                    audioUrl = audioUrlFound;
                    hasAudioSource = true;
                    setPlayButtonState(true);
                    if (wasPlaying || forcePlay) {
                        performCrossfade();
                        setupMediaSession();
                    }
                }

                if (isFirstLoad) {
                    currentTrackInfo = trackInfo;
                    renderMetadata(currentTrackInfo);
                    lastTrackKey = trackKey;
                    isFirstLoad = false;

                    try {
                        await loadTrackAudio();
                    } catch (audioErr) {
                        console.warn('Audio not available for this track:', audioErr.message);
                        hasAudioSource = false;
                        setPlayButtonState(false);
                    }
                } else {
                    try {
                        await loadTrackAudio();
                        lastTrackKey = trackKey;
                        currentTrackInfo = trackInfo;
                        renderMetadata(currentTrackInfo);
                    } catch (audioErr) {
                        console.warn('Audio not available, skipping track:', audioErr.message);
                    }
                }

            } catch (err) {
                console.error('Last.fm fetch failed:', err);
                if (container.classList.contains('skeleton')) {
                    elTrack.textContent = "Offline";
                }
            }
        }

        elPlayBtn.addEventListener('click', togglePlayback);

        [audio1, audio2].forEach(audio => {
            audio.addEventListener('play', () => {
                if (audio === activeAudioEl) {
                    isPlaying = true;
                    setPlayButtonState(true);
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.playbackState = 'playing';
                    }
                }
            });
            audio.addEventListener('pause', () => {
                if (audio === activeAudioEl) {
                    isPlaying = false;
                    setPlayButtonState(true);
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.playbackState = 'paused';
                    }
                }
            });
            audio.addEventListener('ended', () => {
                if (audio === activeAudioEl) {
                    fetchLastFmData(true);
                }
            });
        });

        function setupMediaSession() {
            if (!('mediaSession' in navigator)) return;
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentTrackInfo.name,
                artist: currentTrackInfo.artist,
                album: currentTrackInfo.album,
                artwork: currentTrackInfo.image ? [{ src: currentTrackInfo.image }] : []
            });
            navigator.mediaSession.setActionHandler('play', () => activeAudioEl.play());
            navigator.mediaSession.setActionHandler('pause', () => activeAudioEl.pause());
            navigator.mediaSession.setActionHandler('nexttrack', () => fetchLastFmData(true));
        }

        fetchLastFmData();
        setInterval(updateTimer, 5000);
        setInterval(fetchLastFmData, 5000);
    });
})();