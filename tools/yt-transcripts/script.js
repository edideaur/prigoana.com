const AES_KEY = "zthxw34cdp6wfyxmpad38v52t3hsz6c5";

const CryptoJSFormat = {
  stringify(p) {
    const o = { ct: p.ciphertext.toString(CryptoJS.enc.Base64) };
    if (p.iv)   o.iv = p.iv.toString();
    if (p.salt) o.s  = p.salt.toString();
    return JSON.stringify(o);
  },
  parse(str) {
    const o = JSON.parse(str);
    const p = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(o.ct),
    });
    if (o.iv) p.iv   = CryptoJS.enc.Hex.parse(o.iv);
    if (o.s)  p.salt = CryptoJS.enc.Hex.parse(o.s);
    return p;
  }
};

function toBase64Url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function encode(value) {
  return toBase64Url(
    CryptoJS.AES.encrypt(JSON.stringify(value), AES_KEY, { format: CryptoJSFormat }).toString()
  ).trim();
}

function extractVideoId(url) {
  url = url.trim();
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

function setStatus(html) {
  document.getElementById("status").innerHTML = html;
}

function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function fetchSubtitles(id) {
  const input   = id || document.getElementById("urlInput").value;
  const btn     = document.getElementById("fetchBtn");
  const videoId = extractVideoId(input);

  if (!videoId) {
    setStatus(`<div class="error">couldn't find a video id in that url</div>`);
    return;
  }

  history.pushState(null, "", "/?v=" + videoId);
  document.getElementById("urlInput").value = "https://www.youtube.com/watch?v=" + videoId;
  btn.disabled = true;
  setStatus(`<div class="spinner">fetching…</div>`);

  const token  = encode(videoId);
  const apiUrl = "https://get-info.downsub.com/" + token;

  let data;
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    setStatus(`<div class="error">api error: ${e.message}<br>cors issue if opening from file:// — use a local server</div>`);
    btn.disabled = false;
    return;
  }

  btn.disabled = false;

  if (!data || data.state === 3 || (!data.subtitles?.length && !data.subtitlesAutoTrans?.length)) {
    setStatus(`<div class="error">no subtitles found</div>`);
    return;
  }

  const title     = data.title     || "untitled";
  const thumbnail = data.thumbnail || "";
  const duration  = data.duration  || "";
  const all = [
    ...(data.subtitles         || []),
    ...(data.subtitlesAutoTrans || []),
  ];

  const items = all.map(sub => {
    const type     = sub.type || "srt";
    const filename = [sub.language || sub.name || "subtitle", title].filter(Boolean).join(" - ");
    const titleParam = `?title=${encodeURIComponent(filename)}`;

    function buildPath(t) {
      let p = `https://subtitle.downsub.com/${t}/`;
      if (sub.url)     p += sub.url + "/";
      if (sub.urldual) p += sub.urldual + "/";
      return p + titleParam;
    }

    const mainPath = buildPath(type);
    const txtPath  = buildPath("txt");
    const rawPath  = buildPath("raw");

    return `
      <div class="subtitle-item">
        <span class="sub-name">${sub.name || sub.language || "unknown"}</span>
        <span class="dl-links">
          <a class="dl-link" href="${mainPath}" target="_blank">${type}</a>
          <a class="dl-link" href="${txtPath}"  target="_blank">txt</a>
          <a class="dl-link" href="${rawPath}"  target="_blank">raw</a>
        </span>
      </div>`;
  }).join("");

  setStatus(`
    <div class="results">
      <div class="video-meta">
        ${thumbnail ? `<a href="https://www.youtube.com/watch?v=${videoId}" target="_blank"><img class="video-thumb" src="${escHtml(thumbnail)}" alt=""></a>` : ""}
        <div class="video-info">
          <div class="video-title"><a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" style="color:inherit;text-decoration:none;">${escHtml(title)}</a></div>
          ${duration ? `<div class="video-duration">${escHtml(duration)}</div>` : ""}
        </div>
      </div>
      <div class="section-label">${all.length} track${all.length !== 1 ? "s" : ""}</div>
      <div class="subtitle-list">${items}</div>
    </div>
  `);
}

document.getElementById("urlInput").addEventListener("keydown", e => {
  if (e.key === "Enter") fetchSubtitles();
});

const initId = new URLSearchParams(location.search).get("v");
if (initId) {
  document.getElementById("urlInput").value = "https://www.youtube.com/watch?v=" + initId;
  fetchSubtitles(initId);
}
