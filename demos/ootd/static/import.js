// 从购买记录库导入：先预览会建多少件、哪些没有价格或图片，再正式导入。
(() => {
  const { $, $$, esc, api, toast, state, views } = W;
  const BUCKETS = ['服饰', '鞋包配饰', '彩妆', '护肤个护', '食品饮料', '日用家居', '数码电子', '虚拟服务', '文具书籍', '其他'];
  const DEFAULT = new Set(['服饰', '鞋包配饰', '彩妆']);

  function report(r, dry) {
    const mains = Object.fromEntries(state.meta.categories.map(c => [c.code, L.meta(c.label)]));
    const byMain = Object.entries(r.by_main || {}).sort((a, b) => b[1] - a[1]);
    const flagged = r.details.filter(d => d.warnings.length);
    return L.html`<section class="panel"><h3>${dry ? L.t('预览') : L.t('导入结果')}</h3>
      <div class="fields" style="margin-top:8px">
        <div class="field"><span>候选商品行</span><div class="value">${r.lines}</div></div>
        <div class="field"><span>${dry ? L.t('将新建单品') : L.t('已新建单品')}</span><div class="value">${dry ? r.units_to_create : r.units_created}</div></div>
        <div class="field"><span>已导过（跳过）</span><div class="value">${r.skipped_done}</div></div>
        <div class="field"><span>没有净实付金额</span><div class="value">${r.unknown_price_units} 件</div><div class="small">多是亚马逊多商品订单：列表页只有合计没有单价</div></div>
        <div class="field"><span>${dry ? L.t('将附上的图片') : L.t('新增图片')}</span><div class="value">${dry ? r.photos_to_add : r.photos}</div></div>
        <div class="field"><span>退款行（不导入）</span><div class="value">${r.skipped_refunded_lines}</div></div></div>
      <div class="tags" style="margin-top:10px">${byMain.map(([m, n]) => `<span class="tag">${esc(mains[m] || m)} ${n}</span>`).join('')}</div>
      ${r.warnings.map(w => `<div class="note">⚠ ${esc(w)}</div>`).join('')}
      ${flagged.length ? L.html`<details style="margin-top:10px"><summary>${flagged.length} 条商品行有需留意的事项</summary>${flagged.slice(0, 60).map(d => `<div class="row"><div><div>${esc(d.title.slice(0, 50))}</div><div class="small">${esc(d.line_key)} · ${d.warnings.map(esc).join('；')}</div></div></div>`).join('')}${flagged.length > 60 ? L.html`<div class="small">还有 ${flagged.length - 60} 条未展开</div>` : ''}</details>` : ''}
      ${dry ? '' : L.t('<div class="actions" style="margin-top:12px"><a href="#/items"><button type="button" class="primary">去看衣橱</button></a></div>')}</section>`;
  }

  views.importPurchases = async main => {
    if (window.OOTD_DEMO) {
      main.dataset.view='import';
      main.innerHTML=L.html`<div class="heading"><h2>购买导入</h2></div><div class="panel"><p>购买导入需要正式版连接购买记录库，体验版不提供此操作。</p><a href="#/items">返回衣橱</a></div>`;
      return;
    }
    main.dataset.view = 'import';
    main.innerHTML = L.html`<div class="heading"><div><h2>从购买记录导入</h2><div class="muted">来源是 purchases 项目整理好的购买记录库。同一条购买记录只会导入一次，重复运行只会补图片。</div></div></div>
      <section class="panel"><div class="small" style="margin-bottom:6px">要导入哪几类</div><div class="tagpick" id="buckets">${BUCKETS.map(b => `<label class="${DEFAULT.has(b) ? 'on' : ''}"><input type="checkbox" value="${b}" ${DEFAULT.has(b) ? 'checked' : ''}>${L.t(b)}</label>`).join('')}</div>
        <div class="actions" style="margin-top:10px"><button type="button" id="preview" class="primary">预览会导入什么</button><button type="button" id="run" disabled>正式导入</button></div>
        <div class="note">导入的每件单品会带：分类、品牌、颜色／色号、尺码、购入价（订单净实付分摊）、购入日期、平台与订单号、商品图。购入价有退款分摊的会标「估算」。</div>
        <div class="error" id="import-error"></div></section><div id="result"></div>`;
    const chosen = () => $$('#buckets input:checked', main).map(c => c.value);
    main.addEventListener('change', e => { if (e.target.closest('#buckets')) e.target.closest('label').classList.toggle('on', e.target.checked); });
    main.addEventListener('click', async e => {
      if (e.target.id === 'preview') {
        e.target.disabled = true; $('#import-error').textContent = ''; $('#result').innerHTML = L.t('<div class="empty">正在读购买库…</div>');
        try { const r = await api('GET', '/api/import/purchases/preview?buckets=' + encodeURIComponent(chosen().join(','))); $('#result').innerHTML = report(r, true); $('#run').disabled = !r.units_to_create && !r.photos_to_add; }
        catch (err) { $('#import-error').textContent = err.message; $('#result').innerHTML = ''; }
        e.target.disabled = false;
      }
      if (e.target.id === 'run') {
        e.target.disabled = true; $('#result').innerHTML = L.t('<div class="empty">正在导入，几百件会花一会儿…</div>');
        try { const r = await api('POST', '/api/import/purchases', { buckets: chosen() }); $('#result').innerHTML = report(r, false); await W.loadLocations(); toast(L.msg`已导入 ${r.units_created} 件。`); }
        catch (err) { $('#import-error').textContent = err.message; $('#result').innerHTML = ''; e.target.disabled = false; }
      }
    });
  };
})();
