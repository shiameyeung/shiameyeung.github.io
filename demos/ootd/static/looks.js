// 搭配本：官搭／收藏／自搭；组成引用真实单品或参考单品；取衣清单按当前位置分组；评价分「看图」与「实穿」。
(() => {
  const { $, $$, esc, api, toast, EMOJI, tile, state, views } = W;
  const SRC = { official: L.t('官搭'), saved: L.t('收藏'), own: L.t('自搭'), ai_draft: L.t('AI 草稿') };
  const PHASE = { visual: L.t('看图喜欢'), worn: L.t('实穿感受'), ai: L.t('AI 评价') };
  const SCORE = { liking: L.t('喜欢程度'), comfort: L.t('舒适度'), occasion_fit: L.t('合场合'), rewear: L.t('还想再穿') };

  const mini = s => s.item
    ? `<span class="mini" style="--tile:${tile(s.item.id)}" title="${esc(s.item.code + ' ' + s.item.name)}">${s.item.photos[0] ? `<img src="${s.item.photos[0].url}" alt="">` : EMOJI[s.item.category.main_code] || '👗'}</span>`
    : `<span class="mini ref" title="${esc(s.reference.name)}">＋</span>`;

  function fbSummary(fb) {
    const v = fb.filter(f => f.phase === 'visual' && f.liking), w = fb.filter(f => f.phase === 'worn');
    const parts = [];
    if (v.length) parts.push(L.msg`看图 ${v[0].liking}/5`);
    if (w.length) parts.push(L.msg`实穿 ${[w[0].comfort, w[0].rewear].filter(Boolean).join('·') || L.t('已评')}`);
    return parts.join(' · ') || L.t('尚未评分');
  }

  // ---------- 列表 ----------
  views.looks = async main => {
    main.dataset.view = 'looks';
    const { outfits } = await api('GET', '/api/outfits');
    main.innerHTML = L.html`<div class="heading look-heading"><div><div class="eyebrow">${W.icon("looks")} 你的穿搭灵感簿</div><h2>搭配本<span class="heading-dot">.</span></h2><div class="muted">${outfits.length} 套搭配 · 选好一套，就知道每件在哪里</div></div><a class="button primary" href="#/looks/new">${W.icon("plus")}新建搭配</a></div>
      <div class="grid">${outfits.map(o => L.html`<a class="card look" href="#/looks/${o.id}">${o.assets && o.assets[0] ? `<div class="photo"><img src="${o.assets[0].url}" alt="${esc(o.name)}" loading="lazy" decoding="async"></div>` : `<div class="photo look-placeholder">${W.icon("wardrobe")}</div>`}<div class="copy"><div class="look-kicker"><span class="badge">${SRC[o.source]}${o.latest.annotation_status === 'complete' ? '' : L.t(' · 草稿')}</span>${W.icon("arrow")}</div><div class="name">${esc(o.name)}</div>
        <div class="minis">${o.latest.slots.map(mini).join('')}</div>
        <div class="small">已关联 ${o.latest.item_count} 件${o.latest.reference_count ? L.msg` · 缺 ${o.latest.reference_count} 件` : ''} · 穿过 ${o.latest.worn_times} 次</div>
        <div class="small">${fbSummary(o.latest.feedback)}</div></div></a>`).join('') || L.t('<div class="empty">还没有搭配。把官搭截图里的组合、收藏的搭配或自己配好的一套记下来。</div>')}</div>`;
  };

  // ---------- 详情 ----------
  views.look = async (main, id) => {
    main.dataset.view = 'look';
    let o = await api('GET', `/api/outfits/${id}`);
    let pl = await api('GET', `/api/outfits/versions/${o.latest.id}/pick-list`);
    const draw = () => {
      const v = o.latest;
      main.innerHTML = L.html`<div class="heading"><div><div class="muted">${SRC[o.source]}${o.source_url ? L.html` · <a href="${esc(o.source_url)}" target="_blank" rel="noopener">来源链接</a>` : ''} · 版本 ${v.version_no}${v.annotation_status === 'complete' ? '' : L.t(' · 草稿')}</div><h2>${esc(o.name)}</h2>${o.source_note ? `<div class="muted">${esc(o.source_note)}</div>` : ''}</div>
          <div class="actions"><a href="#/looks"><button type="button">返回</button></a><button type="button" id="edit-meta">编辑名称／来源</button><a href="#/looks/${o.id}/recompose"><button type="button">换组成（开新版本）</button></a>${o.archived_at ? L.t('<button type="button" id="unarchive">恢复</button>') : L.t('<button type="button" id="archive" class="danger">归档</button>')}</div></div>
        ${o.archived_at ? L.t('<span class="badge warn">已归档</span>') : ''}
        <form id="meta-form" class="panel" hidden><div class="fields"><label class="field"><span>名称</span><input name="name" value="${esc(o.name)}" maxlength="80" required></label>
          <label class="field"><span>来源</span><select name="source">${Object.entries(SRC).map(([k, l]) => `<option value="${k}" ${o.source === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field"><span>来源链接</span><input name="source_url" value="${esc(o.source_url)}" maxlength="500"></label>
          <label class="field"><span>来源说明</span><input name="source_note" value="${esc(o.source_note)}" maxlength="500"></label>
          <label class="field"><span>标注状态</span><select name="annotation_status"><option value="draft" ${v.annotation_status === 'draft' ? 'selected' : ''}>草稿（还没标完）</option><option value="complete" ${v.annotation_status === 'complete' ? 'selected' : ''}>已标完</option></select></label></div>
          <div class="actions" style="margin-top:8px"><button type="submit" class="primary">保存</button><button type="button" id="meta-cancel">取消</button></div><div class="error" id="meta-error"></div></form>
        ${o.assets && o.assets.length ? L.html`<section class="panel"><h3>参考图</h3><div class="thumbs" style="margin-top:10px">${o.assets.map(a => L.html`<a class="thumb" href="${a.url}" target="_blank" rel="noopener"><img src="${a.url}" alt=""><span class="role">官搭图</span></a>`).join('')}</div></section>` : ''}
        <div class="two">
          <section class="panel"><h3>组成</h3>${v.slots.map(s => s.item
            ? `<div class="row"><div class="rowl">${mini(s)}<div><a href="#/items/${s.item.id}">${s.item.code} ${esc(s.item.name)}</a>${s.item.archived_at ? L.t(' <span class="badge warn">已归档</span>') : ''}<div class="small">${esc(s.role || L.meta(s.item.category.label))}${s.note ? ' · ' + esc(s.note) : ''}</div></div></div></div>`
            : L.html`<div class="row"><div class="rowl">${mini(s)}<div>${esc(s.reference.name)} <span class="badge warn">尚未拥有</span><div class="small">${esc(s.reference.description || '')}${s.reference.source_url ? L.html` <a href="${esc(s.reference.source_url)}" target="_blank" rel="noopener">链接</a>` : ''}</div></div></div></div>`).join('')}
            ${v.notes ? `<div class="note">${esc(v.notes)}</div>` : ''}</section>
          <section class="panel"><h3>取衣清单</h3><div class="small">按当前位置分组</div>
            ${pl.groups.map(g => `<div class="row"><div><div>${esc(g.location.path)}</div>${g.items.map(i => `<div class="small">${i.code} ${esc(i.name)}</div>`).join('')}</div></div>`).join('')}
            ${pl.unknown_location.length ? L.html`<div class="row"><div><div>还没放进格子</div>${pl.unknown_location.map(i => `<div class="small">${i.code} ${esc(i.name)}${i.suggested ? L.t(' · 建议放 ') + esc(i.suggested.path) : ''}</div>`).join('')}</div></div>` : ''}
            ${pl.references.length ? L.html`<div class="row"><div><span class="badge warn">尚未拥有</span> ${pl.references.map(r => esc(r.name)).join('、')}</div></div>` : ''}
            ${pl.warnings.map(w => `<div class="note">⚠ ${esc(w)}</div>`).join('')}
            <div class="actions" style="margin-top:12px"><button type="button" class="primary" id="wear-outfit" ${o.archived_at ? 'disabled' : ''}>今天穿了这套</button></div>
            <div id="wear-confirm" hidden style="margin-top:8px"><div class="small">确认今天实际穿了哪些（参考单品不在其中，可替换成已有的）：</div>
              ${v.slots.filter(s => s.item).map(s => `<label class="small" style="display:block"><input type="checkbox" name="wear_item" value="${s.item.id}" checked> ${s.item.code} ${esc(s.item.name)}</label>`).join('')}
              <div class="actions" style="margin-top:6px"><button type="button" class="primary" id="wear-confirm-go">记录</button><button type="button" id="wear-confirm-cancel">取消</button></div></div>
            <div class="note">每件分别计次，和今天已有的单件记录自动去重。${v.worn_times ? L.msg`这套穿过 ${v.worn_times} 次，最近 ${v.last_worn}。` : ''}</div></section></div>
        <section class="panel"><div class="heading" style="margin-bottom:6px"><h3>评价</h3></div>
          <form id="fb-form"><div class="fields"><label class="field"><span>评价阶段</span><select name="phase"><option value="visual">看图喜欢程度</option><option value="worn">实穿感受（先要有穿着记录）</option></select></label>
            ${Object.entries(SCORE).map(([k, l]) => L.html`<label class="field"><span>${l}</span><select name="${k}"><option value="">不打分</option>${[1, 2, 3, 4, 5].map(n => L.html`<option value="${n}">${n} 分</option>`).join('')}</select></label>`).join('')}
            <label class="field" style="grid-column:1/-1"><span>理由（一句话）</span><input name="reason" maxlength="500" placeholder="为什么喜欢／不喜欢，下次想怎么改"></label></div>
            <div class="actions" style="margin-top:8px"><button type="submit" class="primary">保存评价</button></div><div class="error" id="fb-error"></div></form>
          <div style="margin-top:10px">${v.feedback.map(f => `<div class="row"><div><div>${PHASE[f.phase]} · ${Object.entries(SCORE).filter(([k]) => f[k]).map(([k, l]) => `${l} ${f[k]}`).join('，') || L.t('未打分')}</div><div class="small">${esc(f.reason || '')} · ${new Date(f.created_at).toLocaleDateString(L.locale)}</div></div></div>`).join('') || L.t('<div class="muted">这个版本还没有评价。</div>')}</div></section>
        ${o.versions.length > 1 ? L.html`<details class="panel"><summary>历史版本（${o.versions.length - 1}）</summary>${o.versions.slice(1).map(hv => L.html`<div class="row"><div><div>版本 ${hv.version_no} · ${new Date(hv.created_at).toLocaleDateString(L.locale)}</div><div class="minis">${hv.slots.map(mini).join('')}</div><div class="small">${fbSummary(hv.feedback)} · 穿过 ${hv.worn_times} 次</div></div></div>`).join('')}</details>` : ''}`;
    };
    draw();
    const reload = async () => { o = await api('GET', `/api/outfits/${id}`); pl = await api('GET', `/api/outfits/versions/${o.latest.id}/pick-list`); draw(); };
    main.addEventListener('click', async e => {
      const t = e.target; if (t.tagName !== 'BUTTON') return;
      try {
        if (t.id === 'edit-meta') $('#meta-form').hidden = false;
        if (t.id === 'meta-cancel') $('#meta-form').hidden = true;
        if (t.id === 'archive' || t.id === 'unarchive') { await api('POST', `/api/outfits/${id}/${t.id}`); await reload(); }
        if (t.id === 'wear-outfit') { if (pl.references.length || pl.warnings.length) $('#wear-confirm').hidden = false; else await wearNow(o.latest.slots.filter(s => s.item).map(s => s.item.id)); }
        if (t.id === 'wear-confirm-cancel') $('#wear-confirm').hidden = true;
        if (t.id === 'wear-confirm-go') await wearNow($$('input[name=wear_item]:checked', main).map(c => Number(c.value)));
      } catch (err) { toast(err.message, 6000); }
    });
    async function wearNow(itemIds) {
      if (!itemIds.length) return toast(L.t('至少选一件实际穿了的单品。'));
      const r = await api('POST', `/api/outfits/versions/${o.latest.id}/wear`, { item_ids: itemIds, idempotency_key: crypto.randomUUID() });
      toast(r.newly_counted.length ? L.msg`已记录，${r.newly_counted.length} 件单品次数加 1${r.already_counted.length ? L.msg`，${r.already_counted.length} 件今天已计过` : ''}。` : L.t('这些单品今天都已经记过了，次数不重复增加。'));
      await reload();
    }
    main.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; const fd = new FormData(f);
      try {
        if (f.id === 'meta-form') { await api('PATCH', `/api/outfits/${id}`, Object.fromEntries(fd)); await reload(); toast(L.t('已保存。')); }
        if (f.id === 'fb-form') {
          const body = { phase: fd.get('phase'), reason: fd.get('reason') };
          Object.keys(SCORE).forEach(k => { if (fd.get(k)) body[k] = Number(fd.get(k)); });
          await api('POST', `/api/outfits/versions/${o.latest.id}/feedback`, body); await reload(); toast(L.t('评价已保存。'));
        }
      } catch (err) { $(f.id === 'meta-form' ? '#meta-error' : '#fb-error').textContent = err.message; }
    });
  };
})();
