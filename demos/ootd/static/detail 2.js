// 单品详情：照片、档案、位置、购入信息、归档。
(() => {
  const { $, esc, api, toast, money, wearText, locationOptions, state, views } = W;

  function wearSection(i) {
    const w = i.wear, wt = wearText(w, i.category.main_code), b = w.baseline;
    const verb = i.category.main_code === 'COS' ? '用' : '穿';  // 彩妆是「用」，衣服是「穿」
    const reason = w.cost_reason === 'no_price' ? L.t('填了购入价才能算') : w.cost_reason === 'no_wear' ? L.t(verb === '用' ? '用过一次就能算' : '穿过一次就能算') : L.t(verb === '用' ? '实付合计 ÷ 累计使用次数' : '实付合计 ÷ 累计穿着次数');
    return L.html`<section class="panel"><div class="heading" style="margin-bottom:6px"><h3>${verb === '用' ? L.t('使用') : L.t('穿着')}</h3><div class="actions">
        ${w.worn_today ? L.t('<button type="button" id="wear-remove-today">撤销今天的记录</button>') : L.html`<button type="button" id="wear-today" class="primary" ${i.archived_at ? 'disabled' : ''}>${L.t(verb === '用' ? '今天用了这件' : '今天穿了这件')}</button>`}</div></div>
      <div class="fields"><div class="field"><span>${L.t(verb === '用' ? '累计使用' : '累计穿着')}</span><div class="value">${wt.count}</div><div class="small">${b ? L.msg`建档前${b.precision === 'estimated' ? L.t('估计') : L.t('记录')} ${b.count} 次（截至 ${b.as_of}）＋ 之后记录 ${w.detail_count} 次` : L.t('按建档后的记录计算')}</div></div>
        <div class="field"><span>平均每次花费</span><div class="value cost">${wt.cost || '—'}</div><div class="small">${reason}</div></div>
        <div class="field"><span>${L.t(verb === '用' ? '最近使用' : '最近穿着')}</span><div class="value">${w.last_worn || '—'}</div></div></div>
      ${w.dates && w.dates.length ? L.html`<div class="small" style="margin-top:8px">${L.t(verb === '用' ? '最近使用' : '最近穿着')}日：${w.dates.slice(-10).join('、')}</div>` : ''}
      </section>`;
  }
  const ROLE = { product: L.t('商品图'), actual: L.t('实物图'), detail: L.t('细节'), care_label: L.t('洗标'), worn: L.t('上身图'), guide: L.t('攻略图') };
  const FIT = { runs_large: L.t('偏大'), fits: L.t('合身'), runs_small: L.t('偏小') };
  const REPURCHASE = { yes: L.t('会'), maybe: L.t('看情况'), no: L.t('不会（踩雷）') };
  const DISPOSITION = { in_use: L.t('在用'), idle: L.t('闲置'), for_sale: L.t('想出手') };
  const KIND = { summary: L.t('要点'), tip: L.t('用法'), swatch: L.t('试色'), official: L.t('官方说明') };
  const applies = (def, mainCode) => !def || !def.applies_to || def.applies_to.includes(mainCode);
  const CURRENCIES = ['CNY', 'JPY', 'USD', 'EUR', 'KRW'];
  const SOURCE = { user: L.t('我填的'), order_record: L.t('订单记录'), estimate: L.t('估计') };
  const STORAGE_CATEGORIES = new Set(['TOP', 'BOT', 'ONE', 'OUT']);
  const STORAGE_LENGTH = { unknown: L.t('待确认'), short: L.t('短款'), regular: L.t('常规'), midi: L.t('中长'), long: L.t('长款') };
  const STORAGE_THICKNESS = { unknown: L.t('待确认'), thin: L.t('薄'), medium: L.t('适中'), thick: L.t('厚') };
  const STORAGE_SOURCE = { unknown: L.t('待确认'), estimated: L.t('估算'), measured: L.t('实测') };
  const STORAGE_DIMENSIONS = [
    ['fold_width_cm', L.t('叠放宽度')], ['fold_depth_cm', L.t('叠放深度')], ['fold_height_cm', L.t('叠放高度')],
    ['hang_length_cm', L.t('挂放长度')], ['hang_width_cm', L.t('挂放宽度')],
  ];

  function storageSection(i) {
    if (!STORAGE_CATEGORIES.has(i.category.main_code)) return '';
    const p = i.storage_profile && typeof i.storage_profile === 'object' ? i.storage_profile : {};
    const options = (values, selected) => Object.entries(values).map(([value, label]) => `<option value="${value}" ${value === (selected || 'unknown') ? 'selected' : ''}>${label}</option>`).join('');
    const dimensions = entries => entries.map(([key, label]) => L.html`<label class="field"><span>${label}（cm）</span><input name="${key}" type="number" inputmode="decimal" step="any" min="0" value="${p[key] == null ? '' : esc(p[key])}" placeholder="待填写"></label>`).join('');
    return L.html`<details class="panel detail-disclosure storage-profile" data-detail-section="storage-profile"><summary><span>收纳参数</span><span class="small">${STORAGE_LENGTH[p.length] || L.t('长短待确认')} · ${STORAGE_THICKNESS[p.thickness] || L.t('厚薄待确认')} · ${STORAGE_SOURCE[p.source] || L.t('来源待确认')}</span></summary>
      <p class="storage-profile-help">记录衣服收起来占多大空间，方便安排柜位。没有量过的尺寸可以先留空。</p>
      <form id="storage-profile-form">
        <div class="fields storage-profile-types">
          <label class="field"><span>长短</span><select name="length">${options(STORAGE_LENGTH, p.length)}</select></label>
          <label class="field"><span>厚薄</span><select name="thickness">${options(STORAGE_THICKNESS, p.thickness)}</select></label>
          <label class="field"><span>数据来源</span><select name="source" aria-describedby="storage-source-help">${options(STORAGE_SOURCE, p.source)}</select></label>
        </div>
        <p class="small" id="storage-source-help">按图片或经验判断选「估算」，实际量过再选「实测」；尚不清楚就保留「待确认」。</p>
        <fieldset class="storage-dimension-group"><legend>叠放后</legend><div class="fields">${dimensions(STORAGE_DIMENSIONS.slice(0, 3))}</div></fieldset>
        <fieldset class="storage-dimension-group"><legend>挂起来</legend><div class="fields">${dimensions(STORAGE_DIMENSIONS.slice(3))}</div></fieldset>
        <div class="actions"><button type="submit" class="primary">保存收纳参数</button><button type="reset">撤销未保存修改</button></div>
        <div class="error" id="storage-profile-error" role="status"></div>
      </form></details>`;
  }

  function attentionNavigation(i) {
    const context = W.attentionContext;
    if (!context || !Array.isArray(context.ids)) return '';
    const ids = context.ids.map(Number), index = ids.indexOf(i.id);
    if (index < 0) return '';
    return L.html`<nav class="detail-queue" aria-label="待补资料导航"><a href="${esc(context.returnHash || '#/attention/' + encodeURIComponent(context.reason))}">返回待补清单</a><span>${index + 1} / ${ids.length}</span><div class="actions">${index > 0 ? L.html`<a class="button" href="#/items/${ids[index - 1]}">上一件</a>` : ''}${index < ids.length - 1 ? L.html`<a class="button" href="#/items/${ids[index + 1]}">下一件</a>` : ''}</div></nav>`;
  }

  const TAG_PRIMARY = ['storage', 'style', 'season', 'apparel_palette', 'makeup_palette', 'occasion'];
  const TAG_SINGLE = new Set(['storage']);  // 一件衣服只能收在一个地方，选了新的就把旧的换下来

  function tagRow(d, chosen) {
    return `<div class="tag-row" data-tag-dimension="${d.key}"><span class="tag-row-label">${esc(L.meta(d.label))}</span>
      <div class="tag-row-options">${d.values.map(v => `<button type="button" data-tag-toggle="${v.id}" aria-pressed="${chosen.has(v.id)}">${W.paletteSwatch(d.key, v.value)}${esc(L.meta(v.value))}</button>`).join('')}</div></div>`;
  }

  function tagEditor(i) {
    const dims = state.meta.tags.filter(d => applies(d, i.category.main_code));
    const chosen = new Set(i.tags.map(t => t.id));
    const primary = TAG_PRIMARY.map(key => dims.find(d => d.key === key)).filter(Boolean);
    const rest = dims.filter(d => !TAG_PRIMARY.includes(d.key));
    return L.html`<section class="panel detail-tags"><div class="heading" style="margin-bottom:6px"><h3>标签</h3></div><div class="selected-tag-summary">${i.tags.filter(t => TAG_PRIMARY.includes(t.dimension)).map(t=>`<span class="tag">${esc(L.meta(t.value))}</span>`).join('') || L.t('还没有标签')}</div><details data-detail-section="edit-tags"><summary>编辑标签</summary><p class="small">点选后自动保存</p>
      ${primary.map(d => tagRow(d, chosen)).join('')}
      ${rest.length ? L.html`<details class="secondary-tags" data-detail-section="tags-more"><summary>更多标签</summary>${rest.map(d => tagRow(d, chosen)).join('')}</details>` : ''}</details></section>`;
  }

  function markup(i, selectedPhoto) {
    const photos = i.photos.filter(ph => ph.role !== 'guide');
    const photo = photos.find(ph => ph.asset_id === selectedPhoto) || photos[0];
    const looks = i.outfits || [];
    return L.html`${attentionNavigation(i)}
      <div class="heading detail-heading"><div><div class="muted">${esc(i.code)} · ${esc(L.meta(i.category.main_label))} / ${esc(L.meta(i.category.label))}</div><h2>${esc(i.display_name || i.name)}</h2>${i.brand ? `<div class="detail-brand">${esc(i.brand)}</div>` : ''}</div>
        <div class="actions"><a class="button" href="${esc(state.itemReturn?.hash || '#/items')}">${esc(state.itemReturn?.label || L.t('返回衣橱'))}</a><button type="button" id="detail-manage">管理档案</button></div></div>
      ${i.archived_at ? L.t('<div class="badge warn">已归档 · 历史记录保留，可在管理档案中恢复</div>') : ''}
      <div class="detail-daily">
        <section class="detail-visual" aria-label="单品照片">
          <div class="detail-main-photo">${photo ? L.html`<a href="${esc(photo.url)}" target="_blank" rel="noopener" aria-label="查看${ROLE[photo.role] || L.t('照片')}原图"><img src="${esc(photo.url)}" alt="${esc(i.display_name || i.name)}" decoding="async"></a><span class="detail-photo-role">${ROLE[photo.role] || L.t('照片')}</span>` : L.t('<div class="detail-no-photo"><span>还没有照片</span><button type="button" id="detail-add-photo">添加第一张</button></div>')}</div>
          ${photos.length > 1 ? L.html`<div class="detail-photo-strip" aria-label="选择照片">${photos.map((ph, index) => L.html`<button type="button" data-photo-select="${ph.asset_id}" aria-pressed="${ph === photo}" aria-label="查看第 ${index + 1} 张${ROLE[ph.role] || L.t('照片')}"><img src="${esc(ph.url)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>` : ''}
        </section>
        <div class="detail-daily-info">${locationSection(i)}${wearSection(i)}${tagEditor(i)}
          <button type="button" id="use-in-look" class="primary detail-compose-action">用这件搭${looks.length ? L.msg` · 已有 ${looks.length} 套` : ''}</button>
        </div>
      </div>
      <section class="panel detail-related" id="related-looks" tabindex="-1"><div class="heading"><div><h3>用这件搭</h3><p class="small">${looks.length ? L.msg`这件单品已经出现在 ${looks.length} 套搭配里` : L.t('从这件单品开始，搭一套喜欢的组合')}</p></div>${!i.archived_at ? L.html`<a class="button primary" href="#/looks/new/${i.id}">＋ 新搭一套</a>` : ''}</div>
        <div class="detail-look-links">${looks.map(o => `<a href="#/looks/${o.id}" class="detail-look-link"><span>${esc(o.name)}</span><span aria-hidden="true">↗</span></a>`).join('') || L.t('<p class="muted">还没有固定搭配。新建时会先放入这件单品。</p>')}</div></section>
      ${storageSection(i)}
      <details class="panel detail-disclosure" data-detail-section="profile"><summary><span>单品档案</span><span class="small">尺码、评价和更多标签</span></summary>
        ${i.display_name && i.display_name !== i.name ? L.html`<p class="small">商品名：${esc(i.name)}</p>` : ''}${i.aliases.length ? L.html`<p class="small">旧编号：${esc(i.aliases.join('、'))}</p>` : ''}
        ${profileSection(i)}</details>
      ${(i.guides || []).length || i.photos.some(ph => ph.role === 'guide') ? L.html`<details class="panel detail-disclosure" data-detail-section="guides"><summary><span>用法与试色</span><span class="small">${(i.guides || []).length} 条攻略</span></summary>${guideSection(i)}</details>` : ''}
      <details class="panel detail-disclosure detail-management" id="detail-management" data-detail-section="management"><summary><span>管理档案</span><span class="small">编辑、照片和购入记录</span></summary>
        <div class="actions detail-management-actions"><a class="button" href="#/items/${i.id}/edit">编辑单品与标签</a>${i.archived_at ? L.t('<button type="button" id="unarchive">恢复单品</button>') : L.t('<button type="button" id="archive" class="danger">归档单品</button>')}</div>
        ${photoManagement(i)}${purchaseSection(i)}${baselineSection(i)}
      </details>`;
  }

  function photoManagement(i) { return L.html`      <section class="panel photo-gallery"><h3>照片</h3>
        <div class="thumbs" style="margin-top:10px">${i.photos.map(ph => L.html`<div class="thumb"><a href="${ph.url}" target="_blank" rel="noopener" aria-label="查看${ROLE[ph.role] || ph.role}原图"><img src="${ph.url}" alt="" loading="lazy" decoding="async"></a><span class="role">${ROLE[ph.role] || ph.role}</span><button type="button" class="del" data-del-photo="${ph.asset_id}" aria-label="删除照片">×</button></div>`).join('') || L.t('<div class="muted">还没有照片</div>')}</div>
        <div class="actions" style="margin-top:12px"><select id="photo-role">${Object.entries(ROLE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><input type="file" id="photo-file" accept="image/*" multiple style="width:auto"><button type="button" id="photo-upload" class="primary">上传</button></div>
        <div class="note">商品图、实物图、细节、洗标和上身图，都可以分开收藏。</div></section>
`; }

  function profileSection(i) { return L.html`      <section class="panel"><h3>档案</h3>
        <div class="fields" style="margin-top:10px">
          <div class="field"><span>品牌</span><div class="value">${esc(i.brand || '—')}</div></div><div class="field"><span>尺码／容量</span><div class="value">${esc(i.size || '—')}</div></div>
          <div class="field"><span>颜色／色号</span><div class="value">${i.color_hex ? `<span class="swatch" style="background:${i.color_hex}"></span>` : ''}${esc(i.color_name || '—')}</div></div>
          <div class="field"><span>数量</span><div class="value">${i.quantity} 件</div></div>
          <div class="field"><span>计量</span><div class="value">${i.unit === 'pair' ? L.t('一对') : L.t('一件')}${i.expected_piece_count > 1 ? L.msg` · 应有 ${i.expected_piece_count} 只，现有 ${i.present_piece_count} 只` : ''}${i.present_piece_count < i.expected_piece_count ? L.t(' <span class="badge warn">不完整</span>') : ''}</div></div>
          <div class="field" style="grid-column:1/-1"><span>备注</span><div class="value">${esc(i.notes || '—')}</div></div></div>
        <div class="fields" style="margin-top:10px">
          ${applies((state.meta.item_fields || {}).fit, i.category.main_code) ? L.html`<div class="field"><span>合身度</span><div class="value">${FIT[i.fit] || '—'}</div></div>` : ''}
          ${applies((state.meta.item_fields || {}).measurements, i.category.main_code) ? L.html`<div class="field"><span>实测尺寸</span><div class="value">${esc(i.measurements || '—')}</div></div>` : ''}
          <div class="field"><span>喜欢程度</span><div class="value">${i.liking ? '★'.repeat(i.liking) + '☆'.repeat(5 - i.liking) : '—'}</div></div>
          <div class="field"><span>还会回购吗</span><div class="value">${REPURCHASE[i.repurchase] || '—'}</div></div>
          <div class="field"><span>状态</span><div class="value">${DISPOSITION[i.disposition] || L.t('在用')}${i.disposition === 'for_sale' && i.asking_price != null && i.asking_price !== '' ? L.msg` · 出手价 ${money(i.asking_price, i.asking_currency)}` : ''}</div></div>
          <div class="field" style="grid-column:1/-1"><span>一句话评价</span><div class="value">${esc(i.review || '—')}</div></div></div>
</section>`; }

  function locationSection(i) { const loc = i.location; return L.html`      <section class="panel"><div class="heading" style="margin-bottom:6px"><h3>位置</h3><button type="button" id="loc-edit">改位置</button></div>
        <div class="fields"><div class="field"><span>放在哪</span><div class="value">${loc.current ? `<a class="location-address" href="#/places/${loc.current.id}"><strong>${esc(loc.current.user_code || loc.current.name)}</strong> ${esc(loc.current.path)}</a>` : L.t('还没放进格子')}</div>${loc.current_note ? `<div class="small">${esc(loc.current_note)}</div>` : ''}</div>
          ${loc.suggested && !loc.current ? L.html`<div class="field"><span>建议放这里</span><div class="value">${esc(loc.suggested.path)}</div>
            <div class="actions" style="margin-top:6px"><button type="button" id="loc-accept" class="primary">放了</button><button type="button" id="loc-reject">不放</button></div></div>` : ''}
          <div class="field"><span>最后确认</span><div class="value">${loc.confirmed_at ? new Date(loc.confirmed_at).toLocaleString(L.locale) : '—'}</div></div></div>
        <form id="loc-form" hidden style="margin-top:12px"><div class="fields">
          <label class="field"><span>改到</span><select name="location_id">${locationOptions(loc.current ? loc.current.id : '', L.t('清空为「未记录」'))}</select></label>
          <label class="field"><span>备注（比如「暂时挂在阳台」）</span><input name="note" value="${esc(loc.current_note || '')}" maxlength="80"></label></div>
          <div class="actions" style="margin-top:10px"><button type="submit" class="primary">保存位置</button><button type="button" id="loc-cancel">取消</button></div><div class="error" id="loc-error"></div></form></section>
`; }

  function purchaseSection(i) { const p = i.purchase; return L.html`      <section class="panel"><div class="heading" style="margin-bottom:6px"><h3>购入记录</h3><button type="button" id="pur-add">＋ 添加一条</button></div>
        <div class="fields"><div class="field"><span>实付合计</span><div class="value">${p ? (p.amount === null ? (p.mixed_currency ? L.t('多种币种，见下方各条') : L.t('未填写')) : money(p.amount, p.currency)) : L.t('未填写')}</div>${p && p.unpriced ? L.html`<div class="small">${p.unpriced} 条没填金额</div>` : ''}</div>
          <div class="field"><span>购入次数 / 件数</span><div class="value">${p ? L.msg`${p.count} 次 · ${p.quantity} 件` : '—'}</div></div>
          <div class="field"><span>首次购入</span><div class="value">${esc(p && p.purchased_on || '—')}</div></div></div>
        <div style="margin-top:8px">${(i.purchases || []).map(r => L.html`<div class="row"><div><div>${esc(r.purchased_on || L.t('日期未知'))} · ${esc(r.platform || L.t('平台未填'))} · ${r.quantity} 件 · ${r.amount === null ? L.t('金额未填') : money(r.amount, r.currency)} <span class="badge">${SOURCE[r.price_source] || r.price_source}</span></div>
            <div class="small">${r.order_number ? L.t('订单 ') + esc(r.order_number) + ' · ' : ''}${esc(r.allocation_note || '')}${r.product_url ? L.html` · <a href="${esc(r.product_url)}" target="_blank" rel="noopener">商品页</a>` : ''}</div></div>
            <div class="actions"><button type="button" data-pur-edit="${r.id}">编辑</button><button type="button" class="danger" data-pur-del="${r.id}">删除</button></div></div>`).join('') || L.t('<div class="muted">还没有购入记录</div>')}</div>
        <form id="pur-form" hidden style="margin-top:12px"><div class="fields">
          <label class="field"><span>实付金额（这条记录的合计，可留空）</span><input name="amount" inputmode="decimal" placeholder="扣掉优惠、退款后实际花的钱"></label>
          <label class="field"><span>币种</span><select name="currency">${CURRENCIES.map(c => `<option ${c === state.meta.default_currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="field"><span>件数</span><input type="number" name="quantity" min="1" value="1" style="width:90px"></label>
          <label class="field"><span>购入日期</span><input type="date" name="purchased_on" max="${state.meta.today}"></label>
          <label class="field"><span>平台／店铺</span><input name="platform" maxlength="120"></label>
          <label class="field"><span>订单号</span><input name="order_number" maxlength="120" placeholder="开头的 0 会保留"></label>
          <label class="field"><span>金额来源</span><select name="price_source">${Object.entries(SOURCE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="field" style="grid-column:1/-1"><span>商品链接</span><input name="product_url" maxlength="500" placeholder="https://…"></label>
          <label class="field" style="grid-column:1/-1"><span>分摊说明</span><input name="allocation_note" maxlength="500" placeholder="同一订单多件时怎么分的、运费税费怎么算的"></label>
          <label class="field" style="grid-column:1/-1"><span>修改原因（会留在历史里）</span><input name="reason" maxlength="200"></label></div>
          <div class="actions" style="margin-top:10px"><button type="submit" class="primary">保存这条购入记录</button><button type="button" id="pur-cancel">取消</button></div><div class="error" id="pur-error"></div></form></section>
`; }

  function baselineSection(i) { const b = i.wear.baseline; return L.html`      <details style="margin-top:10px"><summary>建档前的历史次数${b ? L.t('（已填）') : L.t('（可后补）')}</summary>
        <form id="baseline-form" style="margin-top:8px"><div class="fields">
          <label class="field"><span>历史次数</span><input type="number" name="count" min="0" max="99999" value="${b ? b.count : ''}" required></label>
          <label class="field"><span>截至哪一天</span><input type="date" name="as_of" value="${b ? b.as_of : ''}" max="${state.meta.today}" required></label>
          <label class="field"><span>准确度</span><select name="precision"><option value="estimated" ${!b || b.precision === 'estimated' ? 'selected' : ''}>我的估计</option><option value="exact" ${b && b.precision === 'exact' ? 'selected' : ''}>有记录，准确</option></select></label>
          <label class="field"><span>来源／备注</span><input name="note" value="${esc(b ? b.note : '')}" maxlength="200"></label></div>
          <div class="note">截止日之前的穿着明细会被这个数字覆盖、不再单独累加；之后的记录照常累加。</div>
          <div class="actions" style="margin-top:8px"><button type="submit" class="primary">保存历史次数</button>${b ? L.t('<button type="button" id="baseline-revoke">撤销历史次数</button>') : ''}</div>
          <div class="error" id="baseline-error"></div></form></details>`; }

  function guideSection(i) {
    const guides = i.guides || [];
    const pics = i.photos.filter(ph => ph.role === 'guide');
    return L.html`<section class="panel"><div class="heading" style="margin-bottom:6px"><h3>攻略</h3><div class="small">网上找来的用法、试色、官方说明；图片在上面「照片」里标为「攻略图」</div></div>
      ${pics.length ? `<div class="thumbs">${pics.map(ph => L.html`<a class="thumb" href="${ph.url}" target="_blank" rel="noopener"><img src="${ph.url}" alt=""><span class="role">攻略图</span></a>`).join('')}</div>` : ''}
      ${guides.map(g => `<div class="row"><div><div><span class="badge">${KIND[g.kind] || g.kind}</span> ${esc(g.title || '')}</div><div class="small" style="white-space:pre-wrap">${esc(g.body || '')}</div>${g.source_url ? `<div class="small"><a href="${esc(g.source_url)}" target="_blank" rel="noopener">${esc(g.source_name || L.t('来源'))}</a> · ${g.language}</div>` : ''}</div></div>`).join('') || L.t('<div class="muted" style="margin-top:6px">还没有攻略。</div>')}</section>`;
  }

  views.item = async (main, id) => {
    const $ = selector => main.querySelector(selector);
    let pendingBaseline = null, selectedPhoto = null, reloadVersion = 0, busy = false, savingTags = Promise.resolve();
    let item = await api('GET', `/api/items/${id}`);
    if (!main.isConnected) return;
    main.dataset.view = 'item';
    const draw = () => {
      if (!main.isConnected) return;
      const open = [...main.querySelectorAll('details[open][data-detail-section]')].map(d => d.dataset.detailSection);
      main.innerHTML = markup(item, selectedPhoto);
      open.forEach(key => { const d = main.querySelector(`[data-detail-section="${key}"]`); if (d) d.open = true; });
    };
    draw();
    const context = W.attentionContext;
    if (context && Array.isArray(context.ids) && context.ids.map(Number).includes(id)) {
      if (context.reason === 'missing_location') $('#loc-form').hidden = false;
      if (context.reason === 'missing_actual_photo') { $('#detail-management').open = true; $('#photo-role').value = 'actual'; }
      if (context.reason === 'missing_palette') $('#detail-management').open = true;
    }
    const reload = async () => {
      const version = ++reloadVersion, fresh = await api('GET', `/api/items/${id}`);
      if (!main.isConnected || version !== reloadVersion) return;
      item = fresh; draw();
    };
    main.addEventListener('click', async e => {
      const t = e.target.closest('button');
      if (!t || busy || !main.isConnected) return;
      if (t.dataset.photoSelect) { selectedPhoto = Number(t.dataset.photoSelect); draw(); $(`[data-photo-select="${selectedPhoto}"]`)?.focus({ preventScroll: true }); return; }
      if (t.id === 'detail-manage' || t.id === 'detail-add-photo') {
        const management = $('#detail-management'); management.open = true;
        management.scrollIntoView({ block: 'start', behavior: 'smooth' }); management.querySelector('summary').focus({ preventScroll: true }); return;
      }
      if (t.id === 'use-in-look') { const related = $('#related-looks'); related.scrollIntoView({ block: 'start', behavior: 'smooth' }); related.focus({ preventScroll: true }); return; }
      if (t.dataset.tagToggle) {
        // 就地改标签：按下先变色，保存排成一队挨个发，连点几个也不会丢、不会撞版本号
        const tagId = Number(t.dataset.tagToggle), dimension = t.closest('[data-tag-dimension]').dataset.tagDimension;
        const value = t.textContent.trim(), single = TAG_SINGLE.has(dimension);
        const turningOn = t.getAttribute('aria-pressed') !== 'true';
        if (single && turningOn) t.closest('[data-tag-dimension]').querySelectorAll('[data-tag-toggle]').forEach(b => b.setAttribute('aria-pressed', 'false'));
        t.setAttribute('aria-pressed', String(turningOn));
        savingTags = savingTags.then(async () => {
          const on = item.tags.some(x => x.id === tagId);
          const sameDimension = new Set(state.meta.tags.find(d => d.key === dimension).values.map(v => v.id));
          const ids = item.tags.map(x => x.id).filter(x => x !== tagId && !(!on && single && sameDimension.has(x)));
          if (!on) ids.push(tagId);
          item = await api('PATCH', `/api/items/${id}`, { tag_ids: ids, version: item.version });
          if (!main.isConnected) return;
          const now = new Set(item.tags.map(x => x.id));
          main.querySelectorAll('[data-tag-toggle]').forEach(b => b.setAttribute('aria-pressed', String(now.has(Number(b.dataset.tagToggle)))));
          const summary=main.querySelector('.selected-tag-summary'); if(summary) summary.innerHTML=item.tags.filter(t=>TAG_PRIMARY.includes(t.dimension)).map(t=>`<span class="tag">${esc(L.meta(t.value))}</span>`).join('') || L.t('还没有标签');
          toast(on ? L.msg`已取消「${value}」` : single ? L.msg`已改成「${value}」` : L.msg`已加上「${value}」`);
        }).catch(err => { if (main.isConnected) toast(err.message, 6000); });
        return;
      }
      busy = true;
      try {
      if (t.id === 'archive' || t.id === 'unarchive') { await api('POST', `/api/items/${id}/${t.id}`); await reload(); toast(t.id === 'archive' ? L.t('已归档。') : L.t('已恢复。')); }
      if (t.id === 'loc-edit') { $('#loc-form').hidden = false; }
      if (t.id === 'loc-accept' || t.id === 'loc-reject') {
        const url = t.id === 'loc-accept' ? `/api/items/${id}/place` : `/api/items/${id}/reject-suggestion`;
        await api('POST', url, { location_id: item.location.suggested.id });
        await reload();
        toast(t.id === 'loc-accept' ? L.t('放好了。') : L.t('知道了，以后不往那儿推荐。'));
      }
      if (t.id === 'loc-cancel') { $('#loc-form').hidden = true; }
      if (t.id === 'pur-add' || t.dataset.purEdit) {
        const f = $('#pur-form'); const r = t.dataset.purEdit ? (item.purchases || []).find(x => x.id === Number(t.dataset.purEdit)) : null;
        f.dataset.pid = r ? r.id : ''; f.dataset.version = r ? r.version : '';
        f.elements.amount.value = r && r.amount !== null ? r.amount : ''; f.elements.currency.value = (r && r.currency) || state.meta.default_currency;
        f.elements.quantity.value = r ? r.quantity : 1; f.elements.purchased_on.value = (r && r.purchased_on) || ''; f.elements.platform.value = r ? r.platform : ''; f.elements.order_number.value = r ? r.order_number : '';
        f.elements.price_source.value = r ? r.price_source : 'user'; f.elements.product_url.value = r ? r.product_url : ''; f.elements.allocation_note.value = r ? r.allocation_note : ''; f.elements.reason.value = '';
        f.hidden = false; f.scrollIntoView({ block: 'nearest' });
      }
      if (t.dataset.purDel && confirm(L.t('删除这条购入记录？内容会留在修改历史里。'))) { try { await api('DELETE', `/api/items/${id}/purchases/${t.dataset.purDel}`); await reload(); toast(L.t('已删除这条购入记录。')); } catch (err) { toast(err.message, 6000); } }
      if (t.id === 'pur-cancel') { $('#pur-form').hidden = true; }
      if (t.dataset.delPhoto && confirm(L.t('删除这张照片？删除后无法在这里恢复，请先确认已保留需要的原图。'))) { await api('DELETE', `/api/items/${id}/photos/${t.dataset.delPhoto}`); await reload(); toast(L.t('照片已删除。')); }
      try {
        if (t.id === 'wear-today') { const r = await api('POST', '/api/wear', { item_ids: [id], source: 'item', idempotency_key: crypto.randomUUID() }); await reload(); toast(r.newly_counted.length ? L.t(item.category.main_code === 'COS' ? '已记录今天用了这件。' : '已记录今天穿了这件。') : L.t('今天已经记过了，次数不重复增加。')); }
        if (t.id === 'wear-remove-today') { await api('DELETE', `/api/items/${id}/wear/${state.meta.today}`); await reload(); toast(L.t('已撤销这件单品今天的记录；同一次整套记录里的其他单品不受影响。')); }
        if (t.id === 'baseline-revoke') { await api('DELETE', `/api/items/${id}/wear-baseline`); await reload(); toast(L.t('已撤销历史次数，按建档后的记录计算。')); }
        if (t.id === 'baseline-confirm' && pendingBaseline) { await api('PUT', `/api/items/${id}/wear-baseline`, { ...pendingBaseline, confirm_overlap: true }); pendingBaseline = null; await reload(); toast(L.t('历史次数已保存。')); }
      } catch (err) { toast(err.message, 6000); }
      if (t.id === 'photo-upload') {
        const files = [...$('#photo-file').files]; if (!files.length) return toast(L.t('先选择图片文件。'));
        const role = $('#photo-role').value;
        try { for (const f of files) await api('POST', `/api/items/${id}/photos?role=${role}`, f); await reload(); toast(L.msg`已上传 ${files.length} 张。`); } catch (err) { toast(err.message, 6000); }
      }
      } catch (err) { if (main.isConnected) toast(err.message, 6000); }
      finally { busy = false; }
    });
    main.addEventListener('submit', async e => {
      e.preventDefault(); const form = e.target; const fd = new FormData(form);
      if (busy || !main.isConnected) return;
      busy = true;
      try {
        if (form.id === 'loc-form') {
          await api('PUT', `/api/items/${id}/location`, { field: 'current', location_id: fd.get('location_id') ? Number(fd.get('location_id')) : null, note: fd.get('note'), version: item.location.version });
          await W.loadLocations(); await reload(); toast(L.t('位置已更新。'));
        } else if (form.id === 'storage-profile-form' && STORAGE_CATEGORIES.has(item.category.main_code)) {
          const profile = { length: fd.get('length'), thickness: fd.get('thickness'), source: fd.get('source') };
          for (const [key, label] of STORAGE_DIMENSIONS) {
            const value = String(fd.get(key) || '').trim();
            profile[key] = value === '' ? null : Number(value);
            if (value !== '' && (!Number.isFinite(profile[key]) || profile[key] <= 0)) throw new Error(L.msg`${label}请填大于 0 的厘米数，或留空。`);
          }
          await savingTags;
          if (!main.isConnected) return;
          item = await api('PATCH', `/api/items/${id}`, { storage_profile: profile, version: item.version });
          draw();
          toast(L.t('收纳参数已保存。'));
        } else if (form.id === 'pur-form') {
          const body = { amount: fd.get('amount').trim(), currency: fd.get('currency'), quantity: Number(fd.get('quantity')) || 1, purchased_on: fd.get('purchased_on'), platform: fd.get('platform'), order_number: fd.get('order_number'), price_source: fd.get('price_source'), allocation_note: fd.get('allocation_note'), product_url: fd.get('product_url').trim(), reason: fd.get('reason') || '' };
          if (form.dataset.pid) { body.version = Number(form.dataset.version); await api('PUT', `/api/items/${id}/purchases/${form.dataset.pid}`, body); }
          else await api('POST', `/api/items/${id}/purchases`, body);
          await reload(); toast(L.t('购入记录已保存。'));
        } else if (form.id === 'baseline-form') {
          const body = { count: Number(fd.get('count')), as_of: fd.get('as_of'), precision: fd.get('precision'), note: fd.get('note'), source: '', confirm_overlap: false };
          try { await api('PUT', `/api/items/${id}/wear-baseline`, body); await reload(); toast(L.t('历史次数已保存。')); }
          catch (err) {
            if (main.isConnected && err.status === 409 && err.data.overlapping_dates) {
              pendingBaseline = body;
              $('#baseline-error').innerHTML = L.html`${esc(err.message)}<br>被覆盖的日期：${err.data.overlapping_dates.join('、')} <button type="button" id="baseline-confirm">确认覆盖并保存</button>`;
            } else throw err;
          }
        }
      } catch (err) { const target = $(form.id === 'loc-form' ? '#loc-error' : form.id === 'storage-profile-form' ? '#storage-profile-error' : form.id === 'pur-form' ? '#pur-error' : '#baseline-error'); if (main.isConnected && target) target.textContent = err.message; }
      finally { busy = false; }
    });
  };
})();
