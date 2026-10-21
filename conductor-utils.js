
// conductor-utils.js - single conductor lookup/normalization utility
(function(global){
  function normMaterial(v){
    const s=String(v||'').trim().toLowerCase();
    if(!s || s.includes('copper') || s.includes('구리') || s==='동' || s.includes('동 ')) return 'copper';
    if(s.includes('aluminum') || s.includes('aluminium') || s.includes('알루')) return 'aluminum';
    return v || 'copper';
  }
  function normStandard(v){
    const s=String(v||'').trim().toUpperCase();
    if(s.includes('IEEE') || s.includes('TYPE P')) return 'IEEE_1580';
    if(s.includes('ASTM') || s.includes('AWG') || s.includes('KCMIL')) return 'ASTM';
    if(s.includes('IEC')) return 'IEC';
    return v || 'IEC';
  }
  function normClass(std, cls){
    const s=normStandard(std);
    let c=String(cls||'').trim();
    const u=c.toUpperCase();
    // A/TA are coating values in this program, not conductor class.
    if(!c || u==='A' || u==='TA' || c==='연동선' || c==='동' || c==='구리' || c==='동 (구리)') c='연선';
    if(u==='SOLID') return 'solid';
    if(c==='집합' || c==='복합' || c==='집/복합') return '집/복합';
    if(c==='Class 2' || u==='CLASS2') return '연선';
    if(s==='IEEE_1580') return '집/복합';
    if(c==='압축') return '압축';
    return c || '연선';
  }
  function getDb(){
    try { if (typeof CONDUCTOR_DATABASE_NEW !== 'undefined') return CONDUCTOR_DATABASE_NEW; } catch(e){}
    return null;
  }
  function getList(cfg){
    cfg = cfg || {};
    const mat = normMaterial(cfg.cond_material || cfg.material);
    const std = normStandard(cfg.conductorStandard || cfg.conductor_standard || cfg.standard || 'IEC');
    const cls = normClass(std, cfg.cond_class || cfg.class || '연선');
    const db=getDb();
    let list=[];
    try {
      if (typeof global.getConductorSizeListForConfig === 'function') {
        list = global.getConductorSizeListForConfig({cond_material:mat, conductorStandard:std, cond_class:cls, cond_coating:cfg.cond_coating || cfg.coating || 'A'}) || [];
      } else {
        list = (db && db[mat] && db[mat][std] && db[mat][std][cls]) ? db[mat][std][cls].slice() : [];
      }
    } catch(e){ list=[]; }
    return list.map(function(item){
      return {
        size: item.size || item.sizeText || String(item.nominalArea),
        sizeText: item.size || item.sizeText || String(item.nominalArea),
        nominalArea: parseFloat(item.nominalArea),
        class2OD: parseFloat(item.class2OD),
        weight: parseFloat(item.weight),
        coating: item.coating || 'A',
        strandConfig: item.strandConfig || '',
        sourceTable: item.sourceTable || '',
        conductorResistance: item.conductorResistance,
        classOrType: item.classOrType || '',
        totalWireCount: Number(item.totalWireCount || 0),
        wireDiameter: Number(item.wireDiameter || 0),
        compoundCount: Number(item.compoundCount || 0)
      };
    }).filter(function(x){ return isFinite(x.nominalArea) && isFinite(x.class2OD) && isFinite(x.weight); });
  }
  function find(cfg, size){
    const target = parseFloat(String(size||cfg.cond_size||'').replace(/[^0-9.]/g,''));
    const list=getList(cfg);
    if(!isFinite(target)) return list[0] || null;
    const candidates=list.filter(function(x){ return Math.abs(parseFloat(x.nominalArea)-target) < 1e-9; });
    const requested=String(cfg.cond_strand_config || cfg.strandConfig || '').trim();
    return candidates.find(function(x){ return requested && String(x.strandConfig||'')===requested; }) || candidates[0] || null;
  }
  // 집/복합 도체는 소선구성의 첫 번째 숫자로 단면 형상을 판정한다.
  // 예: "1 / 19 / 0.203"은 집합, "7 / 19 / 0.254"는 집/복합.
  function strandGroupCount(strandConfig){
    const match=String(strandConfig||'').match(/^\s*(\d+)\s*(?:\/|x|×|\*)?/i);
    return match ? Number(match[1]) : 0;
  }
  function isBunchedConstruction(strandConfig){
    return strandGroupCount(strandConfig) === 1;
  }
  global.LSConductorUtils = {
    normalizeMaterial:normMaterial, normalizeStandard:normStandard, normalizeClass:normClass,
    getList:getList, find:find, strandGroupCount:strandGroupCount, isBunchedConstruction:isBunchedConstruction
  };
})(window);
