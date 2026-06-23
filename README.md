# K31 Auto Serwis & LPG — website

Static multi-page lead-gen site (Ukrainian) for an auto service shop in Poland.
Dark industrial theme · orange accent · Saira Condensed + Manrope · no build step.

## Pages
- `index.html` — Home (hero, services, why-us, process, stats, LPG, reviews, lead form)
- `poslugy.html` — Services + price list
- `pro-nas.html` — About + team
- `kontakty.html` — Contacts + lead form + map
- `css/styles.css`, `js/main.js`, `favicon.svg`, `vercel.json`

## ⚠️ PLACEHOLDERS to replace before going live
Search the files for these and swap real values:

| Placeholder | Where | Replace with |
|---|---|---|
| ~~`+48000000000` / `+48 000 000 000`~~ | ✅ DONE → `+48 570 789 084` |
| ~~`info@k31.example`~~ | ✅ REMOVED (client uses messengers, no email) |
| ~~`вул. Прикладна 31, … Варшава`~~ | ✅ DONE → `вул. Korzeńska 31, 51-126 Вроцлав, Польща` |
| ~~Working hours~~ | ✅ DONE → Пн–Пт 9:00–18:00 · Сб 9:00–15:00 · Нд вихідний |
| Messenger links `href="#"` (Telegram/Viber/WhatsApp) | index, kontakty | real links |
| Social links `href="#"` (Instagram/Facebook/TikTok) | footer of index | real profiles |
| **Prices** (`від 150 zł`, etc.) | index, poslugy | confirm real prices |
| `.map-embed` divs | index, kontakty | Google Maps `<iframe>` |
| Team names (`Імʼя Прізвище`) | pro-nas | real names/roles |
| Reviews | index | real client reviews |
| Stats (10+, 5000+, 50+, 98%) | index, pro-nas | real numbers |
| Logo: `.split__media .plate` placeholder | replace with real K31 logo image in `/assets` |

### Lead form → Telegram group  ✅ WIRED
`form[data-lead]` POSTs JSON to the Vercel serverless function `api/lead.js`,
which calls the Telegram Bot API `sendMessage` and posts the lead into a group.
Front-end: `js/main.js` (loading state, error message, `.hp` honeypot for spam).

**Required Vercel env vars** (Project → Settings → Environment Variables → all environments):
| Var | Value |
|---|---|
| `TG_BOT_TOKEN` | bot token from @BotFather |
| `TG_CHAT_ID` | group chat id (groups/supergroups are negative, e.g. `-1001234567890`) |

After setting/changing env vars, **redeploy** (`vercel --prod`) so the function picks them up.

**How to get the group `chat_id`:**
1. Create the bot via @BotFather → copy the token.
2. Add the bot to the target group (and, if it's a group with topics/privacy, allow it to read messages or make it admin).
3. Send any message in the group, then open:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
   and read `result[].message.chat.id` (a negative number). Or add @RawDataBot to the group — it prints the chat id.

> Note: the function can't run on the static/Perl local preview — it only works on Vercel (or `vercel dev`). Locally the form will show its error state because `/api/lead` returns 404.

## Local preview
```bash
cd site
npx serve .        # or: python3 -m http.server 8000
```

## Deploy to Vercel
```bash
npm i -g vercel        # once
cd site
vercel                 # preview deploy (first run: vercel login)
vercel --prod          # production
```
Custom domain later: `vercel domains add <domain>` then add the DNS records Vercel shows.
