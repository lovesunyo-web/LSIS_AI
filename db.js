// 고분자 21종 표준 재질 및 단위중량당 표준 단가 데이터베이스
const REAL_POLYMER_DATABASE = {
  'XLPE': { density: 0.925, price: 3400 },
  'PVC': { density: 1.40, price: 2800 },
  'EPR': { density: 1.30, price: 3900 },
  'HEPR': { density: 1.30, price: 4200 },
  'PE': { density: 0.93, price: 2600 },
  'HDPE': { density: 0.95, price: 2700 },
  'MDPE': { density: 0.93, price: 2650 },
  'LDPE': { density: 0.92, price: 2500 },
  'CPE': { density: 1.45, price: 4500 },
  'CR': { density: 1.50, price: 5200 },
  '실리콘': { density: 1.20, price: 12000 },
  'CSP': { density: 1.40, price: 4800 },
  'XLEVA': { density: 1.20, price: 4600 },
  'TPU': { density: 1.20, price: 6500 },
  'LSX': { density: 1.25, price: 5800 },
  'TPO': { density: 1.15, price: 4100 },
  'PP': { density: 0.91, price: 2100 },
  '나일론': { density: 1.14, price: 6800 },
  'SHF1': { density: 1.45, price: 3800 },
  'SHF2': { density: 1.48, price: 4300 },
  'HF90': { density: 1.42, price: 3500 },
  'XLPO': { density: 1.50, price: 3000 }
};

const standardMaterialsList = Object.keys(REAL_POLYMER_DATABASE);

/* === Common rule engine shared by main/spec screens === */
function getCurrentSpecCode(raw) {
  return String(raw || document.getElementById('thickness_rule_mode')?.value || 'MANUAL');
}
function resolveConductorStandardBySpec(rawSpec) {
  const s = getCurrentSpecCode(rawSpec).toUpperCase();
  if (s.includes('IEEE')) return 'IEEE_1580';
  if (s.includes('AEIC') || s.includes('ICEA') || s.includes('NEMA')) return 'ASTM';
  return 'IEC';
}
function normalizeThicknessRuleForCalc(rawSpec, voltage) {
  const s = getCurrentSpecCode(rawSpec).toUpperCase();
  const v = String(voltage || document.getElementById('v_rating')?.value || '').toUpperCase();
  const isMV = ['3.6/6KV','5KV','6/10KV','8.7/15KV','15KV','12/20KV','18/30KV','25KV','28KV','35KV','46KV','66KV'].includes(v);
  if (s.includes('AEIC') || s.includes('ICEA') || s.includes('NEMA')) return 'NEMA_ICEA';
  if (s.includes('IEEE')) return 'IEEE_1580';
  if (s.includes('IEC_60092') || s.includes('IEC 60092')) {
    if (v.includes('150/250') || v === '250V' || v === '300V') return 'IEC_60092-376';
    return isMV ? 'IEC_60092-354' : 'IEC_60092-353';
  }
  if (s.includes('IEC_60502') || s.includes('IEC 60502')) {
    return isMV ? 'IEC_60502-2' : 'IEC_60502-1';
  }
  if (s.includes('EN_50264') || s.includes('EN 50264')) return 'EN_50264_3_1';
  return rawSpec || 'MANUAL';
}
function isNorthAmericanSpec(rawSpec) {
  const s = getCurrentSpecCode(rawSpec).toUpperCase();
  return s.includes('AEIC') || s.includes('IEEE') || s.includes('ICEA') || s.includes('NEMA');
}
function normalizeConductorClassForStandard(std, cls) {
  const standard = String(std || 'IEC').toUpperCase();
  const c = String(cls || '').trim();
  if (c.toLowerCase() === 'solid') return 'solid';
  if (c === '집합' || c === '복합' || c === '집/복합') return '집/복합';
  // IEEE 1580 uses one visible structure only; Tables 16 and 17 are combined under 집/복합.
  if (standard === 'IEEE_1580') return '집/복합';
  if (c === '압축') return '압축';
  return c || '연선';
}
function getFallbackConductorSizes(std) {
  const standard = String(std || 'IEC').toUpperCase();
  // ASTM selections must always come from CONDUCTOR_DATABASE_NEW (LS standard tables).
  // Do not generate a fallback list with values that are not in the source standard.
  if (standard === 'ASTM') return [];
  const sq=[0.5,0.75,1,1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300,400,500,630,800,1000];
  return sq.map(v=>({size:`${v} SQMM`, nominalArea:v, class2OD:parseFloat((Math.sqrt(v)*1.13).toFixed(2)), weight:parseFloat((v*8.89).toFixed(1))}));
}
// ASTM A(연동선)도 SOLID를 선택할 수 있도록, 기존 ASTM SOLID 치수/중량
// 데이터(동일 규격 치수)를 A 도금 조건으로 확장한다. 원본 TA 행은 보존한다.
(function addAstmCopperASolidEntries(){
  try {
    const solid = CONDUCTOR_DATABASE_NEW?.copper?.ASTM?.solid;
    if (!Array.isArray(solid) || solid.some(item => String(item.coating || '').toUpperCase() === 'A')) return;
    const aEntries = solid
      .filter(item => String(item.coating || '').toUpperCase() === 'TA')
      .map(item => Object.assign({}, item, {
        coating: 'A',
        sourceTable: `${item.sourceTable || 'ASTM Solid'} (A)`
      }));
    solid.push(...aEntries);
  } catch (e) {
    console.warn('ASTM A SOLID 데이터 확장에 실패했습니다.', e);
  }
})();

function getConductorSizeListForConfig(cfg) {
  const c = cfg || {};
  const mat = c.cond_material || document.getElementById('cond_material')?.value || 'copper';
  const std = c.conductorStandard || resolveConductorStandardBySpec(c.thickness_std || c.thickness_rule_mode);
  const cls = normalizeConductorClassForStandard(std, c.cond_class || document.getElementById('cond_class')?.value || '연선');
  const coating = String(c.cond_coating || document.getElementById('cond_coating')?.value || 'A').toUpperCase();
  let list = [];
  try { list = (CONDUCTOR_DATABASE_NEW?.[mat]?.[std]?.[cls] || []).slice(); } catch(e) { list = []; }
  // 사내 표준값은 재질(A/TA)별 개별 데이터로 저장한다.
  list = list.filter(item => !item.coating || String(item.coating).toUpperCase() === coating);
  // 소선구성까지 동일한 중복 행만 제거한다. 동일 사이즈의 복수 구성은 유지한다.
  const seen = new Set();
  return list.filter(item => {
    const k=[item.nominalArea,item.strandConfig||'',item.coating||'',item.class2OD,item.weight].join('|');
    if(seen.has(k)) return false; seen.add(k); return true;
  });
}
function getStrandCountBySize(std, sizeText, nominalArea) {
  const standard = String(std || document.getElementById('conductorStandard')?.value || 'IEC').toUpperCase();
  const txt = String(sizeText || '').toUpperCase();
  const area = parseFloat(nominalArea || txt.replace(/[^0-9.]/g,''));
  if (standard === 'ASTM') {
    if (txt.includes('KCMIL') || txt.includes('MCM')) {
      const k = parseFloat(txt.replace(/[^0-9.]/g,''));
      if (k <= 500) return 37;
      return 61;
    }
    if (/4\/0|3\/0|2\/0|1\/0/.test(txt)) return 19;
    const m = txt.match(/(\d+)\s*AWG/);
    if (m) {
      const awg = parseInt(m[1],10);
      if (awg <= 2) return 19;  // 1~2 AWG
      return 7;                 // 3 AWG and smaller sizes
    }
    return 7;
  }
  if (area <= 35) return 7;
  if (area <= 95) return 19;
  if (area <= 150) return 37;
  if (area < 630) return 61;
  return 91;
}
function getLSAssemblyFactor(type, count) {
  if (typeof window !== 'undefined' && window.LSCablingStandard && typeof window.LSCablingStandard.factor === 'function') {
    return window.LSCablingStandard.factor(type, count);
  }
  const t = String(type || 'CORE').toUpperCase();
  const n = Math.max(1, Number(count) || 1);
  if (t === 'PAIR') return n > 100 ? 1.9 * Math.sqrt(n) : Math.max(1, Math.sqrt(n) * 2); if (t === 'TRIAD') return Math.max(1, 1.5 * Math.sqrt(n)); return 1 + Math.sqrt(n);
}
Object.assign(window, {
  resolveConductorStandardBySpec,
  normalizeThicknessRuleForCalc,
  isNorthAmericanSpec,
  normalizeConductorClassForStandard,
  getConductorSizeListForConfig,
  getFallbackConductorSizes,
  getStrandCountBySize,
  getLSAssemblyFactor
});



/* =========================================================
 * 2026-07-03 reset baseline
 * - 최초 파일 실행 후 초기화 상태를 스냅샷으로 저장/복원
 * ========================================================= */
window.__initialProgramFieldState = window.__initialProgramFieldState || null;

function captureInitialProgramFieldState() {
  const formRoot = document.querySelector('.form-container') || document;
  if (!formRoot || !document.getElementById('cableSvg')) return null;
  const fields = [];
  formRoot.querySelectorAll('input, select, textarea').forEach(el => {
    if (!el.id) return;
    fields.push({
      id: el.id,
      tag: el.tagName,
      type: el.type || '',
      value: el.value,
      checked: !!el.checked,
      defaultValue: el.defaultValue,
      selectedIndex: typeof el.selectedIndex === 'number' ? el.selectedIndex : -1,
      disabled: !!el.disabled
    });
  });
  window.__initialProgramFieldState = {
    fields,
    selectedInsuColors: (typeof selectedInsuColors !== 'undefined' && Array.isArray(selectedInsuColors)) ? selectedInsuColors.slice() : (Array.isArray(window.selectedInsuColors) ? window.selectedInsuColors.slice() : []),
    selectedBeddingColor: (typeof selectedBeddingColor !== 'undefined' ? selectedBeddingColor : (window.selectedBeddingColor || '#64748b')),
    selectedSheathColor: (typeof selectedSheathColor !== 'undefined' ? selectedSheathColor : (window.selectedSheathColor || '#1e293b')),
    capturedAt: Date.now()
  };
  return window.__initialProgramFieldState;
}

function restoreInitialProgramFieldState() {
  const snapshot = window.__initialProgramFieldState || captureInitialProgramFieldState();
  const formRoot = document.querySelector('.form-container') || document;
  if (!snapshot || !formRoot) return false;

  const restoredIds = new Set();
  snapshot.fields.forEach(item => {
    const el = document.getElementById(item.id);
    if (!el) return;
    restoredIds.add(item.id);
    if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = !!item.checked;
    } else if (el.tagName === 'SELECT') {
      const hasValue = Array.from(el.options || []).some(opt => opt.value === item.value);
      if (hasValue) el.value = item.value;
      else if (item.selectedIndex >= 0 && item.selectedIndex < el.options.length) el.selectedIndex = item.selectedIndex;
      else if (el.options.length) el.selectedIndex = 0;
    } else {
      el.value = item.value != null ? item.value : '';
    }
    el.disabled = !!item.disabled;
  });

  // 스냅샷 이후 동적으로 생긴 필드는 HTML 기본값으로 복구
  formRoot.querySelectorAll('input, select, textarea').forEach(el => {
    if (!el.id || restoredIds.has(el.id)) return;
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!el.defaultChecked;
    else if (el.tagName === 'SELECT') {
      const def = Array.from(el.options || []).find(o => o.defaultSelected || o.hasAttribute('selected'));
      if (def) el.value = def.value;
      else if (el.options.length) el.selectedIndex = 0;
    } else {
      el.value = el.defaultValue || el.getAttribute('value') || '';
    }
  });

  try { selectedInsuColors = Array.isArray(snapshot.selectedInsuColors) ? snapshot.selectedInsuColors.slice() : []; } catch(e) { window.selectedInsuColors = Array.isArray(snapshot.selectedInsuColors) ? snapshot.selectedInsuColors.slice() : []; }
  try { selectedBeddingColor = snapshot.selectedBeddingColor || '#64748b'; } catch(e) { window.selectedBeddingColor = snapshot.selectedBeddingColor || '#64748b'; }
  try { selectedSheathColor = snapshot.selectedSheathColor || '#1e293b'; } catch(e) { window.selectedSheathColor = snapshot.selectedSheathColor || '#1e293b'; }
  return true;
}

function runInitialStateUiSync(options = {}) {
  const skipMaterial = !!options.skipMaterial;
  const prevSuppressPart1 = window.__suppressPart1MaterialSync;
  if (skipMaterial) window.__suppressPart1MaterialSync = true;
  try { if (typeof handleThicknessRuleChange === 'function') handleThicknessRuleChange(); } catch(e) { console.warn(e); }
  try { if (typeof handleCoreTypeChange === 'function') handleCoreTypeChange(); } catch(e) { console.warn(e); }
  try { if (typeof handleCoreNumChange === 'function') handleCoreNumChange(); } catch(e) { console.warn(e); }
  try { if (typeof handleCablingODModeChange === 'function') handleCablingODModeChange(); } catch(e) { console.warn(e); }
  try { if (typeof toggleArrayMode === 'function') toggleArrayMode(); } catch(e) { console.warn(e); }
  try { if (typeof syncDisabledInputs === 'function') syncDisabledInputs(); } catch(e) { console.warn(e); }
  try { if (typeof handleVoltageAndDraw === 'function') handleVoltageAndDraw(); } catch(e) { console.warn(e); }
  try { if (typeof updateConductorSizes === 'function') updateConductorSizes(); } catch(e) { console.warn(e); }
  try { if (typeof validateGroundUI === 'function') validateGroundUI(); } catch(e) { console.warn(e); }
  try { if (typeof initColorChips === 'function') initColorChips(); } catch(e) { console.warn(e); }
  try { if (typeof updateCalculatedCopperPrice === 'function') updateCalculatedCopperPrice(); } catch(e) { console.warn(e); }
  try { if (typeof calculateAndDraw === 'function') calculateAndDraw(); } catch(e) { console.warn(e); }
  try { if (typeof handleCableNameChange === 'function') handleCableNameChange(); } catch(e) { console.warn(e); }
  try { if (typeof applyMainScreenPastelStyles === 'function') applyMainScreenPastelStyles(); } catch(e) { console.warn(e); }
  try { if (typeof window.ensureTinyButtonEmojis === 'function') window.ensureTinyButtonEmojis(); } catch(e) {}
  if (!skipMaterial) {
    try { if (typeof runCableDesignCalculation === 'function') runCableDesignCalculation(); } catch(e) { console.warn(e); }
  }
  if (skipMaterial) window.__suppressPart1MaterialSync = prevSuppressPart1;
}


window.onload = function() {
  if (!document.getElementById('cableSvg')) return;
  window.name = "sanTeukMainWindow";
  try { sessionStorage.removeItem('sanTeukSpecTabSeq'); } catch(e) {}

  populateMaterialDropdowns();
  updateConductorSizes();
  validateGroundUI();
  
  if (typeof syncArrayTableToUI === 'function') syncArrayTableToUI();
  if (typeof buildDynamicColorUI === 'function') buildDynamicColorUI();
  initColorChips();
  
  handleVoltageAndDraw(); 
  syncDisabledInputs();

  updateMainScreenThicknessOptions();
  applyMainScreenPastelStyles();
  bindMainRealTimeListeners();
  injectCopperPriceCalculator();
  handleCableNameChange();

  injectCustomCablingODField();
  realignActionButtons();
  setTimeout(captureInitialProgramFieldState, 0);
};

window.handleCoreNumChange = function() {
  try {
    validateGroundUI();
    if (typeof syncArrayTableToUI === 'function') syncArrayTableToUI();
    if (typeof buildDynamicColorUI === 'function') buildDynamicColorUI();
    if (typeof applyAutomaticThicknesses === 'function') applyAutomaticThicknesses();
    syncDisabledInputs();
    if (typeof calculateAndDraw === 'function') {
      calculateAndDraw();
    }
  } catch (err) {
    console.error("선심수 변경 실시간 갱신 실패:", err);
  }
};

window.handleCoreTypeChange = function() {
  try {
    validateGroundUI();
    if (typeof syncArrayTableToUI === 'function') syncArrayTableToUI();
    if (typeof buildDynamicColorUI === 'function') buildDynamicColorUI();
    if (typeof applyAutomaticThicknesses === 'function') applyAutomaticThicknesses();
    syncDisabledInputs();
    if (typeof calculateAndDraw === 'function') {
      calculateAndDraw();
    }
  } catch (err) {
    console.error("선심구조 변경 실시간 갱신 실패:", err);
  }
};

// [수정사항 1] 도체 크기 변경 시 실시간 두께 재산출 리스너
window.handleCondSizeChange = function() {
  try {
    const sel = document.getElementById('cond_size');
    if (sel) sel.dataset.lastSelectedValue = sel.value;
    if (typeof applyAutomaticThicknesses === 'function') applyAutomaticThicknesses();
    if (typeof calculateAndDraw === 'function') calculateAndDraw();
  } catch (err) {
    console.error("도체 사이즈 변경 연산 실패:", err);
  }
};

function injectCustomCablingODField() {
  const calcKInput = document.getElementById('calc_k_factor');
  if (!calcKInput) return;
  
  if (document.getElementById('custom_cabling_od')) return; 
  
  const calcKGroup = calcKInput.parentElement;
  if (!calcKGroup) return;
  
  const newGroup = document.createElement('div');
  newGroup.className = 'field-group';
  newGroup.innerHTML = `
    <label style="color: #ea580c; font-weight: 800;">★ 연합외경 (mm)</label>
    <input type="number" id="custom_cabling_od" step="0.1" min="1.0" placeholder="자동 계산" 
           style="background-color: #fff7ed !important; border-color: #fdba74 !important; font-weight: 800 !important; color: #ea580c !important;" 
           oninput="handleCustomCablingODChange()">
  `;
  
  calcKGroup.parentNode.insertBefore(newGroup, calcKGroup.nextSibling);
  
  const gridContainer = calcKGroup.parentNode;
  if (gridContainer) {
    gridContainer.style.setProperty('grid-template-columns', 'repeat(4, 1fr)', 'important');
    gridContainer.className = gridContainer.className.replace('grid-3', 'grid-4');
  }
}

window.handleCustomCablingODChange = function() {
  if (typeof calculateAndDraw === 'function') calculateAndDraw();
};

if (typeof window.getStandardLayoutPositions === 'function') {
  const originalGetPositions = window.getStandardLayoutPositions;
  window.getStandardLayoutPositions = function(rFinalBundle_12, hasGround, coreNum, numGround, rGroundCoreBase_12) {
    let res = originalGetPositions(rFinalBundle_12, hasGround, coreNum, numGround, rGroundCoreBase_12);
    const customODInput = document.getElementById('custom_cabling_od');
    if (customODInput && customODInput.value) {
      let val = parseFloat(customODInput.value);
      if (!isNaN(val) && val > 0) {
        res.maxCoreBoundary = val * 6; 
      }
    }
    return res;
  };
}

if (typeof window.renderCalculatedTableDOM === 'function' || typeof renderCalculatedTableDOM === 'function') {
  const originalRenderDOM = window.renderCalculatedTableDOM || renderCalculatedTableDOM;
  window.renderCalculatedTableDOM = function() {
    const customODInput = document.getElementById('custom_cabling_od');
    let idx9 = calculatedResultsCache.findIndex(r => r.process === "9. 연합 공정");
    
    if (idx9 !== -1) {
      let r = calculatedResultsCache[idx9];
      let autoOD = parseFloat(r.od);
      
      if (customODInput) {
        if (!customODInput.value) {
          customODInput.placeholder = autoOD.toFixed(1); 
        } else {
          let customOD = parseFloat(customODInput.value);
          let assemblyOD = customOD;
          r.od = assemblyOD.toFixed(2);
          
          let prev_od = idx9 > 0 ? parseFloat(calculatedResultsCache[idx9 - 1].od) : 2.5;
          if (isNaN(prev_od)) prev_od = 2.5;
          
          let cabling_circle_area = (Math.PI * Math.pow(assemblyOD, 2)) / 4;
          let single_core_area = (Math.PI * Math.pow(prev_od, 2)) / 4;
          const core_num = parseInt(document.getElementById('core_num').value) || 3;
          let total_cores_area = single_core_area * core_num;
          let filler_area = Math.max(0, cabling_circle_area - total_cores_area);
          let filler_weight = filler_area * parseFloat(r.density);
          
          r.area = filler_area.toFixed(2);
          r.weight = filler_weight.toFixed(2);
          
          let currentOD = assemblyOD;
          for (let i = idx9 + 1; i < calculatedResultsCache.length; i++) {
            let item = calculatedResultsCache[i];
            if (item.process.includes("9-2. 연합 바인더 테이프") || item.process.includes("바인더")) {
              let t_thick = parseFloat(item.thick) || 0.05;
              item.weight = (Math.PI * currentOD * t_thick * parseFloat(item.density)).toFixed(2);
              currentOD += (t_thick * 2);
              item.od = currentOD.toFixed(2);
            } else if (item.process.includes("10-1. 공동 차폐") || item.process.includes("공동차폐")) {
              let tape_thick = parseFloat(item.thick) || 0.05;
              item.weight = (Math.PI * currentOD * tape_thick * parseFloat(item.density)).toFixed(2);
              item.od = (currentOD + (tape_thick * 2)).toFixed(2);
              currentOD += (tape_thick * 2);
            } else if (item.process.includes("11. 베딩") || item.process.includes("베딩 공정")) {
              let beddingThick = parseFloat(document.getElementById('thick_bedding')?.value) || 1.2;
              let bedding_ring_area = Math.PI * (currentOD + beddingThick) * beddingThick;
              item.area = bedding_ring_area.toFixed(2);
              item.weight = (bedding_ring_area * parseFloat(item.density)).toFixed(2);
              currentOD += (beddingThick * 2);
              item.od = currentOD.toFixed(2);
            } else if (item.process.includes("12. 외장") || item.process.includes("외장 공정")) {
              let thick_armour = parseFloat(document.getElementById('thick_armour')?.value) || 1.0;
              let armour_ring_area = Math.PI * (currentOD + thick_armour) * thick_armour;
              item.area = armour_ring_area.toFixed(2);
              item.weight = (armour_ring_area * parseFloat(item.density)).toFixed(2);
              currentOD += (thick_armour * 2);
              item.od = currentOD.toFixed(2);
            } else if (item.process.includes("13. 시스") || item.process.includes("시스 공정")) {
              let thick_sheath = parseFloat(document.getElementById('thick_sheath')?.value) || 1.6;
              let sheath_ring_area = Math.PI * (currentOD + thick_sheath) * thick_sheath;
              item.area = sheath_ring_area.toFixed(2);
              item.weight = (sheath_ring_area * parseFloat(item.density)).toFixed(2);
              currentOD += (thick_sheath * 2);
              item.od = currentOD.toFixed(2);
            } else {
              let t = parseFloat(item.thick) || 0;
              if (t > 0 && item.thick !== "-") {
                let wt = Math.PI * currentOD * t * parseFloat(item.density);
                item.weight = wt.toFixed(2);
                currentOD += (t * 2);
                item.od = currentOD.toFixed(2);
              } else {
                item.od = currentOD.toFixed(2);
              }
            }
          }
        }
      }
    }
    
    originalRenderDOM();
  };
}

// [수정사항 5] 우측 버튼 컨테이너 정렬 및 버튼 크기 강제 일체화
function realignActionButtons() {
  const sheathGroup = document.getElementById('sheath_base_price')?.parentElement;
  if (!sheathGroup) return;
  
  const outerContainer = sheathGroup.parentElement; 
  if (!outerContainer) return;

  let btnDiv = document.querySelector('div[style*="align-items: flex-end"][style*="margin-bottom: 2px"]');
  if (!btnDiv) {
    btnDiv = document.createElement('div');
  }
  
  btnDiv.style.cssText = "display: flex; gap: 8px; align-items: flex-end; margin-bottom: 0px; padding-left: 10px; align-self: flex-end; margin-left: auto !important; justify-content: flex-end !important; white-space: nowrap !important;";
  btnDiv.innerHTML = ''; 

  const recalcBtn = document.createElement('button');
  recalcBtn.style.cssText = "background-color: #ea580c; width: 110px; height: 28px; font-size: 11px; font-weight: 800; border-radius: 4px; cursor: pointer; border: none; color: white; display: inline-flex; align-items: center; justify-content: center; gap: 4px;";
  recalcBtn.innerHTML = "재료비 계산";
  recalcBtn.onclick = function() {
    runCableDesignCalculation();
  };
  btnDiv.appendChild(recalcBtn);

  const excelCopyBtn = document.createElement('button');
  excelCopyBtn.style.cssText = "background-color: #10b981; width: 110px; height: 28px; font-size: 11px; font-weight: 800; border-radius: 4px; cursor: pointer; border: none; color: white; display: inline-flex; align-items: center; justify-content: center; gap: 4px;";
  excelCopyBtn.innerHTML = "복사하기";
  excelCopyBtn.onclick = copyTableToClipboard;
  btnDiv.appendChild(excelCopyBtn);

  outerContainer.appendChild(btnDiv);
  
  const oldBtnDiv = document.querySelector('div[style*="align-items: flex-end"][style*="margin-bottom: 2px"]');
  if (oldBtnDiv && oldBtnDiv !== btnDiv) {
    oldBtnDiv.remove();
  }
}

function handleCableNameChange() {
  const leftInput = document.getElementById('cable_name');
  const drawInput = document.getElementById('cableTagDisplay');
  if (leftInput && drawInput) {
    let val = leftInput.value.substring(0, 25);
    if (drawInput.tagName === 'INPUT') {
      drawInput.value = val;
    } else {
      drawInput.textContent = val;
    }
  }
}

function resetAllFields() {
  // 초기화 버튼은 기존 복원/연동 함수를 거치지 않고 Ctrl+R과 동일하게 새로고침합니다.
  window.location.reload();
}


function injectCopperPriceCalculator() {
  ['lme_usd_t', 'scr_usd_t', 'exchange_rate', 'markup_rate', 'insu_base_price', 'bedding_base_price', 'sheath_base_price'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateCalculatedCopperPrice);
  });
  updateCalculatedCopperPrice();
}

function updateCalculatedCopperPrice() {
  const lme = parseFloat(document.getElementById('lme_usd_t')?.value) || 0;
  const scr = parseFloat(document.getElementById('scr_usd_t')?.value) || 0;
  const rate = parseFloat(document.getElementById('exchange_rate')?.value) || 0;
  const markup = parseFloat(document.getElementById('markup_rate')?.value) || 0;
  const rawPrice = ((lme + scr) * rate) / 1000;
  const finalPrice = Math.round(rawPrice * (1 + (markup / 100)));
  const output = document.getElementById('calculated_copper_price');
  if (output) {
    output.value = finalPrice.toLocaleString() + " 원/kg";
  }
}

const originalRunCalc = window.runCableDesignCalculation;
window.runCableDesignCalculation = function() {
  const placeholder = document.getElementById('calcPlaceholder');
  const container = document.getElementById('calcTableContainer');
  if (placeholder) placeholder.style.display = 'none';
  if (container) container.style.display = 'block';
  if (typeof originalRunCalc === 'function') {
    originalRunCalc();
  }
};

function handleSyncAllColorsCheckbox() {
  if (typeof buildDynamicColorUI === 'function') buildDynamicColorUI();
  if (typeof calculateAndDraw === 'function') calculateAndDraw();
}

// [수정사항 8] 모든 선심 동일 색상 시 다중 세트에서도 전 대역 인덱스에 연쇄 동기화 이식
function buildDynamicColorUI() {
  const container = document.getElementById('dynamicInsuContainer');
  if (!container) return;
  container.innerHTML = '';
  const coreType = document.getElementById('core_type')?.value || "CORE";
  let coreNum = parseInt(document.getElementById('core_num')?.value) || 1;
  let syncAll = document.getElementById('sync_all_colors') ? document.getElementById('sync_all_colors').checked : false;
  let perBundle = (coreType === 'PAIR') ? 2 : (coreType === 'TRIAD') ? 3 : (coreType === 'QUAD') ? 4 : 1;
  let totalCores = coreNum * perBundle;

  if (syncAll) {
    document.getElementById('matrix_title').innerText = "SET별 통합 색상 지정 (반복 적용)";
    for (let k = 0; k < perBundle; k++) {
      if (!selectedInsuColors[k]) {
        selectedInsuColors[k] = PRESET_ALL_COLORS[k % PRESET_ALL_COLORS.length].val;
      }
      const row = document.createElement('div');
      row.className = 'insu-row';
      row.innerHTML = `<span>${perBundle === 1 ? '모든 선심 공통' : `SET 내 ${k+1}번 공통`}</span>`;
      const chipsWrapper = document.createElement('div');
      chipsWrapper.className = 'color-chips-container';
      PRESET_ALL_COLORS.forEach(color => {
        const chip = document.createElement('div');
        chip.className = `color-chip ${color.val === selectedInsuColors[k] ? 'active' : ''}`;
        chip.style.backgroundColor = COLOR_HEX_MAP[color.val];
        chip.onclick = () => {
          chipsWrapper.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active')); 
          chip.classList.add('active');
          selectedInsuColors[k] = color.val;
          
          // [해결 완료] 전체 선심 배열 중 동일한 위치의 모든 심선에 일괄 전파
          for (let idx = k; idx < totalCores; idx += perBundle) {
              selectedInsuColors[idx] = color.val;
          }
          if (typeof calculateAndDraw === 'function') calculateAndDraw();
        };
        chipsWrapper.appendChild(chip);
      });
      row.appendChild(chipsWrapper);
      container.appendChild(row);
    }
  } else {
    document.getElementById('matrix_title').innerText = "선심별 커스텀 절연 색상 지정";
    for (let i = 0; i < totalCores; i++) {
      if (!selectedInsuColors[i]) {
        selectedInsuColors[i] = PRESET_ALL_COLORS[i % PRESET_ALL_COLORS.length].val;
      }
      let bIdx = Math.floor(i / perBundle) + 1;
      let cIdx = (i % perBundle) + 1;
      let labelText = (perBundle === 1) ? `${i + 1}번 선심` : `${bIdx}세트 - ${cIdx}번 선심`;
      const row = document.createElement('div');
      row.className = 'insu-row';
      row.innerHTML = `<span>${labelText}</span>`;
      const chipsWrapper = document.createElement('div');
      chipsWrapper.className = 'color-chips-container';
      PRESET_ALL_COLORS.forEach(color => {
        const chip = document.createElement('div');
        chip.className = `color-chip ${color.val === selectedInsuColors[i] ? 'active' : ''}`;
        chip.style.backgroundColor = COLOR_HEX_MAP[color.val];
        chip.onclick = () => {
          chipsWrapper.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          selectedInsuColors[i] = color.val;
          if (typeof calculateAndDraw === 'function') calculateAndDraw();
        };
        chipsWrapper.appendChild(chip);
      });
      row.appendChild(chipsWrapper);
      container.appendChild(row);
    }
  }
}

function validateGroundUI() {
  const hasGroundSelect = document.getElementById('has_ground');
  if (!hasGroundSelect) return;

  const coreTypeSelect = document.getElementById('core_type');
  const coreNumSelect = document.getElementById('core_num');

  if (!coreTypeSelect || !coreNumSelect) return;

  const coreType = coreTypeSelect.value;
  const coreNum = parseInt(coreNumSelect.value) || 0;

  const isGroundAllowed = (coreType === 'CORE') && (coreNum >= 2 && coreNum <= 5);

  if (!isGroundAllowed) {
    hasGroundSelect.value = '미적용';
    hasGroundSelect.disabled = true;
  } else {
    hasGroundSelect.disabled = false;
  }
}

function handleGroundChange() {
  try {
    validateGroundUI();
    applyAutomaticThicknesses();
    syncDisabledInputs();
    if (typeof calculateAndDraw === 'function') {
      calculateAndDraw();
    }
  } catch (err) {
    console.error("접지선 설정 변경 연산 중 에러 발생:", err);
  }
}

function updateMainScreenThicknessOptions() {
  const ruleModeSelect = document.getElementById("thickness_rule_mode");
  if (ruleModeSelect) {
    ruleModeSelect.innerHTML = `
      <option value="MANUAL" selected>사용자 수동 지정 (Manual)</option>
      <option value="IEC_60092-353">IEC 60092-353 (선박용 LV)</option>
      <option value="IEC_60092-354">IEC 60092-354 (선박용 MV)</option>
      <option value="IEC_60092-376">IEC 60092-376 (선박용 계장 150/250V)</option>
      <option value="IEC_60502-1">IEC 60502-1 (육상/산업용 LV)</option>
      <option value="IEC_60502-2">IEC 60502-2 (육상/산업용 MV)</option>
      <option value="IEEE_1580">IEEE 1580 (북미 해양용)</option>
      <option value="NEMA_ICEA">NEMA / ICEA (북미 표준 통합)</option>
    `;
  }
}

// [수정사항 6 & 7] CSS 재정의 수혈 - 고정 헤더 간격 계산 및 짙은 회색 합계 셀 스타일링
function applyMainScreenPastelStyles() {
  const styleNode = document.createElement("style");
  styleNode.innerHTML = `
    select, input[type="text"], input[type="number"] {
      height: 22px !important;
      box-sizing: border-box !important;
      border-radius: 4px !important;
      padding: 2px 4px !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      transition: all 0.2s ease !important;
      color: #1e293b !important;
    }
    select:disabled, input:disabled {
      background-color: #e2e8f0 !important;
      border: 1.5px solid #cbd5e1 !important;
      color: #64748b !important;
      cursor: not-allowed;
    }
    .calc-failed-input {
      background-color: #fef2f2 !important;
      border: 2px solid #ef4444 !important;
      color: #b91c1c !important;
      font-weight: 800 !important;
      animation: mainWarningPulse 1.6s infinite;
    }
    @keyframes mainWarningPulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); }
      70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    #cableCalcTable th, #cableCalcTable td {
      white-space: nowrap !important;
      word-break: keep-all !important;
      padding: 6px 10px !important;
      text-align: center !important;
    }
    
    #cableCalcTable th:nth-child(3), #cableCalcTable td:nth-child(3) { min-width: 80px !important; } 
    #cableCalcTable th:nth-child(4), #cableCalcTable td:nth-child(4) { min-width: 90px !important; } 
    #cableCalcTable th:nth-child(8), #cableCalcTable td:nth-child(8) { min-width: 90px !important; } 
    #cableCalcTable th:nth-child(9), #cableCalcTable td:nth-child(9) { min-width: 80px !important; } 
    #cableCalcTable th:nth-child(10), #cableCalcTable td:nth-child(10) { min-width: 110px !important; } 
    
    .table-scroll-wrapper {
      overflow-x: auto !important;
    }
  `;
  document.head.appendChild(styleNode);
}

function bindMainRealTimeListeners() {
  const fields = [
    "v_rating", "cond_material", "conductorStandard", "cond_class", "cond_size", "cond_coating",
    "core_type", "core_num", "insu_material", "bedding_material", "bedding_type", "bedding_division",
    "armour_material_new", "armour_type_new", "sheath_material", "thickness_rule_mode", "nema_level_main", "nema_level",
    "tape_mica", "tape_sep", "tape_semi", "binder_tape", "tape_insu_above",
    "ind_separator", "ind_shield_material", "ind_shield_type", "thick_lead_shield", "ind_dw_size_ref", "ind_screen_tape",
    "ov_shield_material", "ov_shield_type", "thick_ov_lead_shield", "ov_dw_size_ref",
    "has_ground", "num_ground", "thick_ground_insu", "inner_semi", "outer_semi"
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      ["change", "input"].forEach(eventType => {
        el.addEventListener(eventType, () => {
          try {
            if (typeof applyAutomaticThicknesses === 'function') applyAutomaticThicknesses();
            if (id === "core_num" || id === "core_type") {
              if (typeof buildDynamicColorUI === 'function') buildDynamicColorUI();
            }
            syncDisabledInputs(); 
            if (typeof calculateAndDraw === 'function') {
              calculateAndDraw();
            }
          } catch (err) {
            console.error(`실시간 도면 갱신 중 에러 발생 (필드: ${id}):`, err);
          }
        });
      });
    }
  });
}

function handleArmorLabelUpdate() {
  const armourType = document.getElementById('armour_type_new')?.value || "미적용";
  const label = document.getElementById('armour_thick_label');
  if (label) {
    if (armourType === "SWA/AWA (횡권)" || armourType === "편조 (Braid)") {
      label.textContent = "★ 아머 소선경 (mm)";
    } else {
      label.textContent = "★ 아머 두께 (mm)";
    }
  }
}

function handleThicknessRuleChange() {
  if (typeof applyAutomaticThicknesses === 'function') applyAutomaticThicknesses();
  syncDisabledInputs();
  if (typeof calculateAndDraw === 'function') {
    calculateAndDraw();
  }
}

function initColorChips() {
  const bContainer = document.getElementById('beddingColorContainer');
  const sContainer = document.getElementById('sheathColorContainer');
  if (!bContainer || !sContainer) return;
  bContainer.innerHTML = ''; 
  sContainer.innerHTML = '';
  PRESET_ALL_COLORS.forEach(c => {
    const hexColor = COLOR_HEX_MAP[c.val];
    const bChip = document.createElement('div');
    bChip.className = `color-chip ${hexColor === selectedBeddingColor ? 'active' : ''}`;
    bChip.style.backgroundColor = hexColor;
    bChip.title = c.name;
    bChip.onclick = () => {
      bContainer.querySelectorAll('.color-chip').forEach(ch => ch.classList.remove('active'));
      bChip.classList.add('active');
      selectedBeddingColor = hexColor;
      if (typeof calculateAndDraw === 'function') calculateAndDraw();
    };
    bContainer.appendChild(bChip);

    const sChip = document.createElement('div');
    sChip.className = `color-chip ${hexColor === selectedSheathColor ? 'active' : ''}`;
    sChip.style.backgroundColor = hexColor;
    sChip.title = c.name;
    sChip.onclick = () => {
      sContainer.querySelectorAll('.color-chip').forEach(ch => ch.classList.remove('active'));
      sChip.classList.add('active');
      selectedSheathColor = hexColor;
      if (typeof calculateAndDraw === 'function') calculateAndDraw();
    };
    sContainer.appendChild(sChip);
  });
}

function handleVoltageAndDraw() {
  const volt = document.getElementById('v_rating')?.value || '0.6/1kV';
  const mvVoltages = ['3.6/6kV', '5KV', '6/10KV', '8.0KV', '8.7/15KV', '15KV', '12/20KV', '18/30KV', '25KV', '28KV', '35KV', '46KV', '66KV'];
  const isMV = mvVoltages.includes(volt);
  const innerSemi = document.getElementById('inner_semi');
  const outerSemi = document.getElementById('outer_semi');
  if (innerSemi && outerSemi) {
    if (isMV) {
      innerSemi.value = "적용";
      outerSemi.value = "적용";
    } else {
      innerSemi.value = "미적용";
      outerSemi.value = "미적용";
    }
  }
  const ruleMode = document.getElementById('thickness_rule_mode');
  if (ruleMode) {
    const options = ruleMode.options;
    for (let i = 0; i < options.length; i++) {
      const optVal = options[i].value;
      if (isMV) {
        if (optVal === 'IEC_60092-353' || optVal === 'IEC_60092-376' || optVal === 'IEC_60502-1') {
          options[i].disabled = true;
          if (ruleMode.value === optVal) ruleMode.value = 'MANUAL';
        } else {
          options[i].disabled = false;
        }
      } else {
        if (optVal === 'IEC_60092-354' || optVal === 'IEC_60502-2') {
          options[i].disabled = true;
          if (ruleMode.value === optVal) ruleMode.value = 'MANUAL';
        } else {
          options[i].disabled = false;
        }
      }
    }
  }
  syncDisabledInputs();
  if (typeof calculateAndDraw === 'function') calculateAndDraw();
}

function syncDisabledInputs() {
  const hasGround = document.getElementById('has_ground')?.value || '미적용';
  const isGroundUnapplied = (hasGround === '미적용');
  const numGround = document.getElementById('num_ground');
  const thickGround = document.getElementById('thick_ground_insu');
  const groundColor = document.getElementById('ground_insu_color');
  if (numGround) numGround.disabled = isGroundUnapplied;
  if (thickGround) thickGround.disabled = isGroundUnapplied;
  if (groundColor) groundColor.disabled = isGroundUnapplied;

  const ruleMode = document.getElementById('thickness_rule_mode')?.value || 'MANUAL';
  const nemaLevelSelect = document.getElementById("nema_level_main") || document.getElementById("nema_level");
  if (nemaLevelSelect) {
    nemaLevelSelect.disabled = !isNorthAmericanRule(ruleMode);
  }

  const coreType = document.getElementById('core_type')?.value || 'CORE';
  const indShieldType = document.getElementById('ind_shield_type');
  if (indShieldType) {
    for (let option of indShieldType.options) {
      if (option.value.includes('D/W')) {
        option.disabled = (coreType === 'CORE'); 
      }
    }
    if (coreType === 'CORE' && indShieldType.value.includes('D/W')) {
      indShieldType.value = 'Tape (테이프)';
    }
  }

  const innerSemi = document.getElementById('inner_semi')?.value || '미적용';
  const thickInnerSemi = document.getElementById('thick_inner_semi');
  if (thickInnerSemi) thickInnerSemi.disabled = (innerSemi === '미적용');

  const outerSemi = document.getElementById('outer_semi')?.value || '미적용';
  const thickOuterSemi = document.getElementById('thick_outer_semi');
  if (thickOuterSemi) thickOuterSemi.disabled = (outerSemi === '미적용');

  const indShieldTypeVal = indShieldType?.value || '미적용';
  const indSeparator = document.getElementById('ind_separator');
  const indShieldMaterial = document.getElementById('ind_shield_material');
  const thickLeadShield = document.getElementById('thick_lead_shield');
  const indDwRef = document.getElementById('ind_dw_size_ref');
  if (indShieldTypeVal === '미적용') {
    if (indSeparator) indSeparator.disabled = true;
    if (indShieldMaterial) indShieldMaterial.disabled = true;
    if (thickLeadShield) thickLeadShield.disabled = true;
    if (indDwRef) indDwRef.disabled = true;
  } else {
    if (indSeparator) indSeparator.disabled = false;
    if (indShieldMaterial) indShieldMaterial.disabled = false;
    const mat = indShieldMaterial?.value || '';
    if (thickLeadShield) thickLeadShield.disabled = (mat !== '납');
    if (indDwRef) indDwRef.disabled = (!indShieldTypeVal.includes('D/W'));
  }

  const ovShieldType = document.getElementById('ov_shield_type')?.value || '미적용';
  const ovShieldMaterial = document.getElementById('ov_shield_material');
  const ovDwRef = document.getElementById('ov_dw_size_ref');
  const ovLeadThick = document.getElementById('thick_ov_lead_shield');
  if (ovShieldType === '미적용') {
    if (ovShieldMaterial) ovShieldMaterial.disabled = true;
    if (ovDwRef) ovDwRef.disabled = true;
    if (ovLeadThick) ovLeadThick.disabled = true;
  } else {
    if (ovShieldMaterial) ovShieldMaterial.disabled = false;
    if (ovDwRef) ovDwRef.disabled = (!ovShieldType.includes('D/W'));
    if (ovLeadThick) ovLeadThick.disabled = (ovShieldMaterial?.value !== '납');
  }

  const beddingType = document.getElementById('bedding_type')?.value || '미적용';
  const beddingDivision = document.getElementById('bedding_division');
  const beddingMaterial = document.getElementById('bedding_material');
  const thickBedding = document.getElementById('thick_bedding');
  if (beddingType === '미적용') {
    if (beddingDivision) beddingDivision.disabled = true;
    if (beddingMaterial) beddingMaterial.disabled = true;
    if (thickBedding) thickBedding.disabled = true;
  } else {
    if (beddingDivision) beddingDivision.disabled = false;
    if (beddingMaterial) beddingMaterial.disabled = false;
    if (thickBedding) thickBedding.disabled = false; 
  }

  const armourType = document.getElementById('armour_type_new')?.value || '미적용';
  const armourMaterial = document.getElementById('armour_material_new');
  const thickArmour = document.getElementById('thick_armour');
  if (armourType === '미적용') {
    if (armourMaterial) armourMaterial.disabled = true;
    if (thickArmour) thickArmour.disabled = true;
  } else {
    if (armourMaterial) armourMaterial.disabled = false;
    if (thickArmour) thickArmour.disabled = false;
  }
}

function populateDwRefSizes() {
  const indDw = document.getElementById('ind_dw_size_ref');
  const ovDw = document.getElementById('ov_dw_size_ref');
  const sizeSelect = document.getElementById('cond_size');
  if (!sizeSelect) return;
  const std = document.getElementById('conductorStandard')?.value || 'IEC';
  let filteredOptionsHtml = "";
  Array.from(sizeSelect.options).forEach(opt => {
    const area = parseFloat(opt.value);
    const sizeText = opt.textContent;
    let keep = true;
    if (std === 'IEC') {
      if (area > 6.0) keep = false; 
    } else {
      const awgMatch = sizeText.match(/(\d+)\s*AWG/i);
      if (awgMatch) {
        const awgNum = parseInt(awgMatch[1]);
        if (awgNum < 10) keep = false; 
      } else {
        if (area > 6.0) keep = false;
      }
    }
    if (keep) {
      filteredOptionsHtml += `<option value="${opt.value}">${opt.textContent}</option>`;
    }
  });
  if (indDw) {
    const prevVal = indDw.value;
    indDw.innerHTML = filteredOptionsHtml;
    if (prevVal && indDw.querySelector(`option[value="${prevVal}"]`)) {
      indDw.value = prevVal;
    } else if (indDw.options.length > 0) {
      indDw.selectedIndex = 0;
    }
  }
  if (ovDw) {
    const prevVal = ovDw.value;
    ovDw.innerHTML = filteredOptionsHtml;
    if (prevVal && ovDw.querySelector(`option[value="${prevVal}"]`)) {
      ovDw.value = prevVal;
    } else if (ovDw.options.length > 0) {
      ovDw.selectedIndex = 0;
    }
  }
}

function updateConductorSizes() {
  const mat = document.getElementById("cond_material")?.value || "copper";
  const std = document.getElementById("conductorStandard")?.value || "IEC";
  const cls = document.getElementById("cond_class")?.value || "연선";
  const coating = document.getElementById("cond_coating")?.value || "A";
  const sizeSelect = document.getElementById("cond_size");
  if (!sizeSelect) return;
  const previousValue = String(sizeSelect.value || sizeSelect.dataset.lastSelectedValue || "");
  const list = getConductorSizeListForConfig({cond_material:mat, conductorStandard:std, cond_class:cls, cond_coating:coating});
  const unique = [];
  const seen = new Set();
  list.forEach(item => {
    const k=String(item.nominalArea);
    if(!seen.has(k)){ seen.add(k); unique.push(item); }
  });
  sizeSelect.innerHTML = '';
  unique.forEach(item => {
    const option=document.createElement('option');
    option.value=String(item.nominalArea);
    option.textContent=item.size;
    option.dataset.nominalArea=item.nominalArea;
    sizeSelect.appendChild(option);
  });
  if(sizeSelect.options.length){
    const restore=[...sizeSelect.options].find(o=>o.value===previousValue);
    sizeSelect.value=(restore||sizeSelect.options[0]).value;
    sizeSelect.dataset.lastSelectedValue=sizeSelect.value;
  }
  updateConductorConstructionOptions();
  populateDwRefSizes();
}
function updateConductorConstructionOptions() {
  const mat = document.getElementById("cond_material")?.value || "copper";
  const std = document.getElementById("conductorStandard")?.value || "IEC";
  const cls = document.getElementById("cond_class")?.value || "연선";
  const coating = document.getElementById("cond_coating")?.value || "A";
  const sizeSelect=document.getElementById("cond_size"), configSelect=document.getElementById("cond_strand_config");
  if(!sizeSelect || !configSelect) return;
  const prior=configSelect.value;
  const area=Number(sizeSelect.value);
  const list=getConductorSizeListForConfig({cond_material:mat, conductorStandard:std, cond_class:cls, cond_coating:coating})
    .filter(item=>Math.abs(Number(item.nominalArea)-area)<1e-9);
  configSelect.innerHTML='';
  list.forEach((item,index)=>{
    const option=document.createElement('option');
    option.value=item.strandConfig || String(index);
    // 하나만 있는 구성은 선택 UI가 아니라 고정 표시로 제공한다.
    option.textContent=(list.length>1 ? '선택: ' : '') + (item.strandConfig || '표준구성 미등록');
    Object.entries(item).forEach(([k,v])=>{ if(v!==undefined && v!==null) option.dataset[k]=String(v); });
    configSelect.appendChild(option);
  });
  configSelect.disabled=list.length<=1;
  configSelect.setAttribute('aria-label', list.length>1 ? '소선구성 선택' : '소선구성');
  if(configSelect.options.length){
    configSelect.value=[...configSelect.options].some(o=>o.value===prior)?prior:configSelect.options[0].value;
    applySelectedConductorConstruction();
  }
}
function applySelectedConductorConstruction(){
  const sizeSelect=document.getElementById("cond_size"), configSelect=document.getElementById("cond_strand_config");
  const opt=configSelect?.selectedOptions?.[0];
  if(!sizeSelect || !opt) return;
  ['class2OD','weight','strandConfig','sourceTable','conductorResistance','classOrType','compoundCount','bundleStrandCount','wireDiameter','totalWireCount','coating']
    .forEach(k=>{ if(opt.dataset[k]!==undefined) sizeSelect.dataset[k]=opt.dataset[k]; });
  sizeSelect.dataset.conductorSource=opt.dataset.sourceTable || '';
}
window.handleConductorConstructionChange = function(){
  applySelectedConductorConstruction();
  if(typeof window.handleCondSizeChange==='function') window.handleCondSizeChange();
};

function populateMaterialDropdowns() {
  const targets = ['insu_material', 'bedding_material', 'sheath_material'];
  targets.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = '';
      if (id === 'sheath_material') {
        const noneOpt = document.createElement('option');
        noneOpt.value = '미적용';
        noneOpt.textContent = '미적용';
        select.appendChild(noneOpt);
      }
      standardMaterialsList.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = `${m} (${REAL_POLYMER_DATABASE[m] ? REAL_POLYMER_DATABASE[m].density : 1.4} g/cm³)`;
        select.appendChild(opt);
      });
    }
  });

  document.getElementById('insu_material')?.addEventListener('change', function() {
    const customPriceField = document.getElementById('insu_base_price');
    if (customPriceField && REAL_POLYMER_DATABASE[this.value]) {
      customPriceField.value = REAL_POLYMER_DATABASE[this.value].price;
      runCableDesignCalculation();
      calculateAndDraw();
    }
  });

  document.getElementById('bedding_material')?.addEventListener('change', function() {
    const customPriceField = document.getElementById('bedding_base_price');
    if (customPriceField && REAL_POLYMER_DATABASE[this.value]) {
      customPriceField.value = REAL_POLYMER_DATABASE[this.value].price;
      runCableDesignCalculation();
      calculateAndDraw();
    }
  });

  document.getElementById('sheath_material')?.addEventListener('change', function() {
    const customPriceField = document.getElementById('sheath_base_price');
    const thick = document.getElementById('thick_sheath');
    const colorGroup = document.getElementById('sheath_color_group');
    if (this.value === '미적용') {
      if (thick) thick.value = 0;
      if (colorGroup) colorGroup.style.display = 'none';
      if (customPriceField) customPriceField.value = 0;
      runCableDesignCalculation();
      calculateAndDraw();
      return;
    }
    if (colorGroup) colorGroup.style.display = '';
    if (customPriceField && REAL_POLYMER_DATABASE[this.value]) {
      customPriceField.value = REAL_POLYMER_DATABASE[this.value].price;
      runCableDesignCalculation();
      calculateAndDraw();
    }
  });

  if (document.getElementById('insu_material')) document.getElementById('insu_material').value = 'XLPE';
  if (document.getElementById('bedding_material')) document.getElementById('bedding_material').value = 'PVC';
  if (document.getElementById('sheath_material')) document.getElementById('sheath_material').value = 'PVC';
}

function handleIndShieldTypeChange() {
  const val = document.getElementById('ind_shield_type').value;
  const dwGroup = document.getElementById('ind_dw_ref_group');
  if (dwGroup) {
    dwGroup.style.display = val.includes('D/W') ? 'flex' : 'none';
  }
  syncDisabledInputs();
  if (typeof calculateAndDraw === 'function') calculateAndDraw();
}

function handleOvShieldTypeChange() {
  const val = document.getElementById('ov_shield_type').value;
  const dwGroup = document.getElementById('ov_dw_ref_group');
  if (dwGroup) {
    dwGroup.style.display = val.includes('D/W') ? 'flex' : 'none';
  }
  syncDisabledInputs();
  if (typeof calculateAndDraw === 'function') calculateAndDraw();
}

function handleOvShieldMaterialChange() {
  const mat = document.getElementById('ov_shield_material')?.value || '';
  const leadGroup = document.getElementById('ov_lead_thick_group');
  if (leadGroup) leadGroup.style.display = (mat === '납') ? 'flex' : 'none';
  syncDisabledInputs();
  if (typeof calculateAndDraw === 'function') calculateAndDraw();
}

function handleIndShieldMaterialChange() {
  const mat = document.getElementById('ind_shield_material').value;
  const leadGroup = document.getElementById('lead_thick_group');
  const grid = document.getElementById('ind_shield_grid');
  if (mat === '납') {
    if(leadGroup) leadGroup.style.display = 'flex';
    if(grid) grid.className = 'grid-4';
  } else {
    if(leadGroup) leadGroup.style.display = 'none';
    if(grid) grid.className = 'grid-3';
  }
  if (typeof calculateAndDraw === 'function') calculateAndDraw();
}

function handleCablingODModeChange() {
  const mode = document.getElementById('cabling_od_mode').value;
  const group = document.getElementById('manual_od_group');
  if(group) group.style.display = (mode === 'MANUAL') ? 'flex' : 'none';
  if (typeof calculateAndDraw === 'function') calculateAndDraw();
}

// [수정사항 2] 사양서부표 상속 정보 패키징 고도화
function openSpecTablePage() {
  const config = {};

  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (!el.id) return;
    if (el.type === 'checkbox') config[el.id] = el.checked;
    else if (el.type === 'radio') { if (el.checked) config[el.name || el.id] = el.value; }
    else config[el.id] = el.value;
  });

  config.cable_name = config.cable_name || "CABLE ENGINE";
  config.v_rating = config.v_rating || document.getElementById('v_rating')?.value || "";
  config.core_type = config.core_type || document.getElementById('core_type')?.value || "CORE";
  config.core_num = parseInt(config.core_num || document.getElementById('core_num')?.value) || 1;
  config.cond_material = config.cond_material || document.getElementById('cond_material')?.value || "copper";
  config.conductorStandard = document.getElementById('conductorStandard')?.value || config.conductorStandard || "IEC";
  config.cond_class = config.cond_class || document.getElementById('cond_class')?.value || "Class 2";
  config.cond_size = config.cond_size || document.getElementById('cond_size')?.value || "";
  config.cond_coating = config.cond_coating || document.getElementById('cond_coating')?.value || "A";
  config.insu_material = config.insu_material || document.getElementById('insu_material')?.value || "";
  config.bedding_material = config.bedding_material || document.getElementById('bedding_material')?.value || "";
  config.bedding_type = config.bedding_type || document.getElementById('bedding_type')?.value || "미적용";
  config.bedding_division = config.bedding_division || document.getElementById('bedding_division')?.value || "";
  config.sheath_material = config.sheath_material || document.getElementById('sheath_material')?.value || "";
  config.armour_material = config.armour_material_new || config.armour_material || "";
  config.armour_type = config.armour_type_new || config.armour_type || "미적용";
  config.thickness_std = config.thickness_rule_mode || document.getElementById('thickness_rule_mode')?.value || "MANUAL";
  config.nema_level = config.nema_level_main || config.nema_level || "100%";

  // [중요] 연합외경만은 수동 입력 상태와 무관하게 무조건 '자동계산된 연합외경'을 강제 전달
  config.assembly_od_auto = window.lastCalculatedAutoAssemblyOD || "자동계산";

  // 단가 테이블 입력 값 전면 동기화 상속
  config.insu_base_price = document.getElementById('insu_base_price')?.value || "3400";
  config.bedding_base_price = document.getElementById('bedding_base_price')?.value || "2400";
  config.sheath_base_price = document.getElementById('sheath_base_price')?.value || "2800";
  config.calculated_copper_price = document.getElementById('calculated_copper_price')?.value || "13500";

  try { config.selectedInsuColors = Array.isArray(selectedInsuColors) ? selectedInsuColors.slice() : []; } catch(e) {}

  const seqKey = 'sanTeukSpecTabSeq';
  const seq = (parseInt(sessionStorage.getItem(seqKey) || '0', 10) || 0) + 1;
  sessionStorage.setItem(seqKey, String(seq));
  config.spec_seq = seq;
  config.spec_title = `${seq}. ${config.cable_name || "CABLE ENGINE"}`;

  sessionStorage.setItem("cable_design_main_config", JSON.stringify(config));
  const uniqueTabName = "specTableWindow_" + Date.now();
  window.open("spec.html?instance=" + Date.now(), uniqueTabName);
}
window.__openSpecTablePageRoot = openSpecTablePage;

function safeCopyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) return Promise.resolve();
      else return Promise.reject(new Error("복사 기능 실행에 실패했습니다."));
    } catch (err) {
      document.body.removeChild(textarea);
      return Promise.reject(err);
    }
  }
}

function copyTableToClipboard() {
  const table = document.getElementById('cableCalcTable');
  if (!table) return;
  let tableText = "";
  table.querySelectorAll('tr').forEach(row => {
    let cols = row.querySelectorAll('th, td');
    let rowText = [];
    cols.forEach(col => {
      let input = col.querySelector('input');
      rowText.push(input ? input.value : col.innerText.replace(/,/g, ''));
    });
    tableText += rowText.join("\t") + "\n";
  });
  safeCopyToClipboard(tableText).then(() => {
    alert('산출 자재 원가 데이터 표 전체가 클립보드에 복사되었습니다! 엑셀(Excel)에 붙여넣어 편집해 보세요.');
  }).catch((err) => {
    console.error("복사 오류 디테일: ", err);
    alert('사내 보안 또는 브라우저 제한으로 자동 복사에 실패했습니다. 표 내용을 수동으로 드래그해 복사해 주세요.');
  });
}


// === Root common standard helpers (latest-only) ===
function isNorthAmericanRule(rule) {
  const r = String(rule || '').toUpperCase();
  return r === 'AEIC' || r === 'IEEE_1580' || r.includes('ICEA') || r.includes('NEMA') || r === 'NEMA_ICEA';
}
function resolveConductorStandardBySpec(rule) {
  return isNorthAmericanRule(rule) ? 'ASTM' : 'IEC';
}
function formatThicknessByRule(value, rule) {
  const num = parseFloat(value) || 0;
  return isNorthAmericanRule(rule) ? num.toFixed(2) : num.toFixed(1);
}
function normalizeInsulationMaterialForSpec(material) {
  const s = String(material || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (s.includes('HF_HEPR') || s.includes('HEPR')) return 'HEPR';
  if (s.includes('HF_EPR') || s === 'EPR') return 'EPR';
  if (s.includes('XLPE')) return 'XLPE';
  if (s.includes('PVC')) return 'PVC';
  return material || 'XLPE';
}
function getUnifiedBeddingEnglish() {
  const v = (document.getElementById('bedding_unified_type')?.value || document.getElementById('standard_bedding_unified')?.value || '').trim();
  const div = document.getElementById('bedding_division')?.value || document.getElementById('standard_inner_division')?.value || '';
  if (v === '이너시스' || div === 'Inner Sheath') return 'Inner Sheath';
  return 'Inner Covering';
}
function getArmourThicknessByRule(rule, type, diameterUnderArmour) {
  const t = String(type || '');
  const d = parseFloat(diameterUnderArmour) || 0;
  const r = String(rule || '').toUpperCase();
  if (!t || t.includes('미적용')) return { armorVal: 0, armorThick: 0 };
  let val = 0;
  if (t.includes('편조') || t.toUpperCase().includes('BRAID')) {
    if (r.includes('IEC_60092')) {
      if (d <= 10) val = 0.2; else if (d <= 30) val = 0.3; else val = 0.4;
    } else if (r.includes('IEC_60502')) {
      if (d <= 10) val = 0.3; else if (d <= 30) val = 0.4; else val = 0.5;
    } else {
      if (d <= 10) val = 0.3; else if (d <= 30) val = 0.4; else val = 0.5;
    }
    return { armorVal: val, armorThick: val };
  }
  if (t.includes('SWA') || t.includes('AWA') || t.includes('횡권')) {
    if (r.includes('IEC_60092')) {
      if (d <= 10) val = 0.8; else if (d <= 15) val = 1.0; else if (d <= 25) val = 1.25; else if (d <= 35) val = 1.6; else if (d <= 45) val = 2.0; else if (d <= 60) val = 2.5; else val = 3.15;
    } else if (r.includes('IEC_60502')) {
      if (d <= 10) val = 0.8; else if (d <= 15) val = 1.25; else if (d <= 25) val = 1.6; else if (d <= 35) val = 2.0; else if (d <= 60) val = 2.5; else val = 3.15;
    } else {
      if (d <= 15) val = 0.8; else if (d <= 25) val = 1.25; else if (d <= 35) val = 1.6; else if (d <= 45) val = 2.0; else if (d <= 60) val = 2.5; else val = 3.15;
    }
    return { armorVal: val, armorThick: val };
  }
  if (t.includes('STA') || t.includes('테이프')) {
    val = r.includes('IEC_60092') ? (d <= 30 ? 0.2 : 0.5) : 0.5;
    return { armorVal: val, armorThick: val };
  }
  return { armorVal: 0, armorThick: 0 };
}
