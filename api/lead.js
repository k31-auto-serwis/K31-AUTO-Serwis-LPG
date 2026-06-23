// Vercel serverless function — receives the lead form and sends it to a Telegram group.
// Secrets live in Vercel env vars (Project → Settings → Environment Variables):
//   TG_BOT_TOKEN  — bot token from @BotFather
//   TG_CHAT_ID    — group chat id (groups/supergroups are negative, e.g. -1001234567890)

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  var token = process.env.TG_BOT_TOKEN;
  var chatId = process.env.TG_CHAT_ID;
  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: "not_configured" });
  }

  try {
    var body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    // honeypot — silently accept bots, send nothing
    if (body.website) return res.status(200).json({ ok: true });

    var clip = function (v, n) { return String(v == null ? "" : v).trim().slice(0, n); };
    var name = clip(body.name, 200);
    var phone = clip(body.phone, 60);
    var service = clip(body.service, 200);
    var msg = clip(body.msg, 2000);
    var page = clip(body.page, 200);

    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: "missing_fields" });
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
