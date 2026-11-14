/* 车费估算引擎（纯函数，可单独测试） */
(function (root) {
  const lerp = (r, t) => Array.isArray(r) ? r[0] + (r[1] - r[0]) * t : Number(r) || 0;
  // t: 0 = 平峰（区间低值）, 1 = 高峰/夜间（区间高值）
  function fareOne(rule, km, min, t) {
    const base = lerp(rule.base, t);
    const dist = Math.max(0, km - (rule.baseKm || 0)) * lerp(rule.perKm, t);
    const time = Math.max(0, min - (rule.baseMin || 0)) * lerp(rule.perMin, t);
    let long = 0;
    for (const s of rule.long || []) { const to = s.to ?? Infinity; if (km > s.from) long += (Math.min(km, to) - s.from) * s.price; }
    const total = Math.max(base, base + dist + time + long) + (rule.extra || 0);
    return { total: Math.round(total * 10) / 10, base, dist, time, long };
  }
  function rulesFor(P, city) {
    const c = P.cities[city] || P.cities['通用'];
    const parent = c.inherit ? rulesFor(P, c.inherit) : {};
    return Object.assign({}, parent, c.rules);
  }
  // 返回 [{id, low, high, mid, detail, aggregateOf}]
  function estimate(P, city, km, min, t, enabled) {
    const rules = rulesFor(P, city); const out = [];
    for (const [id, p] of Object.entries(P.platforms)) {
      if (enabled && !enabled(id, p)) continue;
      if (p.type === 'aggregate') continue;
      const r = rules[id]; if (!r) continue;
      const lo = fareOne(r, km, min, 0), hi = fareOne(r, km, min, 1), cur = fareOne(r, km, min, t);
      out.push({ id, low: lo.total, high: hi.total, mid: cur.total, detail: cur, rule: r });
    }
    for (const [id, p] of Object.entries(P.platforms)) {
      if (p.type !== 'aggregate' || (enabled && !enabled(id, p))) continue;
      const parts = p.partners.map(pid => { const r = rules[pid]; return r && { pid, lo: fareOne(r, km, min, 0).total, hi: fareOne(r, km, min, 1).total, cur: fareOne(r, km, min, t).total }; }).filter(Boolean);
      if (!parts.length) continue;
      const best = parts.reduce((a, b) => a.cur <= b.cur ? a : b);
      out.push({ id, low: Math.min(...parts.map(x => x.lo)), high: Math.min(...parts.map(x => x.hi)), mid: best.cur, aggregateOf: best.pid, detail: null });
    }
    return out.sort((a, b) => a.mid - b.mid);
  }
  const api = { fareOne, estimate, rulesFor };
  if (typeof module !== 'undefined') module.exports = api; else root.RideFare = api;
})(this);
