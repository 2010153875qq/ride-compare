(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const P = window.RIDE_PRICING, F = window.RideFare, C = window.RIDE_CONFIG || {};
  const LS = { cfg: 'rc_cfg', last: 'rc_last', hist: 'rc_hist', q: 'rc_quotes' };
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yuan = n => '¥' + (Math.round(n * 10) / 10).toFixed(1);
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  let cfg = Object.assign({ didi: true, key: '', sec: '' }, load(LS.cfg, {}));
  let hist = load(LS.hist, []);
  let quotes = load(LS.q, {});
  let lastEst = [];
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800); };
  const enabled = (id, p) => !p.optional || cfg.didi;
  const amapKey = () => cfg.key || C.AMAP_KEY, amapSec = () => cfg.sec || C.AMAP_SECURITY_CODE;

  // 城市
  $('#city').innerHTML = Object.entries(P.cities).map(([k, c]) => `<option value="${esc(k)}">${esc(c.label || k)}</option>`).join('');
  const last = load(LS.last, null);
  $('#city').value = last?.city || C.DEFAULT_CITY || '通用';
  if (last) { $('#from').value = last.from || ''; $('#to').value = last.to || ''; $('#km').value = last.km || ''; $('#min').value = last.min || ''; $('#period').value = last.period ?? '0.5'; }
  $('#btnSwap').addEventListener('click', () => { const a = $('#from').value; $('#from').value = $('#to').value; $('#to').value = a; $('#km').value = ''; $('#min').value = ''; });
  ['from', 'to', 'city'].forEach(id => $('#' + id).addEventListener('change', () => { if (amapKey()) { $('#km').value = ''; $('#min').value = ''; } }));
  const tip = (m, cls) => { const t = $('#routeTip'); t.textContent = m; t.className = 'tip ' + (cls || ''); };
  tip(amapKey() ? '已配置高德 Key：填起终点即可自动算距离和时长。' : '未配置高德 Key：请手动填写距离和时长（地图 App 导航里能看到）。配置方法见 README。');

  // 高德路线（可选）
  let amapReady = null;
  function loadAmap() {
    if (amapReady) return amapReady;
    amapReady = new Promise((res, rej) => {
      if (amapSec()) window._AMapSecurityConfig = { securityJsCode: amapSec() };
      const s = document.createElement('script');
      s.src = 'https://webapi.amap.com/maps?v=2.0&key=' + encodeURIComponent(amapKey()) + '&plugin=AMap.Driving';
      s.onload = () => window.AMap ? res(window.AMap) : rej(new Error('高德 API 加载失败'));
      s.onerror = () => { amapReady = null; rej(new Error('高德 API 加载失败（检查网络或 Key）')); };
      document.head.appendChild(s);
    });
    return amapReady;
  }
  async function routeByAmap(from, to, city) {
    const AMap = await loadAmap();
    return new Promise((res, rej) => {
      const d = new AMap.Driving({ policy: 0 });
      const cityName = city === '通用' ? '' : city;
      d.search([{ keyword: from, city: cityName }, { keyword: to, city: cityName }], (status, r) => {
        if (status === 'complete' && r.routes && r.routes[0]) res({ km: r.routes[0].distance / 1000, min: r.routes[0].time / 60 });
        else rej(new Error('高德没找到路线：' + (typeof r === 'string' ? r : r?.info || status)));
      });
    });
  }

  $('#routeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const city = $('#city').value, from = $('#from').value.trim(), to = $('#to').value.trim();
    let km = parseFloat($('#km').value), min = parseFloat($('#min').value);
    if ((!(km > 0) || !(min > 0)) && amapKey() && from && to) {
      tip('正在用高德计算路线…');
      try { const r = await routeByAmap(from, to, city); km = r.km; min = r.min; $('#km').value = km.toFixed(1); $('#min').value = Math.round(min); tip(`高德路线：${km.toFixed(1)} 公里，约 ${Math.round(min)} 分钟`, 'ok'); }
      catch (err) { tip(err.message + '，请手动填写距离和时长。', 'err'); return; }
    }
    if (!(km > 0)) { tip('请填写距离（公里）。', 'err'); $('#km').focus(); return; }
    if (!(min > 0)) { min = Math.round(km / 30 * 60 + 3); $('#min').value = min; tip(`没填时长，按市区平均 30 公里/小时估为 ${min} 分钟。`); }
    else if (!amapKey()) tip('');
    const period = parseFloat($('#period').value);
    save(LS.last, { city, from, to, km, min, period });
    render(city, from, to, km, min, period);
    addHist({ city, from, to, km, min, t: Date.now(), best: lastEst[0] && { id: lastEst[0].id, v: lastEst[0].mid } });
  });

  function linkBtns(id, p) {
    const b = [];
    if (p.app && isMobile) b.push(`<a class="main" href="${esc(p.app)}">打开 App</a>`);
    b.push(`<a class="${p.app && isMobile ? '' : 'main'}" href="${esc(p.download)}" target="_blank" rel="noopener">官网 / 下载 ↗</a>`);
    if (p.mini) b.push(`<button type="button" data-copy="${esc(p.mini)}">微信小程序：${esc(p.mini)}（复制）</button>`);
    return b.join('');
  }
  function render(city, from, to, km, min, period) {
    lastEst = F.estimate(P, city, km, min, period, enabled);
    $('#resultSec').classList.remove('hidden');
    $('#routeLabel').textContent = `${from || '起点'} → ${to || '终点'} · ${km.toFixed(1)} 公里 · ${Math.round(min)} 分钟 · ${P.cities[city]?.label || city}`;
    const max = Math.max(...lastEst.map(x => x.high));
    $('#resultList').innerHTML = lastEst.map((x, i) => {
      const p = P.platforms[x.id];
      const bk = x.detail ? `起步 ${yuan(x.detail.base)} + 里程 ${yuan(x.detail.dist)} + 时长 ${yuan(x.detail.time)}${x.detail.long ? ' + 远途 ' + yuan(x.detail.long) : ''}${x.rule.fixed ? ' · 一口价' : ''}` : `聚合价：取所含运力里最便宜的（当前是「${esc(x.aggregateOf === 'amap_tehui' ? '特惠快车' : P.platforms[x.aggregateOf]?.name)}」）`;
      const note = x.rule?.note ? `<div class="bk">⚠️ ${esc(x.rule.note)}</div>` : '';
      return `<div class="ritem ${i === 0 ? 'first' : ''}" style="--c:${p.color}" data-id="${x.id}">
        <span class="rank">${i === 0 ? '最便宜' : '第 ' + (i + 1)}</span>
        <div class="badge">${esc(p.short)}</div>
        <div><div class="nm">${esc(p.name)}</div><div class="ds">${esc(p.desc)}</div><div class="bk">${bk}</div>${note}<div class="bar"><i style="width:${(x.mid / max * 100).toFixed(1)}%"></i></div></div>
        <div class="pr"><div class="v">${yuan(x.mid)}</div><div class="rg">估算 ${yuan(x.low)}–${yuan(x.high)}</div></div>
        <div class="btns">${linkBtns(x.id, p)}</div>
      </div>`;
    }).join('');
    const b = lastEst[0], w = lastEst[lastEst.length - 1];
    $('#bestBox').className = 'best win';
    $('#bestBox').innerHTML = `🏆 估算最便宜：<b>${esc(P.platforms[b.id].name)}</b> 约 <span class="big">${yuan(b.mid)}</span>` + (lastEst.length > 1 ? `<br>比 ${esc(P.platforms[w.id].name)} 约省 <b>${yuan(w.mid - b.mid)}</b>。动态调价和优惠券会改变排名，下单前请在 App 里看实际报价，填进下面表格对比。` : '');
    renderQuotes();
    $('#resultSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.addEventListener('click', async e => {
    const c = e.target.dataset?.copy; if (!c) return;
    try { await navigator.clipboard.writeText(c); toast('已复制「' + c + '」，去微信搜索'); } catch { toast('请在微信搜索：' + c); }
  });

  // 实际报价表
  const estOf = id => lastEst.find(x => x.id === id);
  function renderQuotes() {
    const ids = Object.keys(P.platforms).filter(id => enabled(id, P.platforms[id]));
    $('#quoteBody').innerHTML = ids.map(id => { const q = quotes[id] || {}; const e = estOf(id); return `<tr data-id="${id}">
      <td><b style="color:${P.platforms[id].color}">${esc(P.platforms[id].name)}</b></td>
      <td><input data-k="note" value="${esc(q.note)}" placeholder="如：特惠快车 / 拼车"></td>
      <td class="num"><input class="n" data-k="price" type="number" step="0.1" min="0" inputmode="decimal" value="${esc(q.price)}" placeholder="0.0"></td>
      <td class="num"><input class="n" data-k="coupon" type="number" step="0.1" min="0" inputmode="decimal" value="${esc(q.coupon)}" placeholder="0"></td>
      <td class="final">—</td><td class="num est">${e ? yuan(e.mid) : '—'}</td></tr>`; }).join('');
    updateQuotes();
  }
  const pay = q => (Number(q?.price) || 0) - (Number(q?.coupon) || 0);
  function updateQuotes() {
    const rows = [...document.querySelectorAll('#quoteBody tr')];
    const vals = rows.map(r => ({ id: r.dataset.id, v: Number(quotes[r.dataset.id]?.price) > 0 ? pay(quotes[r.dataset.id]) : null })).filter(x => x.v !== null);
    const min = vals.length ? Math.min(...vals.map(x => x.v)) : null;
    rows.forEach(r => { const q = quotes[r.dataset.id]; const ok = Number(q?.price) > 0; r.querySelector('.final').textContent = ok ? yuan(pay(q)) : '—'; r.classList.toggle('cheapest', ok && pay(q) === min); });
    const box = $('#quoteBest');
    if (!vals.length) { box.className = 'best'; box.textContent = '在各 App 里输入同样的起终点，把看到的预估价（券后）填到下面。'; return; }
    vals.sort((a, b) => a.v - b.v);
    box.className = 'best win';
    box.innerHTML = `✅ 实际最便宜：<b>${esc(P.platforms[vals[0].id].name)}</b> <span class="big">${yuan(vals[0].v)}</span>` + (vals.length > 1 ? `，比最贵的 ${esc(P.platforms[vals[vals.length - 1].id].name)} 省 <b>${yuan(vals[vals.length - 1].v - vals[0].v)}</b>` : '');
  }
  $('#quoteBody').addEventListener('input', e => { const tr = e.target.closest('tr'), k = e.target.dataset.k; if (!tr || !k) return; (quotes[tr.dataset.id] ||= {})[k] = e.target.value; save(LS.q, quotes); updateQuotes(); });
  $('#btnClearQuote').addEventListener('click', () => { quotes = {}; save(LS.q, quotes); renderQuotes(); });
  $('#btnSaveQuote').addEventListener('click', () => {
    const l = load(LS.last, {}); if (!Object.values(quotes).some(q => Number(q.price) > 0)) return toast('先填至少一个报价');
    const best = Object.entries(quotes).filter(([, q]) => Number(q.price) > 0).sort((a, b) => pay(a[1]) - pay(b[1]))[0];
    addHist({ ...l, t: Date.now(), quotes: JSON.parse(JSON.stringify(quotes)), real: { id: best[0], v: pay(best[1]) } }); toast('已保存');
  });

  // 历史
  function addHist(h) { hist.unshift(h); hist = hist.slice(0, 40); save(LS.hist, hist); renderHist(); }
  function renderHist() {
    const box = $('#histBox');
    if (!hist.length) { box.innerHTML = '<div class="empty">还没有记录。</div>'; return; }
    box.innerHTML = hist.map((h, i) => `<div class="hitem"><div><div class="t">${h.real ? '✅' : '🧮'} ${esc(h.from || '起点')} → ${esc(h.to || '终点')}</div>
      <div class="m">${new Date(h.t).toLocaleString('zh-CN', { hour12: false })} · ${esc(h.city)} · ${Number(h.km).toFixed(1)} 公里 · ${h.real ? '实际最低 ' + esc(P.platforms[h.real.id]?.name) + ' ' + yuan(h.real.v) : h.best ? '估算最低 ' + esc(P.platforms[h.best.id]?.name) + ' ' + yuan(h.best.v) : ''}</div></div>
      <button class="ghost" data-h="${i}">再算</button></div>`).join('');
  }
  $('#histBox').addEventListener('click', e => { const i = e.target.dataset.h; if (i == null) return; const h = hist[+i];
    $('#city').value = h.city; $('#from').value = h.from || ''; $('#to').value = h.to || ''; $('#km').value = h.km; $('#min').value = Math.round(h.min);
    if (h.quotes) { quotes = JSON.parse(JSON.stringify(h.quotes)); save(LS.q, quotes); }
    $('#routeForm').requestSubmit(); });
  $('#btnClearHist').addEventListener('click', () => { if (confirm('清空历史？')) { hist = []; save(LS.hist, hist); renderHist(); } });

  // 设置
  $('#btnSettings').addEventListener('click', () => { $('#cfgDidi').checked = cfg.didi; $('#cfgKey').value = cfg.key; $('#cfgSec').value = cfg.sec; $('#dlgSettings').showModal(); });
  $('#btnSaveCfg').addEventListener('click', () => { cfg = { didi: $('#cfgDidi').checked, key: $('#cfgKey').value.trim(), sec: $('#cfgSec').value.trim() }; save(LS.cfg, cfg); amapReady = null; toast('已保存'); if (lastEst.length) $('#routeForm').requestSubmit(); else renderQuotes(); });

  // 来源
  $('#srcList').innerHTML = Object.values(P.sources).map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('') + `<li>计价规则更新于 ${esc(P.updated)}，各地、各时段价格不同，欢迎按本地实际修改 data/pricing.json。</li>`;

  renderQuotes(); renderHist();
  if (last && last.km > 0) render(last.city, last.from, last.to, last.km, last.min, last.period ?? 0.5);
  window.RideApp = { get est() { return lastEst; } };
})();
