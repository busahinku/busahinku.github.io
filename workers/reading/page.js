// The private words page, at https://busahin.com/api/reading/app. It is served
// by this Worker and only behind the token (a cookie set by the sign-in form),
// so nothing about vocabulary is ever part of the public site: the static
// pages, their scripts and the search index never mention it.
//
// Tokens copy src/styles/global.css (the four themes) and the fonts are the
// site's own files on the same origin; keep them in step if the themes change.
import { logout, pencil, plus, trash, volume } from "./icons.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const STYLE = `
@font-face { font-family: "Merriweather"; src: url("/fonts/Merriweather-normal-tr.woff2") format("woff2"); font-weight: 300 900; font-display: swap; }
:root { --bg-primary:#ffffff; --bg-secondary:#f8fafc; --text-primary:#0f172a; --text-secondary:#475569; --text-muted:#94a3b8; --accent:#2563eb; --border:#e2e8f0; color-scheme: light; }
[data-theme="dark"] { --bg-primary:#0a0a0b; --bg-secondary:#111113; --text-primary:#fafafa; --text-secondary:#d4d4d8; --text-muted:#a1a1aa; --accent:#ef4444; --border:#27272a; color-scheme: dark; }
[data-theme="paper"] { --bg-primary:#faf8f1; --bg-secondary:#f5f0e1; --text-primary:#3d3929; --text-secondary:#5c5647; --text-muted:#8a8475; --accent:#b45309; --border:#d6ceb8; }
[data-theme="eink"] { --bg-primary:#ffffff; --bg-secondary:#ffffff; --text-primary:#000000; --text-secondary:#000000; --text-muted:#333333; --accent:#000000; --border:#4a4a4a; }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg-primary); color: var(--text-primary); font: 380 1rem/1.6 "Merriweather", Georgia, serif; font-variation-settings: "opsz" 18; }
main { max-width: 680px; margin: 0 auto; padding: max(1.5rem, env(safe-area-inset-top)) 16px 4rem; }
h1 { font-weight: 600; font-size: clamp(1.375rem, 3.2vw, 1.75rem); line-height: 1.1; margin: 0; }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
.count { color: var(--text-secondary); font-size: .875rem; font-variant-numeric: tabular-nums; }
button, input, textarea { font: inherit; color: inherit; }
button { cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ghost { display: inline-flex; align-items: center; gap: .375rem; min-height: 2.25rem; padding: 0 .75rem; border: 1px solid var(--border); border-radius: 999px; background: transparent; font-size: .875rem; transition: border-color .2s ease, transform .16s ease-out; }
.ghost:active { transform: scale(.97); }
.icon { width: 2.25rem; padding: 0; justify-content: center; }
@media (hover: hover) and (pointer: fine) { .ghost:hover { border-color: var(--accent); } }
.add { display: grid; grid-template-columns: 1fr auto; gap: .5rem; margin: 1.5rem 0 0; padding: 1rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.add .more { grid-column: 1 / -1; display: grid; gap: .5rem; }
input, textarea { width: 100%; min-height: 2.5rem; padding: .5rem .75rem; border: 1px solid var(--border); border-radius: .5rem; background: var(--bg-primary); font-size: 1rem; }
textarea { min-height: 4.5rem; resize: vertical; }
input::placeholder, textarea::placeholder { color: var(--text-secondary); opacity: .75; }
.status { min-height: 1.5rem; margin: .75rem 0 0; font-size: .875rem; color: var(--text-secondary); }
ul.cards { list-style: none; margin: 0; padding: 0; }
.card { padding: 1.25rem 0; border-bottom: 1px dashed color-mix(in srgb, var(--border) 70%, transparent); }
.word { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .75rem; }
.term { font-size: 1.375rem; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; font-variation-settings: "opsz" 72; }
.ipa { color: var(--text-secondary); font-family: system-ui, sans-serif; font-size: .9375rem; }
.due { margin-left: auto; font-size: .75rem; color: var(--text-secondary); border: 1px solid var(--border); border-radius: 999px; padding: .0625rem .5rem; }
.card[data-due="true"] .due { border-color: var(--accent); color: var(--text-primary); }
.tr { margin: .375rem 0 0; }
.def { margin: .125rem 0 0; color: var(--text-secondary); font-size: .9375rem; }
.quote { margin: .75rem 0 0; padding-left: .75rem; border-left: 2px solid var(--border); font-size: .9375rem; }
.quote .src, .muted { color: var(--text-secondary); font-size: .8125rem; }
.ex { list-style: none; margin: .75rem 0 0; padding: 0; display: grid; gap: .375rem; font-size: .9375rem; }
.ex li span { display: block; color: var(--text-secondary); font-size: .875rem; }
.ex a { color: inherit; text-decoration: none; }
.note { margin: .75rem 0 0; font-size: .875rem; font-style: italic; color: var(--text-secondary); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: 1rem; }
.row .end { margin-left: auto; display: flex; gap: .5rem; }
.credit { font-size: .75rem; color: var(--text-secondary); margin: .25rem 0 0; }
.edit { display: grid; gap: .5rem; margin-top: .75rem; }
footer { margin-top: 2.5rem; font-size: .75rem; color: var(--text-secondary); }
footer a, .credit a { color: inherit; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
[data-theme="eink"] .card[data-due="true"] .due { border-width: 2px; }
@media (prefers-reduced-motion: reduce) { .ghost { transition: none; } }
`;

// Pre-paint: the site's own theme choice (same origin, same localStorage), else the system's.
const THEME = `try{const t=localStorage.getItem("theme");document.documentElement.dataset.theme=t||(matchMedia("(update: slow), (monochrome)").matches?"eink":matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch{}`;

const shell = (title, nonce, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<script nonce="${nonce}">${THEME}</script>
<style nonce="${nonce}">${STYLE}</style>
</head>
<body><main>${body}</main></body>
</html>`;

export function loginPage(nonce, failed = false) {
  return shell(
    "Sign in",
    nonce,
    `<h1>Sign in</h1>
<form class="add" method="post" action="/api/reading/login">
  <label class="sr-only" for="token">Token</label>
  <input id="token" name="token" type="password" autocomplete="current-password" placeholder="Token" required>
  <button class="ghost" type="submit">Sign in</button>
</form>
<p class="status" role="alert">${failed ? "That token is not right." : ""}</p>`,
  );
}

export function appPage(nonce) {
  return shell(
    "Words",
    nonce,
    `<div class="head"><h1>Words</h1><span class="count" data-count></span>
<form method="post" action="/api/reading/logout"><button class="ghost icon" type="submit" title="Sign out">${logout}<span class="sr-only">Sign out</span></button></form></div>
<form class="add" data-add>
  <label class="sr-only" for="term">Word or phrase</label>
  <input id="term" name="term" maxlength="60" placeholder="Word or phrase" autocomplete="off" autocapitalize="none" spellcheck="false" required>
  <button class="ghost" type="submit">${plus}Add</button>
  <div class="more">
    <label class="sr-only" for="note">Note</label>
    <input id="note" name="note" maxlength="500" placeholder="Note (optional)" autocomplete="off">
    <label class="sr-only" for="sentence">Sentence</label>
    <textarea id="sentence" name="sentence" maxlength="1000" placeholder="Sentence (optional)"></textarea>
  </div>
</form>
<p class="status" data-status aria-live="polite">Loading…</p>
<ul class="cards" data-cards></ul>
<footer>Meanings: <a href="https://www.wikdict.com/">WikDict</a>, CC BY-SA 4.0. Examples: <a href="https://tatoeba.org/">Tatoeba</a>, CC BY 2.0 FR. Recordings: Wikimedia Commons, credited under each word.</footer>
<script nonce="${nonce}">${APP}</script>`,
  );
}

// The page's script: plain DOM, textContent for every value from the data.
const APP = `
const ICON = { volume: ${JSON.stringify(volume)}, pencil: ${JSON.stringify(pencil)}, trash: ${JSON.stringify(trash)} };
const $ = (s, r = document) => r.querySelector(s);
const status = $("[data-status]"), list = $("[data-cards]"), count = $("[data-count]");
const day = (d) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
let today = "";

async function api(path, body) {
  const res = await fetch("/api/reading/" + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  if (res.status === 401) location.reload();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
  return data;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function button(label, icon, onClick, iconOnly) {
  const b = el("button", "ghost" + (iconOnly ? " icon" : ""));
  b.type = "button";
  if (icon) b.insertAdjacentHTML("beforeend", ICON[icon]);
  if (iconOnly) { b.title = label; b.append(el("span", "sr-only", label)); } else b.append(label);
  b.addEventListener("click", onClick);
  return b;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  speechSynthesis.speak(u);
}
const players = new Map();
async function play(card, li) {
  try {
    if (!card.audio && !card.audioChecked) {
      card.audioChecked = true;
      const a = await api("audio", { term: card.term });
      if (a.audio) { card.audio = a.audio; li.replaceWith(render(card)); }
    }
    if (card.audio) {
      players.get(card.term)?.pause();
      const p = new Audio(card.audio.url);
      players.set(card.term, p);
      await p.play();
      return;
    }
  } catch {}
  speak(card.term);
}

function render(card) {
  const li = el("li", "card");
  li.dataset.term = card.term;
  li.dataset.due = String(card.due <= today);
  const word = el("div", "word");
  word.append(el("span", "term", card.term));
  if (card.ipa) word.append(el("span", "ipa", "/" + card.ipa + "/"));
  word.append(button("Play " + card.term, "volume", () => play(card, li), true));
  word.append(el("span", "due", card.due <= today ? "Due" : day(card.due)));
  li.append(word);
  if (card.audio) {
    const c = el("p", "credit");
    const a = el("a", null, card.audio.author ? card.audio.author + ", " + card.audio.license : card.audio.license);
    a.href = "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(card.audio.file);
    a.target = "_blank"; a.rel = "noreferrer";
    c.append("Recording: ", a);
    li.append(c);
  }
  if (card.tr) li.append(el("p", "tr", card.tr));
  if (card.def) li.append(el("p", "def", card.def));
  for (const [text, tr, src] of [[card.clipped, card.clipped_tr, card.book], [card.sentence, card.sentence_tr, null]]) {
    if (!text) continue;
    const q = el("blockquote", "quote");
    const line = el("div");
    line.append(text, " ");
    line.append(button("Play sentence", "volume", () => speak(text), true));
    q.append(line);
    if (tr) q.append(el("div", "muted", tr));
    if (src) q.append(el("div", "src", src));
    li.append(q);
  }
  if (card.examples.length) {
    const ul = el("ul", "ex");
    for (const e of card.examples) {
      const item = el("li");
      const a = el("a", null, e.en);
      a.href = "https://tatoeba.org/en/sentences/show/" + e.id;
      a.target = "_blank"; a.rel = "noreferrer";
      item.append(a, el("span", null, e.tr));
      ul.append(item);
    }
    li.append(ul);
  }
  if (card.note) li.append(el("p", "note", card.note));

  const row = el("div", "row");
  if (card.due <= today)
    for (const grade of ["again", "good"])
      row.append(button(grade === "good" ? "Good" : "Again", null, async () => {
        try {
          const next = await api("review", { term: card.term, grade });
          Object.assign(card, next);
          li.replaceWith(render(card));
          count.textContent = summary();
        } catch (e) { status.textContent = "Couldn't save: " + e.message; }
      }));
  const end = el("div", "end");
  end.append(button("Edit " + card.term, "pencil", () => editForm(card, li), true));
  if (card.source === "manual")
    end.append(button("Delete " + card.term, "trash", async () => {
      if (!confirm("Delete \\u201c" + card.term + "\\u201d? Its review history goes too.")) return;
      try { await api("words/delete", { term: card.term }); cards = cards.filter((c) => c !== card); li.remove(); count.textContent = summary(); }
      catch (e) { status.textContent = "Couldn't delete: " + e.message; }
    }, true));
  row.append(end);
  li.append(row);
  return li;
}

function editForm(card, li) {
  if (li.querySelector(".edit")) return li.querySelector(".edit input, .edit textarea").focus();
  const f = el("form", "edit");
  const field = (name, value, multi, label) => {
    const i = el(multi ? "textarea" : "input");
    i.name = name; i.value = value || ""; i.placeholder = label; i.setAttribute("aria-label", label);
    f.append(i);
    return i;
  };
  const term = card.source === "manual" ? field("term", card.term, false, "Word or phrase") : null;
  field("note", card.note, false, "Note (optional)");
  field("sentence", card.sentence, true, "Sentence (optional)");
  const row = el("div", "row");
  const save = el("button", "ghost", "Save"); save.type = "submit";
  row.append(save, button("Cancel", null, () => f.remove()));
  f.append(row);
  f.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(f));
    try {
      const next = await api("words/edit", { term: card.term, new_term: term ? data.term : undefined, note: data.note, sentence: data.sentence });
      Object.assign(card, next);
      li.replaceWith(render(card));
    } catch (e) { status.textContent = "Couldn't save: " + e.message; }
  });
  li.append(f);
  f.querySelector("input, textarea").focus();
}

let cards = [];
const summary = () => { const due = cards.filter((c) => c.due <= today).length; return cards.length + (cards.length === 1 ? " word" : " words") + (due ? ", " + due + " due" : ""); };

$("[data-add]").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = ev.currentTarget;
  const data = Object.fromEntries(new FormData(f));
  try {
    const card = await api("words", data);
    cards = [card, ...cards.filter((c) => c.term !== card.term)];
    list.querySelector('[data-term="' + CSS.escape(card.term) + '"]')?.remove();
    list.prepend(render(card));
    f.reset();
    status.textContent = "";
    count.textContent = summary();
  } catch (e) { status.textContent = e.message === "bad" ? "That doesn't look like a word or phrase." : "Couldn't add it: " + e.message; }
});

(async () => {
  try {
    const data = await api("cards");
    today = data.today;
    cards = data.cards;
    list.replaceChildren(...cards.map(render));
    status.textContent = cards.length ? "" : "No words yet.";
    count.textContent = summary();
  } catch { status.textContent = "Couldn't load the words. Reload to try again."; }
})();
`;
