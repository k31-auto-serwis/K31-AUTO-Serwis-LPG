// Vercel serverless function — receives the lead form and sends it to a Telegram group.
// Secrets live in Vercel env vars (Project → Settings → Environment Variables):
//   TG_BOT_TOKEN  — bot token from @BotFather
//   TG_CHAT_ID    — group chat id (groups/supergroups are negative, e.g. -1001234567890)
//
// Abuse protection (added 2026-07): origin allow-list, per-IP rate limit,
// honeypot, submit-timing check, body size cap.

var ALLOWED_HOSTS = ["k31autoserwis.pl", "www.k31autoserwis.pl"];

// Per-IP counters. Serverless instances are reused while warm, so this stops
// bursts from a single source. It is a cheap layer, not a distributed limiter.
var RL = global.__k31_rl || (global.__k31_rl = new Map());
var MAX_HITS_PER_MIN = 12; // any request
var MAX_SENDS_PER_10MIN = 4; // messages actually delivered to Telegram

function clientIp(req) {
  var xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.headers["x-real-ip"] || "unknown";
}

function hostAllowed(rawUrl) {
  try {
    var h = new URL(rawUrl).hostname;
    return ALLOWED_HOSTS.indexOf(h) !== -1 || /(^|\.)vercel\.app$/.test(h);
  } catch (e) {
    return false;
  }
}

// Blocks naive scripted abuse. A determined attacker can spoof these headers,
// so it is one layer among several — not a guarantee.
function originAllowed(req) {
  var o = req.headers.origin;
  if (o) return hostAllowed(o);
  var r = req.headers.referer;
  if (r) return hostAllowed(r);
  return false; // no Origin and no Referer → not a real browser form post
}

function rateLimited(ip, kind) {
  var now = Date.now();
  if (RL.size > 5000) RL.clear(); // crude memory guard
  var rec = RL.get(ip) || { hits: [], sends: [] };
  rec.hits = rec.hits.filter(function (t) { return now - t < 60000; });
  rec.sends = rec.sends.filter(function (t) { return now - t < 600000; });
  if (kind === "hit") {
    rec.hits.push(now);
    RL.set(ip, rec);
    return rec.hits.length > MAX_HITS_PER_MIN;
  }
  if (rec.sends.length >= MAX_SENDS_PER_10MIN) { RL.set(ip, rec); return true; }
  rec.sends.push(now);
  RL.set(ip, rec);
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  var ip = clientIp(req);

  if (rateLimited(ip, "hit")) {
    return res.status(429).json({ ok: false, error: "too_many_requests" });
  }

  if (!originAllowed(req)) {
    return res.status(403).json({ ok: false, error: "forbidden_origin" });
  }

  var token = process.env.TG_BOT_TOKEN;
  var chatId = process.env.TG_CHAT_ID;
  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: "not_configured" });
  }

  try {
    var body = req.body;
    if (typeof body === "string") {
      if (body.length > 20000) return res.status(413).json({ ok: false, error: "payload_too_large" });
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    // honeypot — silently accept bots, send nothing
    if (body.website) return res.status(200).json({ ok: true });

    // submit-timing: humans need seconds to fill the form. Only enforced when the
    // client sent the field, so visitors on a cached main.js are never dropped.
    if (typeof body.elapsed_ms === "number" && body.elapsed_ms < 2000) {
      return res.status(200).json({ ok: true });
    }

    var clip = function (v, n) { return String(v == null ? "" : v).trim().slice(0, n); };
    var name = clip(body.name, 200);
    var phone = clip(body.phone, 60);
    var service = clip(body.service, 200);
    var msg = clip(body.msg, 2000);
    var page = clip(body.page, 200);

    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: "missing_fields" });
    }

    if (rateLimited(ip, "send")) {
      return res.status(429).json({ ok: false, error: "too_many_requests" });
    }

    var esc = function (s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    var text =
      "🔧 <b>Нова заявка — K31 Auto Serwis</b>\n\n" +
      "👤 <b>Імʼя:</b> " + esc(name) + "\n" +
      "📞 <b>Телефон:</b> " + esc(phone) + "\n" +
      (service ? "🛠 <b>Послуга:</b> " + esc(service) + "\n" : "") +
      (msg ? "💬 <b>Коментар:</b> " + esc(msg) + "\n" : "") +
      (page ? "\n🌐 <i>" + esc(page) + "</i>" : "");

    var tgRes = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    if (!tgRes.ok) {
      var detail = await tgRes.text();
      console.error("Telegram API error", tgRes.status, detail);
      return res.status(502).json({ ok: false, error: "telegram_failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("lead handler error", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
};
