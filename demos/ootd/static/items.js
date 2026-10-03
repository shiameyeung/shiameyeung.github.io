// 我的衣橱：列表、筛选、批量设置位置。
(() => {
  const { $, $$, esc, api, toast, wearText, EMOJI, tile, locText, locationOptions, state, views } = W;
  let savedKind = 'apparel';
  try { if (!window.OOTD_DEMO && localStorage.getItem('ootd.collection-kind') === 'cosmetics') savedKind = 'cosmetics'; } catch (_) { /* 隐私模式禁用存储时仍可切换。 */ }
  const F = { kind: savedKind, q: '', main: '', category_id: '', location_id: '', tags: new Set(), archived: false, disposition: '', attention:'', never_worn: false };
  let sortMode='random';
  let paletteUse = 'all', allPalettes = false, filtersExpanded = false;
  // 首页不摆首饰配饰和贴身衣物（词表里 ACC 就叫「其他配饰」，项链手链耳环同属配饰）；
  // 顺序每次进来重排一次，同一次浏览里不跳
  const TUCKED_AWAY = ['NEC', 'BRC', 'EAR', 'ACC', 'UND'];
  let browseSeed = 1;
  const tuckedAway = () => !F.main && !F.category_id && !F.q;
  const shuffle = list => {
    const key = id => { let h = (id * 2654435761 ^ browseSeed) >>> 0; h = Math.imul(h ^ h >>> 15, 2246822507); return (h ^ h >>> 13) >>> 0; };
    return [...list].sort((a, b) => key(a.id) - key(b.id));
  };
  const ATTENTION = {missing_location:L.t('未记录位置'),missing_actual_photo:L.t('缺实物图'),missing_palette:L.t('待补色系')};
  const DISPOSITION = { idle: L.t('闲置'), for_sale: L.t('想出手') };
  const B = { on: false, selected: new Map(), field: 'current', target: '', conflicts: [], applying: false };
  let items = [], wornToday = 0, lastBatch = null, timer = null, currentMain = null, loadVersion = 0;
  const active = () => currentMain?.isConnected && currentMain.dataset.view === 'items';

  function query() {
    const u = new URLSearchParams({kind:F.kind,tag_match:'by_dimension'});
    if (F.q) u.set('q', F.q); if (F.main) u.set('main', F.main); if (F.category_id) u.set('category_id', F.category_id);
    if (F.attention) u.set('attention',F.attention);
    if (F.location_id) u.set('location_id', F.location_id); F.tags.forEach(t => u.append('tag', t)); if (F.archived) u.set('include_archived', '1'); if (F.disposition) u.set('disposition', F.disposition);
    if (F.never_worn) u.set('never_worn', '1');
    if (B.on) { u.set('unplaced', '1'); u.delete('location_id'); }
    if (F.kind !== 'cosmetics' && tuckedAway()) u.set('exclude_main', TUCKED_AWAY.join(','));
    return u.toString();
  }
  const load = async () => {
    const main = currentMain, version = ++loadVersion;
    if (!active()) return false;
    const r = await api('GET', '/api/items?' + query());
    // 较早的筛选结果不能盖过新结果，也不能在用户换页后改写另一页。
    if (version !== loadVersion || main !== currentMain || !main.isConnected) return false;
    items = sortMode==='random' ? shuffle(r.items) : [...r.items].sort((a,b)=>String(sortMode==='newest' ? b.created_at : b.wear?.last_worn || '').localeCompare(String(sortMode==='newest' ? a.created_at : a.wear?.last_worn || '')) || b.id-a.id); wornToday = r.worn_today; return true;
  };
  W.reloadItems = async () => { if (active()) await refresh(); };
  const refresh = async () => {
    try { if (await load()) { renderGrid(); renderBatch(); renderLastBatch(); } }
    catch (e) { if (active()) toast(e.message, 6000); }
  };

  async function recordWear(id) {
    try {
      const r = await api('POST', '/api/wear', { item_ids: [id], source: 'item', idempotency_key: crypto.randomUUID() });
      toast(r.newly_counted.length ? L.t('已记录，这件单品的累计次数加 1。') : L.t('今天已经记过这件了，次数不重复增加。'));
      await refresh();
    } catch (e) { toast(e.message, 6000); }
  }

  const HANG_LEVELS = ['一定要挂', '挂着更好'];

  function card(i) {
    const photo = i.photos.find(p => p.role === 'product') || i.photos[0];
    const sel = B.selected.has(i.id);
    const wt = wearText(i.wear, i.category.main_code);
    const styleTags = i.tags.filter(t => t.dimension === 'style');
    const styleTag = styleTags.find(t => F.tags.has(String(t.id))) || styleTags[0];
    // 卡片上只标要挂的两档：衣杆是有限的，叠放和抽屉不用抢位置
    const hang = i.tags.find(t => t.dimension === 'storage' && HANG_LEVELS.includes(t.value));
    return `<article class="card item-card ${sel ? 'selected' : ''}" style="--tile:${tile(i.id)}">
      ${B.on ? L.html`<label class="selection"><input type="checkbox" data-select="${i.id}" ${sel ? 'checked' : ''}> ${i.code}</label><a class="batch-view-detail" href="#/items/${i.id}">查看详情</a>` : ''}
      <a class="open" href="#/items/${i.id}">
        <div class="photo"><span class="photo-code">${i.code}</span>${photo ? `<img src="${photo.url}" alt="${esc(i.display_name || i.name)}" loading="lazy" decoding="async">` : `<span class="photo-placeholder">${W.icon(i.category.main_code === 'COS' ? 'sparkle' : 'shirt')}</span>`}${i.quantity > 1 ? `<span class="quantity-badge">×${i.quantity}</span>` : ''}</div>
        <div class="copy"><div class="card-category">${esc(L.meta(i.category.label))}${i.archived_at ? L.t(' · 已归档') : ''}${DISPOSITION[i.disposition] ? ` · ${DISPOSITION[i.disposition]}` : ''}${i.repurchase === 'no' ? L.t(' · 踩雷') : ''}</div>
          <div class="name" title="${esc(i.display_name || i.name)}">${esc(i.display_name || i.name)}</div>
          <div class="card-meta">${i.color_hex ? `<span class="swatch" style="background:${i.color_hex}"></span>` : ''}${esc(i.color_name || L.t('颜色待记录'))}${i.brand ? ' · ' + esc(i.brand) : ''}</div>
          <div class="card-location">${W.icon('location')}<span>${esc(locText(i))}</span>${hang ? `<span class="storage-label" style="--dot:${W.storageColor(hang.value)};--tint:${W.storageColor(hang.value)}20">${esc(L.meta(hang.value))}</span>` : ''}${styleTag ? `<span class="style-label">${esc(L.meta(styleTag.value))}</span>` : ''}</div></div>
      </a><div class="stats"><span>${wt.count}</span><span class="cost">${wt.cost}</span></div>
      <div class="card-actions"><button type="button" data-wear="${i.id}" class="wear-button ${i.wear?.worn_today ? 'recorded' : ''}" ${i.archived_at ? 'disabled' : ''}>${W.icon(i.wear?.worn_today ? 'check' : 'plus')}${i.wear?.worn_today ? L.t('今天已记录') : (i.category.main_code === 'COS' ? L.t('今天用了') : L.t('今天穿了'))}</button></div></article>`;
  }

  function renderGrid() {
    if (!active()) return;
    const sum = W.purchaseTotals(items.map(i => i.purchase));
    const partial = sum.missing_purchase_count || sum.unpriced_count || sum.other_totals.length;
    const price = [];
    if (sum.converted_count) price.push(`${partial ? L.t('已知购入小计') : L.t('购入合计')}${sum.has_jpy || sum.estimated_count ? L.t('约') : ''} ${W.money(sum.cny, 'CNY')}`);
    else if (items.length) price.push(sum.other_totals.length ? L.t('购入金额待折算') : L.t('购入金额待补'));
    if (sum.estimated_count) price.push(L.msg`含 ${sum.estimated_count} 笔估价`);
    if (sum.missing_purchase_count) price.push(L.msg`${sum.missing_purchase_count} 件尚无购入记录`);
    if (sum.unpriced_count) price.push(L.msg`${sum.unpriced_count} 笔购入缺价`);
    sum.other_totals.forEach(p => price.push(L.msg`另有 ${W.money(p.amount_minor / (['JPY', 'KRW'].includes(p.currency) ? 1 : 100), p.currency)} 未折算`));
    if (sum.has_jpy) price.push(L.t('按 100 JPY = 4.3 CNY'));
    const tucked = F.kind !== 'cosmetics' && tuckedAway();
    $('#count').textContent = L.msg`${items.length} 件${B.on ? L.t('未放入位置') : ''}${F.q || F.main || F.category_id || F.location_id || F.tags.size ? L.t('符合筛选') : ''} · 今天已记录 ${wornToday} 件`;
    $('#tucked-note').textContent = tucked ? L.t('首饰、配饰和贴身衣物没摆出来，选对应分类或搜名字才显示。顺序每次进来都不一样。') : '';
    $('#price-summary').textContent = price.join(' · ');
    $('#clear-filters').hidden = !(F.q || F.main || F.category_id || F.location_id || F.tags.size || F.archived || F.disposition || F.attention || F.never_worn);
    renderSelectedFilters();
    $('#grid').innerHTML = items.length ? items.map(card).join('') : `<div class="empty">${W.icon('search')}<h3>${$('#clear-filters').hidden ? (F.kind === 'cosmetics' ? L.t('彩妆收藏，等你来填满') : L.t('衣橱，等你来填满')) : L.t('这次还没有找到')}</h3><p>${$('#clear-filters').hidden ? L.t('把第一件喜欢的单品放进来吧。') : L.t('试试其他关键词，或清空筛选看看。')}</p></div>`;
    $('#grid').style.gridColumn = items.length ? '' : '1 / -1';
  }

  function renderBatch() {
    if (!active()) return;
    $('#f-loc').disabled = B.on;
    const panel = $('#batch-panel'); panel.hidden = !B.on; $('#batch-toggle').textContent = B.on ? L.t('结束选择') : L.t('批量设置位置');
    if (!B.on) { $('#last-batch').hidden = !lastBatch; return; }
    const visible = new Set(items.map(i => i.id)); const hidden = [...B.selected.keys()].filter(id => !visible.has(id)).length;
    $('#sel-count').textContent = L.msg`已选 ${B.selected.size} 件` + (hidden ? L.msg` · 其中 ${hidden} 件不在当前筛选中` : '');
    $('#sel-list').innerHTML = B.selected.size ? [...B.selected.values()].map(i => L.html`<span class="tag">${i.code} ${esc(i.name)} <button type="button" data-unselect="${i.id}" aria-label="取消选择">×</button></span>`).join(' ') : L.t('勾选卡片左上角来选择单品。');
    $('#select-visible').textContent = L.msg`选择当前结果（${items.length} 件）`;
    const target = state.locations.find(l => String(l.id) === B.target);
    const fieldName = L.t('位置');
    $('#batch-preview').textContent = B.selected.size ? L.msg`将把 ${B.selected.size} 件单品的${fieldName}改为「${target ? target.path : L.t('未记录')}」。` : '';
    $('#batch-conflicts').hidden = !B.conflicts.length;
    $('#batch-conflicts').innerHTML = B.conflicts.length ? L.html`<strong>这批未写入。以下单品已移出选择，请先打开核对，再重新勾选：</strong><ul>${B.conflicts.map(c => `<li><a href="#/items/${c.item_id}">${esc(c.code)} ${esc(c.name)}</a>：${esc(c.reason)}</li>`).join('')}</ul><div>其余 ${B.selected.size} 件保留选择；下方确认只修改当前已选单品。</div>` : '';
    $('#batch-target').value = B.target;
    $('#batch-apply').disabled = !B.selected.size || !B.target || B.applying;
    $('#batch-apply').textContent = B.applying ? L.t('正在保存…') : target ? L.msg`放入 ${target.user_code || target.name}` : L.t('请先选目标格子');
  }

  async function applyBatch() {
    if (B.applying || !B.selected.size || !B.target) return;
    B.applying = true; renderBatch();
    const ids = [...B.selected.keys()]; const versions = {}; B.selected.forEach((it, id) => { versions[id] = it.location.version; });
    try {
      const r = await api('POST', '/api/locations/batch', { item_ids: ids, field: B.field, location_id: B.target ? Number(B.target) : null, versions, idempotency_key: crypto.randomUUID() });
      lastBatch = r; B.selected.clear(); B.conflicts = [];
      await W.loadLocations(); await refresh();
      toast(L.msg`已修改 ${r.changed_count} 件；${r.unchanged_count} 件本来就在那里。`);
    } catch (e) {
      if (e.status === 409 && e.data.conflicts?.length) {
        B.conflicts = e.data.conflicts.map(c => ({ ...c, code: B.selected.get(c.item_id)?.code || `ID ${c.item_id}`, name: B.selected.get(c.item_id)?.name || '' }));
        B.conflicts.forEach(c => B.selected.delete(c.item_id));
        toast(L.t('这批一件都没写入；已列出冲突单品，其余选择保留。'), 6000);
      } else toast(e.message, 6000);
      await refresh();
    } finally { B.applying = false; renderBatch(); }
  }

  function renderLastBatch() {
    if (!active()) return;
    const el = $('#last-batch'); el.hidden = !lastBatch; if (!lastBatch) return;
    el.innerHTML = L.html`上一批：${lastBatch.changed_count} 件改到「${esc(lastBatch.target ? lastBatch.target.path : L.t('未记录'))}」 <button type="button" id="undo-batch">撤销这一批</button>`;
  }
  async function undoBatch(skip) {
    try {
      const r = await api('POST', `/api/locations/batch/${lastBatch.batch_id}/undo`, { skip_conflicts: skip });
      toast(L.msg`已撤销 ${r.reverted_count} 件${r.conflicts.length ? L.msg`；${r.conflicts.length} 件之后又被改过，保持不动` : ''}。`);
      lastBatch = null; await W.loadLocations(); await refresh();
    } catch (e) {
      if (e.status === 409 && e.data.conflicts) {
        if (active()) $('#last-batch').innerHTML = L.html`${e.data.conflicts.length} 件在这批之后又被移动过。 <button type="button" id="undo-skip">只撤销其余单品</button> <button type="button" id="undo-cancel">算了</button>`;
      } else toast(e.message, 6000);
    }
  }

  function batchLocationOptions() {
    const leaves=state.locations.filter(l=>l.enabled && !state.locations.some(x=>x.parent_id===l.id));
    const groups=new Map();
    leaves.forEach(l=>{const key=l.path.split('/')[0].trim();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(l);});
    return L.t('<option value="">选择要放入的格子</option>')+[...groups].map(([name,ls])=>`<optgroup label="${esc(name)}">${ls.map(l=>`<option value="${l.id}">${esc(l.user_code || l.name)} · ${esc(l.name)}</option>`).join('')}</optgroup>`).join('');
  }

  function skeleton(main) {
    const m = state.meta;
    main.dataset.view = 'items';
    main.innerHTML = L.html`
      <div class="collection-toolbar"><div class="collection-switch" role="group" aria-label="选择收藏类型"><button type="button" data-kind="apparel" aria-pressed="${F.kind === 'apparel'}">${W.icon("wardrobe")}衣橱</button><button type="button" data-kind="cosmetics" aria-pressed="${F.kind === 'cosmetics'}">${W.icon("lipstick")}彩妆</button></div><span class="collection-hint">同一风格，衣妆一起选</span></div>
      <div class="wardrobe-welcome"><div class="welcome-copy"><div class="eyebrow" id="collection-eyebrow"></div><h2 id="collection-title"></h2><p id="collection-caption"></p></div><div class="welcome-art" aria-hidden="true">${W.icon("wardrobe")}<span class="art-spark">✧</span><span class="art-dot"></span></div><div class="welcome-actions"><a class="button primary" href="#/items/new">${W.icon("plus")}录入单品</a><button type="button" id="batch-toggle">批量设置位置</button></div></div>
      <div class="collection-summary"><div><div id="count"></div><div id="tucked-note" class="small"></div></div><details class="price-disclosure"><summary>购入合计</summary><div id="price-summary" aria-live="polite"></div></details></div>
      <div id="last-batch" class="note" hidden></div>
      <div class="sticky" id="batch-panel" hidden>
        <div class="heading" style="margin-bottom:6px"><h3 id="sel-count">已选 0 件</h3>
          <div class="actions"><button type="button" id="select-visible">选择当前结果</button><button type="button" id="clear-selected">清空</button></div></div>
        <p class="small">这里只显示还没放入位置的单品；已有建议但尚未放入的仍可选择。</p><div id="sel-list" class="small" style="margin-bottom:8px"></div>
        <div class="fields">
          <label class="field"><span>目标位置</span><select id="batch-target">${batchLocationOptions()}</select></label></div>
        <div class="muted" id="batch-preview" style="margin-top:6px"></div>
        <div class="error" id="batch-conflicts" role="alert" hidden></div>
        <div class="actions batch-bottom" style="margin-top:8px"><button type="button" class="primary" id="batch-apply" disabled>确认修改</button></div></div>
      <section class="filter-panel ${filtersExpanded ? 'expanded' : ''}" aria-label="筛选单品"><div class="filter-heading"><span>${W.icon("filter")} 搜索与筛选</span><div class="filter-tools"><select id="sort-items" aria-label="排列顺序"><option value="random">随便逛逛</option><option value="newest">最近加入</option><option value="worn">最近穿过</option></select><button type="button" id="clear-filters" hidden>清空筛选</button><button type="button" id="expand-filters" class="filter-toggle" aria-expanded="${filtersExpanded}" aria-controls="f-main f-sub f-loc f-disp chips">${filtersExpanded ? L.t('收起筛选') : L.t('展开筛选')}</button></div></div><div class="filters"><label class="search-field">${W.icon("search")}<input id="q" aria-label="搜索单品" placeholder="搜名称、编号、颜色、品牌、位置…" value="${esc(F.q)}"></label>
        <select id="f-main" aria-label="单品主类"><option value="">全部分类</option>${m.categories.filter(c => c.code !== 'COS').map(c => `<option value="${c.code}" ${F.main === c.code ? 'selected' : ''}>${esc(L.meta(c.label))}</option>`).join('')}</select>
        <select id="f-sub" aria-label="单品细类"></select>
        <select id="f-loc" aria-label="收纳位置">${locationOptions(F.location_id, L.t('全部位置'))}</select>
        <select id="f-disp" aria-label="使用状态"><option value="">全部状态</option><option value="in_use" ${F.disposition === 'in_use' ? 'selected' : ''}>在用</option><option value="idle" ${F.disposition === 'idle' ? 'selected' : ''}>闲置</option><option value="for_sale" ${F.disposition === 'for_sale' ? 'selected' : ''}>想出手</option></select>
        <label class="never-worn-toggle"><input type="checkbox" id="f-never-worn" ${F.never_worn ? 'checked' : ''}><span>只看还没穿过的</span></label></div>
      <div id="selected-filters" class="selected-filters" aria-label="已选筛选条件"></div><div class="chips grouped-chips" id="chips"></div><label class="archive-filter small"><input type="checkbox" id="f-archived" ${F.archived ? 'checked' : ''}> 显示已归档</label></section>
      <div class="grid" id="grid"></div>`;
    renderMode();
    $('#selected-filters').addEventListener('click', async e => {
      const b = e.target.closest('[data-remove-filter]'); if (!b) return;
      clearTimeout(timer); const key = b.dataset.removeFilter;
      if (key === 'tag') F.tags.delete(b.dataset.value); else if (key === 'archived') F.archived = false; else F[key] = '';
      if (key === 'main') F.category_id = '';
      ['q','f-main','f-loc','f-disp'].forEach((id,n) => $('#' + id).value = F[['q','main','location_id','disposition'][n]]);
      $('#f-archived').checked = F.archived; fillSub(); renderChips(); await refresh();
    });
    $('#expand-filters').addEventListener('click', e => {
      const expanded = e.currentTarget.getAttribute('aria-expanded') !== 'true';
      filtersExpanded = expanded;
      e.currentTarget.setAttribute('aria-expanded', String(expanded));
      e.currentTarget.textContent = expanded ? L.t('收起筛选') : L.t('展开筛选');
      $('.filter-panel').classList.toggle('expanded', expanded);
    });
    $('#clear-filters').addEventListener('click', async () => {
      clearTimeout(timer); Object.assign(F, {q:'', main:'', category_id:'', location_id:'', tags:new Set(), archived:false, disposition:'', attention:'', never_worn:false});
      ['q','f-main','f-loc','f-disp'].forEach(id => $('#' + id).value = '');
      $('#f-archived').checked = false; $('#f-never-worn').checked = false; $$('#chips [data-tag]').forEach(b => b.setAttribute('aria-pressed','false'));
      renderChips(); fillSub(); await refresh();
    });
    $$('.collection-switch [data-kind]').forEach(button => button.addEventListener('click', async () => {
      if (F.kind === button.dataset.kind) return;
      clearTimeout(timer);
      const styleIds = new Set((state.meta.tags.find(d => d.key === 'style')?.values || []).map(v => String(v.id)));
      F.tags = new Set([...F.tags].filter(id => styleIds.has(id)));
      Object.assign(F, {kind:button.dataset.kind, q:'', main:'', category_id:'', location_id:'', disposition:'', archived:false, attention:''});
      try { if (!window.OOTD_DEMO) localStorage.setItem('ootd.collection-kind', F.kind); } catch (_) {}
      ['q','f-main','f-loc','f-disp'].forEach(id => $('#' + id).value = ''); $('#f-archived').checked = false;
      renderMode(); $('#grid').innerHTML = L.t('<div class="empty">正在找出你的收藏…</div>'); await refresh();
    }));
    $('#q').addEventListener('input', e => { clearTimeout(timer); F.q = e.target.value.trim(); ++loadVersion; timer = setTimeout(() => { if (main.isConnected) refresh(); }, 250); });
    $('#f-main').addEventListener('change', async () => { F.main = $('#f-main').value; F.category_id = ''; fillSub(); await refresh(); });
    $('#f-sub').addEventListener('change', async () => { F.category_id = $('#f-sub').value; const cat = state.meta.categories.find(c => c.code === 'COS')?.children.find(c => String(c.id) === F.category_id); paletteUse = W.makeupPalettes.forCategory(cat?.code); allPalettes = false; renderChips(); await refresh(); });
    $('#f-loc').addEventListener('change', async () => { F.location_id = $('#f-loc').value; await refresh(); });
    $('#f-never-worn')?.addEventListener('change', async e => { F.never_worn = e.target.checked; await refresh(); });
    $('#f-disp').addEventListener('change', async () => { F.disposition = $('#f-disp').value; await refresh(); });
    $('#f-archived').addEventListener('change', async () => { F.archived = $('#f-archived').checked; await refresh(); });
    $('#chips').addEventListener('click', async e => {
      const use = e.target.closest('[data-palette-use]');
      if (use) { paletteUse = use.dataset.paletteUse; allPalettes = false; renderChips(); return; }
      if (e.target.closest('[data-all-palettes]')) { allPalettes = !allPalettes; renderChips(); return; }
      const b = e.target.closest('[data-tag]'); if (!b) return; const id = b.dataset.tag; F.tags.has(id) ? F.tags.delete(id) : F.tags.add(id); renderChips(); $$('#chips [data-tag]').find(b => b.dataset.tag === id)?.focus(); await refresh(); });
    $('#batch-toggle').addEventListener('click', async () => { B.on = !B.on; B.selected.clear(); B.conflicts = []; renderBatch(); $('#grid').innerHTML = L.t('<div class="empty">正在更新单品…</div>'); await refresh(); });
    $('#select-visible').addEventListener('click', () => { items.forEach(i => B.selected.set(i.id, i)); renderGrid(); renderBatch(); });
    $('#clear-selected').addEventListener('click', () => { B.selected.clear(); B.conflicts = []; renderGrid(); renderBatch(); });
    $('#sort-items').value=sortMode;
    $('#sort-items').addEventListener('change',async e=>{sortMode=e.target.value;await refresh();});
    $('#batch-target').addEventListener('change', () => { B.target = $('#batch-target').value; renderBatch(); });
    $('#batch-apply').addEventListener('click', applyBatch);
    main.addEventListener('change', e => { const cb = e.target.closest('[data-select]'); if (!cb) return; const it = items.find(i => i.id === Number(cb.dataset.select)); cb.checked ? B.selected.set(it.id, it) : B.selected.delete(it.id); renderGrid(); renderBatch(); });
    main.addEventListener('click', e => {
      const cardLink=e.target.closest('#grid .open');
      if(B.on && cardLink) { e.preventDefault(); const id=Number(cardLink.getAttribute('href').split('/').pop()); const it=items.find(i=>i.id===id); if(it) {B.selected.has(id) ? B.selected.delete(id) : B.selected.set(id,it);renderGrid();renderBatch();} return; }
      const un = e.target.closest('[data-unselect]'); if (un) { B.selected.delete(Number(un.dataset.unselect)); renderGrid(); renderBatch(); return; }
      const wb = e.target.closest('[data-wear]'); if (wb) { recordWear(Number(wb.dataset.wear)); return; }
      if (e.target.id === 'undo-batch') undoBatch(false);
      if (e.target.id === 'undo-skip') undoBatch(true);
      if (e.target.id === 'undo-cancel') { lastBatch = null; renderLastBatch(); }
    });
  }

  function renderSelectedFilters() {
    const tokens = [];
    const add = (key, label, value = '') => tokens.push(L.html`<button type="button" data-remove-filter="${key}" data-value="${esc(value)}" aria-label="移除筛选：${esc(label)}">${esc(label)} <span aria-hidden="true">×</span></button>`);
    if (F.q) add('q', L.msg`搜索：${F.q}`);
    if (F.main) add('main',L.meta(state.meta.categories.find(c => c.code === F.main)?.label || F.main));
    if (F.category_id) add('category_id',L.meta(state.meta.categories.flatMap(c => c.children).find(c => String(c.id) === F.category_id)?.label) || L.t('细类'));
    if (F.location_id) add('location_id',state.locations.find(l => String(l.id) === F.location_id)?.path || L.t('位置'));
    if (F.disposition) add('disposition',DISPOSITION[F.disposition] || L.t('在用'));
    if (F.archived) add('archived',L.t('含已归档'));
    if (F.attention) add('attention',ATTENTION[F.attention]);
    for (const dim of state.meta.tags) for (const tag of dim.values) if (F.tags.has(String(tag.id))) add('tag',L.meta(tag.value),String(tag.id));
    $('#selected-filters').innerHTML = tokens.length ? L.html`<span class="small">已选</span>${tokens.join('')}` : '';
    $('#selected-filters').hidden = !tokens.length;
  }

  function renderChips() {
    const open = new Set($$('#chips details[open]').map(d => d.dataset.dimension));
    const keys = F.kind === 'cosmetics' ? ['style','makeup_palette','occasion'] : ['style','season','apparel_palette','occasion','storage'];
    const codes = F.kind === 'cosmetics' ? ['COS'] : state.meta.categories.filter(c => c.code !== 'COS').map(c => c.code);
    // 常用的五组照常摆在外面，其余维度收进「更多筛选」，要用的时候再展开
    const rest = state.meta.tags.filter(d => !keys.includes(d.key) && (!d.applies_to || codes.some(code => d.applies_to.includes(code)))).map(d => d.key);
    const chipGroup = (key, forceDisclosure) => {
      const dim = state.meta.tags.find(d => d.key === key);
      if (!dim || (dim.applies_to && !codes.some(code => dim.applies_to.includes(code)))) return '';
      const label = {style:L.t('风格'),season:L.t('季节'),apparel_palette:L.t('配色'),makeup_palette:L.t('妆色'),occasion:L.t('场合'),storage:L.t('收纳')}[key] || L.meta(dim.label);
      const palette = ['apparel_palette', 'makeup_palette', 'storage'].includes(key);
      // 当前收藏类型里一件都没用到的值就别摆出来：彩妆的「睡眠」「游泳／海边」筛了也是空的。
      // 已经选中的照常留着，否则清不掉。
      const inUse = dim.values.filter(v => F.tags.has(String(v.id)) || !v.used || v.used[F.kind] > 0);
      const values = key === 'makeup_palette' ? inUse.filter(v => F.tags.has(String(v.id)) || W.makeupPalettes.visible(v.value,paletteUse,allPalettes)) : inUse;
      if (!values.length) return '';
      const usePicker = key === 'makeup_palette' ? L.html`<div class="palette-uses" role="group" aria-label="优先展示的妆色用途"><span class="small">常用妆色</span>${Object.entries({all:{label:L.t('全部用途')},...W.makeupPalettes.groups}).map(([k,g]) => `<button type="button" data-palette-use="${k}" aria-pressed="${paletteUse === k}">${g.label}</button>`).join('')}</div><p class="palette-help">用途只调整妆色选项；要筛选商品类型，请选择上方彩妆类型。</p>` : '';
      const expand = key === 'makeup_palette' && paletteUse !== 'all' ? `<button type="button" class="palette-expand" data-all-palettes aria-expanded="${allPalettes}">${allPalettes ? L.t('只看常用妆色') : L.t('展开全部妆色')}</button>` : '';
      const buttons = `${usePicker}<div class="chip-options">${values.map(v => `<button type="button" data-tag="${v.id}" aria-pressed="${F.tags.has(String(v.id))}">${palette ? W.paletteSwatch(key, v.value) : ''}${esc(L.meta(v.value))}</button>`).join('')}</div>${expand}`;
      if (forceDisclosure || key === 'apparel_palette' || key === 'makeup_palette' || key === 'occasion' || key === 'storage') {
        const chosen = values.filter(v => F.tags.has(String(v.id))).map(v => L.meta(v.value));
        const help = key === 'apparel_palette' ? L.t('按单品整体配色挑选，具体颜色保留在档案里。') : key === 'makeup_palette' ? L.t('按实际妆色挑选，示意色不等于上脸试色。') : key === 'storage' ? L.t('衣杆放不下时从上往下让：「一定要挂」压过就回不来，「挂着更好」叠了熨一下能恢复，再下面本来就该叠。') : '';
        return L.html`<details class="chip-disclosure" data-dimension="${key}" ${open.has(key) ? 'open' : ''}><summary>${esc(label)}<span>${chosen.length ? esc(chosen.join('、')) : L.t('不限')}</span></summary>${help ? `<p class="palette-help">${help}</p>` : ''}${buttons}<p class="palette-help">同组多选，符合任意一项即可。</p></details>`;
      }
      return `<div class="chip-dimension" role="group" aria-label="${esc(label)}"><span class="chip-title">${esc(label)}</span>${buttons}</div>`;
    };
    const more = rest.map(key => chipGroup(key, true)).join('');
    const morePicked = rest.reduce((n, key) => n + (state.meta.tags.find(d => d.key === key)?.values || []).filter(v => F.tags.has(String(v.id))).length, 0);
    $('#chips').innerHTML = keys.map(key => chipGroup(key, false)).join('')
      + (more ? L.html`<details class="chip-disclosure chip-more" data-dimension="more" ${open.has('more') ? 'open' : ''}><summary>更多筛选<span>${morePicked ? L.msg`已选 ${morePicked} 项` : esc(rest.map(key => L.meta(state.meta.tags.find(d => d.key === key).label)).slice(0, 3).join('、')) + '…'}</span></summary><div class="grouped-chips">${more}</div></details>` : '');
  }

  function renderMode() {
    const cosmetics = F.kind === 'cosmetics';
    currentMain.dataset.kind = F.kind;
    state.collectionKind = F.kind;
    $$('.collection-switch [data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === F.kind)));
    $('#collection-eyebrow').innerHTML = W.icon('sparkle') + (cosmetics ? L.t(' 每天一点妆容灵感') : L.t(' 每天一点穿搭灵感'));
    $('.welcome-art').innerHTML = W.icon(cosmetics ? 'sparkle' : 'wardrobe') + '<span class="art-spark">✧</span><span class="art-dot"></span>';
    $('#collection-title').innerHTML = `${cosmetics ? L.t('我的彩妆') : L.t('我的衣橱')}<span class="heading-dot">.</span>`;
    $('#collection-caption').textContent = cosmetics ? L.t('让喜欢的色彩，成为今天的灵感。') : L.t('把喜欢，穿在身上。');
    $('#f-main').hidden = cosmetics;
    $('#f-sub').setAttribute('aria-label', cosmetics ? L.t('彩妆类型') : L.t('单品细类'));
    $('.filters').classList.toggle('cosmetics-filters', cosmetics);
    renderChips(); fillSub();
  }

  function fillSub() {
    const main = state.meta.categories.find(c => c.code === (F.kind === 'cosmetics' ? 'COS' : F.main));
    const option = c => `<option value="${c.id}" ${String(c.id) === F.category_id ? 'selected' : ''}>${esc(L.meta(c.label))}</option>`;
    // 彩妆有二十个细类，平铺着找不到；按唇部／眼眉／底妆／腮红与修容分组
    const body = !main ? '' : F.kind === 'cosmetics'
      ? W.makeupPalettes.groupChildren(main.children).map(g => `<optgroup label="${esc(g.label)}">${g.items.map(option).join('')}</optgroup>`).join('')
      : main.children.map(option).join('');
    $('#f-sub').innerHTML = L.t('<option value="">全部细类</option>') + body;
    $('#f-sub').disabled = !main;
  }

  views.items = async main => {
    if (!state.returningToList) browseSeed = (Math.random() * 0xffffffff) >>> 0;  // 每次进衣橱换一次顺序
    currentMain = main; clearTimeout(timer); ++loadVersion;
    if (main.dataset.view !== 'items') skeleton(main);
    if (state.pendingBatch) { state.pendingBatch = false; B.on = true; B.selected.clear(); if(state.pendingBatchTarget) B.target=state.pendingBatchTarget; state.pendingBatchTarget=''; }
    await refresh();
  };
  W.openNeverWorn = kind => {
    Object.assign(F,{kind:kind === 'cosmetics' ? 'cosmetics' : 'apparel',q:'',main:'',category_id:'',location_id:'',tags:new Set(),archived:false,disposition:'',attention:'',never_worn:true});
    try { if (!window.OOTD_DEMO) localStorage.setItem('ootd.collection-kind', F.kind); } catch (_) { /* 隐私模式忽略 */ }
    location.hash = '#/items';
  };

  W.openItemAttention = (reason,kind) => {
    if (!ATTENTION[reason]) return;
    Object.assign(F,{kind:kind === 'cosmetics' ? 'cosmetics' : 'apparel',q:'',main:'',category_id:'',location_id:'',tags:new Set(),archived:false,disposition:'',attention:reason});
    state.pendingBatch = reason === 'missing_location';
    if (location.hash === '#/items') W.render(); else location.hash = '#/items';
  };
})();
