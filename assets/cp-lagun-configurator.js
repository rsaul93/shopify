(() => {
  'use strict';
  const locale = document.documentElement.lang || (/^\/en(?:\/|$)/.test(location.pathname) ? 'en-DE' : 'de-DE');
  const t = (value) => window.CpEnglishRuntime?.translate?.(value) || value;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const roles = ['mount', 'leg', 'arm', 'under'];
  const names = {mount:'Befestigung',leg:'Bein',arm:'Arm',under:'Untertischplatte',gap:'GAP',extension:'Erweiterungsarm',extensionArm:'400-mm-Erweiterungsarm',extensionBolt:'Verbindungsbolzen',table:'Tischplatte',service:'Anpassungsservice'};
  const variants = (product) => product?.variants || [];
  const idFromGid = (gid) => String(gid || '').split('/').pop();
  const imageUrl = (product, variant, width=600) => {
    let value = variant?.featured_image?.src || variant?.featured_image?.url || product?.featured_image?.src || product?.featured_image || product?.images?.[0];
    if (typeof value === 'object') value = value.src || value.url;
    if (!value || typeof value !== 'string') return '';
    const url = new URL(value.startsWith('//') ? 'https:'+value : value, location.origin);
    if (!['cdn.shopify.com',location.hostname].includes(url.hostname)) return '';
    url.searchParams.set('width',width); return url.href;
  };
  const isAvailable = (variant) => Boolean(variant?.available);
  const publishAnalytics = (name, data) => {
    try {
      if (window.Shopify?.analytics?.publish) window.Shopify.analytics.publish(name, data || {});
    } catch {}
  };
  function init(root) {
    if (root.dataset.cpConfiguratorReady === 'true') return;
    const read = (selector, fallback) => { try {return JSON.parse(root.querySelector(selector)?.textContent || 'null') || fallback;} catch {return fallback;} };
    const catalog = read('[data-cp-lagun-catalog]', {});
    const variantGids = read('[data-cp-lagun-variant-gids]', {});
    const delivery = read('[data-cp-delivery]', {});
    const purchaseData = read('[data-cp-purchase-clusters]', {});
    let cart = read('[data-cp-initial-cart]', {items:[]}), busy=false, uncertain=false, cartReady=false, refreshTask=null;
    const state = {color:null,mount:null,mountVariant:null,leg:null,arm:'400',under:null,table:null,gap:false,extension:false,extensionLength:'300',service:false,previewFold:true};
    const service={legHandle:'original',armHandle:'original',shorten:false,length:'',instructions:''};
    const assignments = {}, excluded = new Set(), savedColors = {};
    const currency=root.dataset.currency || 'EUR';
    const money = cents => new Intl.NumberFormat(locale,{style:'currency',currency}).format(cents/100);
    const $ = selector=>root.querySelector(selector), $$=selector=>Array.from(root.querySelectorAll(selector));
    const status=$('[data-cp-status]'),add=$('[data-cp-add]'),checkout=$('[data-cp-checkout]'),summary=$('[data-cp-lagun-summary]');
    const color=()=>state.color==='black'?'Schwarz':'Silber';
    const route = path => (window.Shopify?.routes?.root || '/')+path;
    publishAnalytics('cp_lagun_configurator_viewed', {
      version: root.dataset.cpLagunConfiguratorVersion || 'redesign-v1',
      locale: locale.toLowerCase()
    });
    const variantFor = (product, semanticKey) => {
      const id = idFromGid(variantGids[semanticKey]);
      return id ? variants(product).find(variant => String(variant.id) === id) || null : null;
    };

    function resolve(choice,value,forceColor) {
      const savedColorRole=choice==='mountVariant'?'mount':['extensionArm','extensionBolt'].includes(choice)?'extension':choice;
      const tone=forceColor || savedColors[savedColorRole] || (state.color || 'silver'), black=tone==='black';
      let key=null,variant=null;
      if(choice==='mount'){const mountValue=value==='wall'?'standard':'flush';key=value==='wall'?(black?'wallStandardBlack':'wallStandard'):'floor';variant=variantFor(catalog[key],`mount.${mountValue}.${tone}`);}
      if(choice==='mountVariant'){
        key=({standard:black?'wallStandardBlack':'wallStandard',smart:black?'wallSmartBlack':'wallSmart',flush:'floor',surface:'floor'})[value];
        variant=variantFor(catalog[key],`mount.${value}.${tone}`);
      }
      if(choice==='leg'){key=value==='500plus'?'adjustableLeg':'legs';variant=variantFor(catalog[key],`leg.${value}.${tone}`);}
      if(choice==='arm'){key=black?'armBlack':'armSilver';variant=variantFor(catalog[key],`arm.${value}.${tone}`);}
      if(choice==='under'){key=value==='fold'?'foldingUnderTable':'underTable';variant=variantFor(catalog[key],`under.${value}.${tone}`);}
      if(choice==='gap'){const gapValue=state.mountVariant==='smart'?'smart':'standard';key=gapValue==='smart'?'compactGap':'gap';variant=variantFor(catalog[key],`gap.${gapValue}.${tone}`);}
      if(choice==='extension'){
        const length=String(value===true?(state.extensionLength||'300'):(value||'300'));
        if(length==='400'){
          const arm=resolve('extensionArm','400',tone),bolt=resolve('extensionBolt','400',tone);
          return {key:'extension400',product:arm?.product,variant:arm?.variant,image:arm?.image||bolt?.image,available:Boolean(arm?.available&&bolt?.available),choice,value:length,price:Number(arm?.price||0)+Number(bolt?.price||0),color:tone,components:[arm,bolt]};
        }
        key=black?'extraArm':'extraArmSilver';variant=variantFor(catalog[key],`extension.300.${tone}`);
      }
      if(choice==='extensionArm'){key=black?'armBlack':'armSilver';variant=variantFor(catalog[key],`extension.400.arm.${tone}`);}
      if(choice==='extensionBolt'){key='extensionBolt';variant=variantFor(catalog[key],`extension.400.bolt.${tone}`);}
      if(choice==='service'){key='adjustmentService';variant=variantFor(catalog[key],'service.default');}
      if(choice==='table'){
        if(value==='own')return null;
        key=value==='poplar'?'poplarTop':value==='ponga'?'pongaTop':'tableTop';
        variant=variantFor(catalog[key],`table.${value}`);
      }
      if(!key)return null;
      const product=catalog[key];
      const preview=variant || (tone==='black'?resolve(choice,value,'silver')?.variant:null);
      const smartVariant=variantFor(catalog[black?'wallSmartBlack':'wallSmart'],`mount.smart.${tone}`);
      const price=choice==='mount'&&value==='wall'?Math.min(Number(variant?.price||0),Number(smartVariant?.price||variant?.price||0)):Number(variant?.price||0);
      return {key,product,variant,image:imageUrl(product,preview),available:isAvailable(variant),choice,value,price,color:['table','service'].includes(choice)?null:tone};
    }
    function selected() {
      const parts=[];
      if(state.mountVariant)parts.push({...resolve('mountVariant',state.mountVariant),role:'mount'});
      for(const role of ['leg','arm','under'])if(state[role])parts.push({...resolve(role,state[role]),role});
      if(state.gap&&state.mount==='wall'&&state.mountVariant)parts.push({...resolve('gap',true),role:'gap'});
      if(state.extension){
        if(state.extensionLength==='400'){
          parts.push({...resolve('extensionArm','400'),role:'extensionArm',properties:{'_CP Lagun Rolle':'Erweiterungsarm 400 mm'}});
          parts.push({...resolve('extensionBolt','400'),role:'extensionBolt',properties:{'_CP Lagun Rolle':'Verbindungsbolzen 400 mm'}});
        }else parts.push({...resolve('extension','300'),role:'extension'});
      }
      if(state.table&&state.table!=='own')parts.push({...resolve('table',state.table),role:'table'});
      if(state.service)parts.push({...resolve('service',true),role:'service',properties:serviceProperties()});
      return parts;
    }
    const titles={standard:'Standard',smart:'Smart',flush:'Flush',surface:'Aufgesetzt','400':'400 mm','500':'500 mm','700':'700 mm','500plus':'500 mm · zwei Griffe',fold:'Dreh-/Klappachse',oakModern:'Eiche modern',pine:'Fichte / Kiefer',concrete:'Betonoptik',oakLight:'Eiche hell',poplar:'Pappelholz · Weiß',ponga:'Ponga · Eiche'};
    function partLabel(part){
      if(part.role==='service')return 'Anpassungsservice';
      if(part.role==='mount')return (state.mount==='floor'?'Bodenadapter ':'Wandplatte ')+(titles[part.value]||'');
      if(part.role==='gap')return state.mountVariant==='smart'?'GAP klein':'GAP Standard';
      if(part.role==='extension')return '300-mm-Arm + Bolzen';
      if(part.role==='extensionArm')return '400-mm-Erweiterungsarm';
      if(part.role==='extensionBolt')return 'Verbindungsbolzen zur 400-mm-Verlängerung';
      if(part.role==='arm')return '400-mm-Basisarm';
      if(part.role==='leg')return (titles[part.value]||'')+' Bein';
      if(part.role==='table')return titles[part.value]||'Tischplatte';
      return titles[part.value]+'-Untertischplatte';
    }

    // Exact variant mappings serve both preview cards and cart recognition.
    const index=new Map();
    const register=(role,choice,value,tone)=>{const p=resolve(choice,value,tone);if(p?.variant)index.set(String(p.variant.id),{...p,role});};
    ['silver','black'].forEach(tone=>{
      ['standard','smart','flush','surface'].forEach(value=>register('mount','mountVariant',value,tone));
      ['400','500','700','500plus'].forEach(value=>register('leg','leg',value,tone));
      register('arm','arm','400',tone);
      ['standard','fold'].forEach(value=>register('under','under',value,tone));
      register('extension','extension','300',tone);
      register('extensionBolt','extensionBolt','400',tone);
      ['standard','smart'].forEach(value=>{
        const key=value==='smart'?'compactGap':'gap',variant=variantFor(catalog[key],`gap.${value}.${tone}`);
        if(variant)index.set(String(variant.id),{role:'gap',key,variant,product:catalog[key],value,color:tone,image:imageUrl(catalog[key],variant)});
      });
    });
    ['oakModern','pine','concrete','oakLight','poplar','ponga'].forEach(value=>register('table','table',value,'silver'));
    register('service','service',true,'silver');
    // Older single 400-mm silver arm is identical in role and remains recognized.
    index.set(idFromGid(variantGids['legacy.arm.400.silver']),{role:'arm',choice:'arm',value:'400',color:'silver'});
    const knownSets=new Map();
    for(const tone of ['silber','schwarz']){
      const base='lagun-tischgestell-set-mit-';
      const options=[
        ['standard-befestigungsplatte-','standard','500','standard'],
        ['smarter-befestigungsplatte-','smart','500','standard'],
        ['400mm-tischbein-','standard','400','standard'],
        ['700mm-tischbein-','standard','700','standard'],
        ['dreh-klappbarer-untertischbefestigungsplatte-','standard','500','fold']
      ];
      options.forEach(([suffix,mount,leg,under])=>knownSets.set(base+suffix+tone,{mount,leg,under,arm:'400',color:tone==='schwarz'?'black':'silver'}));
    }
    function cartCandidates() {
      const found=Object.fromEntries(Object.keys(names).map(role=>[role,[]]));
      function visit(item,parentKey=''){
        if(!(item.quantity>0))return;
        const configuredRole=item.properties?.['_CP Lagun Rolle'];
        let mapped;
        if(configuredRole==='Erweiterungsarm 400 mm'){
          const variantId=String(item.variant_id||item.id),tone=variantId===idFromGid(variantGids['extension.400.arm.black'])?'black':'silver';
          mapped={...resolve('extensionArm','400',tone),role:'extensionArm'};
        }else if(configuredRole==='Verbindungsbolzen 400 mm'){
          const variantId=String(item.variant_id||item.id),tone=variantId===idFromGid(variantGids['extension.400.bolt.black'])?'black':'silver';
          mapped={...resolve('extensionBolt','400',tone),role:'extensionBolt'};
        }else mapped=index.get(String(item.variant_id||item.id));
        if(mapped?.role==='service'&&(!state.service||item.properties?.['_Lagun Anpassung']!==serviceProperties()['_Lagun Anpassung']))return;
        if(mapped){found[mapped.role].push({...mapped,key:(parentKey?parentKey+'/':'')+(item.key||item.id),label:item.product_title||item.title,image:item.image||mapped.image,quantity:item.quantity,cartPrice:item.final_price??item.price??null});return;}
        const set=knownSets.get(item.handle);
        if(set)roles.forEach(role=>found[role].push({role,key:(item.key||item.id)+':'+role,label:item.product_title||item.title,value:set[role],color:set.color,image:item.image,fromSet:true,setKey:item.key||item.id,cartPrice:item.final_price??item.price??null}));
        else if(item.item_components?.length)item.item_components.forEach(child=>visit(child,item.key||parentKey));
      }
      (cart.items||[]).forEach(item=>visit(item));
      return found;
    }
    function compatible(candidate){
      if(candidate.role==='mount'&&state.mount)return state.mount==='floor'?['flush','surface'].includes(candidate.value):['standard','smart'].includes(candidate.value);
      if(candidate.role==='gap')return state.mount==='wall'&&candidate.value===state.mountVariant;
      return true;
    }
    function reconcile(candidates){
      Object.keys(names).forEach(role=>{
        const items=candidates[role].filter(compatible);
        if(assignments[role]&&!items.some(item=>item.key===assignments[role]))delete assignments[role];
        if(!assignments[role]&&!excluded.has(role)&&items.length===1)assignments[role]=items[0].key;
      });
    }
    const assigned=(role,candidates)=>candidates[role]?.find(item=>item.key===assignments[role]&&compatible(item));
    function adopt(candidate){
      if(candidate.role==='mount'){state.mount=['flush','surface'].includes(candidate.value)?'floor':'wall';state.mountVariant=candidate.value;}
      else if(['leg','arm','under','table'].includes(candidate.role))state[candidate.role]=candidate.value;
      else if(candidate.role==='extension'){state.extension=true;state.extensionLength='300';}
      else if(['extensionArm','extensionBolt'].includes(candidate.role)){state.extension=true;state.extensionLength='400';}
      else if(candidate.role==='gap')state.gap=true;
    }
    function serviceProperties(){
      const positions={original:'Unverändert',opposite:'Auf die gegenüberliegende Seite'};
      const target=role=>{
        const key=assignments[role];
        if(key){
          const item=(cart.items||[]).find(item=>key===item.key||key===item.key+':'+role);
          if(item)return names[role]+' aus '+(item.title||item.product_title)+' [Variante '+(item.variant_id||item.id)+']';
        }
        const p=state[role]&&resolve(role,state[role]);
        return p?.variant?(p.product.title+' · '+p.variant.title+' [Variante '+p.variant.id+']'):'Noch nicht gewählt';
      };
      const data={
        [t('Griff am Bein')]:t(positions[service.legHandle]),
        [t('Griff am Arm')]:t(positions[service.armHandle]),
        [t('Fertige Metalllänge')]:service.shorten?String(service.length)+t(' mm, ohne Kunststoffbolzen'):t('Unverändert'),
        [t('Deine Angaben')]:service.instructions.trim(),
        [t('Bezug Bein')]:t(target('leg')),
        [t('Bezug Arm')]:t(target('arm'))
      };
      // Stable across successful addition: use variant IDs rather than new cart line keys.
      const targetId=role=>{
        const key=assignments[role];
        const item=(cart.items||[]).find(item=>item.key===key);
        return item?.variant_id||item?.id||resolve(role,state[role])?.variant?.id||state[role];
      };
      data['_Lagun Anpassung']=JSON.stringify([targetId('leg'),targetId('arm'),service.legHandle,service.armHandle,service.shorten?String(service.length):'',service.instructions.trim()]);
      Object.assign(data,logisticsProperties(targetId));
      return data;
    }
    function logisticsProperties(targetId){
      const variantId=role=>{const value=targetId?targetId(role):resolve(role,state[role])?.variant?.id;return /^\d+$/.test(String(value||''))?String(value):'';};
      return {'_CP Logistics Version':'1','_CP Logistics Quelle':'lagun-konfigurator','_CP Lagun Bein Variante':variantId('leg'),'_CP Lagun Arm Variante':variantId('arm'),'_CP Lagun Griff Bein':service.legHandle,'_CP Lagun Griff Arm':service.armHandle,'_CP Lagun Länge mm':service.shorten?String(service.length):'','_CP Lagun Maßbezug':'metall_ohne_kunststoffbolzen','_CP Lagun Auswahl':JSON.stringify({color:state.color,mount:state.mount,mountVariant:state.mountVariant,leg:state.leg,arm:state.arm,under:state.under,extension:state.extension,extensionLength:state.extensionLength,gap:state.gap,table:state.table})};
    }
    function serviceError(){
      if(!state.service)return '';
      const variantId=first(catalog.adjustmentService)?.id;
      const existing=(cart.items||[]).filter(item=>Number(item.variant_id||item.id)===Number(variantId));
      if(existing.length&&!existing.some(item=>item.properties?.['_Lagun Anpassung']===serviceProperties()['_Lagun Anpassung']))return 'Ein Anpassungsservice mit anderen oder noch offenen Angaben liegt bereits im Warenkorb. Bitte prüfe ihn dort, damit du den Service nicht doppelt bestellst.';
      if(service.legHandle==='original'&&service.armHandle==='original'&&!service.shorten)return 'Wähle bitte eine Griff-Anpassung oder das Kürzen des Beins.';
      if(((state.leg==='500plus'&&service.legHandle!=='original')||(state.extension&&service.armHandle!=='original'))&&!service.instructions.trim())return 'Gib bitte an, welcher der beiden Griffe beziehungsweise welcher Arm betroffen ist. Der gewählte Griff wird umgedreht.';
      if(service.shorten){
        const nominal=state.leg==='500plus'?500:Number(state.leg),length=Number(service.length);
        if(!nominal)return 'Wähle zuerst dein Tischbein, damit wir die Kürzung prüfen können.';
        if(!Number.isInteger(length)||length<170||length>=nominal)return 'Gib die fertige Metalllänge zwischen 170 und '+(nominal-1)+' mm an – ohne Kunststoffbolzen.';
      }
      return '';
    }
    function stockLabel(part){
      if(!part?.variant)return 'In dieser Farbe nicht erhältlich';
      if(!part.available)return 'Aktuell ausverkauft';
      const meta=delivery[part.variant.id];
      return meta?.preorder?(meta.date?'Vorbestellbar · '+new Intl.DateTimeFormat(locale).format(new Date(meta.date+'T12:00:00')):'Vorbestellbar · Liefertermin auf Produktseite'):'Verfügbar';
    }
    function setImage(img,src,alt){
      if(!img||!src)return;
      if(img.getAttribute('src')!==src){img.removeAttribute('srcset');img.src=src;}
      if(alt)img.alt=alt;
    }
    function visuals(){
      $$('[data-cp-choice]').forEach(button=>{
        if(button.tagName!=='BUTTON')return;
        const {cpChoice:choice,value}=button.dataset;
        const active=state[choice]===value;
        button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active));
        const part=resolve(choice,value);
        if(!part)return;
        const customImage=state.color==='black'&&choice!=='table'?button.dataset.imageBlack:button.dataset.imageSilver;
        setImage(button.querySelector('img'),customImage||part.image,(button.querySelector('strong')?.textContent||'Lagun')+(choice==='table'?'':part.variant?' · '+(part.variant.title==='Default Title'?color():part.variant.title):' · Silber als Ansicht'));
        const unavailable=choice!=='mount'&&!part.available;
        button.classList.toggle('is-unavailable',unavailable);button.setAttribute('aria-disabled',String(unavailable));
        const price=button.querySelector('[data-cp-choice-price]'),stock=button.querySelector('[data-cp-choice-stock]');
        if(price)price.textContent=part.variant?(choice==='mount'?'Ab ':'')+money(part.price):'–';
        if(stock)stock.textContent=choice==='mount'?'Einbauart wählen':stockLabel(part);
      });
      $$('[data-cp-followup]').forEach(node=>node.hidden=node.dataset.cpFollowup!==state.mount);
      $$('.cp-lagun-choice-grid').forEach(grid=>{
        const children=Array.from(grid.children),focus=document.activeElement;
        children.forEach((node,i)=>{if(!node.dataset.cpOriginalOrder)node.dataset.cpOriginalOrder=String(i+1);});
        const sorted=[...children].sort((a,b)=>Number(a.classList.contains('is-unavailable'))-Number(b.classList.contains('is-unavailable'))||Number(a.dataset.cpOriginalOrder)-Number(b.dataset.cpOriginalOrder));
        if(sorted.some((node,i)=>node!==children[i])){
          sorted.forEach(node=>grid.appendChild(node));
          if(focus&&grid.contains(focus))focus.focus({preventScroll:true});
        }
      });
      $$('input[data-cp-choice]').forEach(input=>input.checked=Boolean(state[input.dataset.cpChoice]));
      $$('[data-cp-color]').forEach(button=>{const active=button.dataset.cpColor===state.color;button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active));});
      root.style.setProperty('--lc-part',state.color==='black'?'#3f4b59':'#aebcc9');
      root.style.setProperty('--lc-part-side',state.color==='black'?'#202c3b':'#7f93a7');
      $('[data-cp-color-note]').textContent=state.color?color()+' ist gewählt. Du kannst jederzeit wechseln; deine Maße und Bauformen bleiben erhalten.':'Die Bauteile unten zeigen zunächst Silber. Vergleiche beide Farben – deine übrige Auswahl bleibt erhalten.';
      const gap=resolve('gap',true),baseArm=resolve('arm','400'),extension300=resolve('extension','300'),extension400=resolve('extension','400');
      setImage($('[data-cp-gap-image]'),gap.image);
      $('[data-cp-gap-label]').textContent=state.mountVariant?(state.mountVariant==='smart'?'GAP klein für deine Smart-Platte':'GAP Standard für deine Standard-Platte')+' · '+color():'Wähle zuerst Standard oder Smart. Der passende GAP folgt automatisch.';
      $('[data-cp-gap-price]').textContent=state.mountVariant?(gap.available?money(gap.price):stockLabel(gap)):'';
      const gapInput=$('input[data-cp-choice="gap"]');gapInput.disabled=!state.mountVariant||!gap.available;
      gapInput.closest('.cp-lagun-gap-guide__selection').classList.toggle('is-unavailable',!gap.available);
      $$('[data-cp-arm-configuration]').forEach(input=>{
        const value=input.value,part=value==='base'?baseArm:value==='400'?extension400:extension300;
        const available=Boolean(baseArm.available&&(value==='base'||part.available));
        const selected=value==='base'?!state.extension:state.extension&&state.extensionLength===value;
        input.checked=state.arm==='400'&&selected;input.disabled=!available;
        const option=input.closest('[data-cp-arm-configuration-option]');
        option.classList.toggle('is-selected',input.checked);option.classList.toggle('is-unavailable',!available);option.setAttribute('aria-disabled',String(!available));
        setImage($('[data-cp-arm-configuration-image="'+value+'"]'),part.image);
        $('[data-cp-arm-configuration-price="'+value+'"]').textContent=value==='base'?money(baseArm.price):t('Aufpreis')+' '+money(part.price);
        $('[data-cp-arm-configuration-stock="'+value+'"]').textContent=available?stockLabel(value==='base'?baseArm:part):stockLabel(!baseArm.available?baseArm:part);
      });
      const servicePart=resolve('service',true);
      $('[data-cp-service-price]').textContent=servicePart.available?money(servicePart.price):stockLabel(servicePart);
      $('input[data-cp-choice="service"]').disabled=!servicePart.available;
      $('[data-cp-service-fields]').hidden=!state.service;
      $('[data-cp-service-measure]').hidden=!service.shorten;
      if(!$('[data-cp-service-measure]').dataset.customImage)setImage($('[data-cp-service-measure] > img'),resolve('leg',state.leg||'500').image);
      const nominal=state.leg==='500plus'?500:Number(state.leg),length=Number(service.length);
      $('[data-cp-service-field="length"]').max=nominal?String(nominal-1):'699';
      $('[data-cp-length-help]').textContent=nominal&&Number.isInteger(length)&&length>=170&&length<nominal?'Aus '+nominal+' mm werden '+length+' mm Metall. Wir kürzen um '+(nominal-length)+' mm.':'Gewünschte Endlänge in Millimetern eingeben. Mindestens 170 mm Metall bleiben stehen.';
      $('[data-cp-service-validation]').textContent=serviceError()||'Deine Angaben werden am Service-Artikel im Warenkorb hinterlegt.';
      $$('[data-cp-product-description]').forEach(node=>{
        const role=node.dataset.cpProductDescription;
        const choice=role==='mount'?'mountVariant':role;
        const value=role==='mount'?(state.mountVariant||'standard'):(state[role]||({leg:'500',arm:'400',under:'standard',table:'oakModern'})[role]);
        const part=resolve(choice,value);
        node.closest('details').hidden=!part?.product;
        if(!part?.product||node.dataset.productId===String(part.product.id))return;
        node.dataset.productId=String(part.product.id);node.innerHTML=part.product.description||part.product.body_html||'';
        $('[data-cp-product-info-title="'+role+'"]').textContent='Mehr zu: '+part.product.title;
        $('[data-cp-product-link="'+role+'"]').href=route('products/'+part.product.handle);
      });
    }
    function model(){
      const candidates=cartCandidates();reconcile(candidates);
      const parts=selected(),filled=roles.filter(role=>assigned(role,candidates)||parts.some(p=>p.role===role&&p.variant));
      const missing=roles.filter(role=>!filled.includes(role));
      const additions=parts.filter(p=>!assigned(p.role,candidates));
      return {candidates,parts,filled,missing,additions,unavailable:additions.filter(p=>!p.available),total:additions.reduce((n,p)=>n+p.price,0)};
    }

    function renderAssembly(m) {
      const reveal=(node,visible)=>node.toggleAttribute('hidden',!visible);
      const chosen=role=>assigned(role,m.candidates)||m.parts.find(p=>p.role===role);
      const extension=Boolean(chosen('extension')?.variant||chosen('extensionArm')?.variant),under=chosen('under');
      const fold=under?.value==='fold',tilted=fold&&state.previewFold;
      const mount=chosen('mount')?.value||state.mountVariant||(state.mount==='floor'?'flush':'standard');
      const drawing=$('[data-cp-assembly]'),prefix=drawing.dataset.drawingId;
      drawing.classList.toggle('has-extension',extension);
      drawing.classList.toggle('has-fold',fold);
      drawing.classList.toggle('is-floor',['flush','surface'].includes(mount));
      $$('[data-assembly-piece]').forEach(piece=>{
        const role=piece.dataset.assemblyPiece,p=chosen(role);
        piece.classList.toggle('is-complete',role==='extension'?extension:m.filled.includes(role));
        piece.classList.toggle('is-floor',role==='mount'&&['flush','surface'].includes(mount));
        const tone=p?.color||state.color||'silver';
        piece.style.setProperty('--part-face','url(#'+prefix+'-'+tone+'-face)');
        piece.style.setProperty('--part-top','url(#'+prefix+'-'+tone+'-top)');
        piece.style.setProperty('--part-side',tone==='black'?'#202d39':'#8b9ba9');
        piece.style.setProperty('--part-edge',tone==='black'?'#24303d':'#8999a7');
      });
      $$('[data-mount-shape]').forEach(node=>reveal(node,node.dataset.mountShape===mount));
      $('[data-assembly-head]').setAttribute('transform',extension?'translate(140 63)':'translate(240 107)');
      $$('[data-under-shape]').forEach(node=>reveal(node,node.dataset.underShape===(fold?'fold':'standard')));
      $$('[data-fold-plane]').forEach(node=>reveal(node,node.dataset.foldPlane===(tilted?'tilted':'flat')));
      $$('[data-table-plane]').forEach(node=>reveal(node,node.dataset.tablePlane===(tilted?'tilted':'flat')));
      reveal($('[data-assembly-extra="extension"]'),extension);
      $('[data-cp-extension-marker]').hidden=!extension;
      reveal($('[data-assembly-extra="table"]'),Boolean(chosen('table')));
      const gap=$('[data-assembly-extra="gap"]'),gapPart=chosen('gap');
      reveal(gap,Boolean(gapPart)&&['standard','smart'].includes(mount));
      gap.classList.toggle('is-complete',!gap.hasAttribute('hidden'));
      const gapTone=gapPart?.color||state.color||'silver';
      gap.style.setProperty('--part-face','url(#'+prefix+'-'+gapTone+'-face)');
      gap.style.setProperty('--part-top','url(#'+prefix+'-'+gapTone+'-top)');
      gap.style.setProperty('--part-side',gapTone==='black'?'#202d39':'#8b9ba9');
      $$('[data-gap-shape]').forEach(node=>reveal(node,node.dataset.gapShape===mount));
      reveal($('[data-assembly-double-grip]'),chosen('leg')?.value==='500plus');
      const toggle=$('[data-cp-fold-preview]');
      toggle.hidden=!fold;toggle.setAttribute('aria-pressed',String(tilted));
      toggle.textContent=tilted?'Tischplatte wieder aufklappen ↗':'Klappfunktion ansehen ↘';
      const caption=extension?'400-mm-Arm + '+state.extensionLength+'-mm-Verlängerung':chosen('arm')?'400-mm-Schwenkarm':'Dein Gestell wächst mit deiner Auswahl';
      $('[data-cp-assembly-caption]').textContent=caption+(fold?' · Klappplatte':'');
      $('[data-cp-assembly-svg]').setAttribute('aria-label','Dein Lagun mit '+(extension?'zwei verbundenen Schwenkarmen':'einem Schwenkarm')+' und '+(fold?(tilted?'abgeklappter':'waagerechter')+' Klapp-Unterplatte':'Standard-Unterplatte'));
    }

    function closestPurchaseCluster(selection,data=purchaseData){
      if(!selection.mount||!selection.under)return null;
      const eligible=(data.clusters||[]).filter(c=>c.mount===selection.mount&&c.under===selection.under&&c.extension===selection.extension&&Number.isInteger(c.count)&&c.count>0);
      const distance=c=>[['mountVariant',10],['leg',6],['color',4],['gap',2]].reduce((sum,[key,weight])=>sum+(c[key]===selection[key]?0:weight),0);
      eligible.sort((a,b)=>distance(a)-distance(b)||b.count-a.count||a.label.localeCompare(b.label));
      const closest=eligible[0];if(!closest)return null;
      // Broader families are deduplicated separately, never summed from overlapping clusters.
      const family=(data.families||[]).find(c=>c.mount===selection.mount&&c.under===selection.under&&c.extension===selection.extension);
      if((closest.count<10||selection.color==='mixed')&&family?.count>=3)return {...family,broad:true};
      return closest.count>=3?closest:null;
    }
    function renderPurchaseProof(m){
      const box=$('[data-cp-purchase-proof]');if(!box)return;
      const part=role=>assigned(role,m.candidates)||m.parts.find(p=>p.role===role);
      if(!state.color||m.missing.length||m.unavailable.length){box.hidden=true;return;}
      const mount=part('mount')?.value,colors=new Set(roles.map(r=>part(r)?.color).filter(Boolean));
      const selection={mount:['flush','surface'].includes(mount)?'floor':'wall',mountVariant:mount,leg:part('leg')?.value,under:part('under')?.value,color:colors.size===1?[...colors][0]:'mixed',extension:Boolean(part('extension')||part('extensionArm')),gap:Boolean(part('gap'))};
      const match=closestPurchaseCluster(selection);box.hidden=!match;if(!match)return;
      $('[data-cp-purchase-count]').textContent=new Intl.NumberFormat(locale).format(match.count)+' Kunden';
      $('[data-cp-purchase-label]').textContent=match.label+(match.broad?' · verschiedene Farben und Beinlängen':'');
      $('[data-cp-purchase-period]').textContent='Bestellungen vom 09.09.2024 bis 08.09.2026 · jeder Kunde in dieser Vergleichsgruppe einmal gezählt.';
    }

    function render(){
      visuals();const m=model();
      renderAssembly(m);renderPurchaseProof(m);
      const ready=Boolean(state.color&&m.missing.length===0&&m.unavailable.length===0&&!serviceError());
      const complete=ready&&Boolean(state.table);
      root.classList.toggle('is-frame-ready',ready);root.classList.toggle('is-config-complete',complete);
      $('[data-cp-success]').hidden=!ready;
      $('[data-cp-success-title]').textContent=complete?'Geschafft! Dein Lagun ist fertig konfiguriert.':'Dein Gestell steht – alle 4 Bauteile sind gewählt!';
      $('[data-cp-success-copy]').textContent=complete?'Deine Auswahl ist vollständig. Du kannst sie jetzt zum Warenkorb hinzufügen oder direkt zur Kasse gehen.':'Jetzt fehlt nur noch die Tischplatte: Wähle dein Material oder „Eigene Tischplatte verwenden“. Extras bleiben freiwillig.';
      $('[data-cp-success-next]').hidden=complete;
      $('[data-cp-mobile-title]').textContent=complete?'Geschafft!':ready?'Gestell vollständig':'Dein Lagun';
      $$('[data-cp-jump]').forEach(marker=>{const role=marker.dataset.cpJump;marker.classList.toggle('is-complete',m.filled.includes(role));marker.classList.toggle('is-cart',Boolean(assigned(role,m.candidates)));});
      $('[data-cp-count]').textContent=m.filled.length+'/4';$('[data-cp-progress-mini]').textContent=m.filled.length+' / 4';
      $('[data-cp-progress-bar]').style.width=(m.filled.length*25)+'%';
      $('[data-cp-progress]').textContent=m.missing.length?'Noch offen: '+m.missing.map(role=>names[role]).join(', ')+'.':'Dein Gestell ist vollständig. '+(state.table==='own'?'Du verwendest deine eigene Tischplatte.':state.table?'Deine Tischplatte ist ausgewählt.':'Tischplatte separat wählen.');
      const rows=[],setPrices=new Map();
      for(const role of Object.keys(names)){
        const existing=assigned(role,m.candidates),part=m.parts.find(p=>p.role===role),availableCandidates=m.candidates[role].filter(compatible);
        if(!roles.includes(role)&&!existing&&!part)continue;
        const image=existing?.image||part?.image;
        const label=existing?(existing.fromSet?names[role]+' im Set':existing.label):part?partLabel(part):names[role];
        const isMismatch=existing?.color&&state.color&&existing.color!==state.color;
        const icon=image?'<img src="'+escape(image)+'" width="34" height="38" alt="">':'<span class="cp-summary-missing">'+(roles.includes(role)?roles.indexOf(role)+1:'+')+'</span>';
        if(existing?.fromSet)setPrices.set(existing.setKey,existing);
        let detail=existing?'Bereits im Warenkorb · kein Aufpreis':part?(part.available?(role==='service'?'Deine Anpassungsangaben werden gespeichert':'Ausgewählt · '+(part.color==='black'?'Schwarz':part.color==='silver'?'Silber':'Dekor')):stockLabel(part)):'Noch auswählen';
        rows.push('<li>'+icon+'<span>'+escape(label)+'<small class="'+(existing?'cp-summary-meta':'')+'">'+escape(detail)+'</small>'+(isMismatch?'<small class="cp-summary-warning">Abweichende Farbe bleibt erhalten</small>':'')+(existing?'<button type="button" class="cp-summary-release" data-cp-release="'+role+'">Für dieses Gestell nicht verwenden</button>':'')+'</span><strong>'+(existing?(existing.fromSet?'Im Set':existing.cartPrice!=null?escape(money(existing.cartPrice)):'Vorhanden'):part?.variant?escape(money(part.price)):'–')+'</strong>');
        if(availableCandidates.length&&(!existing||availableCandidates.length>1)){
          rows.push('<select aria-label="'+escape(names[role])+' aus dem Warenkorb zuordnen" data-cp-cart-assignment="'+role+'"><option value="">Warenkorbteil zuordnen …</option>'+availableCandidates.map(item=>'<option value="'+escape(item.key)+'"'+(existing?.key===item.key?' selected':'')+'>'+escape(item.label)+'</option>').join('')+'</select>');
        }
        rows.push('</li>');
      }
      setPrices.forEach(item=>rows.push('<li class="cp-summary-set-price"><span>Set bereits im Warenkorb<small>Enthaltene Grundteile oben · kein Aufpreis</small></span><strong>'+(item.cartPrice!=null?escape(money(item.cartPrice)):'Im Warenkorb')+'</strong></li>'));
      if(state.table==='own')rows.push('<li><span class="cp-summary-missing">✓</span><span>Eigene Tischplatte<small>Keine zusätzliche Platte ergänzen</small></span><strong>–</strong></li>');
      $('[data-cp-summary-items]').innerHTML=rows.join('');
      $('[data-cp-summary-total]').textContent=money(m.total);
      $('[data-cp-price-description]').textContent=m.additions.length?m.additions.length+' neue Artikel · Einzelpreise ansehen':'Bestandteile & Einzelpreise ansehen';
      $('[data-cp-mobile-price]').textContent=m.total?money(m.total)+' · Übersicht ↑':'Auswahl ansehen ↑';
      const used=roles.filter(role=>assigned(role,m.candidates)).length;
      $('[data-cp-summary-cart]').textContent=used?used+' Grundbauteil'+(used===1?'':'e')+' bereits im Warenkorb':'';
      add.disabled=busy||uncertain||!cartReady||!state.color||m.missing.length>0||m.unavailable.length>0||m.additions.length===0||Boolean(serviceError());
      add.textContent=busy?'Wird geprüft …':uncertain?'Warenkorb prüfen':!cartReady?'Warenkorb wird geprüft …':!state.color?'Bitte Farbe wählen':m.missing.length?'Noch '+m.missing.length+' Grundbauteil'+(m.missing.length===1?'':'e')+' wählen':m.unavailable.length?'Ausführung nicht verfügbar':!m.additions.length?'Bereits im Warenkorb':'Zum Warenkorb hinzufügen';
      if(!busy&&cartReady&&state.color&&!m.missing.length&&!m.unavailable.length&&serviceError())add.textContent='Anpassungswünsche vervollständigen';
      checkout.disabled=busy||uncertain||!cartReady||!state.color||m.missing.length>0||m.unavailable.length>0||Boolean(serviceError());
      checkout.textContent=busy?'Wird geprüft …':'Direkt zur Kasse →';
      $$('[data-cp-color],button[data-cp-choice],[data-cp-service-field],[data-cp-config-action],[data-cp-config-file],[data-cp-cart-assignment],[data-cp-release]').forEach(el=>el.disabled=busy);
      if(busy)$$('input[data-cp-choice],[data-cp-arm-configuration]').forEach(el=>el.disabled=true);
      $$('[data-cp-cart-assignment]').forEach(select=>select.addEventListener('change',()=>{
        const candidate=m.candidates[select.dataset.cpCartAssignment].find(p=>p.key===select.value);
        if(candidate){assignments[candidate.role]=candidate.key;excluded.delete(candidate.role);adopt(candidate);}render();
      }));
      $$('[data-cp-release]').forEach(button=>button.addEventListener('click',()=>{
        const role=button.dataset.cpRelease;delete savedColors[role];delete assignments[role];excluded.add(role);
        if(role==='mount')state.mountVariant=null;
        else if(role==='gap')state.gap=false;
        else if(['extension','extensionArm','extensionBolt'].includes(role)){
          state.extension=false;
          for(const extensionRole of ['extension','extensionArm','extensionBolt']){delete assignments[extensionRole];excluded.add(extensionRole);}
        }else state[role]=null;
        render();
      }));
    }

    const storageKey='cp-lagun-configuration-v1';
    function validateConfiguration(data){
      const fail=()=>{throw new Error('Diese Datei ist keine gültige Lagun-Konfiguration (Version 1).');};
      if(data?.adjustment?.legHandle==='custom'||data?.adjustment?.armHandle==='custom')throw new Error('Diese ältere Konfiguration enthält eine nicht angebotene Griffposition. Bitte wähle „So lassen“ oder „Griff umdrehen“ neu.');
      if(!data||data.version!==1||!data.selection||!data.adjustment)fail();
      const allowed={color:[null,'silver','black'],mount:[null,'wall','floor'],mountVariant:[null,'standard','smart','flush','surface'],leg:[null,'400','500','700','500plus'],arm:[null,'400'],under:[null,'standard','fold'],table:[null,'own','oakModern','pine','concrete','oakLight','poplar','ponga']};
      const selection={},adjustment={},partColors={};
      for(const [key,values] of Object.entries(allowed)){if(!values.includes(data.selection[key]))fail();selection[key]=data.selection[key];}
      for(const key of ['gap','extension','service','previewFold']){if(typeof data.selection[key]!=='boolean')fail();selection[key]=data.selection[key];}
      const extensionLength=data.selection.extensionLength===undefined?'300':data.selection.extensionLength;
      if(!['300','400'].includes(extensionLength))fail();selection.extensionLength=extensionLength;
      if(selection.mountVariant&&!(selection.mount==='wall'?['standard','smart']:selection.mount==='floor'?['flush','surface']:[]).includes(selection.mountVariant))fail();
      if(selection.gap&&(selection.mount!=='wall'||!selection.mountVariant))fail();
      for(const key of ['legHandle','armHandle']){if(!['original','opposite'].includes(data.adjustment[key]))fail();adjustment[key]=data.adjustment[key];}
      if(typeof data.adjustment.shorten!=='boolean')fail();adjustment.shorten=data.adjustment.shorten;
      for(const [key,max] of [['length',4],['instructions',1000]]){if(typeof data.adjustment[key]!=='string'||data.adjustment[key].length>max)fail();adjustment[key]=data.adjustment[key];}
      if(adjustment.length&&!/^\d{1,3}$/.test(adjustment.length))fail();
      if(data.partColors!==undefined&&(!data.partColors||typeof data.partColors!=='object'||Array.isArray(data.partColors)))fail();
      for(const [key,tone] of Object.entries(data.partColors||{})){if(![...roles,'gap','extension'].includes(key)||!['silver','black'].includes(tone))fail();partColors[key]=tone;}
      return {version:1,selection,adjustment,partColors};
    }
    function configuration(shared=false){
      const m=model(),selection={...state},partColors={...savedColors};
      for(const role of Object.keys(names)){
        const p=assigned(role,m.candidates);if(!p)continue;
        if(role==='mount'){selection.mount=['flush','surface'].includes(p.value)?'floor':'wall';selection.mountVariant=p.value;}
        else if(role==='gap')selection.gap=true;
        else if(role==='extension'){selection.extension=true;selection.extensionLength='300';}
        else if(['extensionArm','extensionBolt'].includes(role)){selection.extension=true;selection.extensionLength='400';}
        else if(role!=='service')selection[role]=p.value;
        if(p.color)partColors[['extensionArm','extensionBolt'].includes(role)?'extension':role]=p.color;
      }
      if(selection.mount!=='wall')selection.gap=false;
      return validateConfiguration({version:1,selection,adjustment:{...service,instructions:shared?'':service.instructions},partColors});
    }
    function applyConfiguration(data){
      const clean=validateConfiguration(data);
      Object.assign(state,clean.selection);Object.assign(service,clean.adjustment);
      Object.keys(savedColors).forEach(key=>delete savedColors[key]);Object.assign(savedColors,clean.partColors);
      Object.keys(assignments).forEach(key=>delete assignments[key]);
      Object.keys(names).forEach(role=>excluded.add(role));
      const candidates=cartCandidates();
      for(const part of selected()){
        const matches=candidates[part.role].filter(p=>compatible(p)&&p.value===(part.role==='gap'?state.mountVariant:part.value)&&(!p.color||p.color===part.color));
        if(matches.length===1){assignments[part.role]=matches[0].key;excluded.delete(part.role);}
      }
      $$('[data-cp-service-field]').forEach(el=>{if(el.type==='checkbox')el.checked=service[el.dataset.cpServiceField];else el.value=service[el.dataset.cpServiceField];});
      render();
    }
    function encodeConfiguration(data){return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
    function decodeConfiguration(text){
      if(typeof text!=='string'||text.length>20000||!/^[A-Za-z0-9_-]+$/.test(text))throw new Error('Der Konfigurationslink ist unvollständig oder beschädigt.');
      return validateConfiguration(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)))));
    }

    async function refreshCart(){
      if(refreshTask)return refreshTask;
      refreshTask=(async()=>{
        const url=new URL(location.href);url.hash='';url.searchParams.set('section_id',root.dataset.sectionId);url.searchParams.set('_cp_cart',Date.now());
        const response=await fetch(url,{cache:'no-store',headers:{Accept:'text/html'}});
        if(!response.ok)throw new Error('Warenkorb konnte nicht geprüft werden. Bitte lade die Seite neu.');
        const html=await response.text(),doc=new DOMParser().parseFromString(html,'text/html'),snapshot=doc.querySelector('[data-cp-initial-cart]');
        if(!snapshot)throw new Error('Warenkorb konnte nicht geprüft werden. Bitte lade die Seite neu.');
        const currentCatalog=doc.querySelector('[data-cp-lagun-catalog]'),currentDelivery=doc.querySelector('[data-cp-delivery]');
        if(currentCatalog)Object.assign(catalog,JSON.parse(currentCatalog.textContent));
        if(currentDelivery)Object.assign(delivery,JSON.parse(currentDelivery.textContent));
        cart=JSON.parse(snapshot.textContent);cartReady=true;
      })().finally(()=>refreshTask=null);
      return refreshTask;
    }
    const scrollTo=(id)=>{
      if(window.innerWidth<990){summary.classList.remove('is-open');$('[data-cp-summary-toggle]').setAttribute('aria-expanded','false');}
      const target=document.getElementById(id);
      target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    };
    root.addEventListener('click',event=>{
      if(busy&&event.target.closest('[data-cp-choice],[data-cp-color],[data-cp-service-field],[data-cp-config-action]'))return;
      if(event.target.closest('[data-cp-fold-preview]')){state.previewFold=!state.previewFold;render();return;}
      const colorButton=event.target.closest('[data-cp-color]');
      if(colorButton){Object.keys(savedColors).forEach(key=>delete savedColors[key]);state.color=colorButton.dataset.cpColor;render();return;}
      const button=event.target.closest('button[data-cp-choice]');
      if(button){
        if(button.getAttribute('aria-disabled')==='true'||busy)return;
        const {cpChoice:key,value}=button.dataset;
        if(key==='mount'){
          if(state.mount!==value){state.mount=value;state.mountVariant=null;state.gap=false;delete assignments.mount;excluded.add('mount');}
        }else{
          const role=key==='mountVariant'?'mount':key;
          const current=assigned(role,cartCandidates());
          if(current&&current.value===value&&(!current.color||!state.color||current.color===state.color)){state[key]=value;render();return;}
          delete savedColors[role];state[key]=value;
          if(key==='under')state.previewFold=true;
          delete assignments[role];excluded.add(role);
        }
        render();return;
      }
      const jump=event.target.closest('[data-cp-jump]');if(jump)scrollTo('cp-lagun-step-'+jump.dataset.cpJump);
    });
    $$('input[data-cp-choice]').forEach(input=>input.addEventListener('change',()=>{
      if(busy)return;
      const role=input.dataset.cpChoice;delete savedColors[role];state[role]=input.checked;
      if(role==='extension')for(const extensionRole of ['extension','extensionArm','extensionBolt']){delete assignments[extensionRole];excluded.add(extensionRole);}
      else{delete assignments[role];excluded.add(role);}
      render();
    }));
    $$('[data-cp-arm-configuration]').forEach(input=>input.addEventListener('change',()=>{
      if(busy||!input.checked)return;
      state.arm='400';state.extension=input.value!=='base';state.extensionLength=input.value==='base'?'300':input.value;
      delete savedColors.arm;delete savedColors.extension;
      for(const extensionRole of ['arm','extension','extensionArm','extensionBolt']){delete assignments[extensionRole];excluded.add(extensionRole);}
      render();
    }));
    $$('[data-cp-service-field]').forEach(input=>input.addEventListener('input',()=>{if(busy)return;service[input.dataset.cpServiceField]=input.type==='checkbox'?input.checked:input.value;delete assignments.service;excluded.delete('service');render();}));
    root.addEventListener('shopify:block:select',event=>{
      if(event.target.closest('[data-cp-followup="wall"]'))state.mount='wall';
      if(event.target.closest('[data-cp-followup="floor"]'))state.mount='floor';
      render();
      summary.classList.remove('is-open');$('[data-cp-summary-toggle]').setAttribute('aria-expanded','false');
      event.target.scrollIntoView({block:'center',behavior:'auto'});
    });
    $('[data-cp-summary-toggle]').addEventListener('click',()=>{
      const open=summary.classList.toggle('is-open');$('[data-cp-summary-toggle]').setAttribute('aria-expanded',String(open));
    });
    root.addEventListener('keydown',event=>{if(event.key==='Escape'){summary.classList.remove('is-open');$('[data-cp-summary-toggle]').setAttribute('aria-expanded','false');}});

    function quantities(items,out=new Map()){
      for(const item of items||[]){const id=String(item.variant_id||item.id);out.set(id,(out.get(id)||0)+(item.quantity||0));if(item.item_components?.length)quantities(item.item_components,out);}return out;
    }
    const requestedConfirmed=(requested,before,after)=>Array.from(quantities(requested).entries()).every(([id,quantity])=>(after.get(id)||0)>=(before.get(id)||0)+quantity);
    async function submitSelection(destination='cart'){
      const trigger=destination==='checkout'?checkout:add;
      if(trigger.disabled||busy)return;
      busy=true;trigger.setAttribute('aria-busy','true');status.textContent='Dein Warenkorb wird abgeglichen …';render();
      const requested=[];let before=null,submitted=false;
      const completed=()=>{
        requested.forEach(item=>{if(item.role)excluded.delete(item.role);});
        reconcile(cartCandidates());
        status.textContent=destination==='checkout'?'Deine Auswahl ist bereit. Weiter zur Kasse …':'Deine Auswahl liegt jetzt im Warenkorb.';
        if(destination==='checkout')window.location.assign(route('checkout'));
        else document.dispatchEvent(new CustomEvent('cart:refresh',{detail:{open:true}}));
      };
      try{
        await refreshCart();
        const m=model();
        if(m.missing.length||m.unavailable.length||!state.color||serviceError()){status.textContent=serviceError()||'Deine Auswahl hat sich geändert. Bitte prüfe die markierten Teile.';return;}
        if(!m.additions.length){completed();return;}
        before=quantities(cart.items);
        const unique=new Map();m.additions.forEach(part=>{
          const properties={...logisticsProperties(),...(part.properties||{})};
          unique.set(String(part.variant.id)+'|'+part.role,{id:part.variant.id,quantity:1,properties,role:part.role});
        });
        requested.push(...unique.values());submitted=true;
        const payloadItems=requested.map(({role,...item})=>item);
        const response=await fetch(route('cart/add.js'),{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({items:payloadItems})});
        const result=await response.json();
        if(!response.ok||result.status){if(response.status>=400&&response.status<500)submitted=false;throw new Error(result.description||'Diese Auswahl konnte nicht hinzugefügt werden.');}
        await refreshCart();
        const after=quantities(cart.items);
        if(!requestedConfirmed(requested,before,after))throw new Error('Die Übertragung konnte noch nicht vollständig bestätigt werden.');
        completed();
      }catch(error){
        try{
          await refreshCart();
          const after=quantities(cart.items);
          const succeeded=submitted&&requested.length&&requestedConfirmed(requested,before||new Map(),after);
          if(succeeded)completed();
          else{uncertain=submitted;status.textContent=error.message+(uncertain?' Bitte prüfe den Warenkorb, bevor du erneut Teile hinzufügst.':' Bitte prüfe deine Auswahl und versuche es erneut.');}
        }catch{uncertain=submitted;cartReady=false;status.textContent='Der Warenkorb lässt sich gerade nicht prüfen. Bitte lade die Seite neu, bevor du fortfährst.';}
      }finally{busy=false;trigger.removeAttribute('aria-busy');render();}
    }
    add.addEventListener('click',()=>submitSelection('cart'));
    checkout.addEventListener('click',()=>submitSelection('checkout'));
    const configStatus=$('[data-cp-config-status]');
    const loadConfiguration=async data=>{
      if(busy)throw new Error('Bitte warte, bis die laufende Warenkorbprüfung abgeschlossen ist.');
      const clean=validateConfiguration(data);busy=true;render();
      try{await refreshCart();applyConfiguration(clean);}finally{busy=false;render();}
      configStatus.textContent='Konfiguration geladen. Bitte prüfe aktuelle Preise, Verfügbarkeit und deine Anpassungswünsche. Dein Warenkorb bleibt erhalten.';
    };
    $$('[data-cp-config-action]').forEach(button=>button.addEventListener('click',async()=>{
      if(busy)return;
      try{
        const action=button.dataset.cpConfigAction;
        if(action==='save'){
          localStorage.setItem(storageKey,JSON.stringify(configuration()));
          $('[data-cp-config-action="restore"]').hidden=false;
          configStatus.textContent='Auf diesem Gerät gespeichert. Mit „Gespeicherte Auswahl laden“ kannst du später weitermachen.';
        }
        if(action==='download'){
          const url=URL.createObjectURL(new Blob([JSON.stringify(configuration(),null,2)],{type:'application/json'})),a=document.createElement('a');
          a.href=url;a.download='mein-lagun.json';a.hidden=true;root.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},30000);
          configStatus.textContent='Deine Konfiguration wird als Datei gespeichert – einschließlich deiner Anpassungswünsche.';
        }
        if(action==='restore'){
          const saved=localStorage.getItem(storageKey);if(!saved)throw new Error('Auf diesem Gerät ist noch keine Konfiguration gespeichert.');
          await loadConfiguration(JSON.parse(saved));
        }
        if(action==='upload')$('[data-cp-config-file]').click();
        if(action==='share'){
          const url=new URL(location.pathname,location.origin),theme=window.Shopify?.theme;
          if(theme?.id&&theme.role!=='main')url.searchParams.set('preview_theme_id',theme.id);
          url.hash='lagun='+encodeConfiguration(configuration(true));
          const box=$('[data-cp-share-result]'),input=$('[data-cp-share-link]');box.hidden=false;input.value=url.href;
          try{await navigator.clipboard.writeText(url.href);configStatus.textContent='Link kopiert. Er enthält deine Bauteile und Maße. Freitext aus dem Anpassungsservice wird nicht geteilt.';}
          catch{input.focus();input.select();configStatus.textContent='Dein Link ist bereit. Kopiere ihn aus dem Feld. Freitext aus dem Anpassungsservice wird nicht geteilt.';}
        }
      }catch(error){configStatus.textContent=error.name==='QuotaExceededError'||error.name==='SecurityError'?'Dein Browser erlaubt das Speichern hier nicht. Lade stattdessen die Datei herunter.':error.message||'Die Konfiguration konnte nicht geladen werden.';}
    }));
    $('[data-cp-config-file]').addEventListener('change',async event=>{
      if(busy)return;const file=event.target.files?.[0];if(!file)return;
      try{if(file.size>20000)throw new Error('Bitte wähle eine Lagun-Konfigurationsdatei bis 20 KB.');await loadConfiguration(JSON.parse(await file.text()));}
      catch(error){configStatus.textContent=error instanceof SyntaxError?'Die Datei enthält keine gültige Lagun-Konfiguration.':error.message;}
      finally{event.target.value='';}
    });
    try{$('[data-cp-config-action="restore"]').hidden=!localStorage.getItem(storageKey);}catch{}
    let disposed=false;
    const onCart=()=>{if(!disposed&&!busy)refreshCart().then(render).catch(error=>{cartReady=false;status.textContent=error.message;render();});};
    document.addEventListener('cart:updated',onCart);window.addEventListener('focus',onCart);
    document.addEventListener('shopify:section:unload',event=>{if(event.target.contains(root)){disposed=true;document.removeEventListener('cart:updated',onCart);window.removeEventListener('focus',onCart);}});
    root.dataset.cpConfiguratorReady='true';
    render();
    refreshCart().then(()=>{
      const candidates=cartCandidates();reconcile(candidates);
      Object.keys(names).forEach(role=>{const p=assigned(role,candidates);if(p)adopt(p);});
      const colors=new Set(roles.map(role=>assigned(role,candidates)?.color).filter(Boolean));
      if(colors.size===1)state.color=[...colors][0];
      if(location.hash.startsWith('#lagun=')){
        try{applyConfiguration(decodeConfiguration(location.hash.slice(7)));$('.cp-lagun-save-panel').open=true;configStatus.textContent='Geteilte Konfiguration geladen. Prüfe die aktuellen Preise und ergänze gegebenenfalls deine Freitext-Anpassungswünsche.';}
        catch{configStatus.textContent='Der Konfigurationslink konnte nicht gelesen werden. Deine bisherige Auswahl bleibt erhalten.';}
      }
      render();
    }).catch(error=>{status.textContent=error.message;render();});
  }
  const start=()=>document.querySelectorAll('[data-cp-lagun-configurator]').forEach(init);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('shopify:section:load',start);
})();
