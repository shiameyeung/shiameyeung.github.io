// 核心：请求、状态、路由、共用小工具。各页面在 items.js / detail.js / form.js / places.js 里注册到 W.views。
window.W = (() => {
  const rawTemplate=(parts,...values)=>parts.map((part,n)=>part+(n<values.length?values[n]:'')).join('');
  const L=window.L || {t:s=>s,meta:s=>s,msg:rawTemplate,html:rawTemplate,locale:'zh-CN'};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { meta: null, locations: [], route: [], pendingBatch: false };

  async function api(method, path, body) {
    if (window.OOTD_DEMO) return window.OOTDDemo.api(method, path, body);
    const opts = { method, headers: {} };
    if (body instanceof Blob) { opts.body = body; opts.headers['Content-Type'] = body.type || 'application/octet-stream'; }
    else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
    const r = await fetch(path, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(data.error || L.msg`请求失败（${r.status}）`); e.status = r.status; e.data = data; throw e; }
    if (method !== 'GET' && path !== '/api/sync/run') window.W?.sync?.refresh({ afterWrite: true });
    return data;
  }

  let toastTimer;
  function toast(msg, ms = 3500) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  const ZERO = new Set(['JPY', 'KRW']);
  function money(amount, currency) {
    if (amount == null || amount === '') return L.t('未填写');
    const d = ZERO.has(currency) ? 0 : 2;
    return new Intl.NumberFormat(L.locale, { style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(amount));
  }

  // 每条购入金额已经包含该笔数量。先合并币种最小单位，再按楊指定的固定汇率折算。
  function purchaseTotals(purchases) {
    let cnyMills = 0, estimateMills = 0;
    const result = { converted_count: 0, estimated_count: 0, missing_purchase_count: 0, unpriced_count: 0, has_jpy: false, other_totals: [] };
    const others = new Map();
    for (const p of purchases) {
      if (!p) { result.missing_purchase_count++; continue; }
      const groups = p.totals_by_currency || [{ ...p, priced_count: p.amount_minor == null ? 0 : (p.count || 1),
        unpriced: p.unpriced || (p.amount_minor == null ? (p.count || 1) : 0),
        estimated_count: p.price_source === 'estimate' ? (p.count || 1) : 0,
        estimated_amount_minor: p.price_source === 'estimate' ? p.amount_minor : 0 }];
      for (const group of groups) {
        result.unpriced_count += group.unpriced || 0;
        if (group.amount_minor == null) continue;
        result.estimated_count += group.estimated_count || 0;
        const factor = group.currency === 'CNY' ? 10 : group.currency === 'JPY' ? 43 : null;
        if (factor !== null) {
          cnyMills += group.amount_minor * factor;
          estimateMills += (group.estimated_amount_minor || 0) * factor;
          result.converted_count += group.priced_count || 0;
          result.has_jpy ||= group.currency === 'JPY';
        } else {
          const other = others.get(group.currency) || { currency: group.currency, amount_minor: 0, count: 0 };
          other.amount_minor += group.amount_minor; other.count += group.priced_count || 0;
          others.set(group.currency, other);
        }
      }
    }
    return { ...result, cny: cnyMills / 1000, estimated_cny: estimateMills / 1000, other_totals: [...others.values()] };
  }

  const EMOJI = { TOP: '👚', BOT: '👖', ONE: '👗', SOC: '🧦', NEC: '📿', BRC: '⛓️', EAR: '💎', OUT: '🧥', SHO: '👟', BAG: '👜', ACC: '🧣', COS: '💄' };
  const TILES = ['pink', 'mint', 'lemon', 'sky', 'lilac'];
  const tile = id => `var(--${TILES[(id - 1) % TILES.length]})`;

  // 把服务端的穿着统计变成两句话：次数文案、单次成本文案（缺价／零次时说明原因，不显示 0 元）
  function wearText(w, mainCode) {
    if (!w) return { count: '', cost: '' };
    const count = w.count === 0 ? L.t(mainCode === 'COS' ? '还没用过' : '还没穿过') : L.msg`${w.estimated ? L.t('累计约 ') : L.t('累计 ')}${w.count} 次`;
    let cost = '';
    if (w.cost_reason === 'no_price') cost = L.t('待补购入价');
    else if (w.cost_reason === 'incomplete_price') cost = L.t('部分购入记录缺价');
    else if (w.cost_reason === 'mixed_currency') cost = L.t('购入含多币种');
    else if (w.cost_reason === 'no_wear') cost = '';
    else {
      const unit = ZERO.has(w.currency) ? 1 : 100; const value = Number(w.cost_per_wear_minor) / unit;
      cost = value > 0 && value < 1 / unit ? L.msg`低于 ${money(1 / unit, w.currency)} / 次` : L.msg`${w.estimated || w.cost_estimated ? L.t('约 ') : ''}${money(value, w.currency)} / 次`;
      if (w.cost_estimated) cost += L.t('（含估价）');
    }
    return { count, cost };
  }

  function locText(item) {
    const l = item.location || {};
    if (l.current) return l.current.path;
    if (l.suggested) return L.t('还没放进格子 · 建议 ') + l.suggested.path;
    return L.t('位置未记录');
  }

  function locationOptions(selected, clearLabel) {
    const head = clearLabel ? `<option value="">${esc(clearLabel)}</option>` : '';
    return head + state.locations.filter(l => l.enabled).map(l =>
      `<option value="${l.id}" ${String(l.id) === String(selected ?? '') ? 'selected' : ''}>${'　'.repeat(l.depth)}${esc(l.name)}${l.user_code ? ' [' + esc(l.user_code) + ']' : ''}</option>`).join('');
  }

  const loadMeta = async () => { state.meta = await api('GET', '/api/meta'); };
  const loadLocations = async () => { state.locations = (await api('GET', '/api/locations')).locations; };

  const views = {};
  const scrollPositions = new Map();
  let renderedRoute = '', navigationVersion = 0;
  function parseRoute() { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }

  async function render() {
    const p = parseRoute(); const page = p[0] || 'items'; state.route = p;
    const route = p.join('/') || 'items', previous = renderedRoute;
    if (previous) scrollPositions.set(previous, window.scrollY);
    if (/^items\/\d+$/.test(route) && /^(items|places(?:\/[^/]+)?|looks(?:\/[^/]+)?|attention(?:\/.*)?)$/.test(previous)) state.itemReturn = {hash:'#/'+previous,label:previous.startsWith('places') ? L.t('返回收纳分区') : previous.startsWith('looks') ? L.t('返回搭配本') : previous.startsWith('attention') ? L.t('返回待补清单') : L.t('返回衣橱')};
    state.returningToList = route === 'items' && /^items\/\d+/.test(previous);
    renderedRoute = route;
    const navigation = ++navigationVersion;
    $$('[data-nav]').forEach(a => a.dataset.nav === page ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    // 每次换页都换一个新的 main 节点：页面自己挂在 main 上的监听器随旧节点一起丢掉，不会越攒越多而重复提交。
    const old = $('#main'); const main = old.cloneNode(false); delete main.dataset.view; old.replaceWith(main);
    try {
      if (page === 'items' && p[1] === 'new') return await views.itemForm(main, null);
      if (page === 'items' && p[1] && p[2] === 'edit') return await views.itemForm(main, Number(p[1]));
      if (page === 'items' && p[1]) return await views.item(main, Number(p[1]));
      if (page === 'items') return await views.items(main);
      if (page === 'places') return await views.places(main, p[1] || null);
      if (page === 'history') return await views.history(main);
      if (page === 'looks' && p[1] === 'new') return await views.compose(main, null, p[2] ? Number(p[2]) : null);
      if (page === 'looks' && p[1] && p[2] === 'recompose') return await views.compose(main, Number(p[1]));
      if (page === 'looks' && p[1]) return await views.look(main, Number(p[1]));
      if (page === 'looks') return await views.looks(main);
      if (page === 'import') return await views.importPurchases(main);
      if (page === 'today') return await views.today(main, p[1]);
      if (page === 'attention') return await views.attention(main, p[1], p[2]);
      if (page === 'spending') return await views.spending(main, p[1]);
      main.dataset.view = page;
      main.innerHTML = L.t('<div class="empty">没有这个页面。</div>');
    } catch (e) {
      main.dataset.view = 'error';
      main.innerHTML = L.html`<div class="empty">加载失败：${esc(e.message)}</div>`;
    } finally {
      if (navigation === navigationVersion && main.isConnected) {
        const isList = route === 'items' || route === 'looks' || page === 'attention' || page === 'places';
        const y = previous === route || isList ? (scrollPositions.get(route) || 0) : 0;
        requestAnimationFrame(() => {
          if (navigation === navigationVersion && main.isConnected) {
            if (page === 'places' && main.dataset.focusCompartment === 'true') main.querySelector('#items-panel')?.scrollIntoView({block:'start',behavior:'instant'});
            else window.scrollTo({top:y,behavior:'instant'});
          }
        });
      }
    }
  }

  async function start() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!window.OOTD_DEMO) window.W.sync?.start();
    document.querySelector('.top-state').append(L.picker());
    document.querySelectorAll('[data-i18n]').forEach(el => el.textContent=L.t(el.dataset.i18n));
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label',L.t(el.dataset.i18nAria)));
    document.title=L.t('OOTD · 我的衣橱');
    const projectUrl=`https://yotenra.com/apps.html?project=ootd&lang=${L.lang}`;
    document.querySelectorAll('[data-project-return]').forEach(link=>link.href=projectUrl);
    if (window.OOTD_DEMO) {
      const banner=document.createElement('aside'); banner.className='demo-banner';
      banner.innerHTML=L.html`<div><strong>体验版 · 30 件衣物与 20 件彩妆</strong><p>名称、品牌与商品图来自真实档案；价格、日期、穿着记录和位置均为演示数据。</p><p>所有修改只保留在当前页面内存，刷新或恢复样例即可还原。</p></div><div class="actions"><button type="button" id="reset-demo">恢复样例</button><a href="${projectUrl}">回到项目介绍</a><a href="https://ootd.yotenra.com/?lang=${L.lang}">在正式版中登录</a></div>`;
      document.body.prepend(banner);
      document.querySelector('#reset-demo').onclick=()=>location.reload();
      const syncButton=document.querySelector('#sync-status'); syncButton.disabled=true;
      syncButton.textContent=L.t('无同步与登录连接，修改只保留在当前页面。');
      syncButton.removeAttribute('aria-haspopup'); syncButton.removeAttribute('aria-controls');
    }
    try {
      await loadMeta(); await loadLocations();
      $('#top-status').textContent = L.t('今天 ') + state.meta.today;
    } catch (e) { $('#main').innerHTML = L.html`<div class="empty">连不上服务：${esc(e.message)}</div>`; return; }
    window.addEventListener('hashchange', render);
    render();
  }
  window.addEventListener('DOMContentLoaded', start);

  return { $, $$, esc, api, toast, money, purchaseTotals, wearText, EMOJI, tile, locText, locationOptions, loadLocations, state, views, render };
})();
