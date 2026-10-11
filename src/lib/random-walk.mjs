// Sample paths of a simple random walk, for the RandomWalk figure in course
// notes. One seed draws the same paths everywhere: the page as built, the
// browser, and the typeset PDF (scripts/course-notes.mjs).

// mulberry32: a tiny seeded generator, so the same seed gives the same numbers on any machine.
function generator(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Each path starts at 0 and steps up or down by 1 with equal chance.
export function walks(paths, steps, seed) {
  const rand = generator(seed);
  return Array.from({ length: paths }, () => {
    const path = [0];
    for (let i = 0; i < steps; i++) path.push(path[i] + (rand() < 0.5 ? -1 : 1));
    return path;
  });
}

// The y range, widened to whole ticks, and the ticks along t.
export function axes(data) {
  const all = data.flat();
  const tick = Math.max(...all.map(Math.abs)) > 12 ? 5 : 2;
  const steps = data[0].length - 1;
  return {
    lo: Math.floor(Math.min(...all) / tick) * tick,
    hi: Math.ceil(Math.max(...all) / tick) * tick,
    tick,
    tTick: steps <= 30 ? 5 : steps <= 100 ? 10 : 20,
  };
}

// The plot's margins in user units, shared with the client's pointer maths.
export const MARGIN = { l: 34, r: 14, t: 28, b: 26 };

export const minus = (n) => (n < 0 ? `−${-n}` : String(n));
const sub = (n) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[d]);

// The values at time t, grouped so equal ones stack side by side: a dot plot
// of the random variable Y(ω, t), with the picked path's dot on the line.
export function stacks(data, t, picked) {
  const order = [picked, ...data.keys()].filter((i, k, all) => all.indexOf(i) === k);
  const seen = new Map();
  return order.map((i) => {
    const v = data[i][t];
    const j = seen.get(v) ?? 0;
    seen.set(v, j + 1);
    return { i, v, j };
  });
}

// The whole plot as SVG markup, `width` user units wide (the client passes the
// real pixel width, so text stays the same size on a phone and a desktop).
export function plot(data, { t, picked, width = 640 }) {
  const height = Math.round(Math.min(320, Math.max(230, width * 0.5)));
  const m = MARGIN;
  const steps = data[0].length - 1;
  const { lo, hi, tick, tTick } = axes(data);
  const r = (n) => Math.round(n * 10) / 10;
  const x = (s) => r(m.l + (s / steps) * (width - m.l - m.r));
  const y = (v) => r(m.t + ((hi - v) / (hi - lo)) * (height - m.t - m.b));
  const line = (p) => p.map((v, s) => `${x(s)},${y(v)}`).join(" ");
  const out = [];
  for (let v = lo; v <= hi; v += tick) {
    out.push(`<line class="rw-grid" x1="${m.l}" x2="${width - m.r}" y1="${y(v)}" y2="${y(v)}"/>`);
    out.push(`<text class="rw-label" x="${m.l - 8}" y="${y(v)}" text-anchor="end" dominant-baseline="middle">${minus(v)}</text>`);
  }
  for (let s = 0; s <= steps; s += tTick) out.push(`<text class="rw-label" x="${x(s)}" y="${height - 6}" text-anchor="middle">${s}</text>`);
  data.forEach((p, i) => i !== picked && out.push(`<polyline class="rw-path" points="${line(p)}"/>`));
  out.push(`<polyline class="rw-path rw-picked" points="${line(data[picked])}"/>`);
  // The fixed time, its label kept inside the frame at either end.
  const anchor = t < steps * 0.12 ? "start" : t > steps * 0.88 ? "end" : "middle";
  out.push(`<line class="rw-t" x1="${x(t)}" x2="${x(t)}" y1="${m.t - 8}" y2="${height - m.b}"/>`);
  out.push(`<text class="rw-label rw-t-label" x="${x(t)}" y="${m.t - 13}" text-anchor="${anchor}">t = ${t}</text>`);
  // Equal values stack sideways, away from the nearer edge.
  const dir = t > steps * 0.8 ? -1 : 1;
  for (const { i, v, j } of stacks(data, t, picked)) {
    out.push(`<circle class="rw-dot${i === picked ? " rw-picked" : ""}" cx="${r(x(t) + dir * j * 8)}" cy="${y(v)}" r="3.5"/>`);
  }
  return { height, svg: out.join("") };
}

// The two sentences under the plot, from the copy's {placeholders}.
export function describe(data, t, picked, copy) {
  const values = data.map((p) => p[t]);
  const fill = { t, n: data.length, min: minus(Math.min(...values)), max: minus(Math.max(...values)), w: `ω${sub(picked + 1)}` };
  return [copy.fixedT, copy.fixedW].map((s) => s.replace(/\{(\w+)\}/g, (_, k) => fill[k]));
}
