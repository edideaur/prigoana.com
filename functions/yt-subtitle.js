export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    let videoId;
    const contentType = request.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      videoId = body.videoId || body.v || body.url;
    } else {
      const url = new URL(request.url);
      videoId = url.searchParams.get("v") || url.searchParams.get("videoId");
    }

    if (!videoId) {
      return Response.json(
        { error: "videoId required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const ytUrl = videoId.startsWith("http")
      ? videoId
      : `https://www.youtube.com/watch?v=${videoId}`;

    const aesKey = await fetchRemoteAesKey();
    const encrypted = encode(ytUrl, aesKey);

    const form = new URLSearchParams();
    form.append("url", ytUrl);
    form.append("data", encrypted);

    const res = await fetch("https://get.downsub.com/", {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "https://downsub.com/",
        Origin: "https://downsub.com",
      },
      body: form.toString(),
    });

    if (!res.ok) {
      throw new Error(`downsub API ${res.status}`);
    }

    const data = await res.json();
    return Response.json(data, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

async function fetchRemoteAesKey() {
  const res = await fetch("https://prigoana.com/getaes");
  if (!res.ok) throw new Error(`getaes failed: ${res.status}`);
  const json = await res.json();
  return json.AES_KEY;
}

function encode(plaintext, key) {
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(plaintext), key, {
    format: CryptoJSFormat,
  }).toString();

  return btoa(encrypted)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const CryptoJSFormat = {
  stringify(p) {
    const o = { ct: p.ciphertext.toString(CryptoJS.enc.Base64) };
    if (p.iv) o.iv = p.iv.toString();
    if (p.salt) o.s = p.salt.toString();
    return JSON.stringify(o);
  },
  parse(str) {
    const o = JSON.parse(str);
    const p = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(o.ct),
    });
    if (o.iv) p.iv = CryptoJS.enc.Hex.parse(o.iv);
    if (o.s) p.salt = CryptoJS.enc.Hex.parse(o.s);
    return p;
  },
};

const CryptoJS = {
  AES: {
    encrypt(msg, key, opts) {
      return encryptAes(msg, key, opts);
    },
  },
  enc: {
    Base64: {
      parse(s) {
        return globalThis.atob(s);
      },
      stringify(s) {
        return globalThis.btoa(s);
      },
    },
    Hex: {
      parse(s) {
        let result = "";
        for (let i = 0; i < s.length; i += 2) {
          result += String.fromCharCode(parseInt(s.substr(i, 2), 16));
        }
        return result;
      },
      stringify(s) {
        let result = "";
        for (let i = 0; i < s.length; i++) {
          result += s.charCodeAt(i).toString(16).padStart(2, "0");
        }
        return result;
      },
    },
  },
  lib: {
    CipherParams: function (opts) {
      this.ciphertext = opts.ciphertext || "";
      this.iv = opts.iv;
      this.salt = opts.salt;
    },
  },
};

function encryptAes(plaintext, key, opts) {
  const salt = randomBytes(8);
  const iv = randomBytes(16);
  const derived = deriveKey(key, salt, 32);
  const keyBytes = derived.slice(0, 32);
  const ivBytes = iv;

  const plaintextBytes = new TextEncoder().encode(plaintext);
  const encrypted = aesEncrypt(plaintextBytes, keyBytes, ivBytes);

  const cipherBase64 = btoa(String.fromCharCode(...encrypted));

  return {
    ciphertext: {
      toString(format) {
        return cipherBase64;
      },
    },
    iv: ivBytes,
    salt: salt,
    toString(outputFormat) {
      if (outputFormat === "CryptoJS.enc.Utf8") {
        return plaintext;
      }
      return JSON.stringify({
        ct: cipherBase64,
        iv: Array.from(ivBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
        s: Array.from(salt)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      });
    },
  };
}

function randomBytes(n) {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return arr;
}

function deriveKey(password, salt, keyLen) {
  const passBytes = new TextEncoder().encode(password);
  const combined = new Uint8Array(passBytes.length + salt.length);
  combined.set(passBytes);
  combined.set(salt, passBytes.length);

  let key = new Uint8Array(combined);

  for (let i = 0; i < 1000; i++) {
    const hashed = new Uint8Array(key.length);
    for (let j = 0; j < key.length; j++) {
      hashed[j] = key[j] ^ ((i + j) & 0xff);
    }
    key = hashed;
  }

  const result = new Uint8Array(keyLen);
  for (let i = 0; i < keyLen; i++) {
    result[i] = key[i % key.length];
  }

  return result;
}

function aesEncrypt(data, key, iv) {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length] ^ iv[i % iv.length];
  }
  return result;
}