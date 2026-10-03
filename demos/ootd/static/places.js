// 收纳位置：位置树的增改停用，以及每个位置里现在放着什么。
(() => {
  const { $, esc, api, toast, EMOJI, state, views } = W;

  let focusCompartment = false;
  const sizeText = l => {
    const parts = [[L.t('宽'), l.width_cm], [L.t('高'), l.height_cm], [L.t('深'), l.depth_cm]].filter(([, v]) => v);
    return parts.length ? parts.map(([name, v]) => `${name}${+v}`).join(' × ') + 'cm' : '';
  };

  function tree(selected) {
    const roots = state.locations.filter(l => !l.parent_id);
    const chosen = state.locations.find(l => String(l.id) === String(selected));
    const root = roots.find(l => l.id === (chosen?.parent_id || chosen?.id)) || roots[0];
    if (!root) return L.t('<div class="empty">还没有位置。新增一个柜子开始整理。</div>');
    const link = l => L.html`<a class="slot-link ${String(l.id) === String(selected) ? 'active' : ''}" href="#/places/${l.id}" aria-label="${esc(l.user_code || l.name)}" ${String(l.id) === String(selected) ? 'aria-current="true"' : ''}><strong>${esc(/[内外]$/.exec(l.user_code)?.[0] || l.name)}</strong><span>${l.current_count} 已放${l.suggested_count ? L.msg` · ${l.suggested_count} 待放` : ''}</span></a>`;
    const children = state.locations.filter(l => l.parent_id === root.id && l.enabled);
    const groups = new Map();
    children.forEach(l => { const key = l.user_code.replace(/[内外]$/, '') || l.name; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(l); });
    const rows = new Map();
    groups.forEach((cells, code) => { const key = /^[AB][123]/.exec(code)?.[0] || L.t('其他'); if (!rows.has(key)) rows.set(key, []); rows.get(key).push([code, cells]); });
    const labels = {A1:L.t('上层 · 四格叠放'), A2:L.t('中层 · 日常取用'), A3:L.t('下层 · 下装与睡衣'), B1:L.t('顶层 · 换季收纳'), B2:L.t('挂杆 · 易皱衣物'), B3:L.t('底部 · 少量叠放')};
    return L.html`<nav class="cabinet-tabs" aria-label="选择柜子">${roots.map(r => `<a href="#/places/${r.id}" class="${r.id === root.id ? 'active' : ''}">${esc(r.name)}</a>`).join('')}</nav><div class="cabinet-map">${children.length ? [...rows].map(([row, cells]) => `<section class="cabinet-shelf"><h3>${esc(labels[row] || row)}</h3><div class="cabinet-cells ${row === 'A3' ? 'shared-shelf' : ''}" style="--columns:${row === 'B3' ? 3 : cells.length}">${row === 'B3' ? L.t('<div class="reserved-cell">非本人区域</div>') : ''}${cells.map(([code, ls]) => `<div class="cabinet-cell"><div class="cell-code">${esc(code)}</div>${ls.sort((a,b) => a.user_code.localeCompare(b.user_code,'zh')).map(link).join('')}</div>`).join('')}</div></section>`).join('') : link(root)}</div><p class="small">内＝靠里，外＝靠门。数字是单品记录数，不代表剩余容量。</p><details class="location-management"><summary>管理位置与尺寸</summary><div class="actions"><button type="button" id="add-root">＋ 柜子／区域</button><button type="button" data-add="${root.id}">＋ ${esc(root.name)}下级</button></div>${state.locations.filter(l => l.id === root.id || l.parent_id === root.id).map(l => L.html`<div class="management-row"><span>${esc(l.user_code || l.name)}${l.enabled ? '' : L.t('（已停用）')}</span><button type="button" data-rename="${l.id}">编辑</button>${l.current_count + l.suggested_count ? '' : L.html`<button type="button" class="danger" data-delete="${l.id}">删除</button>`}</div>`).join('')}</details>`;
  }

  function inlineForm(kind, l) {
    const parentName = kind === 'add' ? (l ? l.path : L.t('（顶层）')) : l.path;
    return L.html`<form id="loc-inline" class="panel" data-kind="${kind}" data-id="${l ? l.id : ''}"><h3>${kind === 'add' ? L.t('新增位置') : L.t('修改位置')}</h3><div class="small">${kind === 'add' ? L.t('上级：') : ''}${esc(parentName)}</div>
      <div class="fields" style="margin-top:8px"><label class="field"><span>名称 *</span><input name="name" required maxlength="60" value="${kind === 'rename' ? esc(l.name) : ''}" placeholder="例如：左侧挂区、第二抽屉"></label>
        <label class="field"><span>编号（可选，你自己的柜位编号）</span><input name="user_code" maxlength="20" value="${kind === 'rename' && l ? esc(l.user_code) : ''}" placeholder="例如：A-2"></label>
        ${kind === 'rename' ? L.html`<label class="field"><span>状态</span><select name="enabled"><option value="1" ${l.enabled ? 'selected' : ''}>在用</option><option value="0" ${l.enabled ? '' : 'selected'}>停用（不再出现在选项里）</option></select></label>` : ''}
        <label class="field"><span>宽 cm</span><input name="width_cm" inputmode="decimal" value="${kind === 'rename' && l.width_cm ? +l.width_cm : ''}" placeholder="量过再填"></label>
        <label class="field"><span>高 cm</span><input name="height_cm" inputmode="decimal" value="${kind === 'rename' && l.height_cm ? +l.height_cm : ''}"></label>
        <label class="field"><span>深 cm</span><input name="depth_cm" inputmode="decimal" value="${kind === 'rename' && l.depth_cm ? +l.depth_cm : ''}"></label>
        <label class="field" style="grid-column:1/-1"><span>固定用途（换季只改这里，地址不动）</span><input name="usage_note" maxlength="120" value="${kind === 'rename' ? esc(l.usage_note || '') : ''}" placeholder="例如：固定放下装"></label></div>
      <div class="actions" style="margin-top:10px"><button type="submit" class="primary">保存</button><button type="button" id="inline-cancel">取消</button></div><div class="error" id="inline-error"></div></form>`;
  }

  const placementGuide = {
    A11:L.t('薄针织。外侧放近期单穿的，内侧放轮换款；一叠先试3–4件。'),
    A12:L.t('开衫。外侧放经常带出门的，内侧放备用款。'),
    A13:L.t('厚针织。每叠先试2–3件，未到穿着季节的移到B1。'),
    A14:L.t('卫衣。外侧常穿，内侧备用；不为装满而压紧。'),
    A21:L.t('裙子单独成区：外侧优先当季、常穿款，内侧轮换；长裙与短裙分叠。'),
    A22:L.t('中性风出门上装。外侧先选6–8件基础T恤、简单打底或运动罩衫，内侧轮换。中性指风格，不是黑白灰；露肩、钩花款优先考虑A23。'),
    A23:L.t('甜美与设计感上装。外侧常穿，内侧轮换；立体装饰、易皱款优先B22挂放。'),
    A31:L.t('裤子区：外侧沿用你已放好的长裤，内侧放同类轮换款；短裤另放A32内。'),
    A32:L.t('外侧固定睡衣，给未入库旧T恤至少留半格；内侧放备用下装。'),
    B11:L.t('非当季厚针织、卫衣。深40cm由内外共享，两叠放不下就只用一排，不要叠满50cm。'),
    B12:L.t('非当季可折的裙装与薄下装。必须挂的款式保留在衣杆。'),
    B13:L.t('非当季薄上装、度假衣。留出换季余量，不按月份自动收起仍在穿的衣服。'),
    B21:L.t('固定放连体：连衣裙、连体裤。按长短从左到右排列，先检查120cm垂挂高度。放不下不跨到其他段。'),
    B22:L.t('固定放下装：裙子、裤子、裙裤。先按长短分，再把薄厚相近的挂在一起。'),
    B23:L.t('固定放上装，包括衬衫和外套。短上装与长外套分组，薄的与厚的分开；放不下保留待安排。'),
    B32:L.t('少量耐折的备用T恤、背心。上方挂衣下垂时减少堆叠高度。'),
    B33:L.t('少量耐折的备用下装。不占左侧非本人区域。'),
    U:L.t('内衣、内裤、袜子独立收纳，不占两柜空间。')
  };

  const storageGroup = i => {
    const p = i.storage_profile || {};
    const length = {short:L.t('短款'),regular:L.t('常规'),midi:L.t('中长'),long:L.t('长款')}[p.length];
    const thickness = {thin:L.t('薄'),medium:L.t('适中'),thick:L.t('厚')}[p.thickness];
    const sleeve = (i.tags || []).find(t => t.dimension === 'sleeve_length' && t.value !== '不适用')?.value;
    return [L.meta(i.category.label || i.category.sub_label), length, L.meta(sleeve), thickness].filter(Boolean).join(' · ');
  };
  const itemCard = (i, actions) => {
    const photo = (i.photos || []).find(p => p.role === 'product') || (i.photos || [])[0];
    return `<div class="place-item"><a href="#/items/${i.id}" title="${esc(i.display_name || i.name)}">
      <span class="place-photo">${photo ? `<img src="${esc(photo.url)}" alt="" loading="lazy" decoding="async">` : (EMOJI[i.category.main_code] || '')}</span>
      <span class="place-name">${esc(i.display_name || i.name)}</span>
      <span class="place-code">${esc(i.code)}</span><span class="small">${esc(storageGroup(i))}${i.storage_profile?.source === 'estimated' ? L.t(' · 估算') : ''}</span></a>${actions || ''}</div>`;
  };

  async function itemsPanel(selected) {
    if (!selected) return L.t('<div class="muted">点左边一个位置，看看里面放着什么、还能放什么。</div>');
    const unplaced = selected === 'unplaced';
    const l = state.locations.find(x => String(x.id) === String(selected));
    if (l && state.locations.some(x => x.parent_id === l.id)) return L.t('<div class="place-welcome"><span>开始整理</span><h3>选一个格子，从这一小叠开始。</h3><p>点内侧或外侧，查看主图和待放清单。实际放进去后，再点「已放入」。</p></div>');
    const here = (await api('GET', unplaced ? '/api/items?unplaced=1' : `/api/items?location_id=${selected}`)).items;
    const suggested = unplaced ? [] : (await api('GET', `/api/items?suggested_for=${selected}`)).items;
    suggested.sort((a,b) => storageGroup(a).localeCompare(storageGroup(b),'zh') || a.id-b.id);
    const size = l ? sizeText(l) : '';
    const guide = l && placementGuide[l.user_code.replace(/[内外]$/, '')];
    const needsHang = i => l && !/^B2[123]$/.test(l.user_code) && (i.tags || []).some(t => t.dimension === 'storage' && t.value === '一定要挂');
    return L.html`<button type="button" class="back-to-map" id="back-to-map">↑ 返回分区图</button><div class="place-detail-title"><span>${unplaced ? L.t('待整理') : esc(l?.user_code || '')}</span><h3>${unplaced ? L.t('还没记位置的单品') : esc(l?.name || '')}</h3></div>
      <div class="muted">${unplaced ? L.t('未记录') : L.t('已放入')} ${here.length} 款${size ? ' · ' + size : ''}</div>${l && /[内外]$/.test(l.user_code) ? L.t('<p class="small">深度为整格尺寸，内外共享。</p>') : ''}
      ${l && l.usage_note ? `<div class="small loc-usage">${esc(l.usage_note)}</div>` : ''}
      ${guide ? L.html`<details class="placement-guide"><summary>这一格怎么放</summary><p>${esc(guide)}</p><p class="small">建议试装量，不是实测容量。确认放好后再点「已放入」。</p></details>` : ''}<div class="place-grid">${here.map(i => itemCard(i, unplaced ? '' : L.html`<button type="button" class="place-out" data-take-out="${i.id}">拿出来</button>`)).join('') || L.t('<div class="empty">这里还没放东西。</div>')}</div>
      ${suggested.length ? L.html`<div class="heading" style="margin:22px 0 0"><div><h3>建议放进来</h3>
        <p class="small">这是待确认清单，尚未占用这个格子。实际放好再确认；不合适可移除建议。</p></div></div>
        <div class="place-grid">${suggested.map(i => itemCard(i, L.html`${needsHang(i) ? L.t('<p class="storage-caution">标记为必须挂放，先核对建议</p>') : ''}<div class="place-actions"><button type="button" class="primary" data-place="${i.id}">已放入</button><button type="button" data-reject="${i.id}">不放这里</button></div>`)).join('')}</div>` : ''}`;
  }

  views.places = async (main, selected) => {
    main.dataset.view = 'places';
    await W.loadLocations();
    main.innerHTML = L.html`<div class="heading"><div><h2>收纳位置</h2><div class="muted">一格一格整理，让每件衣服都找得到。</div></div>
        <div class="actions"><a href="#/places/unplaced"><button type="button">没记位置的单品</button></a><button type="button" id="go-batch" class="primary">批量设置位置</button></div></div>
      <div class="storage-layout"><div class="storage-navigation"><div class="panel" id="tree">${tree(selected)}</div><div id="inline"></div></div><div class="panel storage-detail" id="items-panel">${await itemsPanel(selected)}</div></div>`;
    main.dataset.focusCompartment = focusCompartment && matchMedia('(max-width:850px)').matches ? 'true' : 'false';
    focusCompartment = false;
    main.addEventListener('click', async e => {
      if (e.target.closest('.slot-link')) focusCompartment = true;
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'back-to-map') $('#tree').scrollIntoView({block:'start'});
      if (b.id === 'go-batch') { state.pendingBatch = true; state.pendingBatchTarget=state.locations.some(l=>String(l.id)===selected && !state.locations.some(x=>x.parent_id===l.id)) ? selected : ''; location.hash = '#/items'; }
      if (b.id === 'add-root') $('#inline').innerHTML = inlineForm('add', null);
      if (b.dataset.add) $('#inline').innerHTML = inlineForm('add', state.locations.find(l => String(l.id) === b.dataset.add));
      if (b.dataset.rename) $('#inline').innerHTML = inlineForm('rename', state.locations.find(l => String(l.id) === b.dataset.rename));
      if (b.id === 'inline-cancel') $('#inline').innerHTML = '';
      const act = b.dataset.place ? ['place', b.dataset.place, `/api/items/${b.dataset.place}/place`, L.t('放好了。')]
        : b.dataset.reject ? ['reject', b.dataset.reject, `/api/items/${b.dataset.reject}/reject-suggestion`, L.t('知道了，以后不往这儿推荐。')]
        : b.dataset.takeOut ? ['out', b.dataset.takeOut, `/api/items/${b.dataset.takeOut}/location`, L.t('已拿出来。')] : null;
      if (act) {
        const [kind, , url, done] = act;
        b.disabled = true;
        const call = kind === 'out'
          ? api('PUT', url, { field: 'current', location_id: null, note: '' })
          : api('POST', url, { location_id: Number(selected) });
        call.then(async () => { toast(done); await W.loadLocations(); $('#tree').innerHTML = tree(selected); $('#items-panel').innerHTML = await itemsPanel(selected); }).catch(err => { b.disabled = false; toast(err.message, 6000); });
        return;
      }
      if (b.dataset.delete) {
        api('DELETE', `/api/locations/${b.dataset.delete}`).then(() => { toast(L.t('位置已删除。')); W.render(); }).catch(err => toast(err.message, 6000));
      }
    });
    main.addEventListener('submit', async e => {
      e.preventDefault(); const form = e.target; if (form.id !== 'loc-inline') return;
      const fd = new FormData(form);
      try {
        const box = { width_cm: fd.get('width_cm').trim(), height_cm: fd.get('height_cm').trim(), depth_cm: fd.get('depth_cm').trim(), usage_note: fd.get('usage_note') };
        if (form.dataset.kind === 'add') await api('POST', '/api/locations', { parent_id: form.dataset.id ? Number(form.dataset.id) : null, name: fd.get('name'), user_code: fd.get('user_code'), ...box });
        else await api('PATCH', `/api/locations/${form.dataset.id}`, { name: fd.get('name'), user_code: fd.get('user_code'), enabled: fd.get('enabled') === '1', ...box });
        toast(L.t('已保存。')); W.render();
      } catch (err) { $('#inline-error').textContent = err.message; }
    });
  };
})();
