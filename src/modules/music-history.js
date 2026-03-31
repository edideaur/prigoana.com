const LASTFM_USER = 'eduardprigoana';
const LASTFM_API_KEY = '816cfe50ddeeb73c9987b85de5c19e71';
const PER_PAGE = 17;
const servers = [
    'https://hifi.geeked.wtf',
    'https://hifi-one.spotisaver.net',
    'https://hifi-two.spotisaver.net'
];

let savedGridContent = null;

// Audio state
let audio = null;
let playingKey = null;
let workingServerIndex = null;
let trackIdCache = {};

// Pagination state
let currentPage = 1;
let totalPages = 1;
let lastFingerprint = null;
let loading = false;
let scrobblesOpen = false;

const btn = document.getElementById('music-history-btn');
const mainEl = document.querySelector('.grid-layout main');

// ── Tilt effect ──
// Based on vanilla-tilt.js by Șandor Sergiu (MIT) — https://github.com/micku7zu/vanilla-tilt.js
function applyTilt(el, maxTilt = 15) {
    if (!el) return;
    el.style.transformStyle = 'preserve-3d';
    el.style.willChange = 'transform';
    el.addEventListener('mouseenter', () => {
        el.style.transition = 'transform 0.1s ease-out';
    });
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const rotateY = (maxTilt * dx / (rect.width / 2)).toFixed(1);
        const rotateX = (-maxTilt * dy / (rect.height / 2)).toFixed(1);
        el.style.transform = `perspective(400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform 0.4s ease-out';
        el.style.transform = '';
    });
}

applyTilt(btn, 20);
applyTilt(document.getElementById('np-art'), 12);

// ── Utilities ──

function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function lfm(method, extra = '') {
    return `https://ws.audioscrobbler.com/2.0/?method=${method}&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json${extra}`;
}

function formatTimeAgo(uts) {
    const diff = Math.floor((Date.now() / 1000) - uts);
    if (diff < 60) return 'Just now';
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
}

const PLACEHOLDER_HASH = '2a96cbd8b46e442fc41c2b86b821562f';

function isPlaceholder(url) {
    return !url || url.includes(PLACEHOLDER_HASH);
}

function artHTML(url) {
    if (!url) return '<div class="track-art-empty"></div>';
    return `<img src="${url}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'track-art-empty\\'></div>'">`;
}

function getImg(images, size) {
    return images?.find(i => i.size === size)?.['#text'] || '';
}

// ── Lazy image resolution via iTunes Search API ──

const imgCache = {};
let imgObserver = null;
const ITUNES_BASE = 'https://itunes.apple.com/search';

function itunesArt(url, size = 200) {
    if (!url) return '';
    return url.replace(/\d+x\d+bb/, `${size}x${size}bb`);
}

async function resolveTrackImage(artist, track) {
    const key = `t:${artist}|${track}`;
    if (imgCache[key] !== undefined) return imgCache[key];
    if (!artist || !track) { imgCache[key] = ''; return ''; }
    try {
        const q = encodeURIComponent(`${artist} ${track}`);
        const res = await fetchWithTimeout(`${ITUNES_BASE}?term=${q}&entity=song&limit=1`);
        const data = await res.json();
        const art = data.results?.[0]?.artworkUrl100;
        if (art) { const url = itunesArt(art); imgCache[key] = url; return url; }
    } catch {}
    imgCache[key] = '';
    return '';
}

function setupImageObserver() {
    if (imgObserver) imgObserver.disconnect();
    imgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const row = entry.target;
            imgObserver.unobserve(row);
            const artEl = row.querySelector('.track-art');
            if (!artEl) return;
            const artist = row.dataset.imgArtist || '';
            const name = row.dataset.imgName || '';
            resolveTrackImage(artist, name).then(url => {
                if (url) artEl.innerHTML = artHTML(url);
            });
        });
    }, { rootMargin: '300px 0px' });
}

function observeRowImage(rowEl) {
    if (imgObserver && rowEl.dataset.imgType) imgObserver.observe(rowEl);
}

// ── Audio / Playback ──

async function checkServerForTrack(server, trackId) {
    const url = `${server}/track/?id=${trackId}&quality=LOW`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error('Track fetch failed');
    const data = await res.json();
    if (data?.data?.manifest) {
        const manifest = JSON.parse(atob(data.data.manifest));
        if (manifest.urls?.length > 0) return manifest.urls[0];
    }
    if (data?.length >= 3 && data[2]?.OriginalTrackUrl) return data[2].OriginalTrackUrl;
    throw new Error('Invalid track data');
}

async function searchAndGetUrl(server, term) {
    const res = await fetchWithTimeout(`${server}/search/?s=${encodeURIComponent(term)}`);
    if (!res.ok) throw new Error('Search failed');
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
    throw new Error('Audio not found on any server');
}

function updateAllPlayButtons(activeKey, state) {
    const container = document.getElementById('mh-content');
    if (!container) return;
    container.querySelectorAll('.mh-play-btn').forEach(b => {
        if (b.dataset.key === activeKey) {
            b.textContent = state === 'playing' ? '❚❚' : state === 'loading' ? '...' : '▶';
            b.classList.toggle('mh-playing', state === 'playing');
        } else {
            b.textContent = '▶';
            b.classList.remove('mh-playing');
        }
    });
}

function playNext() {
    const container = document.getElementById('mh-content');
    if (!container || !playingKey) { playingKey = null; updateAllPlayButtons(null, null); return; }
    const buttons = Array.from(container.querySelectorAll('.mh-play-btn'));
    const idx = buttons.findIndex(b => b.dataset.key === playingKey);
    const nextBtn = buttons[idx + 1];
    if (nextBtn) handlePlay(nextBtn.dataset.key, nextBtn);
    else { playingKey = null; updateAllPlayButtons(null, null); }
}

async function handlePlay(trackKey, playBtn) {
    if (!audio) {
        audio = new Audio();
        audio.addEventListener('ended', () => playNext());
        audio.addEventListener('pause', () => { if (playingKey) updateAllPlayButtons(playingKey, 'paused'); });
        audio.addEventListener('play', () => {
            if (playingKey) updateAllPlayButtons(playingKey, 'playing');
            document.dispatchEvent(new CustomEvent('scrobbles-audio-play'));
        });
    }
    if (playingKey === trackKey) { if (audio.paused) audio.play(); else audio.pause(); return; }
    audio.pause();
    playingKey = trackKey;
    updateAllPlayButtons(trackKey, 'loading');
    try {
        const url = await findAudioUrl(trackKey);
        if (playingKey !== trackKey) return;
        audio.src = url;
        audio.volume = 1;
        await audio.play();
    } catch (err) {
        console.warn('Audio not available:', err.message);
        if (playingKey === trackKey) {
            playingKey = null;
            playBtn.textContent = '✕';
            setTimeout(() => { playBtn.textContent = '▶'; playBtn.classList.remove('mh-playing'); }, 1500);
        }
    }
}

// Stop scrobbles audio when sidebar starts playing
document.addEventListener('sidebar-audio-play', () => {
    if (audio && !audio.paused) {
        audio.pause();
        playingKey = null;
        updateAllPlayButtons(null, null);
    }
});

// ── Row builder ──

function makePlayBtn(trackKey) {
    const isActive = playingKey === trackKey;
    const btnText = isActive && audio && !audio.paused ? '❚❚' : '▶';
    const btnClass = isActive && audio && !audio.paused ? ' mh-playing' : '';
    return `<button class="mh-play-btn${btnClass}" data-key="${trackKey}" type="button" title="Play preview">${btnText}</button>`;
}

function buildRecentRow(track) {
    const isNowPlaying = track['@attr']?.nowplaying === 'true';
    const uts = isNowPlaying ? null : track.date?.uts;
    const img = getImg(track.image, 'large');
    const artist = track.artist['#text'];
    const album = track.album['#text'];
    const trackKey = `${artist} ${track.name}`.replace(/\s+/g, '+');
    const timeHTML = isNowPlaying
        ? '<span class="now-badge">NOW PLAYING</span>'
        : `<span class="track-time">${formatTimeAgo(uts)}</span>`;
    const needsResolve = isPlaceholder(img);
    const cachedImg = needsResolve ? imgCache[`t:${artist}|${track.name}`] : null;
    const displayImg = cachedImg || (needsResolve ? '' : img);
    const lazyAttrs = needsResolve && !cachedImg ? ` data-img-type="track" data-img-artist="${esc(artist)}" data-img-name="${esc(track.name)}"` : '';

    return `<div class="track-row${isNowPlaying ? ' now-playing' : ''}" data-uid="${isNowPlaying ? 'np:' : uts + ':'}${trackKey}"${lazyAttrs}>
        <div class="track-art">${artHTML(displayImg)}</div>
        <div class="track-info">
            <a href="${track.url}" target="_blank" rel="noopener noreferrer" class="track-name">${esc(track.name)}</a>
            <a href="https://www.last.fm/music/${encodeURIComponent(artist)}" target="_blank" rel="noopener noreferrer" class="track-artist">${esc(artist)}</a>
            ${album ? `<a href="https://www.last.fm/music/${encodeURIComponent(artist)}/${encodeURIComponent(album)}" target="_blank" rel="noopener noreferrer" class="track-album">${esc(album)}</a>` : ''}
        </div>
        <div class="track-meta">${makePlayBtn(trackKey)}${timeHTML}</div>
    </div>`;
}

// ── Pagination ──

function getUniqueId(track) {
    const isNP = track['@attr']?.nowplaying === 'true';
    const key = `${track.artist['#text']} ${track.name}`.replace(/\s+/g, '+');
    return isNP ? `np:${key}` : `${track.date?.uts}:${key}`;
}

function getFingerprint(tracks) { return tracks.map(t => getUniqueId(t)).join('|'); }

function renderTracks(tracks) {
    const container = document.getElementById('mh-content');
    if (!container) return;

    // Filter out now-playing track on pages other than 1
    const filtered = currentPage === 1 ? tracks : tracks.filter(t => !t['@attr']?.nowplaying);

    if (currentPage === 1) {
        const fp = getFingerprint(filtered);
        if (fp === lastFingerprint) return;
        lastFingerprint = fp;
    }

    container.innerHTML = '';
    filtered.forEach((t, i) => {
        const div = document.createElement('div');
        div.innerHTML = buildRecentRow(t);
        const row = div.firstElementChild;
        row.style.animationDelay = `${i * 20}ms`;
        container.appendChild(row);
        observeRowImage(row);
    });
}

function updatePaginationUI() {
    const info = document.getElementById('mh-page-info');
    const prevBtn = document.getElementById('mh-prev');
    const nextBtn = document.getElementById('mh-next');
    if (info) info.textContent = `${currentPage} / ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

async function fetchPage(page) {
    if (loading) return;
    loading = true;
    const container = document.getElementById('mh-content');
    if (container) container.innerHTML = '<div class="music-loading">LOADING<span class="loading-blink">...</span></div>';

    try {
        const res = await fetchWithTimeout(lfm('User.getrecenttracks', `&limit=${PER_PAGE}&page=${page}`));
        const data = await res.json();
        const tracks = data.recenttracks?.track;
        const total = Number(data.recenttracks?.['@attr']?.totalPages || 1);

        currentPage = page;
        totalPages = total;

        if (tracks) {
            renderTracks(tracks);
            // Update sidebar from the same data
            document.dispatchEvent(new CustomEvent('lastfm-update', { detail: { track: tracks[0] } }));
        }
        updatePaginationUI();
    } catch (err) {
        console.error('Failed to fetch page:', err);
        if (container) container.innerHTML = '<div class="music-loading">FAILED TO LOAD</div>';
    } finally {
        loading = false;
    }
}

// ── Shared polling — always runs, feeds both sidebar and scrobbles list ──

async function poll() {
    try {
        // If scrobbles view is open on page 1, fetch a full page; otherwise just 1 track for sidebar
        const limit = (scrobblesOpen && currentPage === 1) ? PER_PAGE : 1;
        const res = await fetchWithTimeout(lfm('User.getrecenttracks', `&limit=${limit}&page=1`));
        const data = await res.json();
        const tracks = data.recenttracks?.track;
        if (!tracks || !tracks.length) return;

        // Always update sidebar
        document.dispatchEvent(new CustomEvent('lastfm-update', { detail: { track: tracks[0] } }));

        // Update scrobbles list if open on page 1
        if (scrobblesOpen && currentPage === 1 && tracks.length > 1) {
            const total = Number(data.recenttracks?.['@attr']?.totalPages || 1);
            totalPages = total;
            renderTracks(tracks);
            updatePaginationUI();
        }
    } catch {}
}

// Start polling immediately and forever
poll();
setInterval(poll, 5000);

// ── Show / Hide ──

function show() {
    savedGridContent = mainEl.innerHTML;
    scrobblesOpen = true;
    lastFingerprint = null;
    currentPage = 1;
    totalPages = 1;
    loading = false;

    btn.textContent = '[less]';

    mainEl.innerHTML = `
        <div class="mh-panel">
            <div class="mh-header">
                <span class="mh-title">RECENT SCROBBLES</span>
                <div class="mh-header-right">
                    <div class="mh-pagination">
                        <button class="mh-page-btn" id="mh-prev" type="button" disabled>&larr;</button>
                        <span class="mh-page-info" id="mh-page-info">1 / 1</span>
                        <button class="mh-page-btn" id="mh-next" type="button">&rarr;</button>
                    </div>
                    <button class="mh-close-btn" id="mh-close" type="button">&times;</button>
                </div>
            </div>
            <div id="mh-content" class="mh-content music-list" aria-live="polite">
                <div class="music-loading">LOADING<span class="loading-blink">...</span></div>
            </div>
        </div>
    `;

    document.getElementById('mh-prev').addEventListener('click', () => {
        if (currentPage > 1) fetchPage(currentPage - 1);
    });
    document.getElementById('mh-next').addEventListener('click', () => {
        if (currentPage < totalPages) fetchPage(currentPage + 1);
    });
    document.getElementById('mh-close').addEventListener('click', hide);

    document.getElementById('mh-content').addEventListener('click', (e) => {
        const playBtn = e.target.closest('.mh-play-btn');
        if (playBtn) { e.preventDefault(); e.stopPropagation(); handlePlay(playBtn.dataset.key, playBtn); }
    });

    setupImageObserver();
    fetchPage(1);
}

function hide() {
    scrobblesOpen = false;
    lastFingerprint = null;
    loading = false;
    if (imgObserver) { imgObserver.disconnect(); imgObserver = null; }
    mainEl.innerHTML = savedGridContent;
    savedGridContent = null;
    btn.textContent = '[more]';
}

if (btn && mainEl) {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (savedGridContent) hide();
        else show();
    });
}
