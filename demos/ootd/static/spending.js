// 买了什么：购入记录本来就有日期、金额、品牌，这里只是把它们摊开看，不需要额外录入。
(() => {
  const { $, $$, esc, api, views, icon } = W;
  const money = cents => '¥' + Math.round(cents / 100).toLocaleString(L.locale);
  const monthLabel = key => L.msg`${key.slice(0, 4)} 年 ${Number(key.slice(5))} 月`;

  function bars(rows, label) {
    const top = Math.max(...rows.map(r => r.cny), 1);
    return `<div class="spend-bars">${rows.map(r => L.html`<div class="spend-bar">
      <span class="spend-bar-key">${esc(label(r.key))}</span>
      <span class="spend-bar-track"><span class="spend-bar-fill" style="width:${Math.max(2, r.cny / top * 100)}%"></span></span>
      <span class="spend-bar-value">${money(r.cny)}<small>${r.count} 笔</small></span></div>`).join('')}</div>`;
  }

  views.spending = async (main, kind = 'apparel') => {
    main.dataset.view = 'spending';
    if (!['apparel', 'cosmetics'].includes(kind)) kind = 'apparel';
    const d = await api('GET', `/api/stats/spending?kind=${kind}`);
    if (!main.isConnected) return;
    const noun = kind === 'cosmetics' ? L.t('彩妆') : L.t('衣物');
    const months = d.by_month.slice(-12);
    const currencies = Object.entries(d.totals.by_currency)
      .map(([c, v]) => `${c} ${c === 'JPY' ? v.toLocaleString(L.locale) : (v / 100).toLocaleString(L.locale)}`).join(' · ');
    main.innerHTML = L.html`<div class="heading"><div><div class="eyebrow">买了什么</div><h2>消费回顾</h2>
        <p class="muted">按购入记录统计，日元按 100 JPY = 4.3 CNY 折算成人民币。</p></div>
        <nav class="attention-kind" aria-label="统计范围"><a href="#/spending/apparel" ${kind === 'apparel' ? 'aria-current="page"' : ''}>衣橱</a><a href="#/spending/cosmetics" ${kind === 'cosmetics' ? 'aria-current="page"' : ''}>彩妆</a></nav></div>
      <div class="spend-tiles">
        <div class="spend-tile"><span>合计</span><strong>${money(d.totals.cny)}</strong><small>${d.totals.records} 笔购入${currencies ? ` · ${currencies}` : ''}</small></div>
        <div class="spend-tile warm"><span>还没穿过</span><strong>${money(d.never_worn.cny)}</strong><small>${d.never_worn.items} 件${noun}，还没记过一次</small></div>
        <div class="spend-tile"><span>估算的部分</span><strong>${d.totals.estimated} 笔</strong><small>${d.totals.unpriced ? L.msg`另有 ${d.totals.unpriced} 笔没有金额，未计入` : L.t('其余都是订单实付')}</small></div>
      </div>
      ${d.never_worn.items ? L.html`<button type="button" class="spend-cta" id="spend-never-worn">${icon('search')}去看看这 ${d.never_worn.items} 件 ${icon('arrow')}</button>` : ''}
      <section class="panel"><h3>按月</h3>${months.length ? bars(months, monthLabel) : L.t('<p class="muted">购入记录里还没有日期。</p>')}</section>
      <section class="panel"><h3>按年</h3>${d.by_year.length ? bars(d.by_year, k => k + L.t(' 年')) : L.t('<p class="muted">购入记录里还没有日期。</p>')}</section>
      <section class="panel"><h3>按品牌</h3>${d.by_brand.length ? bars(d.by_brand, k => k) : L.t('<p class="muted">还没有记品牌。</p>')}</section>
      <section class="panel"><h3>按分类</h3>${d.by_main.length ? bars(d.by_main, k => L.meta(k)) : ''}</section>`;
    $('#spend-never-worn', main)?.addEventListener('click', () => W.openNeverWorn(kind));
  };
})();
