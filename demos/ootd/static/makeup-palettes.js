// 用途只改变优先展示，不限制多用途单品的可选妆色。
(() => {
  const groups = {
    lips: {label:L.t('唇部'), codes:['LIPSTICK','LIP_GLOSS','LIP_LINER'], values:['奶茶裸色','豆沙','玫瑰','桃杏','珊瑚橘','红棕','正红','莓果','粉紫','透明']},
    eyes: {label:L.t('眼眉'), codes:['EYESHADOW','EYELINER','MASCARA','LASHES','BROW'], values:['大地色','灰棕','黑灰','香槟金','银白','粉紫','创意色']},
    base: {label:L.t('底妆'), codes:['PRIMER','FOUNDATION','CONCEALER','POWDER'], values:['肤色','透明','校色']},
    cheeks: {label:L.t('腮红与修容'), codes:['BLUSH','HIGHLIGHT','CONTOUR'], values:['桃杏','玫瑰','豆沙','珊瑚橘','粉紫','大地色','灰棕','香槟金','银白']},
  };
  // 上の四組に入らない細類（美甲・工具・その他）はまとめて最後に置く
  const ORDER = ['lips','eyes','base','cheeks'];
  W.makeupPalettes = {
    groups,
    // 细类下拉也按同一套用途分组，避免「挑妆色」和「挑类型」是两种分法
    groupChildren: children => {
      const buckets = ORDER.map(k => ({key:k, label:groups[k].label, items:[]}));
      const rest = {key:'other', label:L.t('其他'), items:[]};
      for (const c of children) (buckets.find(b => groups[b.key].codes.includes(c.code)) || rest).items.push(c);
      return [...buckets, rest].filter(b => b.items.length);
    },
    forCategory: code => Object.keys(groups).find(k => groups[k].codes.includes(code)) || 'all',
    visible: (value, group, expanded) => expanded || group === 'all' || !groups[group] || groups[group].values.includes(value),
  };
})();
