// The private reading app, at https://busahin.com/api/reading/app. It is
// served by this Worker and only behind the token (a cookie set by the sign-in
// form), so nothing about it is part of the public site: the static pages,
// their scripts and the search index never mention it.
//
// Six screens on one page, switched by the URL hash: Today, Review, Words,
// Sentences, Progress and Admin. English and Turkish (the site's rule for
// pages), the four themes (tokens copied from src/styles/global.css; keep them
// in step), Lucide icons only. Grades are queued in localStorage and sent when
// there is a connection, so a dropped connection mid-review loses nothing.
import * as ICONS from "./icons.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const STYLE = `
@font-face { font-family: "Merriweather"; src: url("/fonts/Merriweather-normal-tr.woff2") format("woff2"); font-weight: 300 900; font-display: swap; }
:root { --bg-primary:#ffffff; --bg-secondary:#f8fafc; --text-primary:#0f172a; --text-secondary:#475569; --text-muted:#94a3b8; --accent:#2563eb; --border:#e2e8f0; color-scheme: light; }
[data-theme="dark"] { --bg-primary:#0a0a0b; --bg-secondary:#111113; --text-primary:#fafafa; --text-secondary:#d4d4d8; --text-muted:#a1a1aa; --accent:#ef4444; --border:#27272a; color-scheme: dark; }
[data-theme="paper"] { --bg-primary:#faf8f1; --bg-secondary:#f5f0e1; --text-primary:#3d3929; --text-secondary:#5c5647; --text-muted:#8a8475; --accent:#b45309; --border:#d6ceb8; }
[data-theme="eink"] { --bg-primary:#ffffff; --bg-secondary:#ffffff; --text-primary:#000000; --text-secondary:#000000; --text-muted:#333333; --accent:#000000; --border:#4a4a4a; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg-primary); color: var(--text-primary); font: 380 1rem/1.6 "Merriweather", Georgia, serif; font-variation-settings: "opsz" 18; -webkit-tap-highlight-color: transparent; }
main { max-width: 640px; margin: 0 auto; padding: max(1rem, env(safe-area-inset-top)) 16px calc(5.5rem + env(safe-area-inset-bottom)); }
h1 { font-weight: 600; font-size: clamp(1.375rem, 3.2vw, 1.75rem); line-height: 1.1; margin: 0; }
h2 { font-weight: 500; font-size: 1.125rem; margin: 2rem 0 .75rem; padding-bottom: .5rem; border-bottom: 1px solid var(--border); }
.top { display: flex; align-items: center; gap: .5rem; min-height: 2.75rem; margin-bottom: 1rem; }
.top h1 { flex: 1; }
button, input, textarea, select { font: inherit; color: inherit; }
button, select { cursor: pointer; touch-action: manipulation; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ghost { display: inline-flex; align-items: center; justify-content: center; gap: .375rem; min-height: 2.75rem; padding: 0 1rem; border: 1px solid var(--border); border-radius: 999px; background: transparent; font-size: .9375rem; transition: border-color .2s ease, transform .16s ease-out, opacity .2s ease; }
.ghost:active { transform: scale(.97); }
.ghost[disabled] { opacity: .5; cursor: default; }
.icon { width: 2.75rem; padding: 0; }
.primary { background: var(--text-primary); color: var(--bg-primary); border-color: var(--text-primary); font-weight: 600; }
@media (hover: hover) and (pointer: fine) { .ghost:not(.primary):hover { border-color: var(--accent); } }
input, textarea, select { width: 100%; min-height: 2.75rem; padding: .5rem .75rem; border: 1px solid var(--border); border-radius: .5rem; background: var(--bg-primary); font-size: 1rem; }
textarea { min-height: 4.5rem; resize: vertical; }
input::placeholder, textarea::placeholder { color: var(--text-secondary); opacity: .8; }
.muted, .status { color: var(--text-secondary); font-size: .875rem; }
.status { min-height: 1.25rem; margin: .5rem 0 0; }
.figures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin: 0; padding: 1rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.figures div { display: flex; flex-direction: column-reverse; gap: .125rem; }
.figures dt { color: var(--text-secondary); font-size: .8125rem; }
.figures dd { margin: 0; font-size: 1.75rem; font-weight: 600; line-height: 1.15; font-variant-numeric: tabular-nums; }
.figures dd small { font-size: .875rem; font-weight: 400; color: var(--text-secondary); }
.chip { display: inline-flex; align-items: center; gap: .25rem; font-size: .8125rem; border: 1px solid var(--border); border-radius: 999px; padding: .125rem .625rem; }
.chip.yes { border-color: var(--text-primary); }
.action { width: 100%; margin-top: 1.5rem; min-height: 3.25rem; font-size: 1rem; }
.card { padding: 1.25rem 0; border-bottom: 1px dashed color-mix(in srgb, var(--border) 70%, transparent); }
.word { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .75rem; }
.term { font-size: 1.375rem; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; font-variation-settings: "opsz" 72; }
.big .term { font-size: 2.25rem; }
.ipa { color: var(--text-secondary); font-family: system-ui, sans-serif; font-size: .9375rem; }
.tr { margin: .375rem 0 0; font-size: 1.0625rem; }
.def { margin: .125rem 0 0; color: var(--text-secondary); font-size: .9375rem; }
.quote { margin: .875rem 0 0; padding-left: .75rem; border-left: 2px solid var(--border); font-size: .9375rem; }
.ex { list-style: none; margin: .875rem 0 0; padding: 0; display: grid; gap: .5rem; font-size: .9375rem; }
.ex span, .quote span { display: block; color: var(--text-secondary); font-size: .875rem; }
.ex a { color: inherit; text-decoration: none; }
.note { margin: .75rem 0 0; font-size: .875rem; font-style: italic; color: var(--text-secondary); }
.credit { font-size: .75rem; color: var(--text-secondary); margin: .25rem 0 0; }
.credit a, footer a { color: inherit; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: 1rem; }
.row .end { margin-left: auto; display: flex; gap: .5rem; }
.form { display: grid; gap: .5rem; margin: 0 0 1rem; }
.signin { margin-top: 1.5rem; }
.filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; margin: .5rem 0 1rem; }
.filters .wide { grid-column: 1 / -1; }
ul.plain { list-style: none; margin: 0; padding: 0; }
.line { display: flex; align-items: baseline; gap: .75rem; padding: .75rem 0; border-bottom: 1px dashed color-mix(in srgb, var(--border) 70%, transparent); }
.line .grow { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.line .meta { color: var(--text-secondary); font-size: .875rem; font-variant-numeric: tabular-nums; flex-shrink: 0; }
button.line { width: 100%; text-align: left; background: none; border: none; border-bottom: 1px dashed color-mix(in srgb, var(--border) 70%, transparent); border-radius: 0; }
.state { font-size: .75rem; border: 1px solid var(--border); border-radius: 999px; padding: 0 .5rem; color: var(--text-secondary); flex-shrink: 0; }
.state.due { border-color: var(--text-primary); color: var(--text-primary); }
.bar { display: block; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--border) 60%, transparent); overflow: hidden; margin-top: .375rem; }
.bar > span { display: block; height: 100%; background: var(--accent); transform-origin: left; }
.review { min-height: calc(100svh - 14rem); display: flex; flex-direction: column; padding-bottom: 5rem; }
.review .face { flex: 1; }
.review .back { margin-top: 1rem; }
.grades { position: fixed; left: 0; right: 0; bottom: calc(4.25rem + env(safe-area-inset-bottom)); padding: .75rem 16px; background: var(--bg-primary); border-top: 1px solid var(--border); display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; max-width: 640px; margin: 0 auto; }
.grades .ghost { min-height: 3.25rem; font-size: 1rem; }
.grades .only { grid-column: 1 / -1; }
.count { font-variant-numeric: tabular-nums; color: var(--text-secondary); font-size: .875rem; }
.sentence { padding: 1rem 0; border-bottom: 1px dashed color-mix(in srgb, var(--border) 70%, transparent); }
.sentence p { margin: 0; line-height: 1.9; }
.tok { display: inline; padding: .0625rem .125rem; margin: 0 -.125rem; border: none; background: none; border-radius: .25rem; font: inherit; text-decoration: none; }
.tok.rare { text-decoration: underline; text-decoration-style: dotted; text-decoration-thickness: 2px; text-underline-offset: 4px; text-decoration-color: var(--accent); }
.tok:active { background: color-mix(in srgb, var(--accent) 15%, transparent); }
.sheet { position: fixed; left: 0; right: 0; bottom: calc(4.25rem + env(safe-area-inset-bottom)); max-width: 640px; margin: 0 auto; padding: 1rem 16px; background: var(--bg-primary); border-top: 1px solid var(--text-primary); }
.chart { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 4px; align-items: end; height: 140px; margin-top: .5rem; }
.chart .col { display: flex; flex-direction: column-reverse; height: 100%; }
.chart .col span { display: block; }
.s-new { background: transparent; box-shadow: inset 0 0 0 1px var(--border); }
.s-learning { background: color-mix(in srgb, var(--accent) 30%, var(--bg-primary)); }
.s-review { background: color-mix(in srgb, var(--accent) 60%, var(--bg-primary)); }
.s-learned { background: var(--accent); }
[data-theme="eink"] .s-learning { background: repeating-linear-gradient(45deg, #000 0 1px, #fff 1px 5px); }
[data-theme="eink"] .s-review { background: repeating-linear-gradient(0deg, #000 0 2px, #fff 2px 4px); }
.legend { display: flex; flex-wrap: wrap; gap: .25rem 1rem; font-size: .8125rem; color: var(--text-secondary); margin-top: .5rem; }
.legend i { display: inline-block; width: .75rem; height: .75rem; margin-right: .375rem; vertical-align: -1px; border-radius: 2px; }
.axis { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 4px; font-size: .6875rem; color: var(--text-secondary); text-align: center; margin-top: .25rem; }
.switch { display: flex; align-items: center; gap: .75rem; padding: .625rem 0; border-bottom: 1px dashed color-mix(in srgb, var(--border) 70%, transparent); }
.switch label { flex: 1; display: flex; align-items: center; gap: .625rem; min-height: 2.75rem; }
.switch input[type="checkbox"] { width: 1.25rem; min-height: 1.25rem; margin: 0; accent-color: var(--text-primary); }
.switch select { width: 6rem; }
.token { font-family: ui-monospace, monospace; font-size: .8125rem; overflow-wrap: anywhere; padding: .75rem; border: 1px solid var(--text-primary); border-radius: .5rem; }
nav.tabs { position: fixed; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(5, 1fr); background: var(--bg-primary); border-top: 1px solid var(--border); padding-bottom: env(safe-area-inset-bottom); z-index: 5; }
nav.tabs a { display: flex; flex-direction: column; align-items: center; gap: .125rem; padding: .5rem 0 .625rem; min-height: 4.25rem; font-size: .6875rem; color: var(--text-secondary); text-decoration: none; }
nav.tabs a[aria-current="page"] { color: var(--text-primary); font-weight: 600; }
nav.tabs a[aria-current="page"] svg { stroke-width: 2.5; }
.offline { display: flex; align-items: center; gap: .5rem; margin: 0 0 1rem; padding: .5rem .75rem; border: 1px solid var(--text-primary); border-radius: .5rem; font-size: .875rem; }
footer { margin-top: 2.5rem; font-size: .75rem; color: var(--text-secondary); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.spin svg { animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
[data-motion="off"] *, [data-motion="off"] *::before { transition: none !important; animation: none !important; }
@media (min-width: 720px) { .figures { grid-template-columns: repeat(4, minmax(0, 1fr)); } .filters { grid-template-columns: repeat(4, minmax(0, 1fr)); } .filters .wide { grid-column: 1 / -1; } }
`;

// Pre-paint: the site's own theme choice (same origin, same localStorage), else the system's.
const THEME = `try{const t=localStorage.getItem("theme");document.documentElement.dataset.theme=t||(matchMedia("(update: slow), (monochrome)").matches?"eink":matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch{}`;

// The sign-in page's own few lines: an anonymous visitor never receives the app's stylesheet.
const SIGNIN_STYLE = `
:root { --bg:#ffffff; --fg:#0f172a; --muted:#475569; --line:#e2e8f0; color-scheme: light dark; }
[data-theme="dark"] { --bg:#0a0a0b; --fg:#fafafa; --muted:#d4d4d8; --line:#27272a; }
[data-theme="paper"] { --bg:#faf8f1; --fg:#3d3929; --muted:#5c5647; --line:#d6ceb8; }
[data-theme="eink"] { --bg:#ffffff; --fg:#000000; --muted:#000000; --line:#4a4a4a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 1rem/1.6 Georgia, serif; }
main { max-width: 26rem; margin: 0 auto; padding: max(2rem, env(safe-area-inset-top)) 16px; }
h1 { font-size: 1.5rem; margin: 0 0 1.5rem; }
form { display: grid; gap: .5rem; }
input, button { font: inherit; color: inherit; min-height: 2.75rem; padding: .5rem .75rem; border: 1px solid var(--line); border-radius: .5rem; background: var(--bg); }
button { background: var(--fg); color: var(--bg); border-color: var(--fg); cursor: pointer; }
:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
p { color: var(--muted); font-size: .875rem; min-height: 1.25rem; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
`;

const shell = (title, nonce, body, lang = "en", head = "", style = STYLE) => `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#ffffff">
<title>${esc(title)}</title>
${head}
<script nonce="${nonce}">${THEME}</script>
<style nonce="${nonce}">${style}</style>
</head>
<body>${body}</body>
</html>`;

export function loginPage(nonce, failed = false) {
  return shell(
    "Sign in",
    nonce,
    `<main><h1>Sign in</h1>
<form method="post" action="/api/reading/login">
  <label class="sr-only" for="token">Token</label>
  <input id="token" name="token" type="password" autocomplete="current-password" placeholder="Token" required>
  <button type="submit">Sign in</button>
</form>
<p role="alert">${failed ? "That did not work. Wait a minute if you tried several times." : ""}</p></main>`,
    "en",
    "",
    SIGNIN_STYLE,
  );
}

// Every word the app shows, in both languages.
const TEXT = {
  en: {
    locale: "en-GB",
    tabs: { today: "Today", review: "Review", words: "Words", sentences: "Sentences", progress: "Progress", admin: "Admin" },
    streak: "Streak",
    days: (n) => (n === 1 ? "day" : "days"),
    readToday: "Read today",
    notYet: "Not read yet today",
    due: "Due",
    total: "Words",
    learned: "Learned",
    reviewN: (n) => `Review ${n} ${n === 1 ? "word" : "words"}`,
    addWord: "Add a word",
    wordOfDay: "Word of the day",
    play: (w) => `Play ${w}`,
    playSentence: "Play the sentence",
    show: "Show",
    again: "Again",
    good: "Good",
    doneToday: "Nothing due. Well done.",
    reviewed: (n) => `${n} reviewed in this session.`,
    queued: (n) => `Offline: ${n} ${n === 1 ? "answer" : "answers"} waiting to be sent.`,
    search: "Search",
    allBooks: "Every book",
    allStates: "Every state",
    allSources: "Clipped and added",
    allLists: "Every list",
    states: { due: "Due", new: "New", learning: "Learning", review: "Reviewing", learned: "Learned" },
    sources: { clipping: "Clipped", manual: "Added by hand" },
    awl: "Academic Word List",
    band: (b) => (b === "unranked" ? "No frequency rank" : `Frequency ${b}`),
    count: (n) => `${n} ${n === 1 ? "word" : "words"}`,
    term: "Word or phrase",
    note: "Note (optional)",
    sentence: "Sentence (optional)",
    add: "Add",
    save: "Save",
    cancel: "Cancel",
    edit: (w) => `Edit ${w}`,
    del: (w) => `Delete ${w}`,
    confirmDelete: (w) => `Delete “${w}”? Its review history goes too.`,
    recording: "Recording",
    addCard: (w) => `Add “${w}”`,
    added: (w) => `“${w}” is a card now.`,
    isCard: "Already a card",
    noSentences: "No clipped sentences yet.",
    rareHint: "Underlined: rare words",
    weeks: "Cards by state, last 12 weeks",
    addedWeekly: "Added per week",
    accuracy: "Right, last 30 days",
    reviewsAll: "Reviews",
    bands: "By frequency",
    awlTitle: "Academic Word List",
    awlMet: (m, l) => `${m} of 570 families met, ${l} learned`,
    books: "By book",
    lists: "Book word lists",
    of: (a, b) => `${a} of ${b}`,
    lastSync: "Last pull",
    syncNow: "Pull now",
    ok: "Worked",
    failed: "Failed",
    quota: "Today",
    translations: "Translations",
    recordings: "Recordings",
    pushes: "Notifications",
    morning: "Morning word",
    evening: "Streak at risk",
    weekly: "Sunday digest",
    noTopic: "No ntfy topic is set, so nothing is sent.",
    exportTitle: "Export",
    exportJson: "Everything (JSON)",
    exportCsv: "Cards (CSV for Anki)",
    tokenTitle: "Access",
    rotate: "Rotate the token",
    confirmRotate: "Make a new token? The old one stops working on every device.",
    newToken: "The new token, shown once:",
    signOut: "Sign out",
    language: "Türkçe",
    error: (e) => `Couldn't do that: ${e}`,
    loadFailed: "Couldn't load. Pull to refresh or try again.",
    retry: "Try again",
    never: "never",
    credit: "Meanings: WikDict, CC BY-SA 4.0. Examples: Tatoeba, CC BY 2.0 FR. Recordings: Wikimedia Commons, credited under each word.",
  },
  tr: {
    locale: "tr-TR",
    tabs: { today: "Bugün", review: "Tekrar", words: "Kelimeler", sentences: "Cümleler", progress: "İlerleme", admin: "Yönetim" },
    streak: "Seri",
    days: () => "gün",
    readToday: "Bugün okudum",
    notYet: "Bugün henüz okumadım",
    due: "Sırası gelen",
    total: "Kelime",
    learned: "Öğrenilen",
    reviewN: (n) => `${n} kelimeyi tekrar et`,
    addWord: "Kelime ekle",
    wordOfDay: "Günün kelimesi",
    play: (w) => `${w} kelimesini dinle`,
    playSentence: "Cümleyi dinle",
    show: "Göster",
    again: "Tekrar",
    good: "Bildim",
    doneToday: "Sırası gelen yok. Eline sağlık.",
    reviewed: (n) => `Bu oturumda ${n} tekrar.`,
    queued: (n) => `Çevrimdışı: ${n} cevap gönderilmeyi bekliyor.`,
    search: "Ara",
    allBooks: "Bütün kitaplar",
    allStates: "Bütün durumlar",
    allSources: "Alıntı ve elle eklenen",
    allLists: "Bütün listeler",
    states: { due: "Sırası geldi", new: "Yeni", learning: "Öğreniliyor", review: "Tekrarda", learned: "Öğrenildi" },
    sources: { clipping: "Alıntı", manual: "Elle eklenen" },
    awl: "Akademik Kelime Listesi",
    band: (b) => (b === "unranked" ? "Sıklık sırası yok" : `Sıklık ${b}`),
    count: (n) => `${n} kelime`,
    term: "Kelime ya da ifade",
    note: "Not (isteğe bağlı)",
    sentence: "Cümle (isteğe bağlı)",
    add: "Ekle",
    save: "Kaydet",
    cancel: "Vazgeç",
    edit: (w) => `${w} kelimesini düzenle`,
    del: (w) => `${w} kelimesini sil`,
    confirmDelete: (w) => `“${w}” silinsin mi? Tekrar geçmişi de gider.`,
    recording: "Kayıt",
    addCard: (w) => `“${w}” ekle`,
    added: (w) => `“${w}” artık bir kart.`,
    isCard: "Zaten kart",
    noSentences: "Henüz alıntılanmış cümle yok.",
    rareHint: "Altı çizili: seyrek kelimeler",
    weeks: "Durumlara göre kartlar, son 12 hafta",
    addedWeekly: "Haftalık eklenen",
    accuracy: "Doğru, son 30 gün",
    reviewsAll: "Tekrar",
    bands: "Sıklığa göre",
    awlTitle: "Akademik Kelime Listesi",
    awlMet: (m, l) => `570 aileden ${m} tanesiyle karşılaştım, ${l} tanesini öğrendim`,
    books: "Kitaba göre",
    lists: "Kitap kelime listeleri",
    of: (a, b) => `${a} / ${b}`,
    lastSync: "Son çekme",
    syncNow: "Şimdi çek",
    ok: "Başarılı",
    failed: "Başarısız",
    quota: "Bugün",
    translations: "Çeviriler",
    recordings: "Kayıtlar",
    pushes: "Bildirimler",
    morning: "Sabah kelimesi",
    evening: "Seri tehlikede",
    weekly: "Pazar özeti",
    noTopic: "ntfy konusu ayarlı değil, bildirim gitmiyor.",
    exportTitle: "Dışa aktar",
    exportJson: "Her şey (JSON)",
    exportCsv: "Kartlar (Anki için CSV)",
    tokenTitle: "Erişim",
    rotate: "Anahtarı yenile",
    confirmRotate: "Yeni anahtar oluşturulsun mu? Eskisi her cihazda çalışmayı bırakır.",
    newToken: "Yeni anahtar, bir kez gösteriliyor:",
    signOut: "Çıkış yap",
    language: "English",
    error: (e) => `Olmadı: ${e}`,
    loadFailed: "Yüklenemedi. Yeniden dene.",
    retry: "Yeniden dene",
    never: "hiç",
    credit: "Anlamlar: WikDict, CC BY-SA 4.0. Örnekler: Tatoeba, CC BY 2.0 FR. Kayıtlar: Wikimedia Commons, her kelimenin altında belirtiliyor.",
  },
};

/**
 * Whether a queued grade is given up after this answer. Only when the Worker
 * itself said it cannot apply (400 bad, 409 not due, a 404 with its JSON body:
 * no such card). Rate limits (429), server errors, a lost connection and a
 * signed-out session (an empty 404) keep it queued for the next try.
 */
export function dropGrade(status, json) {
  return status === 400 || status === 409 || (status === 404 && json);
}

// The copy table as JavaScript source, functions included, so the page runs it without eval.
const source = (v) =>
  typeof v === "function" ? v.toString() : v && typeof v === "object" ? `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${source(x)}`).join(", ")}}` : JSON.stringify(v);

export function appPage(nonce) {
  const icons = Object.fromEntries(Object.entries(ICONS));
  return shell(
    "Reading",
    nonce,
    `<main id="app" aria-live="polite"></main>
<nav class="tabs" aria-label="Screens"></nav>
<script nonce="${nonce}">(${client.toString()})(${JSON.stringify(icons)}, ${source(TEXT)}, ${dropGrade.toString()});</script>`,
    "en",
    `<link rel="manifest" href="/api/reading/app.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">`,
  );
}

/**
 * The app itself. Runs in the browser: this function is sent as source text,
 * so it may only use its two arguments and the browser's own globals.
 */
function client(ICON, TEXT, dropGrade) {
  const store = {
    get: (k, d) => {
      try {
        return JSON.parse(localStorage.getItem(k)) ?? d;
      } catch {
        return d;
      }
    },
    set: (k, v) => {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {}
    },
  };
  let lang = store.get("reading-app-lang", navigator.language?.startsWith("tr") ? "tr" : "en");
  let t = TEXT[lang];
  document.documentElement.lang = lang;
  const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches && document.documentElement.dataset.theme !== "eink";
  document.documentElement.dataset.motion = motion ? "on" : "off";
  const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
  const app = document.getElementById("app");
  const nav = document.querySelector("nav.tabs");
  const SCREENS = ["today", "review", "words", "sentences", "progress"];

  // ---- small helpers
  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "style") n.style.cssText = v; // the CSSOM, which the CSP allows; a style attribute it would block
      else if (k === "html") n.innerHTML = v; // only ever our own icon SVG
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    n.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
    return n;
  };
  const icon = (name) => el("span", { html: ICON[name], style: "display:inline-flex" });
  const button = (label, opts = {}) =>
    el(
      "button",
      { type: opts.type ?? "button", class: `ghost${opts.primary ? " primary" : ""}${opts.iconOnly ? " icon" : ""}${opts.class ? ` ${opts.class}` : ""}`, title: opts.iconOnly ? label : null, onclick: opts.onclick, disabled: opts.disabled },
      opts.icon ? icon(opts.icon) : null,
      opts.iconOnly ? el("span", { class: "sr-only" }, label) : label,
    );
  const num = (n) => new Intl.NumberFormat(t.locale).format(n);
  const day = (d, opts = { day: "numeric", month: "short" }) => new Intl.DateTimeFormat(t.locale, { ...opts, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const when = (s) => (s ? new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(s * 1000) : t.never);
  const enter = (node) => motion && node.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: EASE });

  async function api(path, body) {
    const res = await fetch(`/api/reading/${path}`, body !== undefined ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
    const json = (res.headers.get("content-type") ?? "").includes("json");
    // Without a valid session every private route answers an empty 404: back to the sign-in form.
    if (res.status === 404 && !json) {
      location.reload();
      throw Object.assign(new Error("signed out"), { status: 404, json: false });
    }
    const data = json ? await res.json().catch(() => ({})) : {};
    if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, json, data });
    return data;
  }

  // ---- state
  const state = { cards: null, today: null, summary: null, mined: null, progress: null, admin: null, session: null };
  const loadCards = async () => {
    const data = await api("cards");
    state.cards = data.cards;
    state.day = data.today;
  };
  const isDue = (c) => c.due <= state.day;
  const stateOf = (c) => (isDue(c) ? "due" : !c.reviews ? "new" : c.box >= 5 ? "learned" : c.box >= 3 ? "review" : "learning");

  // ---- the grade queue: answers are kept here until the Worker has them
  const QUEUE = "reading-queue";
  let flushing = false;
  async function flush() {
    if (flushing) return;
    flushing = true;
    try {
      for (let queue = store.get(QUEUE, []); queue.length; queue = store.get(QUEUE, [])) {
        const g = queue[0];
        try {
          await api("review", g);
        } catch (e) {
          // Kept unless the Worker said it can never apply; the next try is in 30 seconds or on reconnecting.
          if (!dropGrade(e.status, e.json)) break;
        }
        store.set(QUEUE, store.get(QUEUE, []).filter((q) => q.id !== g.id));
      }
    } finally {
      flushing = false;
      offlineBanner();
    }
  }
  const offlineBanner = () => {
    const n = store.get(QUEUE, []).length;
    document.querySelector(".offline")?.remove();
    if (n) app.prepend(el("p", { class: "offline", role: "status" }, icon("offline"), t.queued(n)));
  };
  addEventListener("online", flush);
  setInterval(() => store.get(QUEUE, []).length && navigator.onLine && flush(), 30_000);

  function grade(card, g) {
    const id = `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(2)).join("-")}`;
    store.set(QUEUE, [...store.get(QUEUE, []), { id, term: card.term, grade: g, at: Date.now() }]);
    // The schedule as the Worker will set it, so the session moves on at once.
    const box = g === "good" ? Math.min(5, card.box + 1) : 1;
    const next = new Date(`${state.day}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + [1, 2, 4, 8, 16][box - 1]);
    Object.assign(card, { box, due: next.toISOString().slice(0, 10), reviews: card.reviews + 1 });
    flush();
  }

  // ---- shared pieces
  const players = new Map();
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }
  async function play(card) {
    try {
      if (!card.audio && !card.audioChecked) {
        card.audioChecked = true;
        card.audio = (await api("audio", { term: card.term })).audio;
      }
      if (card.audio) {
        players.get("current")?.pause();
        const p = new Audio(card.audio.url);
        players.set("current", p);
        await p.play();
        return;
      }
    } catch {}
    speak(card.term);
  }

  // The full card: meaning, the sentence it came from, examples. Used by Review and Words.
  function details(card) {
    const out = [];
    if (card.audio) {
      const a = el("a", { href: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(card.audio.file)}`, target: "_blank", rel: "noreferrer" }, [card.audio.author, card.audio.license].filter(Boolean).join(", "));
      out.push(el("p", { class: "credit" }, `${t.recording}: `, a));
    }
    if (card.tr) out.push(el("p", { class: "tr" }, card.tr));
    if (card.def) out.push(el("p", { class: "def" }, card.def));
    for (const [text, tr, src] of [[card.clipped, card.clipped_tr, card.book], [card.sentence, card.sentence_tr, null]]) {
      if (!text) continue;
      out.push(
        el(
          "blockquote",
          { class: "quote" },
          el("div", {}, text, " ", button(t.playSentence, { icon: "volume", iconOnly: true, onclick: () => speak(text) })),
          tr && el("span", {}, tr),
          src && el("span", {}, src),
        ),
      );
    }
    if (card.examples?.length)
      out.push(
        el(
          "ul",
          { class: "ex" },
          card.examples.map((e) => el("li", {}, el("a", { href: `https://tatoeba.org/en/sentences/show/${e.id}`, target: "_blank", rel: "noreferrer" }, e.en), el("span", {}, e.tr))),
        ),
      );
    if (card.note) out.push(el("p", { class: "note" }, card.note));
    return out;
  }
  const head = (card) =>
    el("div", { class: "word" }, el("span", { class: "term" }, card.term), card.ipa && el("span", { class: "ipa" }, `/${card.ipa}/`), button(t.play(card.term), { icon: "volume", iconOnly: true, onclick: () => play(card) }));

  const top = (title, ...extra) => el("div", { class: "top" }, el("h1", {}, title), ...extra);
  const failed = (retry) => el("div", {}, el("p", { class: "status", role: "alert" }, t.loadFailed), button(t.retry, { icon: "sync", onclick: retry }));

  // ---- screens
  async function today() {
    if (!state.cards) await loadCards();
    const [mine, summary] = await Promise.all([api("today"), fetch("/api/reading/summary").then((r) => (r.ok ? r.json() : null)).catch(() => null)]);
    const due = state.cards.filter(isDue).length;
    const readToday = Boolean(summary?.days?.some(([d]) => d === mine.day));
    const learned = state.cards.filter((c) => c.box >= 5).length;
    const wotd = mine.word && (state.cards.find((c) => c.term === mine.word.term) ?? { ...mine.word, examples: [] });
    return [
      top(day(mine.day, { weekday: "long", day: "numeric", month: "long" }), button(t.tabs.admin, { icon: "admin", iconOnly: true, onclick: () => (location.hash = "#admin") })),
      el(
        "dl",
        { class: "figures" },
        el("div", {}, el("dt", {}, t.streak), el("dd", {}, num(mine.streak), " ", el("small", {}, t.days(mine.streak)))),
        el("div", {}, el("dt", {}, t.due), el("dd", {}, num(due))),
        el("div", {}, el("dt", {}, t.total), el("dd", {}, num(state.cards.length))),
        el("div", {}, el("dt", {}, t.learned), el("dd", {}, num(learned))),
      ),
      el("p", { style: "margin:1rem 0 0" }, el("span", { class: `chip${readToday ? " yes" : ""}` }, icon(readToday ? "check" : "circle"), readToday ? t.readToday : t.notYet)),
      due
        ? button(t.reviewN(due), { primary: true, class: "action", icon: "review", onclick: () => (location.hash = "#review") })
        : button(t.addWord, { primary: true, class: "action", icon: "plus", onclick: () => (location.hash = "#words/add") }),
      wotd && el("h2", {}, t.wordOfDay),
      wotd && el("div", { class: "card" }, head(wotd), ...details(wotd)),
    ];
  }

  async function review() {
    if (!state.cards) await loadCards();
    if (!state.session || state.session.day !== state.day) state.session = { day: state.day, queue: state.cards.filter(isDue).map((c) => c.term), done: 0, practice: new Set() };
    const s = state.session;
    const view = el("div", { class: "review" });
    const render = (direction = 0) => {
      const card = state.cards.find((c) => c.term === s.queue[0]);
      const counter = el("p", { class: "count" }, `${num(s.done)} / ${num(s.done + s.queue.length)}`);
      const barFill = el("span", { style: `transform:scaleX(${s.done / Math.max(1, s.done + s.queue.length)})` });
      if (!card) {
        view.replaceChildren(top(t.tabs.review), el("p", {}, t.doneToday), s.done ? el("p", { class: "muted" }, t.reviewed(s.done)) : null);
        document.querySelector(".grades")?.remove();
        return;
      }
      const face = el("div", { class: "face big" }, head(card));
      const back = el("div", { class: "back", hidden: true }, ...details(card));
      face.append(back);
      view.replaceChildren(top(t.tabs.review, counter), el("span", { class: "bar" }, barFill), el("div", { class: "card", style: "border:none" }, face));
      document.querySelector(".grades")?.remove();
      const bar = el("div", { class: "grades" });
      const reveal = () => {
        back.hidden = false;
        if (motion) back.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 180, easing: EASE });
        bar.replaceChildren(
          button(t.again, { onclick: () => answer("again"), class: "again" }),
          button(t.good, { primary: true, onclick: () => answer("good"), class: "good" }),
        );
        bar.querySelector(".good").focus({ preventScroll: true });
      };
      const answer = (g) => {
        // A card answered "again" comes back once more before the session ends,
        // as practice: the Worker has its grade already and would refuse a second.
        if (!s.practice.has(card.term)) grade(card, g);
        s.queue.shift();
        if (g === "again" && !s.practice.has(card.term)) (s.practice.add(card.term), s.queue.push(card.term));
        else s.done++;
        if (motion) face.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${g === "good" ? 24 : -24}px)` }], { duration: 140, easing: EASE }).finished.then(() => render(g === "good" ? 1 : -1));
        else render();
      };
      bar.append(button(t.show, { primary: true, class: "only", onclick: reveal }));
      document.body.append(bar);
      if (direction && motion) face.animate([{ opacity: 0, transform: `translateX(${direction * -16}px)` }, { opacity: 1, transform: "none" }], { duration: 200, easing: EASE });
      view.onkey = (e) => {
        if (e.target.closest?.("input, textarea, select")) return;
        if (back.hidden && (e.key === " " || e.key === "Enter")) (e.preventDefault(), reveal());
        else if (!back.hidden && e.key === "1") answer("again");
        else if (!back.hidden && (e.key === "2" || e.key === " ")) (e.preventDefault(), answer("good"));
      };
    };
    render();
    return [view];
  }

  async function words(sub) {
    if (!state.cards) await loadCards();
    const f = store.get("reading-filters", { q: "", book: "", state: "", source: "", list: "" });
    const books = [...new Set(state.cards.map((c) => c.book).filter(Boolean))].sort();
    const lists = [...new Set(state.cards.flatMap((c) => c.lists ?? []))].sort();
    const bandsUsed = [...new Set(state.cards.map((c) => c.band))];
    const select = (key, all, options) =>
      el(
        "select",
        { "aria-label": all, onchange: (e) => ((f[key] = e.target.value), store.set("reading-filters", f), draw()) },
        el("option", { value: "" }, all),
        options.map(([v, label]) => el("option", { value: v, selected: f[key] === v }, label)),
      );
    const search = el("input", { type: "search", placeholder: t.search, value: f.q, "aria-label": t.search, oninput: (e) => ((f.q = e.target.value), store.set("reading-filters", f), draw()) });
    const filters = el(
      "div",
      { class: "filters" },
      el("div", { class: "wide" }, search),
      select("state", t.allStates, Object.entries(t.states)),
      select("source", t.allSources, Object.entries(t.sources)),
      select("book", t.allBooks, books.map((b) => [b, b])),
      select("list", t.allLists, [["awl", t.awl], ...bandsUsed.sort().map((b) => [`band:${b}`, t.band(b)]), ...lists.map((l) => [`book:${l}`, l])]),
    );
    const form = addForm(sub === "add");
    const count = el("p", { class: "count" });
    const list = el("ul", { class: "plain" });
    const matches = (c) =>
      (!f.q || c.term.includes(f.q.toLowerCase()) || (c.tr ?? "").toLowerCase().includes(f.q.toLowerCase())) &&
      (!f.state || stateOf(c) === f.state) &&
      (!f.source || c.source === f.source) &&
      (!f.book || c.book === f.book) &&
      (!f.list || (f.list === "awl" ? c.awl : f.list.startsWith("band:") ? c.band === f.list.slice(5) : (c.lists ?? []).includes(f.list.slice(5))));
    const draw = () => {
      const shown = state.cards.filter(matches);
      count.textContent = t.count(shown.length);
      list.replaceChildren(...shown.slice(0, 300).map(row));
    };
    const row = (card) => {
      const li = el("li");
      const open = () => {
        const full = el("div", { class: "card" }, head(card), ...details(card), actions(card, li));
        li.replaceChildren(full);
        enter(full);
      };
      li.append(
        el(
          "button",
          { class: "line", type: "button", onclick: open, "aria-expanded": "false" },
          el("span", { class: "grow" }, el("strong", {}, card.term), card.tr ? el("span", { class: "muted" }, ` · ${card.tr.split(",")[0]}`) : null),
          el("span", { class: `state${isDue(card) ? " due" : ""}` }, t.states[stateOf(card)]),
        ),
      );
      return li;
    };
    const actions = (card, li) =>
      el(
        "div",
        { class: "row" },
        el(
          "div",
          { class: "end" },
          button(t.edit(card.term), { icon: "pencil", iconOnly: true, onclick: () => li.replaceChildren(editForm(card, li)) }),
          card.source === "manual" &&
            button(t.del(card.term), {
              icon: "trash",
              iconOnly: true,
              onclick: async () => {
                if (!confirm(t.confirmDelete(card.term))) return;
                try {
                  await api("words/delete", { term: card.term });
                  state.cards = state.cards.filter((c) => c !== card);
                  li.remove();
                  count.textContent = t.count(state.cards.filter(matches).length);
                } catch (e) {
                  status(t.error(e.message));
                }
              },
            }),
        ),
      );
    const editForm = (card, li) => {
      const fields = {
        new_term: card.source === "manual" ? el("input", { value: card.term, "aria-label": t.term, maxlength: 60 }) : null,
        note: el("input", { value: card.note ?? "", placeholder: t.note, "aria-label": t.note, maxlength: 500 }),
        sentence: el("textarea", { placeholder: t.sentence, "aria-label": t.sentence, maxlength: 1000 }, card.sentence ?? ""),
      };
      const formEl = el(
        "form",
        {
          class: "form card",
          onsubmit: async (e) => {
            e.preventDefault();
            try {
              const next = await api("words/edit", { term: card.term, new_term: fields.new_term?.value, note: fields.note.value, sentence: fields.sentence.value });
              Object.assign(card, next);
              draw();
            } catch (err) {
              status(t.error(err.message));
            }
          },
        },
        Object.values(fields),
        el("div", { class: "row" }, button(t.save, { type: "submit", primary: true }), button(t.cancel, { onclick: draw })),
      );
      return formEl;
    };
    draw();
    return [top(t.tabs.words, button(t.addWord, { icon: "plus", iconOnly: true, onclick: () => form.toggleAttribute("hidden") || form.querySelector("input").focus() })), form, filters, count, list];
  }

  function addForm(open) {
    const term = el("input", { name: "term", placeholder: t.term, "aria-label": t.term, maxlength: 60, autocomplete: "off", autocapitalize: "none", spellcheck: "false", required: true });
    const note = el("input", { name: "note", placeholder: t.note, "aria-label": t.note, maxlength: 500, autocomplete: "off" });
    const sentence = el("textarea", { name: "sentence", placeholder: t.sentence, "aria-label": t.sentence, maxlength: 1000 });
    const form = el(
      "form",
      {
        class: "form",
        hidden: !open,
        onsubmit: async (e) => {
          e.preventDefault();
          try {
            const card = await api("words", { term: term.value, note: note.value, sentence: sentence.value });
            state.cards = [card, ...state.cards.filter((c) => c.term !== card.term)];
            form.reset();
            status(t.added(card.term));
            route();
          } catch (err) {
            status(t.error(err.message));
          }
        },
      },
      term,
      note,
      sentence,
      button(t.add, { type: "submit", primary: true, icon: "plus" }),
    );
    if (open) queueMicrotask(() => term.focus());
    return form;
  }

  async function sentences() {
    state.mined = await api("sentences/mined");
    if (!state.cards) await loadCards();
    const cards = new Set(state.cards.map((c) => c.term));
    let sheet = null;
    const offer = (item, word, info) => {
      sheet?.remove();
      const done = cards.has(word) || (info?.lemma && cards.has(info.lemma));
      sheet = el(
        "div",
        { class: "sheet", role: "dialog", "aria-label": word },
        el("div", { class: "word" }, el("span", { class: "term" }, word), info?.ipa && el("span", { class: "ipa" }, `/${info.ipa}/`), button(t.cancel, { icon: "close", iconOnly: true, onclick: () => sheet.remove() })),
        info?.tr && el("p", { class: "tr" }, info.tr),
        done
          ? el("p", { class: "muted" }, t.isCard)
          : button(t.addCard(info?.lemma ?? word), {
              primary: true,
              class: "action",
              icon: "plus",
              onclick: async () => {
                try {
                  const card = await api("words", { term: info?.lemma ?? word, sentence: item.text });
                  state.cards = [card, ...state.cards.filter((c) => c.term !== card.term)];
                  cards.add(card.term);
                  sheet.remove();
                  status(t.added(card.term));
                } catch (e) {
                  status(t.error(e.message));
                }
              },
            }),
      );
      document.body.append(sheet);
      if (motion) sheet.animate([{ transform: "translateY(16px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 200, easing: EASE });
    };
    const items = state.mined.items.map((item) => {
      const rare = new Map(item.words.map((w) => [w.word, w]));
      const p = el("p");
      for (const part of item.text.split(/(\p{L}+(?:['’-]\p{L}+)*)/u)) {
        const lower = part.toLowerCase().replace(/’/g, "'");
        if (!/\p{L}/u.test(part)) p.append(part);
        else p.append(el("button", { type: "button", class: `tok${rare.has(lower) ? " rare" : ""}`, onclick: () => offer(item, lower, rare.get(lower)) }, part));
      }
      return el(
        "div",
        { class: "sentence" },
        p,
        item.tr && el("p", { class: "muted", style: "margin-top:.375rem" }, item.tr),
        el("p", { class: "muted" }, [item.book, item.chapter].filter(Boolean).join(" · ")),
      );
    });
    return [top(t.tabs.sentences), el("p", { class: "muted" }, t.rareHint), ...(items.length ? items : [el("p", {}, t.noSentences)])];
  }

  async function progressScreen() {
    const p = await api("progress");
    const max = Math.max(1, ...p.weeks.map((w) => w.new + w.learning + w.review + w.learned));
    const order = ["learned", "review", "learning", "new"];
    const chart = el(
      "div",
      { class: "chart", role: "img", "aria-label": `${t.weeks}: ${p.weeks.map((w) => `${day(w.week)}: ${order.map((k) => `${w[k]} ${t.states[k]}`).join(", ")}`).join("; ")}` },
      p.weeks.map((w) =>
        el(
          "div",
          { class: "col" },
          ["learned", "review", "learning", "new"].map((k) => el("span", { class: `s-${k}`, style: `height:${(w[k] / max) * 100}%`, title: `${day(w.week)} · ${t.states[k]}: ${w[k]}` })),
        ),
      ),
    );
    const axis = el("div", { class: "axis", "aria-hidden": "true" }, p.weeks.map((w, i) => el("span", {}, i % 3 === 0 ? day(w.week) : "")));
    const legend = el("div", { class: "legend" }, ["new", "learning", "review", "learned"].map((k) => el("span", {}, el("i", { class: `s-${k}` }), t.states[k])));
    const lineRow = (label, value, frac) =>
      el("li", { class: "line", style: "display:block" }, el("div", { style: "display:flex;gap:.75rem" }, el("span", { class: "grow" }, label), el("span", { class: "meta" }, value)), frac !== undefined && el("span", { class: "bar" }, el("span", { style: `transform:scaleX(${frac})` })));
    const totalCards = p.weeks.at(-1);
    const total = totalCards.new + totalCards.learning + totalCards.review + totalCards.learned;
    const all = Math.max(1, total);
    return [
      top(t.tabs.progress),
      el(
        "dl",
        { class: "figures" },
        el("div", {}, el("dt", {}, t.total), el("dd", {}, num(total))),
        el("div", {}, el("dt", {}, t.learned), el("dd", {}, num(totalCards.learned))),
        el("div", {}, el("dt", {}, t.accuracy), el("dd", {}, p.accuracy.last30 === null ? "–" : `${p.accuracy.last30}%`)),
        el("div", {}, el("dt", {}, t.reviewsAll), el("dd", {}, num(p.accuracy.reviews))),
      ),
      el("h2", {}, t.weeks),
      chart,
      axis,
      legend,
      el("h2", {}, t.addedWeekly),
      el("ul", { class: "plain" }, p.weeks.slice(-6).map((w) => lineRow(day(w.week), num(w.added)))),
      el("h2", {}, t.bands),
      el("ul", { class: "plain" }, Object.entries(p.bands).map(([b, n]) => lineRow(t.band(b), num(n), n / all))),
      el("h2", {}, t.awlTitle),
      el("p", {}, t.awlMet(p.awl.met, p.awl.learned)),
      el("span", { class: "bar" }, el("span", { style: `transform:scaleX(${p.awl.met / 570})` })),
      p.books.length && el("h2", {}, t.books),
      el("ul", { class: "plain" }, p.books.map((b) => lineRow(b.book, `${num(b.cards)} · ${num(b.learned)} ${t.learned.toLowerCase()}`))),
      p.lists.length && el("h2", {}, t.lists),
      el("ul", { class: "plain" }, p.lists.map((l) => lineRow(l.book, t.of(num(l.cards), num(l.words)), l.cards / Math.max(1, l.words)))),
    ];
  }

  async function admin() {
    const a = await api("admin");
    const last = a.sync[0];
    const syncButton = button(t.syncNow, {
      icon: "sync",
      onclick: async () => {
        syncButton.disabled = true;
        syncButton.classList.add("spin");
        try {
          await api("sync", {});
          state.cards = null;
        } catch (e) {
          status(t.error(e.message));
        }
        route();
      },
    });
    const quota = (label, q) =>
      el("li", { class: "line", style: "display:block" }, el("div", { style: "display:flex;gap:.75rem" }, el("span", { class: "grow" }, label), el("span", { class: "meta" }, t.of(num(q.used), num(q.of)))), el("span", { class: "bar" }, el("span", { style: `transform:scaleX(${q.used / q.of})` })));
    const hours = (value, onchange) => el("select", { onchange }, Array.from({ length: 24 }, (_, h) => el("option", { value: h, selected: h === value }, `${String(h).padStart(2, "0")}:00`)));
    const setting = (key, label) => {
      const s = a.settings[key];
      const save = async (patch) => {
        try {
          a.settings = await api("admin/settings", { [key]: patch });
        } catch (e) {
          status(t.error(e.message));
        }
      };
      const id = `set-${key}`;
      return el(
        "div",
        { class: "switch" },
        el("label", { for: id }, el("input", { id, type: "checkbox", checked: s.on, onchange: (e) => save({ on: e.target.checked }) }), label),
        hours(s.hour, (e) => save({ hour: Number(e.target.value) })),
      );
    };
    const tokenBox = el("div");
    return [
      top(t.tabs.admin, button(t.language, { icon: "language", onclick: () => ((lang = lang === "en" ? "tr" : "en"), store.set("reading-app-lang", lang), location.reload()) })),
      el("h2", {}, t.lastSync),
      el("p", {}, last ? `${when(last.at)} · ${last.ok ? t.ok : t.failed}` : t.never, last?.error ? el("span", { class: "muted", style: "display:block" }, last.error) : null),
      syncButton,
      el(
        "ul",
        { class: "plain", style: "margin-top:1rem" },
        a.sync.slice(0, 8).map((r) =>
          el(
            "li",
            { class: "line" },
            el("span", { class: "grow" }, when(r.at), el("span", { class: "muted" }, ` · ${r.trigger}`), r.error ? el("span", { class: "muted", style: "display:block" }, r.error) : null),
            el("span", { class: "meta" }, r.ok ? icon("check") : icon("close"), el("span", { class: "sr-only" }, r.ok ? t.ok : t.failed)),
          ),
        ),
      ),
      el("h2", {}, t.quota),
      el("ul", { class: "plain" }, quota(t.translations, a.quota.translations), quota(t.recordings, a.quota.audio)),
      el("h2", {}, t.pushes),
      !a.notifications && el("p", { class: "muted" }, t.noTopic),
      setting("morning", t.morning),
      setting("evening", t.evening),
      setting("weekly", t.weekly),
      el("h2", {}, t.exportTitle),
      el(
        "div",
        { class: "row", style: "margin-top:0" },
        el("a", { class: "ghost", href: "/api/reading/export.json", download: "reading-export.json", html: `${ICON.download}${t.exportJson}` }),
        el("a", { class: "ghost", href: "/api/reading/cards.csv", download: "reading-cards.csv", html: `${ICON.download}${t.exportCsv}` }),
      ),
      el("h2", {}, t.tokenTitle),
      el(
        "div",
        { class: "row", style: "margin-top:0" },
        button(t.rotate, {
          icon: "key",
          onclick: async () => {
            if (!confirm(t.confirmRotate)) return;
            try {
              const { token } = await api("admin/token", {});
              tokenBox.replaceChildren(el("p", { class: "muted" }, t.newToken), el("p", { class: "token" }, token));
            } catch (e) {
              status(t.error(e.message));
            }
          },
        }),
        el("form", { method: "post", action: "/api/reading/logout" }, button(t.signOut, { type: "submit", icon: "logout" })),
      ),
      tokenBox,
      el("footer", {}, t.credit),
    ];
  }

  // ---- routing
  const status = (msg) => {
    let s = document.querySelector("p.status.global");
    if (!s) app.prepend((s = el("p", { class: "status global", role: "status" })));
    s.textContent = msg;
  };
  const SCREEN_FNS = { today, review, words, sentences, progress: progressScreen, admin };
  let current = 0;
  async function route() {
    const [name, sub] = (location.hash.slice(1) || "today").split("/");
    const screen = SCREEN_FNS[name] ? name : "today";
    const ticket = ++current;
    document.title = `${t.tabs[screen]} · Reading`;
    nav.replaceChildren(
      ...SCREENS.map((s) => el("a", { href: `#${s}`, "aria-current": s === screen ? "page" : null }, icon(s), t.tabs[s])),
    );
    if (screen !== "review") document.querySelector(".grades")?.remove();
    document.querySelector(".sheet")?.remove();
    try {
      const nodes = await SCREEN_FNS[screen](sub);
      if (ticket !== current) return;
      app.replaceChildren(...nodes.flat().filter(Boolean));
      offlineBanner();
      enter(app);
      onkey = nodes[0]?.onkey ?? null;
    } catch (e) {
      if (ticket !== current) return;
      app.replaceChildren(top(t.tabs[screen]), failed(route));
    }
  }
  let onkey = null;
  addEventListener("keydown", (e) => onkey?.(e));
  addEventListener("hashchange", route);
  route();
  flush();
}
