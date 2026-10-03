// Public demo adapter. Every route is handled here or rejected; there is no fetch fallback.
(() => {
  if (!window.OOTD_DEMO) return;
  const copy = value => structuredClone(value);
  const seed = copy(window.OOTD_DEMO_DATA);
  const sampleNames={"示例衣橱":["Sample wardrobe","サンプルクローゼット"],"上装格 A":["Tops compartment A","トップス収納 A"],"上装格 B":["Tops compartment B","トップス収納 B"],"下装格":["Bottoms compartment","ボトムス収納"],"挂衣区":["Hanging area","ハンガー収納"],"示例化妆台":["Sample vanity","サンプルドレッサー"],"彩妆抽屉 A":["Makeup drawer A","コスメの引き出し A"],"彩妆抽屉 B":["Makeup drawer B","コスメの引き出し B"],"演示搭配 · 日常":["Demo outfit · Everyday","デモコーデ · 普段着"],"演示搭配 · 周末":["Demo outfit · Weekend","デモコーデ · 週末"],"演示搭配 · 彩妆":["Demo look · Makeup","デモコーデ · メイク"]};
  const sampleName=name => window.L && L.lang!=='zh' ? (sampleNames[name]?.[L.lang==='en'?0:1]||name) : name;
  let model, nextItem, nextAction, nextVersion, nextOutfit, nextPurchase, blobs;
  const day = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const now = () => new Date().toISOString();
  function reset() {
    (blobs || []).forEach(url => URL.revokeObjectURL(url)); blobs = [];
    model = copy(seed); model.meta.today = day();
    model.locations.forEach(location=>{location.name=sampleName(location.name);});
    model.outfits.forEach(outfit=>{outfit.name=sampleName(outfit.name);});
    nextItem = Math.max(0,...model.items.map(i=>i.id))+1;
    nextAction = Math.max(0,...model.actions.map(a=>a.action_id))+1;
    nextOutfit = Math.max(0,...model.outfits.map(o=>o.id))+1;
    nextVersion = Math.max(0,...model.outfits.flatMap(o=>o.versions.map(v=>v.id)))+1;
    nextPurchase = Math.max(0,...model.items.flatMap(i=>i.purchases.map(p=>p.id)))+1;
    model.batches = []; model.baselines = {}; model.outfits.forEach(o=>o.latest=o.versions[0]);
  }
  reset();
  const fail = (status, message, extra = {}) => { const e = new Error(window.L ? L.t(message) : message); e.status=status; e.data={error:e.message,...extra}; throw e; };
  const itemOf = id => model.items.find(i=>i.id===Number(id)) || fail(404,'单品不存在。');
  const outfitOf = id => model.outfits.find(o=>o.id===Number(id)) || fail(404,'搭配不存在。');
  const versionOf = id => model.outfits.flatMap(o=>o.versions).find(v=>v.id===Number(id)) || fail(404,'搭配版本不存在。');
  const catOf = id => {
    for(const main of model.meta.categories) {
      const sub=main.children.find(c=>c.id===Number(id));
      if(sub) return {id:sub.id,code:sub.code,label:sub.label,main_code:main.code,main_label:main.label};
    }
    return fail(400,'请选择有效细分类。');
  };
  const tagOf = id => {
    for(const dim of model.meta.tags) { const v=dim.values.find(v=>v.id===Number(id)); if(v) return {id:v.id,dimension:dim.key,dimension_label:dim.label,value:v.value,source:'user',confirmed:true}; }
    return fail(400,'标签不存在。');
  };
  const locOf = id => id==null ? null : model.locations.find(l=>l.id===Number(id)) || fail(404,'位置不存在。');
  function locationsList() {
    const visit=(l,seen=new Set())=>{ if(seen.has(l.id)) fail(400,'位置不能循环。'); seen.add(l.id); const p=l.parent_id?locOf(l.parent_id):null; return p?visit(p,seen)+' / '+l.name:l.name; };
    model.locations.forEach(l=>{l.path=visit(l);l.depth=l.path.split(' / ').length-1;l.current_count=model.items.filter(i=>!i.archived_at&&i.location.current?.id===l.id).length;l.suggested_count=model.items.filter(i=>!i.archived_at&&!i.location.current&&i.location.suggested?.id===l.id).length;});
    return model.locations;
  }
  function datesFor(id) {
    return [...new Set(model.actions.filter(a=>!a.undone_at).flatMap(a=>a.items.filter(i=>i.item_id===id&&!i.revoked_at).map(()=>a.wear_date)))].sort();
  }
  const unit = currency => ['JPY','KRW'].includes(currency)?1:100;
  function amountMinor(amount,currency) {
    if(amount==null||amount==='') return null;
    if(!/^[A-Z]{3}$/.test(currency||'')) fail(400,'填写金额时必须选择币种。');
    const digits=unit(currency)===1?0:2;
    const s=String(amount).trim();
    if(!/^\d+(\.\d+)?$/.test(s)||((s.split('.')[1]||'').length>digits)) fail(400,'金额格式或小数位不正确。');
    const [whole,frac='']=s.split('.'); const n=BigInt(whole)*BigInt(unit(currency))+BigInt(frac.padEnd(digits,'0')||'0');
    if(n>BigInt(Number.MAX_SAFE_INTEGER)) fail(400,'金额太大。'); return Number(n);
  }
  function purchaseSummary(purchases) {
    if(!purchases.length) return null;
    const groups=new Map();
    purchases.forEach(p=>{ const k=p.currency || ''; const g=groups.get(k)||{currency:p.currency,amount_minor:0,count:0,quantity:0,priced_count:0,unpriced:0,estimated_count:0,estimated_amount_minor:0};g.count++;g.quantity+=p.quantity||1;
      if(p.amount_minor==null)g.unpriced++;else {g.amount_minor+=p.amount_minor;g.priced_count++; if(p.price_source==='estimate'){g.estimated_count++;g.estimated_amount_minor+=p.amount_minor;}} groups.set(k,g); });
    const gs=[...groups.values()]; gs.forEach(g=>{if(!g.priced_count)g.amount_minor=null;});
    const currencies=gs.filter(g=>g.priced_count);const mixed=currencies.length>1;
    const result={...purchases[0],count:purchases.length,quantity:purchases.reduce((n,p)=>n+(p.quantity||1),0),currency:mixed?null:currencies[0]?.currency||gs[0]?.currency,
      amount_minor:mixed?null:currencies[0]?.amount_minor??null,mixed_currency:mixed,unpriced:gs.reduce((n,g)=>n+g.unpriced,0),priced_count:gs.reduce((n,g)=>n+g.priced_count,0),estimated_count:gs.reduce((n,g)=>n+g.estimated_count,0),totals_by_currency:gs};
    result.price_complete=!result.unpriced;result.price_source=result.estimated_count?'estimate':'user';result.amount=result.amount_minor==null?null:String(result.amount_minor/unit(result.currency));
    return result;
  }
  function stats(i) {
    const dates=datesFor(i.id);const b=model.baselines[i.id]||null;const detail=dates.filter(d=>!b||d>b.as_of);const count=(b?.count||0)+detail.length;const p=purchaseSummary(i.purchases);
    const reason=p?.unpriced&&p?.priced_count?'incomplete_price':p?.mixed_currency?'mixed_currency':p?.amount_minor==null?'no_price':!count?'no_wear':null;
    // Decimal rounding in wear.py is four places, half even. Integer ratio avoids float accumulation.
    let cost=null;
    if(!reason){const scaled=BigInt(p.amount_minor)*10000n,divisor=BigInt(count);let q=scaled/divisor;const r=scaled%divisor;if(r*2n>divisor||(r*2n===divisor&&q%2n))q++;cost=(q/10000n)+'.'+String(q%10000n).padStart(4,'0');}
    return {count,detail_count:detail.length,baseline:b,estimated:!!(b&&b.precision==='estimated'&&b.count>0),last_worn:dates.at(-1)||null,worn_today:dates.includes(day()),cost_per_wear_minor:cost,cost_reason:reason,currency:p?.currency||null,cost_estimated:p?.price_source==='estimate',dates:dates.slice(-30)};
  }
  function full(i) {
    const it=copy(i);it.purchase=purchaseSummary(i.purchases);it.wear=stats(i);it.outfits=model.outfits.filter(o=>!o.archived_at&&o.latest.slots.some(s=>s.item?.id===i.id)).map(o=>({id:o.id,name:o.name,source:o.source}));
    it.location.current=it.location.current?copy(locOf(it.location.current.id)):null;it.location.suggested=it.location.suggested?copy(locOf(it.location.suggested.id)):null;return it;
  }
  function attention(i,reason) {
    if(reason==='missing_location')return !i.location.current;
    if(reason==='missing_actual_photo')return !i.photos.some(p=>p.role==='actual');
    if(reason==='missing_palette')return !i.tags.some(t=>t.dimension===(i.category.main_code==='COS'?'makeup_palette':'apparel_palette'));
    return false;
  }
  function list(query) {
    let result=model.items.filter(i=>query.get('include_archived')==='1'||!i.archived_at);
    const kind=query.get('kind');if(kind)result=result.filter(i=>(i.category.main_code==='COS')===(kind==='cosmetics'));
    if(query.get('main'))result=result.filter(i=>i.category.main_code===query.get('main'));
    if(query.get('category_id'))result=result.filter(i=>i.category.id===Number(query.get('category_id')));
    if(query.get('exclude_main'))result=result.filter(i=>!query.get('exclude_main').split(',').includes(i.category.main_code));
    if(query.get('unplaced')==='1')result=result.filter(i=>!i.location.current);
    if(query.get('location_id'))result=result.filter(i=>i.location.current?.id===Number(query.get('location_id')));
    if(query.get('suggested_for'))result=result.filter(i=>!i.location.current&&i.location.suggested?.id===Number(query.get('suggested_for')));
    if(query.get('disposition'))result=result.filter(i=>i.disposition===query.get('disposition'));
    if(query.get('attention'))result=result.filter(i=>attention(i,query.get('attention')));
    if(query.get('never_worn')==='1')result=result.filter(i=>stats(i).count===0);
    const tags=query.getAll('tag').map(Number);if(tags.length){const dimensions=new Map();tags.forEach(id=>{const t=tagOf(id);const ids=dimensions.get(t.dimension)||[];ids.push(id);dimensions.set(t.dimension,ids);});result=result.filter(i=>query.get('tag_match')==='by_dimension'?[...dimensions.values()].every(ids=>ids.some(id=>i.tags.some(t=>t.id===id))):tags.every(id=>i.tags.some(t=>t.id===id)));}
    const q=(query.get('q')||'').toLowerCase().trim();if(q)result=result.filter(i=>[i.code,...i.aliases,i.name,i.display_name,i.brand,i.color_name,i.notes,i.category.label,i.location.current?.path,...i.tags.map(t=>t.value)].join(' ').toLowerCase().includes(q));
    return result.map(full);
  }
  function codeFor(main) { const used=model.items.flatMap(i=>[i.code,...i.aliases]);const max=Math.max(0,...used.filter(c=>c.startsWith(main+'-')).map(c=>Number(c.split('-')[1])));return main+'-'+String(max+1).padStart(4,'0'); }
  function editItem(i,b) {
    if(b.version!=null&&b.version!==i.version)fail(409,'档案已被修改，请重新打开。');
    const fields=['name','display_name','brand','size','color_name','color_hex','unit','expected_piece_count','present_piece_count','quantity','notes','fit','measurements','liking','repurchase','review','disposition','asking_currency','storage_profile'];
    if('name' in b&&!String(b.name).trim())fail(400,'请填写单品名称。');
    if('category_id' in b){const c=catOf(b.category_id);if(i.category.main_code!==c.main_code){i.aliases.push(i.code);i.code=codeFor(c.main_code);}i.category=c;i.category_id=c.id;}
    if(b.quantity!=null&&(!Number.isInteger(b.quantity)||b.quantity<1))fail(400,'数量至少为 1。');
    if(b.expected_piece_count!=null&&b.present_piece_count!=null&&(b.expected_piece_count<1||b.present_piece_count<0||b.present_piece_count>b.expected_piece_count))fail(400,'现有件数不能超过应有件数。');
    fields.forEach(k=>{if(k in b)i[k]=copy(b[k]);});
    if('tag_ids' in b)i.tags=[...new Set(b.tag_ids)].map(tagOf);
    if('asking_price' in b){i.asking_price_minor=amountMinor(b.asking_price,b.asking_currency);i.asking_price=b.asking_price;}
    i.version++;i.updated_at=now();return full(i);
  }
  function writePurchase(i,b,pid=null) {
    const old=pid?i.purchases.find(p=>p.id===Number(pid)):null;if(pid&&!old)fail(404,'购入记录不存在。');
    if(old&&b.version!=null&&old.version!==b.version)fail(409,'购入记录已被修改。');
    const p={...(old||{}),id:old?.id||nextPurchase++,item_id:i.id,quantity:Number(b.quantity||old?.quantity||1),currency:b.currency||old?.currency||null,purchased_on:b.purchased_on??old?.purchased_on??null,platform:b.platform??old?.platform??'',order_number:b.order_number??old?.order_number??'',price_source:b.price_source||old?.price_source||'user',allocation_note:b.allocation_note??old?.allocation_note??'',product_url:b.product_url??old?.product_url??'',version:(old?.version||0)+1,updated_at:now()};
    p.amount_minor='amount' in b?amountMinor(b.amount,p.currency):old?.amount_minor??null;p.amount=p.amount_minor==null?null:String(p.amount_minor/unit(p.currency));
    if(p.purchased_on&&(!/^\d{4}-\d{2}-\d{2}$/.test(p.purchased_on)||p.purchased_on>day()))fail(400,'购入日期不正确。');
    if(old)Object.assign(old,p);else i.purchases.push(p);return copy(p);
  }
  function record(b) {
    const replay=model.actions.find(a=>a.idempotency_key&&a.idempotency_key===b.idempotency_key);if(replay)return {...copy(replay),newly_counted:[],already_counted:[],replayed:true};
    const ids=[...new Set((b.item_ids||[]).map(Number))];if(!ids.length)fail(400,'没有指定单品。');ids.forEach(itemOf);
    const date=b.wear_date||day();if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>day())fail(400,'不能记录未来或无效日期。');
    const source=b.source||'item';if(!['item','outfit','backfill'].includes(source))fail(400,'记录来源不合法。');
    if(b.outfit_version_id!=null)versionOf(b.outfit_version_id);
    const newly=ids.filter(id=>!datesFor(id).includes(date));const already=ids.filter(id=>!newly.includes(id));
    const a={action_id:nextAction++,wear_date:date,source,outfit_version_id:b.outfit_version_id??null,occasion:b.occasion||'',created_at:now(),undone_at:null,idempotency_key:b.idempotency_key||crypto.randomUUID(),items:ids.map(id=>{const i=itemOf(id);return {item_id:id,code:i.code,name:i.name,revoked_at:null};})};
    model.actions.push(a);return {...copy(a),newly_counted:newly,already_counted:already,replayed:false};
  }
  function move(i,b,batch=null) {
    if(!['home','current'].includes(b.field))fail(400,'位置字段不合法。');
    if(b.version!=null&&b.version!==i.location.version)fail(409,'位置已被修改。');
    const dest=locOf(b.location_id),field=b.field==='home'?'suggested':'current';
    if(dest&&!dest.enabled)fail(400,'不能放入停用位置。');
    if(i.location[field]?.id===(dest?.id??undefined)){if(b.note!=null)i.location.current_note=b.note;return false;}
    i.location[field]=copy(dest);i.location.version++;i.location.confirmed_at=now();if(b.note!=null)i.location.current_note=b.note;return true;
  }
  function slots(b) { const seen=new Set();if(!b.length)fail(400,'搭配至少要有一个组成。');return b.map((s,n)=>{if((s.item_id==null)===(s.reference==null))fail(400,'组成需指定已有单品或参考单品。');if(s.item_id!=null){if(seen.has(s.item_id))fail(400,'同一件单品在一套搭配里只出现一次。');seen.add(s.item_id);return {position:n+1,role:s.role||'',note:s.note||'',item:full(itemOf(s.item_id)),reference:null};}if(!s.reference.name?.trim())fail(400,'请填写参考单品名称。');return {position:n+1,role:s.role||'',note:s.note||'',item:null,reference:{...copy(s.reference),id:n+1}};});}
  function newVersion(o,b){const v={id:nextVersion++,version_no:o.versions.length+1,annotation_status:b.annotation_status||'draft',notes:b.notes||'',created_at:now(),slots:slots(b.slots||[]),feedback:[],worn_times:0,last_worn:null};v.item_count=v.slots.filter(s=>s.item).length;v.reference_count=v.slots.length-v.item_count;o.versions.unshift(v);o.latest=v;o.updated_at=now();return v;}
  function outfitFull(o){const out=copy(o);out.versions.forEach(v=>{v.slots.forEach(s=>{if(s.item)s.item=full(itemOf(s.item.id));});const actions=model.actions.filter(a=>!a.undone_at&&a.outfit_version_id===v.id);v.worn_times=actions.length;v.last_worn=actions.map(a=>a.wear_date).sort().at(-1)||null;});out.latest=out.versions[0];return out;}
  function spending(kind){const found=model.items.filter(i=>!i.archived_at&&(i.category.main_code==='COS')===(kind==='cosmetics'));const result={kind,totals:{cny:0,records:0,estimated:0,unpriced:0,by_currency:{}},never_worn:{cny:0,items:0},by_month:[],by_year:[],by_brand:[],by_main:[]};const maps={by_month:new Map(),by_year:new Map(),by_brand:new Map(),by_main:new Map()};
    found.forEach(i=>{const unWorn=!stats(i).count;if(unWorn)result.never_worn.items++;i.purchases.forEach(p=>{result.totals.records++;if(p.amount_minor==null){result.totals.unpriced++;return;}result.totals.by_currency[p.currency]=(result.totals.by_currency[p.currency]||0)+p.amount_minor;if(p.price_source==='estimate')result.totals.estimated++;const cny=p.currency==='JPY'?Math.floor((p.amount_minor*43+5)/10):p.amount_minor;result.totals.cny+=cny;if(unWorn)result.never_worn.cny+=cny;const keys={by_month:p.purchased_on?.slice(0,7),by_year:p.purchased_on?.slice(0,4),by_brand:i.brand||'未记品牌',by_main:i.category.main_label};Object.entries(keys).forEach(([name,key])=>{if(!key)return;const row=maps[name].get(key)||{key,cny:0,count:0};row.cny+=cny;row.count++;maps[name].set(key,row);});});});Object.entries(maps).forEach(([k,m])=>result[k]=[...m.values()].sort((a,b)=>k==='by_month'||k==='by_year'?a.key.localeCompare(b.key):b.cny-a.cny));result.by_brand=result.by_brand.slice(0,12);result.by_main=result.by_main.slice(0,12);return result;}
  async function api(method,path,body={}) {
    const url=new URL(path,'https://demo.invalid');const p=url.pathname,q=url.searchParams,b=body||{};let m;
    locationsList();
    if(method==='GET'&&p==='/api/meta')return copy({...model.meta,today:day()});
    if(method==='GET'&&p==='/api/locations')return copy({locations:locationsList()});
    if(method==='GET'&&p==='/api/items')return {items:list(q),worn_today:model.items.filter(i=>stats(i).worn_today).length};
    if(method==='GET'&&p==='/api/items/attention'){const kind=q.get('kind')||'apparel',reason=q.get('reason')||'missing_location';const base=new URLSearchParams({kind});const found=list(base);const counts={};['missing_location','missing_actual_photo','missing_palette'].forEach(r=>counts[r]=found.filter(i=>attention(i,r)).length);return {kind,reason,counts,items:found.filter(i=>attention(i,reason))};}
    if(method==='GET'&&p==='/api/wear/suggestions'){const kind=q.get('kind')||'apparel',found=list(new URLSearchParams({kind})),worn_today=found.filter(i=>i.wear.worn_today),available=found.filter(i=>!i.wear.worn_today);return {today:day(),season:kind==='cosmetics'?null:({3:'春',4:'春',5:'春',6:'夏',7:'夏',8:'夏',9:'秋',10:'秋',11:'秋',12:'冬',1:'冬',2:'冬'})[Number(day().slice(5,7))],worn_today,recent:available.filter(i=>i.wear.last_worn).sort((a,b)=>b.wear.last_worn.localeCompare(a.wear.last_worn)).slice(0,12),seasonal:available.filter(i=>!i.wear.last_worn).sort((a,b)=>b.id-a.id).slice(0,12)};}
    if(method==='GET'&&p==='/api/stats/spending')return spending(q.get('kind')||'apparel');
    if(method==='POST'&&p==='/api/items'){const cat=catOf(b.category_id);const i={id:nextItem++,code:codeFor(cat.main_code),aliases:[],category:cat,category_id:cat.id,version:0,name:'',display_name:'',brand:'',size:'',color_name:'',color_hex:null,unit:'piece',expected_piece_count:1,present_piece_count:1,quantity:1,notes:'',fit:null,measurements:'',liking:null,repurchase:null,review:'',disposition:'in_use',asking_price_minor:null,asking_currency:null,archived_at:null,created_at:now(),updated_at:now(),photos:[],tags:[],purchases:[],purchase:null,guides:[],storage_profile:{},location:{suggested:null,current:null,current_note:'',confirmed_at:null,version:0}};editItem(i,b);if(b.purchase)writePurchase(i,b.purchase);if(b.location?.home_id)move(i,{field:'home',location_id:b.location.home_id});if(b.location?.current_id)move(i,{field:'current',location_id:b.location.current_id});model.items.push(i);return full(i);}
    if((m=p.match(/^\/api\/items\/(\d+)$/))){const i=itemOf(m[1]);if(method==='GET')return full(i);if(method==='PATCH'){const candidate=copy(i);editItem(candidate,b);Object.assign(i,candidate);return full(i);}}
    if((m=p.match(/^\/api\/items\/(\d+)\/(archive|unarchive)$/))&&method==='POST'){const i=itemOf(m[1]);i.archived_at=m[2]==='archive'?now():null;i.version++;return full(i);}
    if((m=p.match(/^\/api\/items\/(\d+)\/location$/))&&method==='PUT'){const i=itemOf(m[1]);move(i,b);return copy(i.location);}
    if((m=p.match(/^\/api\/items\/(\d+)\/(place|reject-suggestion)$/))&&method==='POST'){const i=itemOf(m[1]);if(m[2]==='place')move(i,{field:'current',location_id:b.location_id});else i.location.suggested=null;return copy(i.location);}
    if((m=p.match(/^\/api\/items\/(\d+)\/purchases(?:\/(\d+))?$/))){const i=itemOf(m[1]);if(method==='POST'||method==='PUT')return writePurchase(i,b,m[2]);if(method==='DELETE'&&m[2]){i.purchases=i.purchases.filter(p=>p.id!==Number(m[2]));return {ok:true};}}
    if((m=p.match(/^\/api\/items\/(\d+)\/purchase$/))&&method==='PUT'){const i=itemOf(m[1]);return writePurchase(i,b,i.purchases[0]?.id);}
    if((m=p.match(/^\/api\/items\/(\d+)\/photos(?:\/(\d+))?$/))){const i=itemOf(m[1]);if(method==='DELETE'){i.photos=i.photos.filter(ph=>ph.asset_id!==Number(m[2]));return {ok:true};}if(method==='POST'){if(!(body instanceof Blob)||!body.type.startsWith('image/'))fail(400,'请选图片。');const url=URL.createObjectURL(body);blobs.push(url);const photo={asset_id:Date.now(),role:q.get('role')||'actual',url,sort_order:i.photos.length};i.photos.push(photo);return copy(photo);}}
    if(method==='POST'&&p==='/api/wear')return record(b);
    if(method==='GET'&&p==='/api/wear/history')return {actions:copy(model.actions.filter(a=>(!q.get('from')||a.wear_date>=q.get('from'))&&(!q.get('to')||a.wear_date<=q.get('to'))).sort((a,b)=>b.wear_date.localeCompare(a.wear_date)||b.action_id-a.action_id).slice(0,Number(q.get('limit')||200)))};
    if((m=p.match(/^\/api\/wear\/day\/(\d{4}-\d{2}-\d{2})$/))&&method==='GET')return {wear_date:m[1],items:model.items.filter(i=>datesFor(i.id).includes(m[1])).map(full)};
    if((m=p.match(/^\/api\/wear\/actions\/(\d+)\/undo$/))&&method==='POST'){const a=model.actions.find(a=>a.action_id===Number(m[1]))||fail(404,'记录不存在。');if(a.undone_at)fail(409,'这次记录已经撤销过了。');a.undone_at=now();const lost=a.items.filter(i=>!datesFor(i.item_id).includes(a.wear_date)).map(i=>i.item_id);return {...copy(a),lost_count_item_ids:lost,still_counted_item_ids:a.items.filter(i=>!lost.includes(i.item_id)).map(i=>i.item_id)};}
    if((m=p.match(/^\/api\/items\/(\d+)\/wear\/(\d{4}-\d{2}-\d{2})$/))&&method==='DELETE'){const id=Number(m[1]);itemOf(id);let n=0;model.actions.filter(a=>!a.undone_at&&a.wear_date===m[2]).forEach(a=>a.items.filter(i=>i.item_id===id&&!i.revoked_at).forEach(i=>{i.revoked_at=now();n++;}));return {item_id:id,wear_date:m[2],revoked_sources:n};}
    if((m=p.match(/^\/api\/items\/(\d+)\/wear-baseline$/))){const id=Number(m[1]);itemOf(id);if(method==='DELETE'){delete model.baselines[id];return {ok:true};}if(method==='PUT'){if(!Number.isInteger(b.count)||b.count<0||b.count>99999||!/^\d{4}-\d{2}-\d{2}$/.test(b.as_of)||b.as_of>day()||!['exact','estimated'].includes(b.precision))fail(400,'历史次数、截止日期或精度不正确。');const overlap=datesFor(id).filter(d=>d<=b.as_of);if(overlap.length&&!b.confirm_overlap)fail(409,'历史次数会覆盖已有记录，确认后再保存。',{overlapping_dates:overlap});model.baselines[id]={...copy(b),item_id:id,created_at:now()};return copy(model.baselines[id]);}}
    if(method==='POST'&&p==='/api/locations'){if(!b.name?.trim())fail(400,'请填写位置名称。');if(b.parent_id!=null)locOf(b.parent_id);const l={id:Math.max(0,...model.locations.map(l=>l.id))+1,parent_id:b.parent_id??null,user_code:b.user_code||'',name:b.name,enabled:true,width_cm:null,height_cm:null,depth_cm:null,usage_note:'',...copy(b)};model.locations.push(l);locationsList();return copy(l);}
    if((m=p.match(/^\/api\/locations\/(\d+)$/))){const l=locOf(m[1]);if(method==='PATCH'){if('parent_id' in b&&Number(b.parent_id)===l.id)fail(400,'位置不能循环。');Object.assign(l,copy(b));locationsList();return copy(l);}if(method==='DELETE'){if(model.locations.some(x=>x.parent_id===l.id)||model.items.some(i=>i.location.current?.id===l.id||i.location.suggested?.id===l.id))fail(409,'位置仍有下级或单品，不能删除。');model.locations=model.locations.filter(x=>x.id!==l.id);return {ok:true};}}
    if(method==='POST'&&p==='/api/locations/batch'){const replay=model.batches.find(x=>x.idempotency_key===b.idempotency_key&&b.idempotency_key);if(replay)return copy({...replay,replayed:true});const ids=[...new Set((b.item_ids||[]).map(Number))];const found=ids.map(itemOf);const conflicts=found.filter(i=>b.versions?.[i.id]!=null&&b.versions[i.id]!==i.location.version).map(i=>({item_id:i.id,reason:'位置已被修改'}));if(conflicts.length)fail(409,'这批未写入，请核对位置。',{conflicts});locOf(b.location_id);const changes=[];let changed=0;found.forEach(i=>{const before=copy(i.location);if(move(i,b)){changed++;changes.push({item_id:i.id,before,after:copy(i.location)});}});const batch={batch_id:crypto.randomUUID(),field:b.field,target:copy(locOf(b.location_id)),changed_count:changed,unchanged_count:ids.length-changed,idempotency_key:b.idempotency_key,changes,undone:false};model.batches.push(batch);return copy(batch);}
    if((m=p.match(/^\/api\/locations\/batch\/([^/]+)\/undo$/))&&method==='POST'){const batch=model.batches.find(x=>x.batch_id===m[1])||fail(404,'批量记录不存在。');if(batch.undone)fail(409,'这批已撤销。');const conflicts=batch.changes.filter(c=>itemOf(c.item_id).location.version!==c.after.version).map(c=>({item_id:c.item_id,reason:'之后又被移动过'}));if(conflicts.length&&!b.skip_conflicts)fail(409,'位置之后被修改过。',{conflicts});const clean=batch.changes.filter(c=>!conflicts.some(x=>x.item_id===c.item_id));clean.forEach(c=>{const i=itemOf(c.item_id);const version=i.location.version+1;i.location=copy(c.before);i.location.version=version;});batch.undone=true;return {batch_id:batch.batch_id,reverted_count:clean.length,conflicts,fully_undone:!conflicts.length};}
    if(method==='GET'&&p==='/api/locations/batches')return {batches:copy(model.batches)};
    if(method==='GET'&&p==='/api/outfits')return {outfits:model.outfits.filter(o=>q.get('include_archived')==='1'||!o.archived_at).map(outfitFull)};
    if(method==='POST'&&p==='/api/outfits'){if(!b.name?.trim())fail(400,'请给这套搭配起个名字。');const o={id:nextOutfit++,name:b.name,source:b.source||'own',source_url:b.source_url||'',source_note:b.source_note||'',created_at:now(),updated_at:now(),archived_at:null,versions:[],assets:[]};newVersion(o,b);model.outfits.push(o);return outfitFull(o);}
    if((m=p.match(/^\/api\/outfits\/(\d+)$/))){const o=outfitOf(m[1]);if(method==='GET')return outfitFull(o);if(method==='PATCH'){['name','source','source_url','source_note'].forEach(k=>{if(k in b)o[k]=b[k];});if('annotation_status' in b)o.latest.annotation_status=b.annotation_status;return outfitFull(o);}}
    if((m=p.match(/^\/api\/outfits\/(\d+)\/(archive|unarchive|versions|photos)$/))&&method==='POST'){const o=outfitOf(m[1]);if(m[2]==='versions'){newVersion(o,b);return outfitFull(o);}if(m[2]==='photos'){if(!(body instanceof Blob)||!body.type.startsWith('image/'))fail(400,'请选图片。');const url=URL.createObjectURL(body);blobs.push(url);o.assets.unshift({asset_id:Date.now(),url});return copy(o.assets[0]);}o.archived_at=m[2]==='archive'?now():null;return outfitFull(o);}
    if((m=p.match(/^\/api\/outfits\/versions\/(\d+)\/(pick-list|wear|feedback)$/))){const v=versionOf(m[1]);if(m[2]==='wear'&&method==='POST')return record({...b,item_ids:b.item_ids?.length?b.item_ids:v.slots.filter(s=>s.item).map(s=>s.item.id),source:'outfit',outfit_version_id:v.id});
      if(m[2]==='feedback'&&method==='POST'){if(!['visual','worn','ai'].includes(b.phase))fail(400,'评价类型不合法。');if(b.phase==='worn'&&!model.actions.some(a=>a.outfit_version_id===v.id&&!a.undone_at))fail(409,'先记录实际穿了这套，再评价实穿感受。');const scores=['liking','comfort','occasion_fit','rewear'];scores.forEach(k=>{if(b[k]!=null&&(!Number.isInteger(b[k])||b[k]<1||b[k]>5))fail(400,'评价需为 1–5 的整数。');});if(scores.every(k=>b[k]==null)&&!b.reason?.trim())fail(400,'至少给一个分数或写一句理由。');const fb={...copy(b),id:Date.now(),created_at:now()};v.feedback.unshift(fb);return fb;}
      if(m[2]==='pick-list'&&method==='GET'){const groups=new Map(),unknown=[],references=[],warnings=[];v.slots.forEach(s=>{if(s.reference){references.push(copy(s.reference));return;}const i=full(itemOf(s.item.id));const entry={item_id:i.id,code:i.code,name:i.display_name||i.name,photo:i.photos[0]?.url||null,role:s.role};if(i.archived_at)warnings.push(i.code+' '+(window.L?L.t('已归档'):'已归档'));if(i.present_piece_count<i.expected_piece_count)warnings.push(i.code+' '+(window.L?L.t('不完整'):'不完整'));const l=i.location.current;if(l){const g=groups.get(l.id)||{location:l,items:[]};g.items.push(entry);groups.set(l.id,g);}else unknown.push({...entry,suggested:i.location.suggested});});return {groups:[...groups.values()],unknown_location:unknown,references,warnings};}}
    // Unsupported service features are explicit errors; never delegate to production.
    return fail(403,'体验版不支持此功能。所有修改仅保留在当前页面，刷新即可恢复。');
  }
  window.OOTDDemo={api,reset};
})();
