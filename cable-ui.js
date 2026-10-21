// 전역 DOM 헬퍼 보강: 통합 패치 중 사용된 $(id) 호출이 jQuery 없이도 동작하도록 보장
(function(global){
  if (typeof global.$ !== 'function') {
    global.$ = function(id){ return document.getElementById(id); };
  }
})(window);

// 1. 공통 색상 및 UI 설정 상수
const COPPER_CORE_HEX = '#b87333';
const COLOR_HEX_MAP = {
    BK: '#1e293b', WH: '#f8fafc', RD: '#ef4444', GN: '#22c55e', YL: '#eab308', 
    BN: '#78350f', BL: '#2563eb', GY: '#64748b', OR: '#f97316', VI: '#a855f7'
};

const PRESET_ALL_COLORS = [
    {val: "BK", name: "BK"}, {val: "WH", name: "WH"}, {val: "RD", name: "RD"}, {val: "GN", name: "GN"},
    {val: "YL", name: "YL"}, {val: "BN", name: "BN"}, {val: "BL", name: "BL"}, {val: "GY", name: "GY"},
    {val: "OR", name: "OR"}, {val: "VI", name: "VI"}
];

// 2. 자재 물성치 기본값 (비중, 단가, 로스율)
const MATERIAL_SPECS = {
    "구리": { density: 8.89, price: 12500, loss: 2 },
    "알루미늄": { density: 2.7, price: 4200, loss: 3 },
    "PE": { density: 0.935, price: 2600, loss: 5 },
    "XLPE": { density: 0.925, price: 2900, loss: 5 },
    "PVC": { density: 1.4, price: 2200, loss: 5 },
    "XLPO": { density: 1.375, price: 3400, loss: 5 },
    "SHF1": { density: 1.5, price: 3600, loss: 5 },
    "SHF2": { density: 1.55, price: 3900, loss: 5 },
    "HDPE": { density: 0.955, price: 2700, loss: 5 },
    "MDPE": { density: 0.935, price: 2600, loss: 5 },
    "LDPE": { density: 0.92, price: 2500, loss: 5 },
    "CPE": { density: 1.45, price: 4400, loss: 5 },
    "CR": { density: 1.45, price: 4600, loss: 5 },
    "실리콘": { density: 1.2, price: 7800, loss: 5 },
    "CSP": { density: 1.5, price: 5000, loss: 5 },
    "XLEVA": { density: 1.4, price: 4100, loss: 5 },
    "TPU": { density: 1.2, price: 6200, loss: 5 },
    "LSX": { density: 1.4, price: 3800, loss: 5 },
    "TPO": { density: 1.175, price: 3500, loss: 5 },
    "EPR": { density: 1.3, price: 4300, loss: 5 },
    "HEPR": { density: 1.325, price: 4500, loss: 5 },
    "PP": { density: 0.905, price: 2300, loss: 5 },
    "나일론": { density: 1.14, price: 5200, loss: 5 },
    "EPDM스티링": { density: 1.2, price: 4200, loss: 5 },
    "EPDM": { density: 1.2, price: 4200, loss: 5 },
    "폴리에스터": { density: 1.375, price: 4600, loss: 5 },
    "바인더테이프": { density: 1.375, price: 5800, loss: 5 },
    "세퍼레이터": { density: 1.375, price: 5800, loss: 5 },
    "아연도철선": { density: 7.825, price: 1900, loss: 3 },
    "동테이프": { density: 8.89, price: 13000, loss: 2 },
    "납": { density: 11.34, price: 3200, loss: 2 },
    "아라미드 얀": { density: 1.44, price: 26000, loss: 5 },
    "폴리에스터 얀": { density: 1.375, price: 4600, loss: 5 },
    "우레탄글라스": { density: 1.3, price: 8500, loss: 5 },
    "고무입면": { density: 0.64, price: 3700, loss: 5 },
    "마이카": { density: 1.315, price: 9500, loss: 5 },
    "폴리이미드": { density: 1.53, price: 16000, loss: 5 },
    "MICA": { density: 1.315, price: 9500, loss: 5 },
    "Paper": { density: 0.8, price: 1600, loss: 5 },
    "부직포": { density: 0.9, price: 3200, loss: 5 },
    "TETRON": { density: 1.38, price: 4200, loss: 5 },
    "PET": { density: 1.38, price: 3700, loss: 5 },
    "반도전": { density: 1.1, price: 4800, loss: 5 },
    "AL/Mylar": { density: 1.5, price: 6800, loss: 4 },
    "CU/Mylar": { density: 2.2, price: 9800, loss: 4 },
    "구리 (동)": { density: 8.89, price: 12500, loss: 2 },
    "면사": { density: 1.5, price: 2700, loss: 5 },
    "철 (STA)": { density: 7.85, price: 1700, loss: 3 }
};

const standardMaterials = [
    'PE', 'XLPE', 'PVC', 'XLPO', 'SHF1', 'SHF2', 'HDPE', 'MDPE', 'LDPE', 
    'CPE', 'CR', '실리콘', 'CSP', 'XLEVA', 'TPU', 'LSX', 'TPO', 'EPR', 'HEPR', 'PP', '나일론'
];

// 3. 국가 및 등급별 도체 데이터베이스
// 3. 국가 및 등급별 도체 데이터베이스는 conductor-db.js에서 단일 관리합니다.


// 4. 연합배열 표준 데이터셋 (K-팩터 및 계층 분포식)
// LS 연합외경 계수/CASE 표준 데이터는 shared-material-engine.js의 단일 원천만 사용합니다.

/* =========================================================
 * Integrated from integrated_repair_module during refactor.
 * Original script reference removed from HTML.
 * ========================================================= */
// integrated_repair_module - 2026-06-25 자재량 계산/사양서부표 호출 복구 수정
(function(){
  function val(id, def=''){ const el=document.getElementById(id); return el ? (el.type==='checkbox'?el.checked:el.value) : def; }
  function showCalcResult(){
    const ph=document.getElementById('calcPlaceholder');
    const ct=document.getElementById('calcTableContainer');
    if(ph) ph.style.display='none';
    if(ct) ct.style.display='block';
  }
  function saveMainConfig(){
    const config={};
    document.querySelectorAll('input,select,textarea').forEach(el=>{
      if(!el.id) return;
      config[el.id]=(el.type==='checkbox')?el.checked:el.value;
    });
    config.cable_name = val('cable_name','CABLE ENGINE') || val('product_name','CABLE ENGINE') || 'CABLE ENGINE';
    config.v_rating = val('v_rating','0.6/1kV');
    config.core_type = val('core_type','CORE');
    config.core_num = parseInt(val('core_num','3')) || 3;
    config.cond_material = val('cond_material','copper');
    config.conductorStandard = val('conductorStandard','IEC');
    config.cond_class = val('cond_class','A');
    config.cond_size = val('cond_size','16');
    config.insu_material = val('insu_material','XLPE');
    config.bedding_type = val('bedding_type','미적용');
    config.bedding_material = val('bedding_material','XLPE');
    config.armour_type = val('armour_type_new', val('armour_type','미적용'));
    config.sheath_material = val('sheath_material','PVC');
    config.thickness_std = val('thickness_std', val('thickness_rule_mode','MANUAL')) || 'MANUAL';
    config.insu_base_price = val('insu_base_price','3400');
    config.bedding_base_price = val('bedding_base_price','2400');
    config.sheath_base_price = val('sheath_base_price','2800');
    config.calculated_copper_price = val('calculated_copper_price','');
    // 자재량 계산표에서 수정된 로스율을 사양서부표로 상속
    const lossDefaults = { conductor:5, insulation:25, bedding:25, sheath:25, other:10 };
    const loss = Object.assign({}, lossDefaults);
    try {
      document.querySelectorAll('#resultTableBody tr').forEach(tr=>{
        const cells = tr.querySelectorAll('td');
        if(cells.length < 9) return;
        const proc = (cells[0].innerText||'') + ' ' + (cells[1].innerText||'');
        const inp = cells[8].querySelector('input');
        const v = parseFloat(inp ? inp.value : cells[8].innerText);
        if(isNaN(v)) return;
        if(/도체|D\/W|접지선|소선/.test(proc)) loss.conductor = v;
        else if(/절연|내도|외도/.test(proc)) loss.insulation = v;
        else if(/베딩|Inner Sheath/.test(proc)) loss.bedding = v;
        else if(/시스|Outer Sheath/.test(proc)) loss.sheath = v;
        else loss.other = v;
      });
    } catch(e) {}
    config.loss_conductor = loss.conductor;
    config.loss_insulation = loss.insulation;
    config.loss_bedding = loss.bedding;
    config.loss_sheath = loss.sheath;
    config.loss_other = loss.other;
    try { sessionStorage.setItem('cable_design_main_config', JSON.stringify(config)); } catch(e){ console.warn(e); }
    return config;
  }
  function install(){
    if(typeof window.runCableDesignCalculation==='function' && !window.__repairCalcWrapped){
      const original=window.runCableDesignCalculation;
      window.runCableDesignCalculation=function(){
        try{
          const r=original.apply(this,arguments);
          showCalcResult();
          saveMainConfig();
          return r;
        }catch(e){
          console.error('자재량 계산 오류:', e);
          alert('자재량 계산 중 오류가 발생했습니다. 콘솔 오류를 확인해 주세요.');
        }
      };
      window.__repairCalcWrapped=true;
    }
    window.openSpecTablePage=function(){
      if (typeof window.__openSpecTablePageRoot === 'function') {
        return window.__openSpecTablePageRoot();
      }
      const config = saveMainConfig();
      const seqKey = 'sanTeukSpecTabSeq';
      const seq = (parseInt(sessionStorage.getItem(seqKey) || '0', 10) || 0) + 1;
      sessionStorage.setItem(seqKey, String(seq));
      config.spec_seq = seq;
      config.spec_title = `${seq}. ${config.cable_name || 'CABLE ENGINE'}`;
      try { sessionStorage.setItem('cable_design_main_config', JSON.stringify(config)); } catch(e){}
      window.open('spec.html?instance=' + Date.now(), '_blank');
    };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', install); else install();
  setTimeout(install,100);
})();


/* =========================================================
 * Integrated from integrated_main_module during refactor.
 * Original script reference removed from HTML.
 * ========================================================= */
// integrated_main_module - requested layout/action/material fixes
(function(){
  function $(id){return document.getElementById(id);}
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }

  function layoutMaterialArea(){
    const tableArea=$('tableArea'), price=$('copper_price_calc_container'), calc=$('calcTableContainer'), ph=$('calcPlaceholder');
    if(!tableArea || !price || !calc) return;

    // Remove old duplicated action groups/buttons inside price block.
    price.querySelectorAll('button').forEach(b=>b.remove());
    price.querySelectorAll('div').forEach(d=>{
      const t=(d.innerText||'').trim();
      if(t.includes('자재 단위 중량당 실시간 단가')) d.remove();
    });

    let top=$('materialPriceFixedPane');
    if(!top){
      top=document.createElement('div');
      top.id='materialPriceFixedPane';
      top.className='material-price-fixed-pane';
      tableArea.insertBefore(top, tableArea.firstChild);
    }
    if(price.parentElement!==top) top.appendChild(price);

    let btns=$('materialPriceActionButtons');
    if(!btns){
      btns=document.createElement('div');
      btns.id='materialPriceActionButtons';
      btns.className='material-price-action-buttons';
      btns.innerHTML=`
        <button class="mp-btn mp-recalc" onclick="runCableDesignCalculation()">재료비 계산</button>
        <button class="mp-btn mp-image" onclick="copyMaterialTableAsImage()">이미지 복사</button>
        <button class="mp-btn mp-excel" onclick="copyTableToClipboard()">엑셀복사</button>`;
      top.appendChild(btns);
    }

    let bottom=$('materialTableScrollPane');
    if(!bottom){
      bottom=document.createElement('div');
      bottom.id='materialTableScrollPane';
      bottom.className='material-table-scroll-pane';
      tableArea.appendChild(bottom);
    }
    if(ph && ph.parentElement!==bottom) bottom.appendChild(ph);
    if(calc.parentElement!==bottom) bottom.appendChild(calc);

    // remove result title block if still exists
    calc.querySelectorAll('h3').forEach(h=>{ if((h.innerText||'').includes('자재량 및 소요')) h.closest('div')?.remove(); });

    tableArea.classList.add('table-area-split');
    price.style.cssText += ';margin:0;flex:1;min-width:0;';
    const firstRow=price.querySelector('div[style*="display: flex"]');
    if(firstRow) firstRow.style.flexWrap='nowrap';
  }

  async function copyElementAsImage(el){
    if(!el){ alert('복사할 표가 없습니다.'); return; }
    const table=el.querySelector('table') || el;
    const rows=[...table.rows].map(r=>[...r.cells].map(c=>c.innerText.trim()));
    if(!rows.length){ alert('복사할 표가 없습니다.'); return; }
    const font='12px Arial';
    const padX=8, rowH=26;
    const ctx=document.createElement('canvas').getContext('2d'); ctx.font=font;
    const colCount=Math.max(...rows.map(r=>r.length));
    const widths=Array.from({length:colCount},(_,i)=>Math.max(70,...rows.map(r=>ctx.measureText(r[i]||'').width+padX*2)));
    const w=widths.reduce((a,b)=>a+b,0)+2, h=rows.length*rowH+2;
    const canvas=document.createElement('canvas'); canvas.width=Math.min(Math.max(w,600),4000); canvas.height=Math.min(Math.max(h,80),4000);
    const c=canvas.getContext('2d'); c.font=font; c.textBaseline='middle';
    c.fillStyle='white'; c.fillRect(0,0,canvas.width,canvas.height);
    let y=1;
    rows.forEach((r,ri)=>{
      let x=1;
      c.fillStyle=ri===0?'#1e293b':(ri%2?'#ffffff':'#f8fafc');
      c.fillRect(1,y,canvas.width-2,rowH);
      widths.forEach((cw,i)=>{
        c.strokeStyle='#cbd5e1'; c.strokeRect(x,y,cw,rowH);
        c.fillStyle=ri===0?'#ffffff':'#0f172a';
        c.fillText(r[i]||'',x+padX,y+rowH/2);
        x+=cw;
      });
      y+=rowH;
    });
    try{
      const blob=await new Promise(res=>canvas.toBlob(res,'image/png'));
      if(navigator.clipboard && window.ClipboardItem){
        await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
        alert('이미지로 복사되었습니다.');
      }else{
        const url=canvas.toDataURL('image/png');
        const win=window.open(); win.document.write('<img src="'+url+'">');
      }
    }catch(e){
      console.warn(e); alert('브라우저 보안 설정으로 이미지 클립보드 복사가 제한되었습니다. Chrome/Edge에서 http:// 또는 https://로 실행해 주세요.');
    }
  }
  window.copyMaterialTableAsImage=function(){
    const calc=$('calcTableContainer');
    if(calc && getComputedStyle(calc).display==='none' && typeof runCableDesignCalculation==='function') runCableDesignCalculation();
    copyElementAsImage($('calcTableContainer'));
  };

  // ensure filler material change recalculates right material table also
  function bindFiller(){
    const f=$('filler_material');
    if(f && !f.dataset.finalBound){
      f.dataset.finalBound='1';
      f.addEventListener('change',()=>{ try{ calculateAndDraw(); }catch(e){} try{ runCableDesignCalculation(); }catch(e){} });
    }
  }
  ready(()=>{ layoutMaterialArea(); bindFiller(); setTimeout(layoutMaterialArea,300); });
})();


// part1_standard_integrated.js - fixed Part 1 standard information layout/sync
(function(){
  function $(id){ return document.getElementById(id); }
  function val(id){ const el=$(id); return el ? el.value : ''; }
  function setVal(id, v, fire){
    const el=$(id); if(!el) return false;
    if(![...el.options || []].some(o=>o.value===v) && el.tagName==='SELECT'){
      const opt=document.createElement('option'); opt.value=v; opt.textContent=v; el.appendChild(opt);
    }
    if(el.value!==v){
      el.value=v;
      if(fire) el.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return true;
  }

  const STANDARD_ORDER = [
    ['MANUAL','수동 지정'],
    ['IEC_60092','IEC 60092'],
    ['IEC_60502','IEC 60502'],
    ['IEEE_1580','IEEE 1580'],
    ['AEIC','AEIC 규격'],
    ['ICEA_S95_NEMA_WC70','ICEA S-95-658 / NEMA WC 70'],
    ['ICEA_S96_NEMA_WC71','ICEA S-96-659 / NEMA WC 71'],
    ['ICEA_S93_NEMA_WC74','ICEA S-93-639 / NEMA WC 74'],
    ['ICEA_S73_NEMA_WC57','ICEA S-73-532 / NEMA WC 57'],
    ['EN_50264_3_1','EN 50264-3-1']
  ];

  const MATERIAL_OPTIONS = {
    MANUAL: [
      ['XLPE','XLPE'],['EPR','EPR'],['PVC','PVC'],['실리콘','실리콘'],['XLPO','XLPO']
    ],
    IEC_60092: [
      ['XLPE','XLPE'],['EPR','EPR'],['HEPR','HEPR'],['S95','S95 → 실리콘'],['HF90','HF90 → EPR'],['HF85','HF85 → EPR'],
      ['HF_EPR','HF EPR → EPR'],['HF_XLPE','HF XLPE → XLPE'],['HF_HEPR','HF HEPR → HEPR'],['HF_S95','HF S95 → 실리콘'],['PVC_A','PVC/A → PVC']
    ],
    IEC_60502: [
      ['PVC','PVC'],['XLPE','XLPE'],['EPR','EPR'],['HEPR','HEPR']
    ],
    IEEE_1580: [
      ['TYPE_E','Type E → EPR'],['TYPE_X','Type X → XLPE'],['TYPE_P','Type P → XLPO'],['TYPE_LSE','Type LSE → EPR'],
      ['TYPE_LSX','Type LSX → XLPE'],['TYPE_S','Type S → 실리콘'],['TYPE_LSS','Type LSS → 실리콘'],['TYPE_T','Type T → PVC']
    ],
    AEIC: [
      ['XLPE','XLPE'],['EPR','EPR'],['TR_XLPE','TR-XLPE → XLPE']
    ],
    ICEA_S95_NEMA_WC70: [
      ['XLPE','XLPE'],['EPR','EPR']
    ],
    ICEA_S96_NEMA_WC71: [
      ['XLPE','X-1/X-2 → XLPE'],['EPR','E-1/E-2/E-4 → EPR']
    ],
    ICEA_S93_NEMA_WC74: [
      ['XLPE','XLPE'],['EPR','EPR']
    ],
    ICEA_S73_NEMA_WC57: [
      ['XLPE','XLPE Types I/II → XLPE'],['EPR','EP Types I/II → EPR'],['SR','SR → 실리콘'],['PVC','PVC'],['PE','PE → XLPE'],['TPE','TPE Types I/II → EPR']
    ],
    EN_50264_3_1: [
      ['XLPO','XLPO']
    ]
  };

  const MATERIAL_MAP = {
    HEPR:'HEPR', S95:'실리콘', HF90:'EPR', HF85:'EPR', HF_EPR:'EPR', HF_XLPE:'XLPE', HF_HEPR:'HEPR', HF_S95:'실리콘', PVC_A:'PVC',
    TYPE_E:'EPR', TYPE_X:'XLPE', TYPE_P:'XLPO', TYPE_LSE:'EPR', TYPE_LSX:'XLPE', TYPE_S:'실리콘', TYPE_LSS:'실리콘', TYPE_T:'PVC',
    TR_XLPE:'XLPE', SR:'실리콘', PE:'XLPE', TPE:'EPR',
    XLPE:'XLPE', EPR:'EPR', PVC:'PVC', XLPO:'XLPO', '실리콘':'실리콘'
  };

  const VOLTAGE_ALLOW = {
    MANUAL: null,
    IEC_60092: ['250V','300V','600V','1000V','1500V','2000V','450/750V','0.6/1kV','1.8/3kV','3.6/6kV','6/10KV','8.7/15KV','12/20KV','18/30KV'],
    IEC_60502: ['0.6/1kV','1.8/3kV','3.6/6kV','6/10KV','8.7/15KV','12/20KV','18/30KV'],
    IEEE_1580: ['300V','600V','1000V','2000V'],
    AEIC: ['5KV','8.0KV','15KV','25KV','35KV','46KV'],
    ICEA_S95_NEMA_WC70: ['600V','2000V'],
    ICEA_S96_NEMA_WC71: ['2000V','5KV'],
    ICEA_S93_NEMA_WC74: ['5KV','8.0KV','15KV','25KV','28KV','35KV','46KV'],
    ICEA_S73_NEMA_WC57: ['300V','600V','1000V'],
    EN_50264_3_1: ['0.6/1kV','1.8/3kV']
  };

  const OLD_MODE_ALIAS = {
    IEEE_1580:'IEEE_1580',
    ICEA_S95_NEMA_WC70:'NEMA_ICEA',
    ICEA_S96_NEMA_WC71:'NEMA_ICEA',
    ICEA_S93_NEMA_WC74:'NEMA_ICEA',
    AEIC:'NEMA_ICEA',
    ICEA_S73_NEMA_WC57:'NEMA_ICEA'
  };

  function oldAliasForCurrent(){
    const spec=val('thickness_rule_mode');
    const v=val('v_rating');
    if(spec==='IEC_60092'){
      if(['250V','300V'].includes(v)) return 'IEC_60092-376';
      if(['3.6/6kV','5KV','6/10KV','8.0KV','8.7/15KV','15KV','12/20KV','18/30KV','25KV','28KV','35KV','46KV','66KV'].includes(v)) return 'IEC_60092-354';
      return 'IEC_60092-353';
    }
    if(spec==='IEC_60502'){
      if(['3.6/6kV','5KV','6/10KV','8.0KV','8.7/15KV','15KV','12/20KV','18/30KV','25KV','28KV','35KV','46KV','66KV'].includes(v)) return 'IEC_60502-2';
      return 'IEC_60502-1';
    }
    if(spec==='EN_50264_3_1') return 'MANUAL';
    return OLD_MODE_ALIAS[spec] || spec || 'MANUAL';
  }

  function ensureXLPO(){
    ['insu_material','bedding_material','sheath_material','standard_insu_material'].forEach(id=>{
      const el=$(id);
      if(el && el.tagName==='SELECT' && ![...el.options].some(o=>o.value==='XLPO')){
        const opt=document.createElement('option'); opt.value='XLPO'; opt.textContent='XLPO'; el.appendChild(opt);
      }
    });
  }

  function rebuildStandardSelect(){
    const sel=$('thickness_rule_mode'); if(!sel) return;
    const keep=sel.value && STANDARD_ORDER.some(([v])=>v===sel.value) ? sel.value : 'MANUAL';
    sel.innerHTML = STANDARD_ORDER.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
    sel.value=keep;
  }

  function rebuildMaterialSelect(){
    const spec=val('thickness_rule_mode') || 'MANUAL';
    const sel=$('standard_insu_material'); if(!sel) return;
    const old=sel.value;
    const opts=MATERIAL_OPTIONS[spec] || MATERIAL_OPTIONS.MANUAL;
    sel.innerHTML=opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
    if(spec==='EN_50264_3_1') sel.value='XLPO';
    else if(opts.some(([v])=>v===old)) sel.value=old;
    else sel.value=opts[0]?.[0] || 'XLPE';
    syncStandardMaterial(false);
  }

  function syncStandardMaterial(recalc){
    ensureXLPO();
    const raw=val('standard_insu_material') || 'XLPE';
    const mapped=MATERIAL_MAP[raw] || raw;
    setVal('insu_material', mapped, true);
    if(val('thickness_rule_mode')==='EN_50264_3_1') setVal('standard_insu_material','XLPO',false);
    if(recalc) safeRecalc();
  }

  function showConditions(){
    const spec=val('thickness_rule_mode');
    document.querySelectorAll('.standard-cond').forEach(el=>{ el.style.display='none'; });
    if(['AEIC','ICEA_S96_NEMA_WC71','ICEA_S93_NEMA_WC74'].includes(spec)){
      document.querySelectorAll('.standard-cond-level').forEach(el=>el.style.display='block');
    }
    if(spec==='IEC_60092'){
      document.querySelectorAll('.standard-cond-60092').forEach(el=>el.style.display='block');
    }
    if(spec==='EN_50264_3_1'){
      document.querySelectorAll('.standard-cond-en').forEach(el=>el.style.display='block');
    }
  }

  function syncConditions(){
    // IEC 60092 전용 조건은 IEC 60092 선택 시에만 메인 조건으로 반영한다.
    if(val('thickness_rule_mode') !== 'IEC_60092') return;

    const mode = val('standard_iec60092_bedding_inner_mode') || val('standard_bedding_unified') || '';
    if(mode){
      if(mode === '미적용'){
        setVal('bedding_type','미적용', true);
        setVal('bedding_division','Inner Covering', true);
        setVal('standard_inner_division','Inner Covering', false);
        setVal('standard_bedding_form','압출형', false);
      } else if(mode === 'LAPPED_INNER_COVERING' || mode === 'LAPPED'){
        setVal('bedding_type','LAPPED', true);
        setVal('bedding_division','Inner Covering', true);
        setVal('standard_inner_division','Inner Covering', false);
        setVal('standard_bedding_form','테이프식', false);
      } else if(mode === 'EXTRUDED_INNER_SHEATH' || mode === '이너시스'){
        setVal('bedding_type','압출형', true);
        setVal('bedding_division','Inner Sheath', true);
        setVal('standard_inner_division','Inner Sheath', false);
        setVal('standard_bedding_form','압출형', false);
      } else {
        setVal('bedding_type','압출형', true);
        setVal('bedding_division','Inner Covering', true);
        setVal('standard_inner_division','Inner Covering', false);
        setVal('standard_bedding_form','압출형', false);
      }
    } else {
      const div=val('standard_inner_division');
      if(div) setVal('bedding_division', div, true);
      const form=val('standard_bedding_form');
      if(form) setVal('bedding_type', form==='테이프식'?'LAPPED':'압출형', true);
    }

    const armourChoice = val('standard_armour_type') || '미적용';
    setVal('armour_type_new', armourChoice === '미적용' ? '미적용' : armourChoice, true);
  }

  function applyVoltageAllow(){
    const spec=val('thickness_rule_mode');
    const allow=VOLTAGE_ALLOW[spec];
    const sel=$('v_rating'); if(!sel) return;
    let first=null;
    [...sel.options].forEach(opt=>{
      const ok=!allow || allow.includes(opt.value);
      opt.disabled=!ok;
      opt.style.color=ok?'#2563eb':'#94a3b8';
      opt.style.backgroundColor=ok?'#eff6ff':'#f1f5f9';
      if(ok && !first) first=opt.value;
    });
    if(allow && !allow.includes(sel.value) && first){
      sel.value=first;
      sel.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function isMVVoltage(v){
    const raw = String(v || '').trim();
    const upper = raw.toUpperCase();
    if (upper === '0.6/1KV' || upper === '600/1000V' || upper === '1000V') return false;
    if (upper.includes('KV')) {
      const nums = upper.match(/\d+(?:\.\d+)?/g) || [];
      return nums.some(n => Number(n) >= 1.8);
    }
    const vnum = Number(upper.replace(/[^0-9.]/g, ''));
    return Number.isFinite(vnum) && vnum >= 1800;
  }

  function applyCoreByVoltage(){
    const sel=$('core_type'); if(!sel) return;
    const mv=isMVVoltage(val('v_rating'));
    [...sel.options].forEach(opt=>{
      opt.disabled = mv && opt.value!=='CORE';
    });
    if(mv && sel.value!=='CORE'){
      sel.value='CORE';
      try{ if(typeof buildDynamicColorUI==='function') buildDynamicColorUI(); }catch(e){}
      try{ if(typeof validateGroundUI==='function') validateGroundUI(); }catch(e){}
    }
  }

  function applyAstmForNorthAmerica(){
    const spec=val('thickness_rule_mode');
    const coating=String(val('cond_coating')||'A').toUpperCase();
    let target = (typeof resolveConductorStandardBySpec === 'function') ? resolveConductorStandardBySpec(spec) : ((spec==='AEIC'||spec==='IEEE_1580'||spec.startsWith('ICEA_')) ? 'ASTM' : 'IEC');
    // IEEE 1580 Type P는 TA 전용: A 선택 시 IEEE를 비활성화하고 ASTM 일반 도체로 전환한다.
    if(coating==='A' && target==='IEEE_1580') target='ASTM';
    const cs=$('conductorStandard');
    if(cs && cs.value!==target) cs.value=target;
    try{ if(typeof syncConductorStructureOptions==='function') syncConductorStructureOptions(); }catch(e){}
    try{ if(typeof updateConductorSizes==='function') updateConductorSizes(); }catch(e){}
    try{ if(typeof handleCondSizeChange==='function') handleCondSizeChange(); }catch(e){}
  }

  function safeRecalc(){
    try{ if(typeof applyAutomaticThicknesses==='function') applyAutomaticThicknesses(); }catch(e){ console.warn(e); }
    try{ if(typeof syncDisabledInputs==='function') syncDisabledInputs(); }catch(e){}
    try{ if(typeof calculateAndDraw==='function') calculateAndDraw(); }catch(e){ console.warn(e); }
    try{ if(typeof runCableDesignCalculation==='function') runCableDesignCalculation(); }catch(e){}
  }

  function refreshAll(recalc){
    ensureXLPO();
    rebuildStandardSelect();
    rebuildMaterialSelect();
    showConditions();
    ensureBeddingUnifiedControls();
    syncConditions();
    applyVoltageAllow();
    applyCoreByVoltage();
    applyAstmForNorthAmerica();
    if(recalc) safeRecalc();
  }

  const originalHandleThickness = window.handleThicknessRuleChange;
  window.handleThicknessRuleChange = function(){
    refreshAll(false);
    if(typeof originalHandleThickness==='function'){
      try{ originalHandleThickness(); }catch(e){ console.warn(e); safeRecalc(); }
    }else{
      safeRecalc();
    }
  };

  window.handleStandardMaterialChange=function(){ syncStandardMaterial(true); };
  window.handleStandardConditionChange=function(){ syncConditions(); safeRecalc(); };

  const originalVoltage = window.handleVoltageAndDraw;
  window.handleVoltageAndDraw=function(){
    applyCoreByVoltage();
    if(typeof originalVoltage==='function') originalVoltage();
    else safeRecalc();
  };

  const originalCoreType = window.handleCoreTypeChange;
  window.handleCoreTypeChange=function(){
    applyCoreByVoltage();
    if(typeof originalCoreType==='function') originalCoreType();
    else safeRecalc();
    try{ if(typeof calculateAndDraw==='function') calculateAndDraw(); }catch(e){}
  };

  const originalApplyAuto = window.applyAutomaticThicknesses;
  window.applyAutomaticThicknesses=function(){
    const sel=$('thickness_rule_mode');
    if(!sel || typeof originalApplyAuto!=='function') return;
    const real=sel.value;
    const alias=oldAliasForCurrent();
    if(real===alias) return originalApplyAuto();
    let temp=null;
    if(![...sel.options].some(o=>o.value===alias)){
      temp=document.createElement('option');
      temp.value=alias; temp.textContent=alias; temp.dataset.tempAlias='1';
      sel.appendChild(temp);
    }
    try{
      sel.value=alias;
      return originalApplyAuto();
    }finally{
      sel.value=real;
      if(temp) temp.remove();
    }
  };


  function ensureBeddingUnifiedControls(){
    // 1-1 IEC 60092 베딩/이너 조건은 HTML의 standard_iec60092_bedding_inner_mode 하나만 사용한다.
    const stdDiv = $('standard_inner_division');
    const stdForm = $('standard_bedding_form');
    if(stdDiv && stdDiv.closest('.field-group')) stdDiv.closest('.field-group').style.display = 'none';
    if(stdForm && stdForm.closest('.field-group')) stdForm.closest('.field-group').style.display = 'none';
    const oldStdUnified = $('standard_bedding_unified');
    if(oldStdUnified && oldStdUnified.closest('.field-group')) oldStdUnified.closest('.field-group').style.display = 'none';

    // 11. 베딩 통합: 기존 계산용 select는 숨김 유지하고 통합 select가 값을 매핑한다.
    const bedType = $('bedding_type');
    const bedDiv = $('bedding_division');
    if(bedType && bedDiv && !$('bedding_unified_type')){
      const host = bedType.closest('.field-group');
      const wrap = document.createElement('div');
      wrap.className = 'field-group';
      wrap.innerHTML = '<label>베딩 선택</label><select id="bedding_unified_type"><option value="미적용" selected>미적용</option><option value="이너커버링">이너커버링</option><option value="이너시스">이너시스</option><option value="LAPPED">LAPPED</option></select>';
      host.parentNode.insertBefore(wrap, host);
      bedType.closest('.field-group').style.display = 'none';
      bedDiv.closest('.field-group').style.display = 'none';

      function applyMainUnified(){
        const v = val('bedding_unified_type');
        if(v === '미적용'){
          setVal('bedding_type','미적용', true);
          setVal('bedding_division','Inner Covering', true);
        } else if(v === '이너커버링'){
          setVal('bedding_type','압출형', true);
          setVal('bedding_division','Inner Covering', true);
        } else if(v === '이너시스'){
          setVal('bedding_type','압출형', true);
          setVal('bedding_division','Inner Sheath', true);
        } else if(v === 'LAPPED'){
          setVal('bedding_type','LAPPED', true);
          setVal('bedding_division','Inner Covering', true);
        }
        safeRecalc();
      }
      $('bedding_unified_type').addEventListener('change', applyMainUnified);
    }
    if(bedType) bedType.closest('.field-group').style.display = 'none';
    if(bedDiv) bedDiv.closest('.field-group').style.display = 'none';
  }

  window.addEventListener('load', function(){
    setTimeout(function(){
      ensureBeddingUnifiedControls();
      refreshAll(true);
      // Guard against older startup code that may rewrite the standard selector.
      setTimeout(()=>refreshAll(false), 250);
    }, 0);
  });
})();



// === Latest recovery overlay: keep current logic from falling back ===
(function(){
  function $(id){return document.getElementById(id);}
  function val(id, def=''){const el=$(id); return el ? (el.type==='checkbox'?el.checked:el.value) : def;}
  function setVal(id,v,fire=false){const el=$(id); if(!el) return; el.value=v; if(fire) el.dispatchEvent(new Event('change',{bubbles:true}));}
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  const NORTH = ['AEIC','IEEE_1580','ICEA_S95_NEMA_WC70','ICEA_S96_NEMA_WC71','ICEA_S93_NEMA_WC74','ICEA_S73_NEMA_WC57','NEMA_ICEA'];
  function isNorth(rule){ return (typeof isNorthAmericanRule==='function') ? isNorthAmericanRule(rule) : NORTH.includes(String(rule||'')); }
  window.isNorthAmericanRule = window.isNorthAmericanRule || isNorth;

  function integratedNemaLevel(){
    const spec=val('thickness_rule_mode','MANUAL');
    const group = $('nema_level_main')?.closest('.standard-cond-level') || $('nema_level_main')?.closest('.field-group');
    const sel=$('nema_level_main') || $('nema_level');
    const levelAllowed = ['AEIC','ICEA_S96_NEMA_WC71','ICEA_S93_NEMA_WC74'].includes(spec);
    if(group) group.style.display = levelAllowed ? 'block' : 'none';
    if(sel) sel.disabled = !levelAllowed;
  }

  const originalSyncDisabledInputs = window.syncDisabledInputs;
  window.syncDisabledInputs=function(){
    if(typeof originalSyncDisabledInputs==='function') originalSyncDisabledInputs.apply(this,arguments);
    integratedNemaLevel();
  };

  const manualThicknessOverride = {thick_insu:false, thick_bedding:false, thick_armour:false, thick_sheath:false};
  function bindManualThickness(){
    Object.keys(manualThicknessOverride).forEach(id=>{
      const el=$(id);
      if(el && !el.dataset.manualOverrideBound){
        el.dataset.manualOverrideBound='1';
        el.addEventListener('input',()=>{manualThicknessOverride[id]=true;});
        el.addEventListener('change',()=>{manualThicknessOverride[id]=true;});
      }
    });
  }
  const prevApplyAuto = window.applyAutomaticThicknesses;
  window.applyAutomaticThicknesses=function(){
    const before={};
    Object.keys(manualThicknessOverride).forEach(id=>{const el=$(id); if(el) before[id]=el.value;});
    const r = (typeof prevApplyAuto==='function') ? prevApplyAuto.apply(this,arguments) : undefined;
    Object.keys(manualThicknessOverride).forEach(id=>{const el=$(id); if(el && manualThicknessOverride[id]) el.value=before[id];});
    formatNorthThicknessInputs();
    return r;
  };

  function formatNorthThicknessInputs(){
    const rule=val('thickness_rule_mode','MANUAL');
    if(!isNorth(rule)) return;
    ['thick_insu','thick_bedding','thick_armour','thick_sheath'].forEach(id=>{
      const el=$(id); if(!el || el.value==='') return;
      const n=parseFloat(el.value); if(!isNaN(n)) el.value=n.toFixed(2);
    });
  }

  function setDefault(id){
    const el=$(id); if(!el) return;
    if(el.tagName==='SELECT'){
      const opts=[...el.options].map(o=>o.value);
      const firstNon=opts.find(v=>v && v!=='미적용');
      el.value=firstNon || opts[0] || '';
    } else if(el.type==='number'){
      if(el.id==='thick_sheath') el.value=el.defaultValue || '1.6';
      else if(parseFloat(el.value)===0 && el.defaultValue) el.value=el.defaultValue;
    }
  }

  const SECTION_MAP = {
    '2': {title:/^2\./, ids:['tape_mica','tape_sep','tape_semi'], off:{tape_mica:'미적용',tape_sep:'미적용',tape_semi:'미적용'}, on:{tape_mica:'적용',tape_sep:'PET',tape_semi:'미적용'}},
    '3': {title:/^3\./, ids:['inner_semi','thick_inner_semi'], off:{inner_semi:'미적용'}, on:{inner_semi:'적용'}},
    '5': {title:/^5\./, ids:['outer_semi','thick_outer_semi'], off:{outer_semi:'미적용'}, on:{outer_semi:'적용'}},
    '6': {title:/^6\./, ids:['tape_insu_above'], off:{tape_insu_above:'미적용'}, on:{tape_insu_above:'PET'}},
    '7': {title:/^7\./, ids:['ind_separator','ind_shield_material','ind_shield_type','ind_dw_ref'], off:{ind_separator:'미적용',ind_shield_type:'미적용'}, on:{ind_separator:'PET',ind_shield_type:'Tape (테이프)'}},
    '8': {title:/^8\./, ids:['ind_screen_tape'], off:{ind_screen_tape:'미적용'}, on:{ind_screen_tape:'PET'}},
    '10': {title:/^10\./, ids:['ov_shield_material','ov_shield_type','ov_dw_ref'], off:{ov_shield_type:'미적용'}, on:{ov_shield_type:'Tape (테이프)'}},
    '11': {title:/^11\./, ids:['bedding_unified_type','bedding_type','bedding_division','bedding_material','thick_bedding'], off:{bedding_unified_type:'미적용',bedding_type:'미적용',thick_bedding:'0'}, on:{bedding_unified_type:'이너커버링',bedding_type:'압출형',bedding_division:'Inner Covering'}},
    '12': {title:/^12\./, ids:['armour_material_new','armour_type_new','thick_armour'], off:{armour_type_new:'미적용',thick_armour:'0'}, on:{armour_type_new:'SWA/AWA (횡권)'}},
    '13': {title:/^13\./, ids:['sheath_material','thick_sheath'], off:{sheath_material:'미적용',thick_sheath:'0'}, on:{}}
  };

  function findTitle(re){
    return [...document.querySelectorAll('.section-title')].find(el=>re.test((el.textContent||'').trim()));
  }
  function ensureTitleContent(title){
    if(!title.querySelector('.section-title-text')){
      const txt=(title.childNodes.length===1?title.textContent:title.childNodes[0]?.textContent||title.textContent).trim();
      title.innerHTML='';
      const span=document.createElement('span'); span.className='section-title-text'; span.textContent=txt; title.appendChild(span);
    }
  }
  function setSectionEnabled(key, enabled, fire=true){
    const cfg=SECTION_MAP[key]; if(!cfg) return;
    const title=findTitle(cfg.title);
    const body=title?.nextElementSibling;
    const map=enabled?cfg.on:cfg.off;
    Object.keys(map).forEach(id=>setVal(id,map[id],false));
    if(enabled){
      cfg.ids.forEach(id=>{
        const el=$(id); if(!el) return;
        if(map[id]===undefined && (el.value==='미적용' || el.value==='0')) setDefault(id);
      });
      if(key==='13'){
        const sh=$('sheath_material'); if(sh && sh.value==='미적용') setDefault('sheath_material');
        const th=$('thick_sheath'); if(th && (!parseFloat(th.value))) th.value=th.defaultValue || '1.6';
      }
    } else if(key==='13'){
      setVal('sheath_material','미적용',false); setVal('thick_sheath','0',false);
    }
    if(body){
      body.classList.toggle('section-disabled', !enabled);
      body.querySelectorAll('select,input,textarea,button').forEach(el=>{
        if(el.classList.contains('section-apply-checkbox')) return;
        el.disabled = !enabled;
      });
    }
    if(key==='11' && $('bedding_unified_type')){
      $('bedding_unified_type').dispatchEvent(new Event('change',{bubbles:true}));
    }
    try{ if(typeof syncDisabledInputs==='function') syncDisabledInputs(); }catch(e){}
    if(fire) try{ if(typeof calculateAndDraw==='function') calculateAndDraw(); }catch(e){}
  }

  function installSectionToggles(){
    Object.entries(SECTION_MAP).forEach(([key,cfg])=>{
      const title=findTitle(cfg.title); if(!title) return;
      ensureTitleContent(title);
      if(title.querySelector('.section-apply-toggle')) return;
      const label=document.createElement('label');
      label.className='section-apply-toggle';
      const checked = key==='13';
      label.innerHTML=`<input type="checkbox" class="section-apply-checkbox" data-section-key="${key}" ${checked?'checked':''}> 적용`;
      title.appendChild(label);
      label.querySelector('input').addEventListener('change', e=>setSectionEnabled(key,e.target.checked,true));
      setSectionEnabled(key, checked, false);
    });
    [['4',/^4\./],['9',/^9\./]].forEach(([_,re])=>{
      const title=findTitle(re); if(!title) return;
      ensureTitleContent(title);
      if(!title.querySelector('.required-badge')){
        const span=document.createElement('span'); span.className='required-badge'; span.textContent='필수 적용'; title.appendChild(span);
      }
    });
  }

  function fixTextsAndButtons(){
    document.querySelectorAll('button').forEach(btn=>{
      const t=(btn.textContent||'').trim();
      if(t==='실시간 재계산' || t==='재료비계산' || t==='재료비 계산 (우측)') btn.textContent='재료비 계산';
      if(t==='사양서부표' || t==='사양서 부표 (새탭)') btn.textContent='사양서부표';
      if(t.includes('실시간 재계산') || t==='재료비 계산'){
        btn.style.backgroundColor='#dc2626'; btn.style.color='#fff';
      }
      if(t.includes('이미지 복사') || t.includes('엑셀복사') || t.includes('복사하기')){
        btn.classList.add('btn-gray-main'); btn.style.backgroundColor='#64748b'; btn.style.color='#fff';
      }
    });
  }

  function normalizeSpecForSession(){
    const rule=val('thickness_rule_mode','MANUAL');
    const config=(typeof window.collectMainConfigForLinkedOutputs==='function') ? window.collectMainConfigForLinkedOutputs() : {};
    document.querySelectorAll('input,select,textarea').forEach(el=>{ if(el.id) config[el.id]=(el.type==='checkbox')?el.checked:el.value; });
    config.cable_name=val('cable_name','CABLE ENGINE') || 'CABLE ENGINE';
    config.v_rating=val('v_rating','0.6/1kV');
    config.core_type=val('core_type','CORE');
    config.core_num=parseInt(val('core_num','3'),10)||3;
    config.cond_material=val('cond_material','copper');
    // 도체 표준/구조와 IEC·ASTM 등급은 화면 선택값을 그대로 사양서·TECH DATA에 전달한다.
    config.conductorStandard=val('conductorStandard',(typeof resolveConductorStandardBySpec==='function')?resolveConductorStandardBySpec(rule):(isNorth(rule)?'ASTM':'IEC'));
    config.cond_class=val('cond_class','연선');
    config.iec_conductor_class=val('iec_conductor_class','CLASS_2');
    config.astm_conductor_spec=val('astm_conductor_spec','ASTM_B8');
    config.astm_conductor_class=val('astm_conductor_class','CLASS_B');
    config.cond_size=val('cond_size','16');
    config.insu_material=val('insu_material','XLPE');
    config.bedding_type=val('bedding_type','미적용');
    config.bedding_division=val('bedding_division','Inner Covering');
    config.bedding_material=val('bedding_material','XLPE');
    config.armour_type=val('armour_type_new',val('armour_type','미적용'));
    config.sheath_material=val('sheath_material','PVC');
    config.thickness_std=rule;
    config.nema_level=val('nema_level_main',val('nema_level','100%'));
    config.assembly_od_auto = window.lastCalculatedAutoAssemblyOD || config.assembly_od_auto || '자동계산';
    try{sessionStorage.setItem('cable_design_main_config',JSON.stringify(config));}catch(e){}
    return config;
  }

  function saveDrawingSnapshots(){
    // 번호 오버레이는 WebGL 캔버스 밖의 HTML 요소입니다.
    // 사양서용 캡처에서는 두 레이어를 합성하는 전용 함수를 반드시 사용합니다.
    try {
      if (typeof window.captureCatalogDrawingSnapshots === 'function') {
        window.captureCatalogDrawingSnapshots();
        return;
      }
      const svg=document.getElementById('cableSvg');
      if(svg) sessionStorage.setItem('cable_2d_drawing','data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg)));
      const canvas=document.querySelector('#cable3DContainer canvas');
      if(canvas) sessionStorage.setItem('cable_3d_drawing',canvas.toDataURL('image/png'));
    } catch(e){ console.warn('도면 저장 실패:',e); }
  }
  window.__openSpecTablePageRoot=function(){
    const cfg=normalizeSpecForSession();
    saveDrawingSnapshots();
    const seqKey='sanTeukSpecTabSeq';
    const seq=(parseInt(sessionStorage.getItem(seqKey)||'0',10)||0)+1;
    sessionStorage.setItem(seqKey,String(seq));
    cfg.spec_seq=seq; cfg.spec_title=`${seq}. ${cfg.cable_name||'CABLE ENGINE'}`;
    try{sessionStorage.setItem('cable_design_main_config',JSON.stringify(cfg));}catch(e){}
    window.open('spec.html?instance='+Date.now(),'_blank');
  };

  function refresh(){
    bindManualThickness();
    integratedNemaLevel();
    formatNorthThicknessInputs();
    installSectionToggles();
    fixTextsAndButtons();
  }
  ready(()=>{ refresh(); setTimeout(refresh,100); setTimeout(refresh,500); });
  document.addEventListener('change', e=>{
    if(e.target && e.target.id==='thickness_rule_mode'){
      Object.keys(manualThicknessOverride).forEach(k=>manualThicknessOverride[k]=false);
      setTimeout(refresh,0);
    }
  });
})();


// === 2026-06-30 safety overlay: IEC 60092 spec condition -> section apply/thickness sync ===
(function(){
  if (window.__specConditionApplySyncIntegratedV1) return;
  window.__specConditionApplySyncIntegratedV1 = true;

  function $(id){ return document.getElementById(id); }
  function val(id, def=''){ const el=$(id); return el ? (el.type==='checkbox' ? el.checked : el.value) : def; }
  function hasOption(sel, value){ return !!(sel && Array.from(sel.options || []).some(o => o.value === value)); }
  function setSelect(id, value){
    const el=$(id); if(!el || value === undefined || value === null) return false;
    if(el.tagName === 'SELECT' && !hasOption(el, value)) return false;
    if(el.value !== value) el.value = value;
    return true;
  }
  function setNumber(id, value, digits){
    const el=$(id); if(!el) return;
    const n = Number(value);
    el.value = Number.isFinite(n) ? n.toFixed(digits ?? 1) : String(value);
  }

  function setSectionChecked(key, checked){
    const cb = document.querySelector('.section-apply-checkbox[data-section-key="'+key+'"]');
    if(!cb) return;
    if(cb.checked !== checked){
      cb.checked = checked;
      cb.dispatchEvent(new Event('change', {bubbles:true}));
    }
    const title = cb.closest('.section-title');
    const body = title && title.nextElementSibling;
    if(body){
      body.classList.toggle('section-disabled', !checked);
      body.querySelectorAll('select,input,textarea,button').forEach(el=>{
        if(!el.classList.contains('section-apply-checkbox')) el.disabled = !checked;
      });
    }
  }

  function resolveBeddingFromSpec(){
    const unified = val('standard_bedding_unified', '');
    if(unified){
      if(unified === '미적용') return {apply:false, type:'미적용', division:'Inner Covering', unified:'미적용'};
      if(unified === 'LAPPED') return {apply:true, type:'LAPPED', division:'Inner Covering', unified:'LAPPED'};
      if(unified === '이너시스') return {apply:true, type:'압출형', division:'Inner Sheath', unified:'이너시스'};
      return {apply:true, type:'압출형', division:'Inner Covering', unified:'이너커버링'};
    }
    const div = val('standard_inner_division', 'Inner Covering');
    const form = val('standard_bedding_form', '압출형');
    return {
      apply: true,
      type: form === '테이프식' ? 'LAPPED' : '압출형',
      division: div === 'Inner Sheath' ? 'Inner Sheath' : 'Inner Covering',
      unified: form === '테이프식' ? 'LAPPED' : (div === 'Inner Sheath' ? '이너시스' : '이너커버링')
    };
  }

  function fictitiousDiameter(area){
    if(typeof window.getFictitiousConductorDiameter === 'function'){
      try { return Number(window.getFictitiousConductorDiameter(area)) || 0; } catch(e){}
    }
    return Math.sqrt((4 * (Number(area)||0)) / Math.PI);
  }
  function lsAssemblyFactor(type, count){
    if(typeof window.getLSAssemblyFactor === 'function'){
      try { return Number(window.getLSAssemblyFactor(type, count)) || 1; } catch(e){}
    }
    const n = Number(count)||1; return type === 'PAIR' && n > 100 ? 1.9 * Math.sqrt(n) : (type === 'CORE' ? (1 + Math.sqrt(n)) : Math.max(1, Math.sqrt(n) * 2));
  }
  function formatForRule(mode, value){
    const n = Number(value) || 0;
    const north = (typeof window.isNorthAmericanRule === 'function') ? window.isNorthAmericanRule(mode) : /AEIC|ICEA|NEMA|IEEE/.test(String(mode||''));
    return north ? n.toFixed(2) : n.toFixed(1);
  }
  function fallbackArmourThickness(mode, armourType, dUnder){
    const type = String(armourType || '');
    if(!type || type === '미적용') return 0;
    if(String(mode || '').startsWith('IEC_60092')){
      if(type.includes('편조') || type.includes('Braid')) return dUnder <= 15 ? 0.3 : (dUnder <= 35 ? 0.4 : 0.5);
      if(type.includes('횡권') || type.includes('SWA') || type.includes('AWA')){
        if(dUnder <= 15) return 0.8;
        if(dUnder <= 25) return 1.25;
        if(dUnder <= 35) return 1.6;
        if(dUnder <= 45) return 2.0;
        if(dUnder <= 60) return 2.5;
        return 3.15;
      }
      if(type.includes('테이프') || type.includes('STA')) return 0.5;
      return 1.0;
    }
    if(typeof window.getArmourThicknessByStandard === 'function'){
      try { return Number(window.getArmourThicknessByStandard(mode, armourType, dUnder)) || 0; } catch(e){}
    }
    return 0;
  }

  function forceSpecThicknesses(){
    const mode = val('thickness_rule_mode', 'MANUAL');
    if(mode === 'MANUAL') return;

    const sizeSel = $('cond_size');
    const opt = sizeSel && sizeSel.options[sizeSel.selectedIndex];
    const sizeNum = Number(opt?.dataset?.nominalArea || val('cond_size', 0)) || 0;
    const voltage = val('v_rating', '0.6/1kV');
    const coreType = val('core_type', 'CORE');
    const coreNum = parseInt(val('core_num', '1'), 10) || 1;
    const beddingType = val('bedding_type', '미적용');
    const beddingDivision = val('bedding_division', 'Inner Covering');
    const armourType = val('armour_type_new', '미적용');

    const perBundle = coreType === 'PAIR' ? 2 : (coreType === 'TRIAD' ? 3 : (coreType === 'QUAD' ? 4 : 1));
    const totalCores = coreNum * perBundle;
    const isMV = ['3.6/6kV','5KV','6/10KV','8.0KV','8.7/15KV','15KV','12/20KV','18/30KV','25KV','28KV','35KV','46KV','66KV'].includes(voltage);
    let dL = fictitiousDiameter(sizeNum);
    if(val('tape_mica','미적용') !== '미적용') dL += 0.3;
    const insu = parseFloat(val('thick_insu','0')) || 0;
    let dc = dL + 2 * insu + 2 * (isMV ? 1.0 : 0.0);
    if(val('tape_insu_above','미적용') !== '미적용') dc += 0.2;
    if(val('ind_shield_type','미적용') !== '미적용') dc += 0.3;

    let df = dc * lsAssemblyFactor(coreType, coreNum);
    if((coreType === 'PAIR' || coreType === 'TRIAD') && val('ind_shield_type','미적용') !== '미적용') df += 0.3;
    if(val('binder_tape','미적용') !== '미적용') df += 0.2;
    if(val('ov_shield_type','미적용') !== '미적용') df += 0.3;

    let bed = 0;
    if(beddingType !== '미적용'){
      if(String(mode).startsWith('IEC_60092') && beddingType === 'LAPPED') bed = df <= 40 ? 0.4 : 0.6;
      else if(String(mode).includes('IEC')){
        if(String(mode).startsWith('IEC_60092')){
          if(beddingDivision === 'Inner Covering') bed = df <= 25 ? 1.0 : (df <= 35 ? 1.2 : (df <= 45 ? 1.4 : (df <= 60 ? 1.6 : (df <= 80 ? 1.8 : 2.0))));
          else bed = Math.max(1.0, 0.04 * df + 0.8);
        } else if(beddingDivision === 'Inner Covering') bed = df <= 25 ? 0.8 : (df <= 45 ? 1.0 : 1.2);
        else bed = df <= 25 ? 1.0 : (df <= 35 ? 1.2 : (df <= 45 ? 1.4 : (df <= 60 ? 1.6 : 1.8)));
      }
      if(bed > 0) setNumber('thick_bedding', formatForRule(mode, bed), String(mode).includes('NEMA') ? 2 : 1);
    } else {
      setNumber('thick_bedding', 0, String(mode).includes('NEMA') ? 2 : 1);
    }

    const dUnderArmour = df + 2 * bed;
    let arm = 0;
    if(armourType !== '미적용'){
      if(typeof window.getArmourThicknessByStandard === 'function'){
        try { arm = Number(window.getArmourThicknessByStandard(mode, armourType, dUnderArmour)) || 0; } catch(e){ arm = 0; }
      }
      if(!arm) arm = fallbackArmourThickness(mode, armourType, dUnderArmour);
      setNumber('thick_armour', formatForRule(mode, arm), String(mode).includes('NEMA') ? 2 : 1);
    } else {
      setNumber('thick_armour', 0, String(mode).includes('NEMA') ? 2 : 1);
    }
  }

  function syncSpecConditionToMain(){
    if(val('thickness_rule_mode','') !== 'IEC_60092') return;

    const bed = resolveBeddingFromSpec();
    setSectionChecked('11', !!bed.apply);
    setSelect('standard_bedding_unified', bed.unified);
    setSelect('standard_inner_division', bed.division);
    setSelect('standard_bedding_form', bed.type === 'LAPPED' ? '테이프식' : '압출형');
    setSelect('bedding_unified_type', bed.unified);
    setSelect('bedding_type', bed.type);
    setSelect('bedding_division', bed.division);

    const armourChoice = val('standard_armour_type', '미적용');
    if(armourChoice && armourChoice !== '미적용'){
      setSectionChecked('12', true);
      setSelect('armour_type_new', armourChoice);
    }else{
      setSectionChecked('12', false);
      setSelect('armour_type_new', '미적용');
    }

    try { if(typeof window.applyAutomaticThicknesses === 'function') window.applyAutomaticThicknesses(); } catch(e){ console.warn(e); }
    forceSpecThicknesses();
    try { if(typeof window.syncDisabledInputs === 'function') window.syncDisabledInputs(); } catch(e){}
    try { if(typeof window.calculateAndDraw === 'function') window.calculateAndDraw(); } catch(e){ console.warn(e); }
    try { if(typeof window.runCableDesignCalculation === 'function') window.runCableDesignCalculation(); } catch(e){}
  }

  function paintSpecTabButton(){
    document.querySelectorAll('button').forEach(btn => {
      const t = (btn.textContent || '').trim();
      const onclick = String(btn.getAttribute('onclick') || '');
      if(t.includes('사양서 부표') || t.includes('사양서부표') || onclick.includes('openSpecTablePage')){
        btn.style.background = 'linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)';
        btn.style.backgroundColor = '#86efac';
        btn.style.color = '#064e3b';
        btn.style.border = '1px solid #4ade80';
        btn.style.boxShadow = '0 2px 6px rgba(34, 197, 94, 0.22)';
        btn.style.fontWeight = '800';
      }
    });
  }

  const prevHandle = window.handleStandardConditionChange;
  window.handleStandardConditionChange = function(){
    if(typeof prevHandle === 'function'){
      try { prevHandle.apply(this, arguments); } catch(e){ console.warn(e); }
    }
    setTimeout(syncSpecConditionToMain, 0);
  };

  document.addEventListener('change', function(e){
    const id = e.target && e.target.id;
    if(['standard_bedding_unified','standard_inner_division','standard_bedding_form','standard_armour_apply','standard_armour_type','thickness_rule_mode','cond_size','core_num','core_type','v_rating'].includes(id)){
      setTimeout(syncSpecConditionToMain, 0);
    }
  });

  function boot(){
    paintSpecTabButton();
    syncSpecConditionToMain();
    setTimeout(paintSpecTabButton, 100);
    setTimeout(syncSpecConditionToMain, 150);
    setTimeout(paintSpecTabButton, 500);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


// 2026-06-30 requested current-behavior alignment
(function(){
  if (window.__currentBehaviorAlignment_20260630) return;
  window.__currentBehaviorAlignment_20260630 = true;

  function $(id){ return document.getElementById(id); }
  function toArray(x){ return Array.prototype.slice.call(x || []); }
  function hasOption(sel, value){ return !!(sel && toArray(sel.options).some(o => o.value === value)); }
  function setSelect(id, value){
    const el=$(id); if(!el || value == null) return false;
    if(el.tagName === 'SELECT' && !hasOption(el, value)) return false;
    if(el.value !== value) el.value = value;
    return true;
  }
  function setInput(id, value){
    const el=$(id); if(!el || value == null) return false;
    if(String(el.value) !== String(value)) el.value = String(value);
    return true;
  }
  function setSectionApply(key, checked){
    const cb=document.querySelector('.section-apply-checkbox[data-section-key="'+key+'"]');
    if(!cb) return false;
    cb.checked=!!checked;
    const title=cb.closest('.section-title');
    const body=title && title.nextElementSibling;
    if(body){
      body.classList.toggle('section-disabled', !checked);
      body.querySelectorAll('select,input,textarea,button').forEach(el=>{
        if(!el.classList.contains('section-apply-checkbox')) el.disabled=!checked;
      });
    }
    return true;
  }
  function parseNumberText(text){
    const n = Number(String(text||'').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? n : 0;
  }
  function formatWonPerMeterTable(){
    const table=$('cableCalcTable');
    if(!table) return;
    const headers=toArray(table.querySelectorAll('thead tr:first-child th'));
    headers.forEach(th=>{
      const t=(th.textContent||'').trim();
      if(t.includes('재료비')) th.textContent='재료비 (원/m)';
    });
    let sum=0;
    toArray(document.querySelectorAll('#resultTableBody td[id^="table_cost_"]')).forEach(td=>{
      let n=parseNumberText(td.textContent);
      if(/\bkm\b|\/\s*km|원\s*\/\s*km/i.test(td.textContent)) n=Math.round(n/1000);
      td.textContent=n.toLocaleString();
      td.style.textAlign='right';
      sum += n;
    });
    ['table_final_cost_val','table_final_cost'].forEach(id=>{
      const el=$(id);
      if(!el) return;
      if(sum > 0) el.textContent=sum.toLocaleString();
      else {
        let n=parseNumberText(el.textContent);
        if(/\bkm\b|\/\s*km|원\s*\/\s*km/i.test(el.textContent)) n=Math.round(n/1000);
        el.textContent=n.toLocaleString();
      }
      el.style.textAlign='right';
    });
  }

  function beddingFrom60092(){
    const unified=$('standard_bedding_unified')?.value || '';
    if(unified){
      if(unified === '미적용') return {apply:false, type:'미적용', division:'Inner Covering', unified};
      if(unified === 'LAPPED') return {apply:true, type:'LAPPED', division:'Inner Covering', unified};
      if(unified === '이너시스') return {apply:true, type:'압출형', division:'Inner Sheath', unified};
      return {apply:true, type:'압출형', division:'Inner Covering', unified:'이너커버링'};
    }
    const division=$('standard_inner_division')?.value === 'Inner Sheath' ? 'Inner Sheath' : 'Inner Covering';
    const form=$('standard_bedding_form')?.value === '테이프식' ? 'LAPPED' : '압출형';
    return {
      apply:true,
      type:form,
      division,
      unified:form === 'LAPPED' ? 'LAPPED' : (division === 'Inner Sheath' ? '이너시스' : '이너커버링')
    };
  }
  function sync60092ConditionToSections(){
    if(($('thickness_rule_mode')?.value || '') !== 'IEC_60092') return;
    const bed=beddingFrom60092();
    setSectionApply('11', bed.apply);
    setSelect('standard_bedding_unified', bed.unified);
    setSelect('standard_inner_division', bed.division);
    setSelect('standard_bedding_form', bed.type === 'LAPPED' ? '테이프식' : '압출형');
    setSelect('bedding_unified_type', bed.unified);
    setSelect('bedding_type', bed.type);
    setSelect('bedding_division', bed.division);

    const armourChoice=($('standard_armour_type')?.value || '미적용');
    const armourOn=(armourChoice !== '미적용');
    setSectionApply('12', armourOn);
    setSelect('armour_type_new', armourOn ? armourChoice : '미적용');

    try{ if(typeof window.applyAutomaticThicknesses === 'function') window.applyAutomaticThicknesses(); }catch(e){}
    try{ if(typeof window.syncDisabledInputs === 'function') window.syncDisabledInputs(); }catch(e){}
    try{ if(typeof window.calculateAndDraw === 'function') window.calculateAndDraw(); }catch(e){}
    setTimeout(formatWonPerMeterTable, 0);
  }
  function forceSheathApplyDefault(){
    setSectionApply('13', true);
    const sh=$('sheath_material');
    if(sh && (sh.value === '미적용' || sh.value === '')){
      const opt=toArray(sh.options).find(o => o.value && o.value !== '미적용');
      if(opt) sh.value=opt.value;
    }
    const th=$('thick_sheath');
    if(th && (!parseFloat(th.value))) th.value = th.defaultValue || th.getAttribute('value') || '1.6';
    try{ if(typeof window.syncDisabledInputs === 'function') window.syncDisabledInputs(); }catch(e){}
    try{ if(typeof window.calculateAndDraw === 'function') window.calculateAndDraw(); }catch(e){}
  }

  function wrapRenderAndRun(){
    if(typeof window.renderCalculatedTableDOM === 'function' && !window.renderCalculatedTableDOM.__wonM){
      const original=window.renderCalculatedTableDOM;
      window.renderCalculatedTableDOM=function(){
        const r=original.apply(this, arguments);
        formatWonPerMeterTable();
        return r;
      };
      window.renderCalculatedTableDOM.__wonM = true;
    }
    if(typeof window.runCableDesignCalculation === 'function' && !window.runCableDesignCalculation.__wonM){
      const original=window.runCableDesignCalculation;
      window.runCableDesignCalculation=function(){
        const r=original.apply(this, arguments);
        setTimeout(formatWonPerMeterTable, 0);
        return r;
      };
      window.runCableDesignCalculation.__wonM = true;
    }
  }
  function boot(){
    wrapRenderAndRun();
    forceSheathApplyDefault();
    sync60092ConditionToSections();
    formatWonPerMeterTable();
    setTimeout(()=>{ wrapRenderAndRun(); forceSheathApplyDefault(); sync60092ConditionToSections(); formatWonPerMeterTable(); }, 120);
    setTimeout(()=>{ wrapRenderAndRun(); sync60092ConditionToSections(); formatWonPerMeterTable(); }, 600);
  }
  document.addEventListener('change', function(e){
    const id=e.target && e.target.id;
    if(['thickness_rule_mode','standard_bedding_unified','standard_inner_division','standard_bedding_form','standard_armour_apply','standard_armour_type','cond_size','core_num','core_type','v_rating'].includes(id)){
      setTimeout(sync60092ConditionToSections, 0);
    }
  });
  document.addEventListener('input', function(e){
    if(e.target && e.target.classList && e.target.classList.contains('table-edit-input')){
      setTimeout(formatWonPerMeterTable, 0);
    }
    if(e.target && ['cable_name','core_num'].includes(e.target.id)){
      setTimeout(()=>{ try{ updateSectionDrawingTitle(); }catch(_e){} }, 0);
    }
  });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


/* Integrated requested main-screen behavior fixes: IEC60092 armour unification, MV semi default, table copy alignment */
(function(){
  if(window.__requestedMainBehaviorIntegrated20260702) return;
  window.__requestedMainBehaviorIntegrated20260702 = true;
  function $(id){ return document.getElementById(id); }
  function val(id, d=''){ const el=$(id); return el ? (el.type==='checkbox'?el.checked:el.value) : d; }
  const MV_VOLTAGES = ['1.8/3kV','2000V','3.6/6kV','5KV','6/10KV','8.0KV','8.7/15KV','15KV','12/20KV','18/30KV','25KV','28KV','35KV','46KV','66KV'];
  const LEVEL_ALLOWED = ['AEIC','ICEA_S96_NEMA_WC71','ICEA_S93_NEMA_WC74'];
  function hasOption(sel, value){ return !!(sel && Array.from(sel.options||[]).some(o=>o.value===value)); }
  function ensureIecArmourOptions(){
    const sel=$('standard_armour_type');
    if(sel && !hasOption(sel,'미적용')){
      const opt=document.createElement('option');
      opt.value='미적용'; opt.textContent='비외장';
      sel.insertBefore(opt, sel.firstChild);
    }
    const apply=$('standard_armour_apply');
    if(apply && apply.closest('.field-group')) apply.closest('.field-group').style.display='none';
  }
  function syncArmourByType(){
    if(val('thickness_rule_mode') !== 'IEC_60092') return;
    ensureIecArmourOptions();
    const choice=val('standard_armour_type','미적용');
    const main=$('armour_type_new');
    if(main && hasOption(main, choice)) main.value=choice;
    else if(main && choice==='미적용') main.value='미적용';
    const cb=document.querySelector('.section-apply-checkbox[data-section-key="12"]');
    if(cb){
      const on=choice !== '미적용';
      cb.checked=on;
      const body=cb.closest('.section-title')?.nextElementSibling;
      if(body){
        body.classList.toggle('section-disabled', !on);
        body.querySelectorAll('select,input,textarea,button').forEach(el=>{
          if(!el.classList.contains('section-apply-checkbox')) el.disabled=!on;
        });
      }
    }
  }
  function syncNemaLevelVisibility(){
    const spec=val('thickness_rule_mode','MANUAL');
    const allowed=LEVEL_ALLOWED.includes(spec);
    const group=$('nema_level_main')?.closest('.field-group');
    if(group) group.style.display=allowed ? 'block' : 'none';
    if($('nema_level_main')) $('nema_level_main').disabled=!allowed;
  }
  function isMvRating(v){
    const raw = String(v || '').trim();
    const upper = raw.toUpperCase();
    if (upper === '0.6/1KV' || upper === '600/1000V' || upper === '1000V') return false;
    if (MV_VOLTAGES.includes(raw)) return true;
    if (upper.includes('KV')) {
      const nums = upper.match(/\d+(?:\.\d+)?/g) || [];
      return nums.some(n => Number(n) >= 1.8);
    }
    const vnum = Number(upper.replace(/[^0-9.]/g, ''));
    return Number.isFinite(vnum) && vnum >= 1800;
  }
  function sectionTagText(){
    const voltage = val('v_rating','');
    const name = val('cable_name','CABLE ENGINE') || 'CABLE ENGINE';
    const ctype = val('core_type','CORE');
    const suffix = ctype === 'PAIR' ? 'P' : ctype === 'TRIAD' ? 'T' : ctype === 'QUAD' ? 'Q' : 'C';
    const cores = val('core_num','') || '1';
    const size = val('cond_size','');
    const sizeTxt = size ? (String(size).toUpperCase().includes('AWG') || String(size).toUpperCase().includes('KCMIL') ? size : `${size}SQ`) : '';
    return [voltage, name, `${cores}${suffix}`, 'x', sizeTxt].filter(Boolean).join(' ');
  }
  function updateSectionDrawingTitle(){
    const text = sectionTagText();
    const title = $('sectionDrawingTitle');
    const hidden = $('cableTagDisplay');
    if(title) title.textContent = text || '단면도';
    if(hidden) hidden.value = text || 'CABLE ENGINE';
  }
  function runLinkedRecalc(){
    try{ if(typeof window.syncDisabledInputs === 'function') window.syncDisabledInputs(); }catch(e){}
    try{ if(typeof window.calculateAndDraw === 'function') window.calculateAndDraw(); }catch(e){}
    try{
      const body = document.getElementById('resultTableBody');
      const hasRows = body && body.children && body.children.length > 0;
      if(hasRows && typeof window.runCableDesignCalculation === 'function') window.runCableDesignCalculation();
    }catch(e){}
  }
  function setSectionApplyState(key, checked){
    const cb=document.querySelector('.section-apply-checkbox[data-section-key="'+key+'"]');
    if(!cb) return false;
    const next=!!checked;
    if(cb.checked!==next) cb.checked=next;
    const body=cb.closest('.section-title')?.nextElementSibling;
    if(body){
      body.classList.toggle('section-disabled', !next);
      body.querySelectorAll('select,input,textarea,button').forEach(el=>{
        if(!el.classList.contains('section-apply-checkbox')) el.disabled=!next;
      });
    }
    return true;
  }
  function applyMvSemiDefaults(){
    const isMV = isMvRating(val('v_rating'));
    if(!isMV) return;
    let changed = false;
    if(setSectionApplyState('3', true)) changed = true;
    if(setSectionApplyState('5', true)) changed = true;
    [['inner_semi','적용'],['outer_semi','적용']].forEach(([id,v])=>{
      const el=$(id);
      if(el && el.value!==v){
        el.value=v;
        changed = true;
      }
    });
    if($('thick_inner_semi') && !parseFloat($('thick_inner_semi').value)) { $('thick_inner_semi').value='0.4'; changed = true; }
    if($('thick_outer_semi') && !parseFloat($('thick_outer_semi').value)) { $('thick_outer_semi').value='0.6'; changed = true; }
    if(changed) runLinkedRecalc();
  }

  function tableTextValue(cell){
    const input=cell.querySelector('input,select,textarea');
    return input ? input.value : (cell.innerText || '').trim();
  }
  function isNumericText(s){
    return /^-?\d{1,3}(,\d{3})*(\.\d+)?$|^-?\d+(\.\d+)?$/.test(String(s||'').replace(/\s*(mm|kg\/km|원\/m|%)\s*$/i,'').trim());
  }
  window.copyTableToClipboard=function(){
    const table=$('cableCalcTable');
    if(!table){ alert('복사할 자재량 계산표가 없습니다.'); return; }
    const clone=table.cloneNode(true);
    clone.querySelectorAll('input').forEach(inp=>{
      const span=document.createElement('span');
      span.textContent=inp.value;
      span.style.display='inline-block';
      span.style.width='100%';
      span.style.textAlign='right';
      inp.replaceWith(span);
    });
    clone.querySelectorAll('td,th').forEach(cell=>{
      const text=(cell.innerText||'').trim();
      if(cell.tagName==='TH') cell.style.textAlign='center';
      else if(isNumericText(text) || /(\d|-)$/ .test(text)) cell.style.textAlign='right';
    });
    const html='<html><body>'+clone.outerHTML+'</body></html>';
    const text=Array.from(clone.rows).map(r=>Array.from(r.cells).map(c=>(c.innerText||'').trim()).join('\t')).join('\n');
    if(navigator.clipboard && window.ClipboardItem){
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html],{type:'text/html'}),
        'text/plain': new Blob([text],{type:'text/plain'})
      })]).then(()=>alert('엑셀복사 완료')).catch(()=>{
        const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); alert('엑셀복사 완료');
      });
    }else{
      const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); alert('엑셀복사 완료');
    }
  };
  function refreshRequested(){
    ensureIecArmourOptions();
    syncNemaLevelVisibility();
    syncArmourByType();
    applyMvSemiDefaults();
    updateSectionDrawingTitle();
  }
  document.addEventListener('change', function(e){
    const id=e.target && e.target.id;
    if(['thickness_rule_mode','standard_armour_type','v_rating','core_type','core_num','cond_size','cable_name','nema_level_main'].includes(id)){
      setTimeout(refreshRequested,0);
    }
  });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(refreshRequested,0); setTimeout(refreshRequested,80); });
  else { setTimeout(refreshRequested,0); setTimeout(refreshRequested,80); }
})();


/* Requested fix: prevent IEC 60092-only conditions from carrying into AEIC/other standards */
(function(){
  if(window.__iec60092ConditionLeakGuard20260702) return;
  window.__iec60092ConditionLeakGuard20260702 = true;
  function $(id){ return document.getElementById(id); }
  function val(id,d=''){ const el=$(id); return el ? el.value : d; }
  function hasOption(sel, value){ return !!(sel && Array.from(sel.options||[]).some(o=>o.value===value)); }
  function setSelect(id, value){
    const el=$(id); if(!el) return;
    if(el.tagName==='SELECT' && !hasOption(el,value)) return;
    el.value=value;
  }
  function setSection(key, checked){
    const cb=document.querySelector('.section-apply-checkbox[data-section-key="'+key+'"]');
    if(!cb) return;
    cb.checked=!!checked;
    const body=cb.closest('.section-title')?.nextElementSibling;
    if(body){
      body.classList.toggle('section-disabled', !checked);
      body.querySelectorAll('select,input,textarea,button').forEach(el=>{
        if(!el.classList.contains('section-apply-checkbox')) el.disabled=!checked;
      });
    }
  }
  function resetIec60092Selections(){
    setSelect('standard_bedding_unified','미적용');
    setSelect('standard_inner_division','Inner Covering');
    setSelect('standard_bedding_form','압출형');
    setSelect('standard_armour_type','미적용');
    setSelect('bedding_unified_type','미적용');
    setSelect('bedding_type','미적용');
    setSelect('bedding_division','Inner Covering');
    setSelect('armour_type_new','미적용');
    setSection('11', false);
    setSection('12', false);
  }
  let previousRule = val('thickness_rule_mode','MANUAL');
  function enforce(){
    const current=val('thickness_rule_mode','MANUAL');
    const leaving60092 = previousRule === 'IEC_60092' && current !== 'IEC_60092';
    document.querySelectorAll('.standard-cond-60092').forEach(el=>{
      if(current !== 'IEC_60092') el.style.display='none';
    });
    if(leaving60092) {
      resetIec60092Selections();
      try{ if(typeof window.applyAutomaticThicknesses==='function') window.applyAutomaticThicknesses(); }catch(e){}
      try{ if(typeof window.syncDisabledInputs==='function') window.syncDisabledInputs(); }catch(e){}
      try{ if(typeof window.calculateAndDraw==='function') window.calculateAndDraw(); }catch(e){}
      try{ if(typeof window.runCableDesignCalculation==='function') window.runCableDesignCalculation(); }catch(e){}
    }
    previousRule=current;
  }
  document.addEventListener('change', function(e){
    if(e.target && e.target.id==='thickness_rule_mode') setTimeout(enforce,0);
  });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>setTimeout(enforce,0));
  else setTimeout(enforce,0);
})();



// ==================== 안정화: 사양서 조건 표시 및 시스 방식 변경 핸들러 ====================
(function(){
  function qsAll(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function v(id){ return document.getElementById(id)?.value || ''; }
  function recalcAll(){
    try { if (typeof syncArrayTableToUI === 'function') syncArrayTableToUI(); } catch(e) { console.warn(e); }
    try { if (typeof calculateAndDraw === 'function') calculateAndDraw(); } catch(e) { console.warn(e); }
    try {
      const tbl=document.getElementById('calcTableBody');
      if(tbl && tbl.children && tbl.children.length && typeof runCableDesignCalculation === 'function') runCableDesignCalculation();
    } catch(e) { console.warn(e); }
  }
  window.forceStandardConditionVisibility = function(){
    const spec=v('thickness_rule_mode');
    qsAll('.standard-cond').forEach(function(el){ el.style.display='none'; });
    if(['AEIC','ICEA_S96_NEMA_WC71','ICEA_S93_NEMA_WC74'].includes(spec)){
      qsAll('.standard-cond-level').forEach(function(el){ el.style.display='block'; });
    }
    if(spec==='IEC_60092'){
      qsAll('.standard-cond-60092').forEach(function(el){ el.style.display='block'; });
    }
    if(spec==='EN_50264_3_1'){
      qsAll('.standard-cond-en').forEach(function(el){ el.style.display='block'; });
    }
    const sheath=document.getElementById('cabling_sheath_method');
    if(sheath && sheath.closest('.field-group')) sheath.closest('.field-group').style.display='block';
  };
  const prevThickness = window.handleThicknessRuleChange;
  window.handleThicknessRuleChange = function(){
    if(typeof prevThickness === 'function'){
      try { prevThickness.apply(this, arguments); } catch(e) { console.warn(e); }
    }
    window.forceStandardConditionVisibility();
    recalcAll();
  };
  window.handleCablingSheathMethodChange = function(){
    window.forceStandardConditionVisibility();
    recalcAll();
  };
  const prevStdCond = window.handleStandardConditionChange;
  window.handleStandardConditionChange = function(){
    if(typeof prevStdCond === 'function'){
      try { prevStdCond.apply(this, arguments); } catch(e) { console.warn(e); }
    }
    window.forceStandardConditionVisibility();
    recalcAll();
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){ window.forceStandardConditionVisibility(); }, 0);
  });
})();
// ==================== /안정화 ====================

/* =========================================================
 * Spec condition UI finalization: 2026-07-02
 * - 시스 방식은 사양서 앞/항상 표시
 * - IEEE 1580은 IEEE Type을 절연재질 선택으로 표시
 * - IEC 60092 베딩/이너 조건은 하나의 select만 표시
 * ========================================================= */
(function(){
  function $(id){ return document.getElementById(id); }
  function qsa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function val(id,d){ const el=$(id); return el ? el.value : d; }
  function setDisplay(el, show){ if(el) el.style.display = show ? 'block' : 'none'; }
  function ensureVoltageOption(value, label, afterValue){
    const sel=$('v_rating'); if(!sel || Array.from(sel.options).some(o=>o.value===value)) return;
    const opt=document.createElement('option'); opt.value=value; opt.textContent=label||value;
    const after=Array.from(sel.options).find(o=>o.value===afterValue);
    if(after && after.nextSibling) sel.insertBefore(opt, after.nextSibling); else sel.appendChild(opt);
  }
  function finalizeSpecConditionUI(){
    ensureVoltageOption('28KV','28KV','25KV');
    ensureVoltageOption('46KV','46KV','35KV');

    const sheath=$('cabling_sheath_method');
    const specSel=$('thickness_rule_mode');
    if(sheath && specSel){
      const sheathGroup=sheath.closest('.field-group');
      const specGroup=specSel.closest('.field-group');
      if(sheathGroup && specGroup && specGroup.parentNode && sheathGroup.nextElementSibling!==specGroup){
        specGroup.parentNode.insertBefore(sheathGroup, specGroup);
      }
      setDisplay(sheathGroup, true);
    }

    const spec=val('thickness_rule_mode','MANUAL');
    qsa('.standard-cond').forEach(el=>setDisplay(el,false));

    // 기본 절연재질 선택은 대부분 표시. IEEE는 라벨만 IEEE Type으로 변경.
    const matSel=$('standard_insu_material');
    const matGroup=matSel ? matSel.closest('.field-group') : null;
    const matLabel=matGroup ? matGroup.querySelector('label') : null;
    if(matGroup) setDisplay(matGroup, spec!=='MANUAL');
    if(matLabel) matLabel.textContent = (spec==='IEEE_1580') ? 'IEEE Type' : (spec==='ICEA_S73_NEMA_WC57' ? '절연재질 상세' : '절연 재질');

    if(spec==='IEC_60092'){
      const unified=$('standard_iec60092_bedding_inner_mode');
      if(unified && unified.closest('.field-group')) setDisplay(unified.closest('.field-group'), true);
      qsa('.standard-cond-60092-legacy').forEach(el=>setDisplay(el,false));
      const arm=$('standard_armour_type');
      if(arm && arm.closest('.field-group')) setDisplay(arm.closest('.field-group'), true);
    }
    if(spec==='IEC_60502'){
      // IEC 60502는 절연재질만 사양조건으로 노출. 베딩/외장은 Part 2/3 공정에서 선택값 상속.
    }
    if(spec==='EN_50264_3_1'){
      qsa('.standard-cond-en').forEach(el=>setDisplay(el,true));
    }
    if(spec==='ICEA_S93_NEMA_WC74' || spec==='AEIC'){
      qsa('.standard-cond-level').forEach(el=>setDisplay(el,true));
    }
    // ICEA S-96은 단심/다심은 선심구조에서 상속, 절연 Type은 standard_insu_material 선택으로 처리.
  }
  const prevForce=window.forceStandardConditionVisibility;
  window.forceStandardConditionVisibility=function(){
    if(typeof prevForce==='function'){ try{ prevForce(); }catch(e){} }
    finalizeSpecConditionUI();
  };
  const prevHandle=window.handleThicknessRuleChange;
  window.handleThicknessRuleChange=function(){
    if(typeof prevHandle==='function'){ try{ prevHandle.apply(this, arguments); }catch(e){ console.warn(e); } }
    finalizeSpecConditionUI();
  };
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(finalizeSpecConditionUI, 0); setTimeout(finalizeSpecConditionUI, 300); });
})();


/* =========================================================
 * 2026-07-03 requested integration patch
 * - 모든 버튼 소형 이모티콘
 * - PART1 변경을 단일 syncPart1LinkedOutputs() 경로로 PART2/PART3/자재량/부표 config에 연동
 * ========================================================= */
(function(){
  if (window.__lsRequest20260703MainPatch) return;
  window.__lsRequest20260703MainPatch = true;

  function $(id){ return document.getElementById(id); }
  function val(id, def=''){
    const el=$(id);
    if(!el) return def;
    return el.type === 'checkbox' ? el.checked : el.value;
  }
  function setVal(id, value){
    const el=$(id);
    if(!el || value === undefined || value === null) return false;
    if(el.tagName === 'SELECT'){
      const ok = Array.from(el.options || []).some(o => o.value === value);
      if(!ok) return false;
    }
    if(String(el.value) !== String(value)) el.value = String(value);
    return true;
  }

  // Decorative button emojis were removed to keep all screens visually consistent.
  window.ensureTinyButtonEmojis = function(){ return; };

  function collectMainConfigForLinkedOutputs(){
    const config={};
    document.querySelectorAll('input,select,textarea').forEach(el=>{
      if(!el.id) return;
      config[el.id]=(el.type==='checkbox')?el.checked:el.value;
    });
    const rule = val('thickness_rule_mode','MANUAL');
    config.cable_name = val('cable_name','CABLE ENGINE') || 'CABLE ENGINE';
    config.v_rating = val('v_rating','0.6/1kV');
    config.core_type = val('core_type','CORE');
    config.core_num = parseInt(val('core_num','3'),10) || 3;
    config.cond_material = val('cond_material','copper');
    config.conductorStandard = (typeof resolveConductorStandardBySpec === 'function') ? resolveConductorStandardBySpec(rule) : val('conductorStandard','IEC');
    config.cond_class = val('cond_class','연선');
    config.cond_size = val('cond_size','2.5');
    config.insu_material = val('insu_material','XLPE');
    config.bedding_type = val('bedding_type','미적용');
    config.bedding_division = val('bedding_division','Inner Covering');
    config.bedding_material = val('bedding_material','XLPE');
    config.armour_type = val('armour_type_new', val('armour_type','미적용'));
    config.armour_material = val('armour_material_new', val('armour_material',''));
    config.sheath_material = val('sheath_material','PVC');
    config.cabling_sheath_method = val('cabling_sheath_method','GENERAL_EXTRUDED');
    config.thickness_std = rule;
    config.nema_level = val('nema_level_main', val('nema_level','100%'));
    config.assembly_od_auto = window.lastCalculatedAutoAssemblyOD || '자동계산';

    ['insu_base_price','bedding_base_price','sheath_base_price','calculated_copper_price',
     'loss_conductor','loss_insulation','loss_bedding','loss_sheath','loss_other'].forEach(id=>{
      const el=$(id);
      if(el) config[id]=el.value;
    });
    try { config.selectedInsuColors = Array.isArray(selectedInsuColors) ? selectedInsuColors.slice() : []; } catch(e) {}
    return config;
  }
  window.collectMainConfigForLinkedOutputs = collectMainConfigForLinkedOutputs;

  function broadcastMainConfigForSpec(config){
    try { sessionStorage.setItem('cable_design_main_config', JSON.stringify(config)); } catch(e) {}
    try {
      localStorage.setItem('cable_design_main_config_broadcast', JSON.stringify({ts:Date.now(), config}));
    } catch(e) {}
  }
  window.broadcastMainConfigForSpec = broadcastMainConfigForSpec;

  function setSectionApply(key, enabled){
    const cb=document.querySelector('.section-apply-checkbox[data-section-key="'+key+'"]');
    if(!cb) return false;
    cb.checked=!!enabled;
    const title=cb.closest('.section-title');
    const body=title && title.nextElementSibling;
    if(body){
      body.classList.toggle('section-disabled', !enabled);
      body.querySelectorAll('select,input,textarea,button').forEach(el=>{
        if(el.classList.contains('section-apply-checkbox')) return;
        el.disabled = !enabled;
      });
    }
    return true;
  }

  function syncPart1ToSectionCheckboxes(){
    const mode = val('thickness_rule_mode','MANUAL');

    // IEC 60092 조건값은 PART3 베딩/외장 적용 체크박스까지 함께 맞춘다.
    if(mode === 'IEC_60092'){
      const bedMode = val('standard_iec60092_bedding_inner_mode', val('standard_bedding_unified',''));
      const bedApply = !!bedMode && bedMode !== '미적용';
      setSectionApply('11', bedApply);
      const armourApply = val('standard_armour_type','미적용') !== '미적용';
      setSectionApply('12', armourApply);
    }else{
      setSectionApply('11', val('bedding_type','미적용') !== '미적용');
      setSectionApply('12', val('armour_type_new','미적용') !== '미적용');
    }

    // EN 50264의 시스 유무 또는 현재 시스 재질에 따라 PART3 시스 적용 체크박스 동기화
    if(mode === 'EN_50264_3_1'){
      setSectionApply('13', val('standard_en_sheath','적용') !== '미적용');
    }else{
      setSectionApply('13', val('sheath_material','미적용') !== '미적용');
    }
  }

  let syncing=false;
  window.syncPart1LinkedOutputs = function(options){
    options = options || {};
    if(syncing){
      if(typeof options.original === 'function' && !options.skipOriginal){
        return options.original.apply(this, options.args || []);
      }
      return;
    }
    syncing=true;
    try{
      if(typeof options.original === 'function' && !options.skipOriginal){
        try { options.original.apply(this, options.args || []); } catch(e){ console.warn(e); }
      }

      // 기존 자동 두께/조건/비활성화 로직은 유지하고, 체크박스와 부표 config만 한 곳에서 후처리
      try { if(typeof applyAutomaticThicknesses === 'function') applyAutomaticThicknesses(); } catch(e){ console.warn(e); }
      try { if(typeof syncDisabledInputs === 'function') syncDisabledInputs(); } catch(e){}
      try { syncPart1ToSectionCheckboxes(); } catch(e){ console.warn(e); }
      try { if(typeof updateConductorSizes === 'function') updateConductorSizes(); } catch(e){}
      try { if(typeof buildDynamicColorUI === 'function') buildDynamicColorUI(); } catch(e){}
      try { if(typeof initColorChips === 'function') initColorChips(); } catch(e){}
      try { if(typeof calculateAndDraw === 'function') calculateAndDraw(); } catch(e){ console.warn(e); }

      const cfg = collectMainConfigForLinkedOutputs();
      broadcastMainConfigForSpec(cfg);

      if(!options.skipMaterial && !window.__suppressPart1MaterialSync){
        try { if(typeof runCableDesignCalculation === 'function') runCableDesignCalculation(); } catch(e){}
      }
      try { window.ensureTinyButtonEmojis(); } catch(e){}
      return cfg;
    } finally {
      syncing=false;
    }
  };

  function wrapPart1Handler(name, source){
    const prev = window[name];
    window[name] = function(){
      return window.syncPart1LinkedOutputs.call(this, {source, original:prev, args:arguments});
    };
  }
  [
    ['handleThicknessRuleChange','thickness_rule_mode'],
    ['handleCablingSheathMethodChange','cabling_sheath_method'],
    ['handleStandardConditionChange','standard_condition'],
    ['handleStandardMaterialChange','standard_insu_material'],
    ['handleVoltageAndDraw','v_rating'],
    ['handleCoreTypeChange','core_type'],
    ['handleCoreNumChange','core_num']
  ].forEach(pair=>wrapPart1Handler(pair[0], pair[1]));

  // PART1 안의 체크박스/선택값 변경도 중앙 함수로 한 번 더 보정(디바운스)
  let part1Timer=null;
  document.addEventListener('change', function(e){
    const target=e.target;
    if(!target || !target.closest || !target.closest('.part-1')) return;
    clearTimeout(part1Timer);
    part1Timer=setTimeout(()=>window.syncPart1LinkedOutputs({source:'part1-debounced', skipOriginal:true}), 0);
  });

  function boot(){
    window.ensureTinyButtonEmojis();
    window.syncPart1LinkedOutputs({source:'boot', skipOriginal:true, skipMaterial:true});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);
  try {
    new MutationObserver(()=>window.ensureTinyButtonEmojis()).observe(document.documentElement, {childList:true, subtree:true});
  } catch(e) {}
})();

/* Catalog navigation helpers */
(function(){
  function captureCatalogDrawings(){
    try{
      const svg=document.getElementById('cableSvg');
      if(svg) sessionStorage.setItem('cable_2d_drawing','data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg)));
      const canvas=document.querySelector('#cable3DContainer canvas');
      if(canvas) sessionStorage.setItem('cable_3d_drawing',canvas.toDataURL('image/png'));
    }catch(e){console.warn('도면 캡처 실패:',e);}
  }
  window.openTechDataFromMain = function(){
    try { if(typeof normalizeSpecForSession==='function') normalizeSpecForSession(); captureCatalogDrawings(); }catch(e){}
    window.open('tech-data.html?instance='+Date.now(),'_blank');
  };
  window.openSpecSheetFromMain = function(){
    try { if(typeof normalizeSpecForSession==='function') normalizeSpecForSession(); captureCatalogDrawings(); }catch(e){}
    window.open('spec-sheet.html?instance='+Date.now(),'_blank');
  };
})();

/* Specification-sheet drawing snapshot: preserves visible 3D number labels and their legend. */
(function(){
  // 사양서에는 메인 화면에 실제 표시된 3D 캔버스와 번호 오버레이를 그대로 합성해 저장합니다.
  // 번호 좌표는 오버레이가 아닌 캔버스 기준으로 환산하여 화면과 저장 이미지의 위치를 일치시킵니다.
  function capture3DWithLabels(canvas, overlay){
    if(!canvas) return '';
    try{
      const w=canvas.width||canvas.clientWidth, h=canvas.height||canvas.clientHeight;
      const out=document.createElement('canvas'); out.width=w; out.height=h;
      const ctx=out.getContext('2d'); ctx.drawImage(canvas,0,0,w,h);
      if(overlay){
        const cr=canvas.getBoundingClientRect();
        overlay.querySelectorAll('.label-3d-num').forEach(function(el){
          if(getComputedStyle(el).display==='none') return;
          const r=el.getBoundingClientRect();
          const scaleX=w/(cr.width||w), scaleY=h/(cr.height||h);
          const x=(r.left-cr.left+r.width/2)*scaleX;
          const y=(r.top-cr.top+r.height/2)*scaleY;
          const radius=Math.max(11,((r.width||22)*scaleX)/2);
          ctx.beginPath();ctx.fillStyle='#005596';ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1.5,2*scaleX);ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
          ctx.fillStyle='#fff';ctx.font=`bold ${Math.round(radius)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(el.textContent||'',x,y+1);
        });
      }
      return out.toDataURL('image/png');
    }catch(e){ return canvas.toDataURL('image/png'); }
  }
  window.captureCatalogDrawingSnapshots=function(){
    try{
      const svg=document.getElementById('cableSvg');
      if(svg) sessionStorage.setItem('cable_2d_drawing','data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg)));
      const canvas=document.querySelector('#cable3DContainer canvas'), overlay=document.getElementById('labels3DOverlay');
      if(canvas) sessionStorage.setItem('cable_3d_drawing',capture3DWithLabels(canvas,overlay));
      if(window.lastCableLabelMap) sessionStorage.setItem('cable_label_map',JSON.stringify(window.lastCableLabelMap));
    }catch(e){console.warn('도면 캡처 실패:',e);}
  };
  const oldOpen=window.__openSpecTablePageRoot;
  if(oldOpen) window.__openSpecTablePageRoot=function(){ window.captureCatalogDrawingSnapshots(); return oldOpen.apply(this,arguments); };
  window.openSpecSheetFromMain=async function(){
    try{
      if(typeof normalizeSpecForSession==='function') normalizeSpecForSession();

      // 사양서에는 번호가 포함된 3D 화면을 항상 사용합니다.
      const labels=document.getElementById('show_labels');
      const view3d=document.getElementById('show_3d_view');
      if(labels && !labels.checked) { labels.checked=true; labels.dispatchEvent(new Event('change')); }
      if(view3d && !view3d.checked) { view3d.checked=true; view3d.dispatchEvent(new Event('change')); }

      // 3D 분할영역의 크기 확정 및 번호 오버레이 위치 계산이 끝난 뒤 합성 캡처합니다.
      await new Promise(resolve=>setTimeout(resolve,560));
      if(typeof window.update3DCableView==='function') window.update3DCableView();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      window.captureCatalogDrawingSnapshots();
    }catch(e){ console.warn('사양서 도면 캡처 실패:',e); }
    window.open('spec-sheet.html?instance='+Date.now(),'_blank');
  };
  window.openTechDataFromMain=function(){ try{if(typeof normalizeSpecForSession==='function')normalizeSpecForSession();window.captureCatalogDrawingSnapshots();}catch(e){} window.open('tech-data.html?instance='+Date.now(),'_blank'); };
})();
/* Button text normalization: remove decorative emoji prefixes without changing button behaviour. */
(function(){
  const emoji=/^[\s\u{1F000}-\u{1FAFF}\u2600-\u27BF\u{FE0F}]+/u;
  window.ensureTinyButtonEmojis=function(){};
  function strip(){document.querySelectorAll('button,a.btn,input[type="button"]').forEach(el=>{if(el.tagName==='INPUT')return;el.childNodes.forEach(n=>{if(n.nodeType===3)n.nodeValue=n.nodeValue.replace(emoji,'').trimStart();});});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',strip);else strip();
  try{new MutationObserver(strip).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}
})();
