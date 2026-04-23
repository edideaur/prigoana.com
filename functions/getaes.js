export default {
  async fetch(request, env, ctx) {
    try {
      const key = await extractAesKey();
      return Response.json({ AES_KEY: key }, {
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    } catch (err) {
      return Response.json(
        { error: err.message },
        { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }
  }
};

async function extractAesKey() {
  const htmlRes = await fetch("https://downsub.com/", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!htmlRes.ok) {
    throw new Error(`Failed to fetch downsub.com: ${htmlRes.status}`);
  }

  const html = await htmlRes.text();

  const scriptPattern = /src=["']?([^"'\s>]*?(?:main|app)[^"'\s>]*?\.js[^"'\s>]*?)["']?/gi;
  const candidates = [];
  let m;

  while ((m = scriptPattern.exec(html)) !== null) {
    candidates.push(m[1]);
  }

  if (candidates.length === 0) {
    const fallback = /src=["']?([^"'\s>]*?\.js[^"'\s>]*)["']?/gi;
    while ((m = fallback.exec(html)) !== null) {
      candidates.push(m[1]);
    }
  }

  if (candidates.length === 0) {
    throw new Error("No JavaScript bundle URLs found in downsub.com HTML");
  }

  for (const src of candidates) {
    const url = src.startsWith("http") ? src : `https://downsub.com${src}`;

    let jsRes;
    try {
      jsRes = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Referer: "https://downsub.com/",
        },
      });
    } catch (_) {
      continue;
    }

    if (!jsRes.ok) continue;

    const js = await jsRes.text();
    const key = findAesKey(js);
    if (key) return key;
  }

  throw new Error("AES key not found in any JavaScript bundle");
}

function findAesKey(js) {
  const assignPattern = /([A-Za-z_$][A-Za-z0-9_$]*)=["']([a-z0-9]{28,40})["']/g;
  const potentialKeys = new Map();
  let m;

  while ((m = assignPattern.exec(js)) !== null) {
    potentialKeys.set(m[1], m[2]);
  }

  for (const [varName, keyValue] of potentialKeys) {
    const usagePattern = new RegExp(
      `\\.AES\\.(?:encrypt|decrypt)\\([^)]*?(?:\\b${escapeRegex(varName)}\\b)[^)]*?[,)]`
    );
    if (usagePattern.test(js)) {
      return keyValue;
    }
  }

  const directPattern = /\.AES\.(?:encrypt|decrypt)\([^,]+,\s*(?:[A-Za-z_$][A-Za-z0-9_$]*\s*\|\|\s*)?["']([a-z0-9]{28,40})["']/g;
  while ((m = directPattern.exec(js)) !== null) {
    return m[1];
  }

  const standalonePattern = /["']([a-z0-9]{32})["']/g;
  while ((m = standalonePattern.exec(js)) !== null) {
    const v = m[1];
    if (/[a-z].*[a-z].*[a-z]/.test(v) && /[0-9].*[0-9].*[0-9]/.test(v)) {
      return v;
    }
  }

  return null;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}