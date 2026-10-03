// 资料可以慢慢补：这里只展示当前缺少的字段，不把空白推断成错误。
(() => {
  const { $, esc, api, views } = W;
  const reasons = {
    missing_location: {title:L.t('还没放进格子'), description:L.t('去收纳位置那边，按建议放进去，或者直接选一个格子。'), action:L.t('记录位置'), icon:'location'},
    missing_actual_photo: {title:L.t('待补实物图'), description:L.t('商品图可以继续用。闲下来拍一张自己这件的照片，会更容易认出来。'), action:L.t('补实物图'), icon:'wardrobe'},
    missing_palette: {title:L.t('待补色系'), description:L.t('这些单品还没有填写新色系，并不代表分类有误。工具等不需要色系的单品可以略过。'), action:L.t('看看色系'), icon:'sparkle'},
  };
  const skipLabels = {missing_location: L.t('不用记位置'), missing_actual_photo: L.t('不用补实物图'), missing_palette: L.t('不用定色系')};
  views.attention = async (main, reason = 'missing_location', kind = 'apparel') => {
    main.dataset.view = 'attention';
    if (!reasons[reason]) reason = 'missing_location';
    if (!['apparel', 'cosmetics'].includes(kind)) kind = 'apparel';
    const data = await api('GET', `/api/items/attention?kind=${kind}&reason=${reason}`);
    if (!main.isConnected) return;
    const current = reasons[reason];
    const returnHash = `#/attention/${reason}/${kind}`;
    W.attentionContext = {reason, kind, ids:data.items.map(i => i.id), returnHash};
    main.innerHTML = L.html`<div class="heading"><div><div class="eyebrow">一点点整理</div><h2>待补资料</h2><p class="muted">从最有用的一点开始，随时可以回去挑衣服。</p></div><a class="attention-back" href="#/items">返回单品 ${W.icon('arrow')}</a></div>
      <nav class="attention-kind" aria-label="待补资料范围"><a href="#/attention/${reason}/apparel" ${kind === 'apparel' ? 'aria-current="page"' : ''}>衣橱</a><a href="#/attention/${reason}/cosmetics" ${kind === 'cosmetics' ? 'aria-current="page"' : ''}>彩妆</a></nav>
      <nav class="attention-summary" aria-label="选择要补的资料">${Object.entries(reasons).map(([key, info]) => L.html`<a class="attention-stat" href="#/attention/${key}/${kind}" ${key === reason ? 'aria-current="page"' : ''}>${W.icon(info.icon)}<span>${info.title}</span><strong>${data.counts[key]}</strong><small>件单品</small></a>`).join('')}</nav>
      <section class="panel attention-work"><div class="heading"><div><h3>${current.title}<span class="badge">${data.items.length} 件</span></h3><p class="muted">${current.description}</p></div><div class="actions">${reason === 'missing_location' && data.items.length ? L.t('<button type="button" id="attention-batch">批量设置位置</button>') : ''}${data.items.length ? L.html`<a class="attention-start" href="#/items/${data.items[0].id}">从第一件开始 ${W.icon('arrow')}</a>` : ''}</div></div>
      <div class="attention-list">${data.items.map((i, n) => {
        const photo = i.photos.find(p => p.role === 'actual') || i.photos.find(p => p.role === 'product') || i.photos[0];
        const ask = i.attention && i.attention.status === 'needs_user' ? L.html`<p class="attention-ask">${W.icon('sparkle')}<span>只有你能定：${esc(i.attention.note || L.t('缺少能确认的依据'))}</span></p>` : '';
        return L.html`<article class="attention-row" data-row="${i.id}"><a class="attention-photo" href="#/items/${i.id}" aria-label="查看 ${esc(i.display_name || i.name)}">${photo ? `<img src="${esc(photo.url)}" alt="" loading="lazy">` : W.icon('wardrobe')}</a><div class="attention-item"><span class="small">${n + 1} / ${data.items.length} · ${esc(i.code)}</span><h4><a href="#/items/${i.id}">${esc(i.display_name || i.name)}</a></h4><div class="small">${esc(i.brand || L.meta(i.category.label))}</div>${ask}</div><div class="attention-actions"><a class="attention-action" href="#/items/${i.id}">${current.action}${W.icon('arrow')}</a><button type="button" class="attention-skip" data-skip="${i.id}">${skipLabels[reason]}</button></div></article>`;
      }).join('') || L.html`<div class="attention-empty">${W.icon('check')}<h3>这一项都记好了</h3><p class="muted">可以看看其他资料，或回去选今天的搭配。</p><a href="#/items">返回单品</a></div>`}</div>
      ${data.counts.skipped?.[reason] ? L.html`<p class="attention-skipped-note">另有 ${data.counts.skipped[reason]} 件标成了不用补，不计在上面。<button type="button" id="attention-show-skipped">看看它们</button></p>` : ''}</section>`;
    $('#attention-batch', main)?.addEventListener('click', () => W.openItemAttention(reason, kind));
    $('#attention-show-skipped', main)?.addEventListener('click', async event => {
      event.target.disabled = true;
      const skipped = await api('GET', `/api/items/attention?kind=${kind}&reason=${reason}&include=skipped`);
      if (!main.isConnected) return;
      event.target.closest('.attention-skipped-note').outerHTML = `<div class="attention-list attention-skipped">${skipped.items.map(i =>
        L.html`<article class="attention-row"><div class="attention-item"><span class="small">${esc(i.code)}</span><h4><a href="#/items/${i.id}">${esc(i.display_name || i.name)}</a></h4><div class="small">${esc(i.attention?.note || L.t('不用补这项'))}</div></div><div class="attention-actions"><button type="button" class="attention-skip" data-restore="${i.id}">放回清单</button></div></article>`).join('')}</div>`;
    });
    main.addEventListener('click', async event => {
      const button = event.target.closest('[data-skip], [data-restore]');
      if (!button) return;
      const restoring = 'restore' in button.dataset;
      button.disabled = true;
      try {
        await api('PUT', `/api/items/${button.dataset.skip || button.dataset.restore}/attention/${reason}`,
                  restoring ? {status: null} : {status: 'skipped', note: L.t('我确认这件不用补')});
        W.toast(restoring ? L.t('已放回清单。') : L.t('好，这件不再出现在这份清单里。'));
        await views.attention(main, reason, kind);
      } catch (error) {
        button.disabled = false;
        W.toast(error.message, 6000);
      }
    });
  };
})();
