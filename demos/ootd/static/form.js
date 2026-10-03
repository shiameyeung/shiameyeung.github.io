// 录入 / 编辑单品档案。新建时顺带填位置、购入信息与照片；编辑时这些在详情页改。
(() => {
  const { $, $$, esc, api, toast, locationOptions, state, views } = W;
  const OPEN_DIMS = new Set(['style', 'season', 'apparel_palette', 'makeup_palette', 'occasion', 'layer_role', 'finish', 'undertone', 'care']);
  const applies = (def, mainCode) => !def.applies_to || def.applies_to.includes(mainCode);
  const FIT = { runs_large: L.t('偏大'), fits: L.t('合身'), runs_small: L.t('偏小') };
  const REPURCHASE = { yes: L.t('会'), maybe: L.t('看情况'), no: L.t('不会（踩雷）') };
  const DISPOSITION = { in_use: L.t('在用'), idle: L.t('闲置'), for_sale: L.t('想出手') };
  const CURRENCIES = ['CNY', 'JPY', 'USD', 'EUR', 'KRW'];

  function subOptions(mainCode, selectedId) {
    const main = state.meta.categories.find(c => c.code === mainCode);
    const option = c => `<option value="${c.id}" ${c.id === selectedId || (!selectedId && c.code === 'UNCLASSIFIED') ? 'selected' : ''}>${esc(L.meta(c.label))}</option>`;
    if (!main) return '';
    // 筛选那边的细类也按用途分组，录入时保持同一套分法
    return mainCode === 'COS'
      ? W.makeupPalettes.groupChildren(main.children).map(g => `<optgroup label="${esc(g.label)}">${g.items.map(option).join('')}</optgroup>`).join('')
      : main.children.map(option).join('');
  }

  function markup(item) {
    const isNew = !item; const mainCode = item ? item.category.main_code : (state.collectionKind === 'cosmetics' ? 'COS' : 'TOP');
    const chosen = new Set(item ? item.tags.map(t => t.id) : []);
    return L.html`<form id="item-form" class="panel"><div class="heading"><h2>${isNew ? L.t('录入单品') : L.t('编辑单品档案')}</h2><a href="${isNew ? '#/items' : '#/items/' + item.id}"><button type="button">取消</button></a></div>
      <div class="fields">
        <label class="field"><span>名称 *</span><input name="name" required maxlength="120" value="${esc(item ? item.name : '')}" placeholder="例如：奶油色针织开衫"></label>
        <label class="field"><span>显示名称（可选，默认用名称）</span><input name="display_name" maxlength="120" value="${esc(item ? item.display_name || '' : '')}" placeholder="彩妆建议：品牌 商品 类型 色号 色名"></label>
        <label class="field"><span>数量</span><input type="number" name="quantity" min="1" value="${item ? item.quantity : 1}" style="width:90px"></label>
        <label class="field"><span>主类 *</span><select name="main">${state.meta.categories.map(c => `<option value="${c.code}" ${c.code === mainCode ? 'selected' : ''}>${esc(L.meta(c.label))}${c.optional ? '' : ''}</option>`).join('')}</select></label>
        <label class="field"><span>细类 *（不确定就留「待细分」）</span><select name="category_id">${subOptions(mainCode, item ? item.category.id : null)}</select></label>
        <label class="field"><span>品牌</span><input name="brand" maxlength="200" value="${esc(item ? item.brand : '')}"></label>
        <label class="field"><span id="size-label">${mainCode === 'COS' ? L.t('容量／克重') : mainCode === 'SHO' ? L.t('尺码（鞋）') : L.t('尺码')}</span><input name="size" maxlength="40" value="${esc(item ? item.size : '')}"></label>
        <label class="field"><span>颜色／色号</span><input name="color_name" maxlength="80" value="${esc(item ? item.color_name : '')}" placeholder="例如：奶油色、#03 自然棕"></label>
        <label class="field"><span>色值（可选）</span><div class="actions"><input type="color" name="color_hex_pick" value="${item && item.color_hex ? item.color_hex : '#cccccc'}" style="width:52px;padding:2px"><label class="small"><input type="checkbox" name="use_hex" ${item && item.color_hex ? 'checked' : ''}> 记录这个色值</label></div></label>
        <label class="field"><span>计量</span><select name="unit"><option value="piece" ${!item || item.unit === 'piece' ? 'selected' : ''}>一件</option><option value="pair" ${item && item.unit === 'pair' ? 'selected' : ''}>一对（袜子、耳环）</option></select></label>
        <label class="field"><span>应有 / 现有件数</span><div class="actions"><input type="number" name="expected_piece_count" min="1" value="${item ? item.expected_piece_count : 1}" style="width:80px"><span>/</span><input type="number" name="present_piece_count" min="0" value="${item ? item.present_piece_count : 1}" style="width:80px"></div></label>
        <label class="field" style="grid-column:1/-1"><span>备注</span><textarea name="notes" rows="2" maxlength="2000">${esc(item ? item.notes : '')}</textarea></label>
      </div>
      <h3 style="margin-top:16px">使用感受与状态</h3>
      <div class="fields" id="extra-fields">
        <label class="field" data-field="fit"><span>合身度</span><select name="fit"><option value="">未评价</option>${Object.entries(FIT).map(([k, l]) => `<option value="${k}" ${item && item.fit === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field" data-field="measurements"><span>实测尺寸</span><input name="measurements" maxlength="300" value="${esc(item ? item.measurements : '')}" placeholder="例如：胸围 96 / 衣长 62（cm）"></label>
        <label class="field" data-field="liking"><span>喜欢程度</span><select name="liking"><option value="">未评价</option>${[1, 2, 3, 4, 5].map(n => L.html`<option value="${n}" ${item && item.liking === n ? 'selected' : ''}>${n} 分</option>`).join('')}</select></label>
        <label class="field" data-field="repurchase"><span>还会回购吗</span><select name="repurchase"><option value="">未评价</option>${Object.entries(REPURCHASE).map(([k, l]) => `<option value="${k}" ${item && item.repurchase === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field" data-field="review" style="grid-column:1/-1"><span>一句话评价</span><input name="review" maxlength="500" value="${esc(item ? item.review : '')}" placeholder="穿着感受、色号准不准、哪里不满意"></label>
        <label class="field" data-field="disposition"><span>状态</span><select name="disposition">${Object.entries(DISPOSITION).map(([k, l]) => `<option value="${k}" ${(item ? item.disposition : 'in_use') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field" data-field="asking_price"><span>出手价（想出手时填）</span><div class="actions"><input name="asking_price" inputmode="decimal" value="${esc(item?.asking_price ?? '')}" style="width:120px"><select name="asking_currency" style="width:90px">${CURRENCIES.map(c => `<option ${c === (item && item.asking_currency || state.meta.default_currency) ? 'selected' : ''}>${c}</option>`).join('')}</select></div></label>
      </div>
      <h3 style="margin-top:16px">标签（按需多选）</h3>
      <div id="tag-dims">${state.meta.tags.map(d => `<details data-dim="${d.key}" ${OPEN_DIMS.has(d.key) ? 'open' : ''} style="margin-top:8px"><summary>${esc(L.meta(d.label))}</summary><div class="tagpick" style="margin-top:6px">${d.values.map(v => `<label class="${chosen.has(v.id) ? 'on' : ''}"><input type="checkbox" name="tag_ids" value="${v.id}" ${chosen.has(v.id) ? 'checked' : ''}>${esc(L.meta(v.value))}</label>`).join('')}</div></details>`).join('')}</div>
      ${isNew ? L.html`
      <h3 style="margin-top:16px">位置（可以以后再填）</h3>
      <div class="fields"><label class="field"><span>常住位置（平时收在哪）</span><select name="home_id">${locationOptions('', L.t('未记录'))}</select></label>
        <label class="field"><span>当前位置（现在放在哪）</span><select name="current_id">${locationOptions('', L.t('未记录'))}</select></label></div>
      <h3 style="margin-top:16px">购入信息（可以以后再填）</h3>
      <div class="fields"><label class="field"><span>实付单件金额</span><input name="amount" inputmode="decimal" placeholder="扣掉优惠、退款后这一件实际花的钱"></label>
        <label class="field"><span>币种</span><select name="currency">${CURRENCIES.map(c => `<option ${c === state.meta.default_currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="field"><span>购入日期</span><input type="date" name="purchased_on" max="${state.meta.today}"></label>
        <label class="field"><span>平台／店铺</span><input name="platform" maxlength="120"></label>
        <label class="field"><span>订单号</span><input name="order_number" maxlength="120"></label></div>
      <h3 style="margin-top:16px">照片</h3>
      <div class="actions"><select name="photo_role"><option value="product">商品图</option><option value="actual">实物图</option><option value="detail">细节</option><option value="care_label">洗标</option><option value="worn">上身图</option></select><input type="file" name="photos" accept="image/*" multiple style="width:auto"></div>
      <div class="note">保存后会先建档并分配编号，再逐张上传。</div>` : ''}
      <div class="error" id="form-error"></div>
      <div class="actions" style="margin-top:12px"><button type="submit" class="primary">${isNew ? L.t('保存并建档') : L.t('保存修改')}</button></div></form>`;
  }

  views.itemForm = async (main, id) => {
    const item = id ? await api('GET', `/api/items/${id}`) : null;
    if (!main.isConnected) return;
    main.dataset.view = 'form';
    main.innerHTML = markup(item);
    const form = main.querySelector('#item-form');
    let showAllPalettes = false;
    const paletteDim = form.querySelector('[data-dim="makeup_palette"]');
    const paletteNote = document.createElement('div');
    paletteNote.className = 'form-palette-note';
    paletteDim.querySelector('summary').after(paletteNote);
    const applyPaletteUse = () => {
      const category = state.meta.categories.find(c => c.code === 'COS')?.children.find(c => String(c.id) === form.elements.category_id.value);
      const group = W.makeupPalettes.forCategory(category?.code);
      const definition = state.meta.tags.find(d => d.key === 'makeup_palette');
      paletteDim.querySelectorAll('input[name="tag_ids"]').forEach(input => {
        const value = definition.values.find(v => String(v.id) === input.value)?.value;
        input.closest('label').hidden = !input.checked && !W.makeupPalettes.visible(value,group,showAllPalettes);
      });
      paletteNote.innerHTML = group === 'all' ? L.t('<span class="small">综合盘或多用途单品，可以选择多个妆色。</span>') : L.html`<span class="small">优先显示${W.makeupPalettes.groups[group].label}常用妆色，已选妆色始终保留。</span> <button type="button" id="form-all-palettes" aria-expanded="${showAllPalettes}">${showAllPalettes ? L.t('只看常用妆色') : L.t('展开全部妆色')}</button>`;
    };
    paletteNote.addEventListener('click', e => { if (e.target.closest('#form-all-palettes')) { showAllPalettes = !showAllPalettes; applyPaletteUse(); } });
    // 只显示当前主类适用的标签维度和字段（彩妆没有洗护方式，合身度只给衣服和鞋）
    const applyMain = () => {
      const mainCode = form.elements.main.value;
      const defs = state.meta.item_fields || {};
      state.meta.tags.forEach(d => { const el = form.querySelector(`[data-dim="${d.key}"]`); if (el) el.hidden = !applies(d, mainCode); });
      form.querySelectorAll('#extra-fields [data-field]').forEach(el => { const def = defs[el.dataset.field]; el.hidden = def ? !applies(def, mainCode) : false; });
      const sizeLabel = form.querySelector('#size-label'); if (sizeLabel) sizeLabel.textContent = mainCode === 'COS' ? L.t('容量／克重') : mainCode === 'SHO' ? L.t('尺码（鞋）') : L.t('尺码');
      applyPaletteUse();
    };
    applyMain();
    form.elements.main.addEventListener('change', () => { form.elements.category_id.innerHTML = subOptions(form.elements.main.value, null); applyMain(); });
    form.elements.category_id.addEventListener('change', () => { showAllPalettes = false; applyPaletteUse(); });
    form.addEventListener('change', e => { if (e.target.name === 'tag_ids') e.target.closest('label').classList.toggle('on', e.target.checked); if (e.target.name === 'color_hex_pick') form.elements.use_hex.checked = true; });
    form.elements.name.focus();
    form.addEventListener('submit', async e => {
      e.preventDefault(); if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const body = {
        name: fd.get('name').trim(), display_name: fd.get('display_name').trim(), quantity: Number(fd.get('quantity')) || 1, category_id: Number(fd.get('category_id')), brand: fd.get('brand'), size: fd.get('size'), color_name: fd.get('color_name'),
        color_hex: fd.get('use_hex') ? fd.get('color_hex_pick') : null, unit: fd.get('unit'), expected_piece_count: Number(fd.get('expected_piece_count')),
        present_piece_count: Number(fd.get('present_piece_count')), notes: fd.get('notes'), tag_ids: fd.getAll('tag_ids').map(Number),
        fit: fd.get('fit') || null, measurements: fd.get('measurements'), liking: fd.get('liking') ? Number(fd.get('liking')) : null, repurchase: fd.get('repurchase') || null,
        review: fd.get('review'), disposition: fd.get('disposition'), asking_price: fd.get('asking_price').trim(), asking_currency: fd.get('asking_currency'),
      };
      // PATCH 省略隐藏栏才能保留旧值；显式写 null/空串会把用户以前填写的内容清掉。
      form.querySelectorAll('#extra-fields [data-field][hidden]').forEach(el => {
        delete body[el.dataset.field];
        if (el.dataset.field === 'asking_price') delete body.asking_currency;
      });
      const visibleTag = id => { const dim = state.meta.tags.find(d => d.values.some(v => v.id === id)); return !dim || applies(dim, fd.get('main')); };
      // 标签接口接收完整集合：隐藏的原有标签保留，刚勾选后又切走分类的标签不新增。
      body.tag_ids = [...new Set([...fd.getAll('tag_ids').map(Number).filter(visibleTag), ...(item?.tags || []).map(t => t.id).filter(id => !visibleTag(id))])];
      try {
        if (item) {
          await api('PATCH', `/api/items/${item.id}`, { ...body, version: item.version });
          toast(L.t('档案已更新。')); if (main.isConnected) location.hash = `#/items/${item.id}`; return;
        }
        if (fd.get('home_id') || fd.get('current_id')) body.location = { home_id: fd.get('home_id') ? Number(fd.get('home_id')) : null, current_id: fd.get('current_id') ? Number(fd.get('current_id')) : null };
        if (fd.get('amount').trim() || fd.get('purchased_on') || fd.get('platform').trim() || fd.get('order_number').trim()) {
          body.purchase = { amount: fd.get('amount').trim(), currency: fd.get('currency'), purchased_on: fd.get('purchased_on'), platform: fd.get('platform'), order_number: fd.get('order_number') };
        }
        const created = await api('POST', '/api/items', body);
        const files = [...form.elements.photos.files]; let uploaded = 0;
        for (const f of files) { try { await api('POST', `/api/items/${created.id}/photos?role=${fd.get('photo_role')}`, f); uploaded++; } catch (err) { toast(L.msg`照片 ${f.name} 上传失败：${err.message}`, 6000); } }
        toast(L.msg`已建档 ${created.code}${files.length ? L.msg`，上传照片 ${uploaded}/${files.length}` : ''}。`);
        if (main.isConnected) location.hash = `#/items/${created.id}`;
      } catch (err) { form.querySelector('#form-error').textContent = err.message; }
    });
  };
})();
