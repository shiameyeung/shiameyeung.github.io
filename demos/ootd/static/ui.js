// 共用矢量图标：随文字缩放，不依赖字体或外部图片服务。
(() => {
  const paths = {
    wardrobe: '<path d="M8 6a4 4 0 0 1 8 0c0 2-4 2-4 5l9 6a1 1 0 0 1-.6 2H3.6a1 1 0 0 1-.6-2l9-6"/>',
    looks: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/>',
    location: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5 3 3 5-5"/>',
    import: '<path d="M5 9V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M3 12h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm9-6v10m-3-3 3 3 3-3"/>',
    today: '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z"/><path d="m10 15 2 2 4-4"/>',
    note: '<rect x="4" y="3" width="15" height="18" rx="3"/><path d="M8 7h7M8 11h4m1 6 5-5 2 2-5 5-3 1Z"/>',
    wallet: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8h18m0 4h-6v5h6"/><circle cx="17" cy="14.5" r=".5"/>',
    cabinet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 12h16M12 3v9M8 7v2m8-2v2m-7 7h6"/>',
    lipstick: '<path d="M7 13h10v8H7Zm2 0V5l6-3v11M7 17h10"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    sparkle: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/>',
    shirt: '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    filter: '<path d="M3 6h18M6 12h12M9 18h6"/>',
  };
  W.icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sparkle}</svg>`;
  const paletteSamples = {
    apparel_palette: {
      '黑白灰':['#38373b','#b6b4b8','#f7f6f2'], '奶油色':['#f3e8ce','#e9d8b8','#f8edbd'],
      '大地色':['#967357','#c1a078','#878268'], '粉彩':['#efd0d8','#c4dce5','#d7d0ec'],
      '雾色':['#909fa7','#b5a0ad','#9cae9f'], '浓色':['#333e61','#783f51','#365d54'],
      '亮色':['#da5251','#eaa14a','#49a8aa'], '金属色':['#bcbfc7','#eee8d1','#c0a16c'],
    },
    makeup_palette: {
      '奶茶裸色':['#c99880'], '豆沙':['#ad777f'], '玫瑰':['#c77587'], '桃杏':['#e9a38e'],
      '珊瑚橘':['#de8266'], '红棕':['#a75543'], '正红':['#c53e4a'], '莓果':['#934761'],
      '粉紫':['#cca3c3'], '大地色':['#a28265'], '灰棕':['#8d817e'], '香槟金':['#d9bd83'],
      '银白':['#d3d4df'], '创意色':['#709ebb','#a3b989'], '肤色':['#e3bfa1'],
      '透明':['#ffffff','#e8e4e7'], '黑灰':['#38373b','#8a878c'], '校色':['#d6bddb','#dce4c6','#f0d0c1'],
    },
    // 挂的两档用同一族的深浅，一眼看出哪档先让位；色值都取自上面两张色表
    storage: {
      '一定要挂':['#a75543'], '挂着更好':['#c99880'], '叠起来':['#9cae9f'], '抽屉小格':['#8d817e'],
    },
  };
  W.storageColor = value => paletteSamples.storage[value]?.[0] || '';
  W.paletteSwatch = (dimension, value) => {
    const colors = paletteSamples[dimension]?.[value];
    return colors ? `<span class="palette-swatch" aria-hidden="true">${colors.map(c => `<i style="background:${c}"></i>`).join('')}</span>` : '';
  };
  document.querySelector('.skip-link')?.addEventListener('click', e => {
    e.preventDefault(); document.querySelector('#main')?.focus();
  });
  const icons = {items:'wardrobe',looks:'looks',places:'cabinet',history:'calendar',import:'import',today:'today',attention:'note',spending:'wallet'};
  document.querySelectorAll('[data-nav]').forEach(a => {
    a.innerHTML = W.icon(icons[a.dataset.nav]) + `<span>${W.esc(a.textContent)}</span>`;
  });
})();
