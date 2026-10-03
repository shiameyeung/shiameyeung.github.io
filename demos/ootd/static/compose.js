// 固定搭配的组成按版本保存；参考单品不计入库存。
(() => {
  const { esc, api, toast, EMOJI, views } = W;
  const SRC = { official: L.t('官搭'), saved: L.t('收藏'), own: L.t('自搭'), ai_draft: L.t('AI 草稿') };

  views.compose = async (main, outfitId, seedItemId) => {
    main.dataset.view = 'compose';
    const $ = s => main.querySelector(s);
    const existing = outfitId ? await api('GET', `/api/outfits/${outfitId}`) : null;
    const seed = !existing && seedItemId ? await api('GET', `/api/items/${seedItemId}`) : null;
    if (!main.isConnected) return;
    const slots = existing ? existing.latest.slots.map(s => s.item ? { item: s.item, role: s.role, note: s.note } : { reference: s.reference, role: s.role, note: s.note }) : seed ? [{ item: seed, role: '', note: '' }] : [];
    let results = [], timer = null, searchVersion = 0, photoFile = null, photoUrl = null;
    let saved = null, submitting = false, previewAsset = existing?.assets?.[0]?.url || null;
    const cancelUrl = existing ? `#/looks/${existing.id}` : seed ? `#/items/${seed.id}` : '#/looks';
    const initialStatus = existing?.latest.annotation_status || 'draft';
    const photoOf = item => item.photos?.find(p => p.role === 'actual') || item.photos?.[0];
    const mini = item => photoOf(item) ? `<img src="${esc(photoOf(item).url)}" alt="">` : `<span>${EMOJI[item.category.main_code] || '👗'}</span>`;
    main.innerHTML = L.html`<div class="heading compose-heading"><div><p class="eyebrow">搭配工作台</p><h2>${existing ? L.t('换一版组成') : seed ? L.t('从这件开始搭') : L.t('新建搭配')}</h2><p class="muted">${existing ? L.msg`${esc(existing.name)} · 旧版本和评分都会保留` : L.t('先放进喜欢的单品，慢慢搭成一套。')}</p></div><a class="button" href="${cancelUrl}">取消</a></div>
      <form id="compose" class="compose-workspace">
        <aside class="compose-preview panel" aria-label="搭配预览">
          <div class="compose-preview-top"><h3>搭配预览</h3><span id="compose-state" class="badge"></span></div>
          <div id="compose-photo" class="compose-photo"></div>
          <div id="compose-photo-caption" class="small"></div>
          ${existing?.assets?.length > 1 ? L.html`<div class="compose-photo-strip" aria-label="浏览参考图">${existing.assets.map((a, n) => L.html`<button type="button" data-preview-asset="${n}" aria-label="预览参考图 ${n + 1}"><img src="${esc(a.url)}" alt=""></button>`).join('')}</div>` : ''}
          <div class="compose-upload"><label class="field"><span>${existing ? L.t('换一张主图') : L.t('添加搭配主图')}</span><input id="compose-photo-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><button id="compose-photo-clear" type="button" hidden>取消这张图</button></div>
          <div id="compose-summary" aria-live="polite"></div><div id="compose-selected" class="compose-selected"></div>
        </aside>
        <div class="compose-editor">
          <fieldset id="compose-fields">
            ${existing ? L.t('<div class="note">保存后会成为新版本；这版的穿着记录和评价从头开始，历史版本保留。</div>') : L.html`<section class="panel"><h3>给这套起个名字</h3><label class="field"><span>名称 *</span><input name="name" required maxlength="80" placeholder="例如：周末的奶油色"></label><details class="compose-source"><summary>来源与收藏链接</summary><div class="fields"><label class="field"><span>来源</span><select name="source">${Object.entries(SRC).map(([k, l]) => `<option value="${k}" ${k === 'own' ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="field"><span>来源链接</span><input name="source_url" maxlength="500" placeholder="官搭页面、收藏图的链接"></label><label class="field" style="grid-column:1/-1"><span>来源说明</span><input name="source_note" maxlength="500"></label></div></details></section>`}
            <section class="panel"><div class="compose-section-title"><h3>挑选单品</h3><span class="small">同一件只放一次</span></div><label class="field"><span>从衣橱和彩妆里找</span><input id="search" autocomplete="off" placeholder="搜编号、名称、颜色…"></label><div id="compose-search-status" class="small" role="status"></div><div id="results" class="compose-results"></div>
              <details class="compose-reference"><summary>还缺一件？先放一个参考</summary><p class="small">参考单品会单独列出，暂不计入你已拥有的单品。</p><div class="fields"><label class="field"><span>名称</span><input id="ref-name" maxlength="120" placeholder="例如：棕色乐福鞋"></label><label class="field"><span>说明</span><input id="ref-desc" maxlength="500"></label><label class="field"><span>链接</span><input id="ref-url" maxlength="500"></label></div><div class="actions"><button type="button" id="ref-add">加入参考单品</button></div></details>
            </section>
            <section class="panel"><h3>这套的组成</h3><div id="slots"></div></section>
            <section class="panel"><h3>留点搭配笔记</h3><label class="field"><span>版本备注</span><textarea name="notes" maxlength="1000" rows="2" placeholder="这版为什么这么配"></textarea></label><label class="field"><span>组成标注</span><select name="annotation_status"><option value="draft" ${initialStatus === 'draft' ? 'selected' : ''}>还没标完，先存草稿</option><option value="complete" ${initialStatus === 'complete' ? 'selected' : ''}>图中组成都标好了</option></select></label><p class="small">标注完成也可以有尚未拥有的参考单品。</p></section>
          </fieldset>
          <div class="compose-save panel"><div class="error" id="compose-error" role="alert"></div><div id="compose-save-note" class="small" aria-live="polite"></div><div class="actions"><button id="compose-submit" type="submit" class="primary">${existing ? L.t('保存为新版本') : L.t('保存搭配')}</button><a id="compose-saved-link" hidden>先查看已保存的搭配</a></div></div>
        </div>
      </form>`;

    const drawPreview = () => {
      const url = photoUrl || previewAsset;
      $('#compose-photo').innerHTML = url ? L.html`<img src="${esc(url)}" alt="搭配主图预览">` : `<div class="compose-collage">${slots.filter(s => s.item).slice(0, 4).map(s => `<div>${mini(s.item)}</div>`).join('') || L.html`<div class="compose-photo-empty">${W.icon('wardrobe')}<span>先选单品，或放一张搭配图</span></div>`}</div>`;
      $('#compose-photo-caption').textContent = photoUrl ? L.t('已选新主图 · 保存搭配时上传') : previewAsset ? L.t('搭配参考图') : L.t('已选单品预览 · 尚未添加搭配主图');
      $('#compose-photo-clear').hidden = !photoFile;
      const owned = slots.filter(s => s.item), missing = slots.filter(s => s.reference);
      const draft = $('[name=annotation_status]').value !== 'complete';
      $('#compose-state').textContent = draft ? L.t('组成待确认') : L.t('组成已标完');
      $('#compose-state').classList.toggle('warn', draft);
      $('#compose-summary').innerHTML = L.html`<strong>已关联 ${owned.length} 件</strong><span>${missing.length ? L.msg`参考 ${missing.length} 件 · 尚未拥有` : L.t('暂无参考缺件')}</span>${draft ? L.t('<p class="small">组成还没标完，整套是否齐全待确认。</p>') : ''}`;
      $('#compose-selected').innerHTML = slots.map(s => `<div class="compose-selected-item ${s.reference ? 'is-reference' : ''}"><span class="mini">${s.item ? mini(s.item) : '＋'}</span><span>${esc(s.item ? s.item.display_name || s.item.name : s.reference.name)}<small>${s.item ? esc(s.item.code) : L.t('尚未拥有')}</small></span></div>`).join('');
    };
    const drawSlots = () => {
      $('#slots').innerHTML = slots.map((s, n) => L.html`<div class="compose-slot ${s.reference ? 'is-reference' : ''}"><div class="compose-slot-head"><span class="mini">${s.item ? mini(s.item) : '＋'}</span><div class="compose-slot-name"><span class="small">${s.item ? L.msg`${esc(s.item.code)} · 已拥有` : L.t('参考单品 · 尚未拥有')}</span><strong>${esc(s.item ? s.item.display_name || s.item.name : s.reference.name)}</strong></div><button type="button" data-remove="${n}" aria-label="移除${esc(s.item ? s.item.display_name || s.item.name : s.reference.name)}">移除</button></div><div class="compose-slot-fields"><label class="field"><span>叠穿角色</span><input data-role="${n}" value="${esc(s.role || '')}" maxlength="40" placeholder="如：内搭、外层"></label><label class="field"><span>备注</span><input data-note="${n}" value="${esc(s.note || '')}" maxlength="200" placeholder="这件怎么穿"></label></div></div>`).join('') || L.t('<div class="compose-empty">还没放入单品。先搜一件，或加入一个参考。</div>');
      drawPreview();
    };
    const drawResults = () => {
      const chosen = new Set(slots.filter(s => s.item).map(s => s.item.id));
      const available = results.filter(i => !chosen.has(i.id));
      $('#results').innerHTML = available.slice(0, 12).map(i => `<button type="button" class="compose-result" data-add="${i.id}"><span class="mini">${mini(i)}</span><span><small>${esc(i.code)}</small>${esc(i.display_name || i.name)}</span><b aria-hidden="true">＋</b></button>`).join('');
      $('#compose-search-status').textContent = !$('#search').value.trim() ? '' : results.length ? available.length ? L.msg`找到 ${results.length} 件${available.length > 12 ? L.t('，先显示 12 件，可继续缩小范围') : ''}` : L.t('找到的单品都已加入') : L.t('没有找到，试试品牌、名称或编号。');
    };
    drawSlots();
    $('#search').addEventListener('input', () => {
      clearTimeout(timer);
      const version = ++searchVersion, q = $('#search').value.trim();
      results = []; $('#results').innerHTML = ''; $('#compose-search-status').textContent = q ? L.t('正在找…') : '';
      if (!q) return;
      timer = setTimeout(async () => {
        try {
          const response = await api('GET', '/api/items?q=' + encodeURIComponent(q));
          if (!main.isConnected || version !== searchVersion) return;
          results = response.items; drawResults();
        } catch (err) { if (main.isConnected && version === searchVersion) $('#compose-search-status').textContent = err.message; }
      }, 250);
    });
    $('#compose-photo-input').addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { e.target.value = ''; return toast(L.t('请选择 JPG、PNG、WebP 或 GIF 图片。')); }
      if (file.size > 25 * 1024 * 1024) { e.target.value = ''; return toast(L.t('图片请小于 25 MB。')); }
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoFile = file; photoUrl = URL.createObjectURL(file); drawPreview();
    });
    const cleanup = () => { clearTimeout(timer); if (photoUrl) URL.revokeObjectURL(photoUrl); window.removeEventListener('hashchange', cleanup); };
    window.addEventListener('hashchange', cleanup);
    main.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || submitting) return;
      if (b.dataset.previewAsset !== undefined) { previewAsset = existing.assets[Number(b.dataset.previewAsset)].url; drawPreview(); }
      if (saved) return;
      if (b.dataset.add) {
        const item = results.find(i => i.id === Number(b.dataset.add));
        if (!item || slots.some(s => s.item?.id === item.id)) return;
        slots.push({ item, role: '', note: '' }); drawSlots(); drawResults();
      }
      if (b.dataset.remove !== undefined) { slots.splice(Number(b.dataset.remove), 1); drawSlots(); drawResults(); }
      if (b.id === 'ref-add') {
        const name = $('#ref-name').value.trim(); if (!name) return toast(L.t('参考单品要有名称。'));
        slots.push({ reference: { name, description: $('#ref-desc').value.trim(), source_url: $('#ref-url').value.trim() }, role: '', note: '' });
        $('#ref-name').value = $('#ref-desc').value = $('#ref-url').value = ''; drawSlots();
      }
      if (b.id === 'compose-photo-clear') { if (photoUrl) URL.revokeObjectURL(photoUrl); photoFile = photoUrl = null; $('#compose-photo-input').value = ''; drawPreview(); }
    });
    main.addEventListener('input', e => {
      if (e.target.dataset.role !== undefined) slots[Number(e.target.dataset.role)].role = e.target.value;
      if (e.target.dataset.note !== undefined) slots[Number(e.target.dataset.note)].note = e.target.value;
    });
    $('[name=annotation_status]').addEventListener('change', drawPreview);
    $('#compose').addEventListener('submit', async e => {
      e.preventDefault(); if (submitting) return;
      if (!saved && !slots.length) { $('#compose-error').textContent = L.t('先加入至少一件已有单品或参考单品。'); return; }
      const fd = new FormData(e.target);
      submitting = true; $('#compose-submit').disabled = true; $('#compose-error').textContent = '';
      $('#compose-fields').disabled = true; $('#compose-photo-input').disabled = true; $('#compose-photo-clear').disabled = true;
      try {
        if (!saved) {
          const payload = { slots: slots.map(s => s.item ? { item_id: s.item.id, role: s.role, note: s.note } : { reference: s.reference, role: s.role, note: s.note }), notes: fd.get('notes'), annotation_status: fd.get('annotation_status') };
          saved = existing ? await api('POST', `/api/outfits/${existing.id}/versions`, payload) : await api('POST', '/api/outfits', { ...payload, name: fd.get('name'), source: fd.get('source'), source_url: fd.get('source_url'), source_note: fd.get('source_note') });
        }
        if (photoFile) { $('#compose-save-note').textContent = L.t('搭配已保存，正在上传主图…'); await api('POST', `/api/outfits/${saved.id}/photos`, photoFile); }
        toast(existing ? L.msg`已保存为版本 ${saved.latest.version_no}。` : L.t('搭配已保存。'));
        if (main.isConnected) location.hash = `#/looks/${saved.id}`;
      } catch (err) {
        if (!main.isConnected) return;
        $('#compose-error').textContent = saved ? L.msg`搭配已保存，主图上传失败：${err.message}` : err.message;
        $('#compose-submit').textContent = saved ? L.t('只重试上传主图') : existing ? L.t('保存为新版本') : L.t('保存搭配');
        $('#compose-save-note').textContent = saved ? L.t('重试只上传这张图，不会重复创建搭配或新版本。也可以先查看已保存的搭配。') : '';
        if (saved) { $('#compose-saved-link').href = `#/looks/${saved.id}`; $('#compose-saved-link').hidden = false; }
      } finally {
        submitting = false;
        if (main.isConnected) { $('#compose-submit').disabled = false; $('#compose-fields').disabled = !!saved; $('#compose-photo-input').disabled = !!saved; $('#compose-photo-clear').disabled = !!saved; }
      }
    });
  };
})();
