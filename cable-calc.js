// cable-calc.js
// LS 연합외경 계수/CASE 표준 데이터는 shared-material-engine.js의 LSCablingStandard 단일 원천만 사용합니다.

function getMaterialDensity(mat) {
    if (!mat) return 1.4;
    const normalized = mat.trim().toUpperCase();
    if (normalized.includes("XLPE")) return 0.925;
    if (normalized.includes("PVC")) return 1.40;
    if (normalized.includes("EPR") || normalized.includes("HEPR")) return 1.30;
    if (normalized.includes("PE") || normalized.includes("XLPO")) return 0.93;
    if (normalized.includes("LSE") || normalized.includes("LSX") || normalized.includes("실리콘")) return 1.20;
    if (normalized.includes("구리") || normalized.includes("COPPER") || normalized.includes("동")) return 8.89;
    if (normalized.includes("알루미늄") || normalized.includes("ALUMINUM")) return 2.70;
    if (normalized.includes("철") || normalized.includes("STEEL") || normalized.includes("STA") || normalized.includes("SWA")) return 7.85;
    if (normalized.includes("납") || normalized.includes("LEAD")) return 11.34;
    return 1.40; 
}

function getFictitiousConductorDiameter(nominalArea) {
    const table = {
        0.5: 0.8, 0.75: 1.0, 1: 1.1, 1.5: 1.4, 2.5: 1.8, 4: 2.3, 6: 2.8,
        10: 3.6, 16: 4.5, 25: 5.6, 35: 6.7, 50: 8.0, 70: 9.5, 95: 11.1,
        120: 12.5, 150: 14.0, 185: 15.5, 240: 17.7, 300: 19.8, 400: 22.8,
        500: 25.6, 630: 28.7, 800: 32.4, 1000: 36.3
    };
    return table[nominalArea] || parseFloat((1.15 * Math.sqrt(nominalArea)).toFixed(1));
}

function parseCenterText(txt) {
    if (!txt) return { cores: 1, hasFiller: false };
    let s = txt.toString().trim();
    if (s === "1") return { cores: 1, hasFiller: false };
    if (s === "2") return { cores: 2, hasFiller: false };
    if (s === "3") return { cores: 3, hasFiller: false };
    if (s === "4") return { cores: 4, hasFiller: false };
    if (s === "5") return { cores: 5, hasFiller: false };
    if (s === "F") return { cores: 0, hasFiller: true };
    if (s === "1+F") return { cores: 1, hasFiller: true };
    if (s === "2+F") return { cores: 2, hasFiller: true };
    if (s === "3+F") return { cores: 3, hasFiller: true };
    return { cores: 1, hasFiller: false };
}

function calculateGroundInsertType(coreNum, nominalArea, numGround) {
    if (coreNum === 3 && numGround === 1) return 'symmetric_round';
    if (nominalArea <= 16) return 'symmetric_round';
    return 'valley_insertion'; 
}

function getGroundConductorSize(mainSize, numGround) {
    if (mainSize <= 16) return mainSize;
    let target = (mainSize / 2.0) / numGround;
    const stdSizes = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630, 800, 1000];
    for (let s of stdSizes) {
        if (s >= target) return s;
    }
    return stdSizes[stdSizes.length - 1];
}

function getConductorODForSize(nominalArea) {
    const selected = document.getElementById("cond_size");
    if (selected && Math.abs(Number(selected.value)-Number(nominalArea)) < 0.01 && Number(selected.dataset.class2OD)>0) {
        return Number(selected.dataset.class2OD);
    }
    const cfg={cond_material:document.getElementById("cond_material")?.value||"copper",
      conductorStandard:document.getElementById("conductorStandard")?.value||"IEC",
      cond_class:document.getElementById("cond_class")?.value||"연선",
      cond_coating:document.getElementById("cond_coating")?.value||"A"};
    const sizes=window.LSConductorUtils ? LSConductorUtils.getList(cfg) : [];
    const item=sizes.find(x=>Math.abs(Number(x.nominalArea)-Number(nominalArea))<0.01);
    return item ? Number(item.class2OD) : Math.sqrt(nominalArea) * 1.13;
}

function getStandardLayoutPositions(rFinalBundle_mm, hasGround, coreNum, numGround, rGround_scaled) {
    let positions = [];
    let fillers = [];
    let maxCoreBoundary = rFinalBundle_mm;
    let centerText = document.getElementById('layer_center')?.value || "1";
    let l1 = parseInt(document.getElementById('layer_1st')?.value) || 0;
    let l2 = parseInt(document.getElementById('layer_2nd')?.value) || 0;
    let l3 = parseInt(document.getElementById('layer_3rd')?.value) || 0;
    let l4 = parseInt(document.getElementById('layer_4th')?.value) || 0;
    let l5 = parseInt(document.getElementById('layer_5th')?.value) || 0;
    let centerSpec = parseCenterText(centerText);
    let centerCores = centerSpec.cores;
    let centerHasFiller = centerSpec.hasFiller;
    let currentBoundaryRadius = 0;
    const condSizeSelect = document.getElementById('cond_size');
    let nominalArea = 0;
    if (condSizeSelect && condSizeSelect.options[condSizeSelect.selectedIndex]) {
        nominalArea = parseFloat(condSizeSelect.options[condSizeSelect.selectedIndex].dataset.nominalArea) || 0;
    }

    if (hasGround) {
        let R_m = rFinalBundle_mm; 
        let R_g = rGround_scaled; 
        const groundInsertType = calculateGroundInsertType(coreNum, nominalArea, numGround);
        if (groundInsertType === 'symmetric_round') {
            let totalCores = coreNum + numGround;
            let k_factor = 2.15;
            if (totalCores === 2) k_factor = 2.0;
            else if (totalCores === 3) k_factor = 2.15;
            else if (totalCores === 4) k_factor = 2.414;
            else if (totalCores === 5) k_factor = 2.7;
            else k_factor = 1 + Math.sqrt(totalCores);
            let R_center = (R_m * k_factor - R_m);
            for (let i = 0; i < coreNum; i++) {
                let angle = (i * (360 / totalCores) - 90) * Math.PI / 180;
                positions.push({ layer: 0, rIdx: i, dx: R_center, dy: 0, angle: angle, isGround: false });
            }
            for (let i = 0; i < numGround; i++) {
                let angle = ((coreNum + i) * (360 / totalCores) - 90) * Math.PI / 180;
                positions.push({ layer: 0, rIdx: i, dx: R_center, dy: 0, angle: angle, isGround: true });
            }
            maxCoreBoundary = R_center + R_m;
            return { positions, fillers, maxCoreBoundary };
        } else {
            let k_factor = 2.15;
            if (coreNum === 2) k_factor = 2.0;
            else if (coreNum === 3) k_factor = 2.15;
            else if (coreNum === 4) k_factor = 2.414;
            else if (coreNum === 5) k_factor = 2.7;
            let R_center = (R_m * k_factor - R_m);
            for (let i = 0; i < coreNum; i++) {
                let angle = (i * (360 / coreNum) - 90) * Math.PI / 180;
                positions.push({ layer: 0, rIdx: i, dx: R_center, dy: 0, angle: angle, isGround: false });
            }
            let fillAngleOffset = 180 / coreNum;
            for (let i = 0; i < coreNum; i++) {
                let angle = (i * (360 / coreNum) - 90 + fillAngleOffset) * Math.PI / 180;
                let dG = R_center / Math.cos(fillAngleOffset * Math.PI / 180);
                if (i < numGround) {
                    positions.push({ layer: 0, rIdx: i, dx: dG, dy: 0, angle: angle, isGround: true });
                } else {
                    fillers.push({ dx: dG * Math.cos(angle), dy: dG * Math.sin(angle), r: R_g });
                }
            }
            maxCoreBoundary = R_center + R_m;
            return { positions, fillers, maxCoreBoundary };
        }
    }

    if (centerCores === 1) {
        positions.push({ layer: 0, rIdx: 0, dx: 0, dy: 0, angle: 0, isGround: false });
        currentBoundaryRadius = rFinalBundle_mm;
    } else if (centerCores > 1) {
        let dist = (centerCores === 2) ? rFinalBundle_mm : (rFinalBundle_mm / Math.sin(Math.PI / centerCores));
        for(let i=0; i<centerCores; i++) {
            let ang = (i * (360 / centerCores) - 90) * Math.PI / 180;
            positions.push({ layer: 0, rIdx: i, dx: dist, dy: 0, angle: ang, isGround: false });
        }
        currentBoundaryRadius = dist + rFinalBundle_mm;
    }

    if (centerHasFiller) {
        let centerFillerR = rFinalBundle_mm * 0.9;
        if (centerCores === 0) {
            fillers.push({ dx: 0, dy: 0, r: centerFillerR });
            currentBoundaryRadius = Math.max(currentBoundaryRadius, centerFillerR);
        } else {
            let requiredLayerRadius = (l1 > 0) ? (rFinalBundle_mm / Math.sin(Math.PI / l1)) : 0;
            currentBoundaryRadius = (l1 > 0) ? (requiredLayerRadius - rFinalBundle_mm) : (rFinalBundle_mm * 1.45);
            fillers.push({ dx: 0, dy: 0, r: Math.max(0.1, currentBoundaryRadius * 0.95) });
        }
    }

    let layers = [l1, l2, l3, l4, l5];
    for (let idx = 0; idx < layers.length; idx++) {
        let coreCount = layers[idx];
        if (coreCount <= 0) continue;
        let geoMinRadius = rFinalBundle_mm / Math.sin(Math.PI / coreCount);
        let actualLayerRadius = Math.max(currentBoundaryRadius + rFinalBundle_mm, geoMinRadius);
        if (idx === 0 && centerCores === 1 && !centerHasFiller && coreCount <= 6) {
            actualLayerRadius = rFinalBundle_mm * 2.05;
        }
        for (let i = 0; i < coreCount; i++) {
            let baseAngle = -90;
            let angle = (baseAngle + (i * (360 / coreCount))) * Math.PI / 180;
            positions.push({ layer: idx + 1, rIdx: i, dx: actualLayerRadius, dy: 0, angle: angle, isGround: false });
        }
        let circ = 2 * Math.PI * actualLayerRadius;
        let fillerSpace = (circ - (coreCount * rFinalBundle_mm * 2)) / coreCount;
        if (fillerSpace > rFinalBundle_mm * 0.4) {
            let fR = Math.min(rFinalBundle_mm * 0.8, fillerSpace / 2);
            for (let i = 0; i < coreCount; i++) {
                let baseAngle = -90;
                let angle = (baseAngle + (i * (360 / coreCount)) + (360 / coreCount / 2)) * Math.PI / 180;
                fillers.push({ dx: actualLayerRadius * Math.cos(angle), dy: actualLayerRadius * Math.sin(angle), r: fR });
            }
        }
        currentBoundaryRadius = actualLayerRadius + rFinalBundle_mm;
        if (currentBoundaryRadius > maxCoreBoundary) maxCoreBoundary = currentBoundaryRadius;
    }
    return { positions, fillers, maxCoreBoundary: Math.max(maxCoreBoundary, currentBoundaryRadius) };
}



// ==================== LS 연합표준 UI 동기화 헬퍼 ====================
// 계수표는 이 파일에 두지 않는다. shared-material-engine.js의
// window.resolveLsCablingStandard / window.LSCablingStandard만 호출한다.
function getSharedLayerSpec(category, material, method, overrides){
  if(window.LSSharedMaterialEngine && typeof window.LSSharedMaterialEngine.getLayerSpec==='function'){
    return window.LSSharedMaterialEngine.getLayerSpec(category, material, method, overrides||{});
  }
  return {thickness:Number(overrides&&overrides.thickness)||0, density:1, coverageFactor:1};
}
function isLsOffValue(v){
  const s=String(v ?? '').trim();
  return !s || s==='미적용' || s==='없음' || s==='none' || s==='NONE' || s==='-';
}
function resolveLsShieldKindFromDom(){
  const coreType=(document.getElementById('core_type')?.value || 'CORE').toUpperCase();
  const coreNum=parseInt(document.getElementById('core_num')?.value || '1',10) || 1;
  if(!['PAIR','TRIAD','QUAD'].includes(coreType) || coreNum < 2) return 'NONE';
  const ind=document.getElementById('ind_shield_type')?.value;
  const ov=document.getElementById('ov_shield_type')?.value;
  if(!isLsOffValue(ind)) return 'INDIVIDUAL';
  if(!isLsOffValue(ov)) return 'COMMON';
  return 'NONE';
}
function resolveLsCablingStandard(input){
  const ctx=input || {};
  if(window.LSCablingStandard && typeof window.LSCablingStandard.resolve === 'function'){
    return window.LSCablingStandard.resolve(Object.assign({}, ctx, {
      shieldKind: ctx.shieldKind || resolveLsShieldKindFromDom(),
      indShieldType: document.getElementById('ind_shield_type')?.value,
      ovShieldType: document.getElementById('ov_shield_type')?.value
    }));
  }
  throw new Error('LSCablingStandard is not loaded. Check shared-material-engine.js load order.');
}
function applyLsCablingLayoutToDom(result){
  if(!result || !result.layout) return;
  const d=result.layout;
  if(document.getElementById('layer_center')) document.getElementById('layer_center').value = d.center ?? '1';
  if(document.getElementById('layer_1st')) document.getElementById('layer_1st').value = d.l1 || 0;
  if(document.getElementById('layer_2nd')) document.getElementById('layer_2nd').value = d.l2 || 0;
  if(document.getElementById('layer_3rd')) document.getElementById('layer_3rd').value = d.l3 || 0;
  if(document.getElementById('layer_4th')) document.getElementById('layer_4th').value = d.l4 || 0;
  if(document.getElementById('layer_5th')) document.getElementById('layer_5th').value = d.l5 || 0;
  if(document.getElementById('calc_k_factor')) document.getElementById('calc_k_factor').value = (Number(result.k)||0).toFixed(2);
}
window.applyLsCablingLayoutToDom = applyLsCablingLayoutToDom;
if(window.LSCablingStandard && typeof window.LSCablingStandard.resolve === 'function') window.resolveLsCablingStandard = window.LSCablingStandard.resolve;
// ==================== /LS 연합표준 UI 동기화 헬퍼 ====================

function syncArrayTableToUI() {
    const mode = document.getElementById('array_mode')?.value || 'AUTO';
    if (mode !== 'AUTO') return;
    let coreNum = parseInt(document.getElementById('core_num')?.value) || 1;
    const coreType = document.getElementById('core_type')?.value || 'CORE';
    const hasGround = (document.getElementById('has_ground')?.value === '적용') && (coreType === 'CORE') && (coreNum >= 2 && coreNum <= 5);
    const condSizeSelect = document.getElementById('cond_size');
    let nominalArea = 0;
    if (condSizeSelect && condSizeSelect.options[condSizeSelect.selectedIndex]) {
        nominalArea = parseFloat(condSizeSelect.options[condSizeSelect.selectedIndex].dataset.nominalArea) || 0;
    }
    let numGround = hasGround ? (parseInt(document.getElementById('num_ground')?.value) || 1) : 1;
    const groundInsertType = calculateGroundInsertType(coreNum, nominalArea, numGround);
    let effectiveCores = (hasGround && groundInsertType === 'symmetric_round') ? (coreNum + numGround) : coreNum;

    // LS 연합표준 6케이스를 우선 적용한다.
    // CORE/PAIR/TRIAD/QUAD, 시스 방식, 7번/10번 차폐 상태를 여기서 한 번에 판정한다.
    const lsResult = resolveLsCablingStandard({
        coreType: coreType,
        count: effectiveCores,
        sheathMethod: document.getElementById('cabling_sheath_method')?.value || 'GENERAL_EXTRUDED'
    });
    applyLsCablingLayoutToDom(lsResult);
    window.lastLsCablingCase = lsResult.caseId;
    window.lastLsCablingK = lsResult.k;
}

function toggleArrayMode() {
    const mode = document.getElementById('array_mode')?.value || 'AUTO';
    const isManual = (mode === 'MANUAL');
    if(document.getElementById('layer_center')) document.getElementById('layer_center').disabled = !isManual;
    if(document.getElementById('layer_1st')) document.getElementById('layer_1st').disabled = !isManual;
    if(document.getElementById('layer_2nd')) document.getElementById('layer_2nd').disabled = !isManual;
    if(document.getElementById('layer_3rd')) document.getElementById('layer_3rd').disabled = !isManual;
    if(document.getElementById('layer_4th')) document.getElementById('layer_4th').disabled = !isManual;
    if(document.getElementById('layer_5th')) document.getElementById('layer_5th').disabled = !isManual;
    if (!isManual) syncArrayTableToUI();
    if (typeof calculateAndDraw === 'function') calculateAndDraw();
}

function handleManualArrayChange() {
    if (typeof calculateAndDraw === 'function') calculateAndDraw();
}

// [수정사항 1] 두께 규격 동적 자동 연산 및 입력 필드 반영 로직
function getLSAssemblyFactor(type, count) {
    if (window.LSCablingStandard && typeof window.LSCablingStandard.factor === 'function') {
        return window.LSCablingStandard.factor(type, count);
    }
    throw new Error('LSCablingStandard is not loaded. Check shared-material-engine.js load order.');
}
if(window.LSCablingStandard && typeof window.LSCablingStandard.factor === 'function') window.getLSAssemblyFactor = window.LSCablingStandard.factor;
else window.getLSAssemblyFactor = window.getLSAssemblyFactor || getLSAssemblyFactor;


function getArmourThicknessByStandard(mode, armourType, diameterUnderArmour) {
    if (typeof getArmourThicknessByRule === "function") return getArmourThicknessByRule(mode, armourType, diameterUnderArmour).armorVal;
    if (!armourType || armourType === "미적용") return 0.0;
    const type = String(armourType);

    // IEC 60092 기준: IEC 60502 테이블과 공유하지 않는다.
    if (mode && mode.startsWith("IEC_60092")) {
        if (type.includes("편조") || type.includes("Braid")) {
            if (diameterUnderArmour <= 10.0) return 0.2;
            if (diameterUnderArmour <= 30.0) return 0.3;
            return 0.4;
        }
        if (type.includes("횡권") || type.includes("SWA") || type.includes("AWA")) {
            if (diameterUnderArmour <= 15.0) return 0.8;
            if (diameterUnderArmour <= 25.0) return 1.25;
            if (diameterUnderArmour <= 35.0) return 1.6;
            if (diameterUnderArmour <= 45.0) return 2.0;
            if (diameterUnderArmour <= 60.0) return 2.5;
            return 3.15;
        }
        if (type.includes("테이프") || type.includes("STA")) return 0.5;
        return 1.0;
    }

    // IEC 60502 기준: IEC 60092와 분리. Wire armour는 IEC 60502 구간 기준을 사용한다.
    if (mode && mode.startsWith("IEC_60502")) {
        if (type.includes("편조") || type.includes("Braid")) {
            if (diameterUnderArmour <= 10.0) return 0.2;
            if (diameterUnderArmour <= 30.0) return 0.3;
            return 0.4;
        }
        if (type.includes("횡권") || type.includes("SWA") || type.includes("AWA")) {
            if (diameterUnderArmour <= 10.0) return 0.8;
            if (diameterUnderArmour <= 15.0) return 1.25;
            if (diameterUnderArmour <= 25.0) return 1.6;
            if (diameterUnderArmour <= 35.0) return 2.0;
            if (diameterUnderArmour <= 60.0) return 2.5;
            return 3.15;
        }
        if (type.includes("테이프") || type.includes("STA")) {
            return diameterUnderArmour <= 30.0 ? 0.2 : 0.5;
        }
        return 1.0;
    }

    if (type.includes("편조") || type.includes("Braid")) {
        if (diameterUnderArmour <= 10.0) return 0.3;
        if (diameterUnderArmour <= 30.0) return 0.4;
        return 0.5;
    }
    if (type.includes("횡권") || type.includes("SWA") || type.includes("AWA")) {
        if (diameterUnderArmour <= 15.0) return 0.8;
        if (diameterUnderArmour <= 25.0) return 1.25;
        if (diameterUnderArmour <= 35.0) return 1.6;
        if (diameterUnderArmour <= 45.0) return 2.0;
        if (diameterUnderArmour <= 60.0) return 2.5;
        return 3.15;
    }
    if (type.includes("테이프") || type.includes("STA")) return 0.5;
    return 1.0;
}

function formatThicknessForRule(mode, value) {
    const num = parseFloat(value) || 0;
    if (typeof isNorthAmericanRule === "function" ? isNorthAmericanRule(mode) : (mode === "IEEE_1580" || mode === "NEMA_ICEA" || String(mode).includes("AEIC") || String(mode).includes("ICEA") || String(mode).includes("NEMA"))) {
        return num.toFixed(2);
    }
    return num.toFixed(1);
}



function getIec60502LvInsulationBySpec(area, material) {
    const a = parseFloat(area) || 0;
    const mat = String(material || 'XLPE').toUpperCase();
    function base() {
        if (a <= 16) return 0.7; if (a <= 35) return 0.9; if (a <= 70) return 1.1; if (a <= 120) return 1.1;
        if (a <= 150) return 1.4; if (a <= 185) return 1.6; if (a <= 240) return 1.7; if (a <= 300) return 1.8;
        if (a <= 400) return 2.0; if (a <= 630) return 2.2; if (a <= 800) return 2.4; return 2.6;
    }
    if (mat.includes('PVC')) {
        if (a <= 6) return 0.8; if (a <= 16) return 1.0; if (a <= 35) return 1.2; if (a <= 70) return 1.4; if (a <= 120) return 1.6;
        if (a <= 150) return 1.8; if (a <= 185) return 2.0; if (a <= 240) return 2.2; if (a <= 300) return 2.4;
        if (a <= 400) return 2.6; if (a <= 630) return 2.8; if (a <= 800) return 3.0; return 3.2;
    }
    if (mat.includes('HEPR')) {
        if (a <= 2.5) return 0.5;
        if (a <= 6) return 0.6;
        return base();
    }
    return base(); // XLPE / EPR
}

function getIEEE1580InsulationByType(area, type, voltage) {
    const a = parseFloat(area) || 0;
    const t = String(type || 'TYPE_E').toUpperCase();
    const v = String(voltage || '1000V').toUpperCase();
    const isHigh = v.includes('2000') || v.includes('1001');
    const groupS = t.includes('TYPE_S') || t.includes('TYPE_LSS') || t === 'S' || t === 'LSS';
    const groupLSE = t.includes('TYPE_LSE') || t.includes('TYPE_LSX') || t === 'LSE' || t === 'LSX';
    const groupT = t.includes('TYPE_T') || t === 'T' || t.includes('PVC');
    const groupP = t.includes('TYPE_P') || t === 'P';
    if (isHigh) {
        if (groupS) { if (a <= 7) return 1.52; if (a <= 34) return 1.78; if (a <= 85) return 2.29; return 2.67; }
        if (groupT || groupP) { if (a <= 7) return 1.14; if (a <= 34) return 1.40; if (a <= 85) return 1.65; return 2.29; }
        if (a <= 7) return 1.14; if (a <= 34) return 1.40; return 1.65;
    }
    if (groupS) { if (a <= 0.68) return 0.88; if (a <= 7) return 1.14; if (a <= 34) return 1.52; if (a <= 107) return 2.03; if (a <= 254) return 2.41; if (a <= 508) return 2.79; return 3.56; }
    if (groupT) { if (a <= 0.68) return 0.63; if (a <= 1.31) return 0.76; if (a <= 7) return 1.14; if (a <= 34) return 1.52; if (a <= 107) return 2.03; if (a <= 254) return 2.41; if (a <= 508) return 2.79; return 3.56; }
    if (groupLSE) { if (a <= 0.68) return 0.63; if (a <= 7) return 0.76; if (a <= 34) return 1.14; if (a <= 107) return 1.40; if (a <= 254) return 1.65; if (a <= 508) return 2.03; return 2.41; }
    if (a <= 0.68) return 0.51; if (a <= 7) return 0.76; if (a <= 34) return 1.14; if (a <= 107) return 1.40; if (a <= 254) return 1.65; if (a <= 508) return 2.03; return 2.41;
}

function applyAutomaticThicknesses() {
    const mode = document.getElementById("thickness_rule_mode")?.value || "MANUAL";
    if (mode === "MANUAL") {
        return; 
    }

    const condSizeSelect = document.getElementById("cond_size");
    if (!condSizeSelect) return;
    const selectedOpt = condSizeSelect.options[condSizeSelect.selectedIndex];
    if (!selectedOpt) return;
    const sizeNum = parseFloat(selectedOpt.dataset.nominalArea) || 0;
    const voltage = document.getElementById("v_rating")?.value || "0.6/1kV";
    const insuMaterial = document.getElementById("insu_material")?.value || "XLPE";
    const standardInsuType = document.getElementById("standard_insu_material")?.value || insuMaterial;
    const nemaLevel = document.getElementById("nema_level_main")?.value || "100%";
    const coreNum = parseInt(document.getElementById("core_num")?.value) || 1;
    const coreType = document.getElementById("core_type")?.value || "CORE";
    const beddingType = document.getElementById("bedding_type")?.value || "미적용";
    const beddingDivision = document.getElementById("bedding_division")?.value || "Inner Covering";
    const armourType = document.getElementById("armour_type_new")?.value || "미적용";

    const tapeMica = document.getElementById("tape_mica")?.value || "미적용";
    const tapeInsuAbove = document.getElementById("tape_insu_above")?.value || "미적용";
    const binderTape = document.getElementById("binder_tape")?.value || "미적용";
    const indShield = document.getElementById("ind_shield_type")?.value || "미적용";
    const ovShield = document.getElementById("ov_shield_type")?.value || "미적용";

    let insuThick = 0.8;
    let beddingThick = 0.0;
    let sheathThick = 1.6;
    let armourThick = 0.0;
    let insuSuccess = true;

    const isMV = ['3.6/6kV', '5KV', '6/10KV', '8.0KV', '8.7/15KV', '15KV', '12/20KV', '18/30KV', '25KV', '28KV', '35KV', '46KV', '66KV'].includes(voltage);
    const isLV_Control = ['150/250V', '250V', '300V'].includes(voltage);

    // 1. 절연 두께 산출
    if (mode === "IEC_60092-353") {
        if (isMV) { insuSuccess = false; insuThick = 0.0; }
        else if (["XLPE", "HEPR", "XLPO", "LSX"].includes(insuMaterial)) {
            if (sizeNum <= 16) insuThick = 0.7;
            else if (sizeNum <= 35) insuThick = 0.9;
            else if (sizeNum <= 120) insuThick = 1.1;
            else if (sizeNum <= 185) insuThick = 1.2;
            else insuThick = 1.4;
        } else if (["EPR", "LSE"].includes(insuMaterial)) {
            if (sizeNum <= 16) insuThick = 1.0;
            else if (sizeNum <= 35) insuThick = 1.2;
            else if (sizeNum <= 120) insuThick = 1.4;
            else insuThick = 1.6;
        } else {
            insuThick = 1.0;
        }
    } else if (mode === "IEC_60092-354") {
        if (!isMV) { insuSuccess = false; insuThick = 0.0; }
        else {
            if (voltage.includes("3.6/6")) insuThick = 2.5;
            else if (voltage.includes("6/10")) insuThick = 3.4;
            else if (voltage.includes("8.7/15") || voltage.includes("15KV")) insuThick = 4.5;
            else if (voltage.includes("12/20")) insuThick = 5.5;
            else if (voltage.includes("18/30") || voltage.includes("35KV")) insuThick = 8.0;
            else { insuThick = 8.0; insuSuccess = false; }
        }
    } else if (mode === "IEC_60092-376") {
        if (!isLV_Control || sizeNum > 2.5) { insuSuccess = false; insuThick = 0.0; }
        else {
            if (sizeNum <= 0.75) insuThick = 0.5;
            else insuThick = 0.6;
        }
    } else if (mode === "IEC_60502-1") {
        if (isMV) { insuSuccess = false; insuThick = 0.0; }
        else {
            insuThick = getIec60502LvInsulationBySpec(sizeNum, standardInsuType || insuMaterial);
        }
    } else if (mode === "IEC_60502-2") {
        if (!isMV) { insuSuccess = false; insuThick = 0.0; }
        else {
            if (voltage.includes("3.6/6")) insuThick = 2.5;
            else if (voltage.includes("6/10")) insuThick = 3.4;
            else if (voltage.includes("8.7/15")) insuThick = 4.5;
            else if (voltage.includes("12/20")) insuThick = 5.5;
            else if (voltage.includes("18/30")) insuThick = 8.0;
            else { insuThick = 8.0; insuSuccess = false; }
        }
    } else if (mode === "IEEE_1580") {
        insuThick = getIEEE1580InsulationByType(sizeNum, standardInsuType || insuMaterial, voltage);
    } else if (mode === "NEMA_ICEA") {
        let mils = 0;
        if (!isMV) {
            if (sizeNum <= 6.0) {
                mils = (nemaLevel === "133%") ? 45 : 30;
            } else if (sizeNum <= 35.0) {
                mils = (nemaLevel === "133%") ? 60 : 45;
            } else if (sizeNum <= 107.0) {
                mils = (nemaLevel === "133%") ? 80 : 55;
            } else if (sizeNum <= 253.0) {
                mils = (nemaLevel === "133%") ? 95 : 65;
            } else {
                mils = (nemaLevel === "133%") ? 110 : 80;
            }
        } else {
            const is133 = (nemaLevel === "133%");
            if (voltage.includes("5KV") || voltage.includes("3.6/6")) { mils = is133 ? 115 : 90; }
            else if (voltage.includes("8.0KV") || voltage.includes("6/10")) { mils = is133 ? 140 : 115; }
            else if (voltage.includes("15KV") || voltage.includes("8.7/15")) { mils = is133 ? 220 : 175; }
            else if (voltage.includes("25KV") || voltage.includes("12/20")) { mils = is133 ? 320 : 260; }
            else if (voltage.includes("35KV") || voltage.includes("18/30")) { mils = is133 ? 420 : 345; }
            else { mils = 90; }
        }
        insuThick = parseFloat((mils * 0.0254).toFixed(2));
    }

    const t_insu = document.getElementById("thick_insu");
    if (t_insu && insuSuccess) {
        t_insu.value = formatThicknessForRule(mode, insuThick);
    }

    // 2. 가상 가공경(D_f) 환산
    let perBundle = (coreType==='PAIR') ? 2 : (coreType==='TRIAD') ? 3 : (coreType==='QUAD') ? 4 : 1;
    let totalCores = coreNum * perBundle;
    let d_L = getFictitiousConductorDiameter(sizeNum);
    if (tapeMica !== "미적용") { d_L += 0.3; }
    const t_scr = isMV ? 1.0 : 0.0;
    let D_c = d_L + 2 * insuThick + 2 * t_scr;
    if (tapeInsuAbove !== "미적용") { D_c += 0.2; }
    if (indShield !== "미적용") { D_c += 0.3; }
    
    let assemblyK = getLSAssemblyFactor(coreType, totalCores);
    let D_f = D_c * assemblyK;
    if ((coreType === "PAIR" || coreType === "TRIAD") && indShield !== "미적용") { D_f += 0.3; }
    if (binderTape !== "미적용") { D_f += 0.2; }
    if (ovShield !== "미적용") { D_f += 0.3; }

    // 3. 베딩 두께 산출
    if (beddingType !== "미적용") {
        if (mode && mode.startsWith("IEC_60092") && beddingType === "LAPPED") {
            beddingThick = D_f <= 40 ? 0.4 : 0.6;
        } else if (mode.includes("IEC")) {
            if (beddingDivision === "Inner Covering") {
                if (D_f <= 25.0) beddingThick = 0.8;
                else if (D_f <= 45.0) beddingThick = 1.0;
                else beddingThick = 1.2;
            } else {
                if (D_f <= 25.0) beddingThick = 1.0;
                else if (D_f <= 35.0) beddingThick = 1.2;
                else if (D_f <= 45.0) beddingThick = 1.4;
                else if (D_f <= 60.0) beddingThick = 1.6;
                else beddingThick = 1.8;
            }
        } else if (mode === "IEEE_1580") {
            if (D_f <= 10.79) beddingThick = 1.14;
            else if (D_f <= 17.78) beddingThick = 1.52;
            else if (D_f <= 38.10) beddingThick = 2.03;
            else if (D_f <= 63.50) beddingThick = 2.79;
            else beddingThick = 3.56;
        } else if (mode === "NEMA_ICEA") {
            if (D_f <= 11.43) beddingThick = 0.76;
            else if (D_f <= 25.40) beddingThick = 1.14;
            else if (D_f <= 63.50) beddingThick = 1.65;
            else beddingThick = 2.03;
        }
    }

    const t_bedding = document.getElementById("thick_bedding");
    if (t_bedding) {
        t_bedding.value = beddingThick > 0 ? formatThicknessForRule(mode, beddingThick) : (formatThicknessForRule(mode, 0));
    }

    let D_g = D_f + 2 * beddingThick;

    // 4. 아머 두께 산출
    armourThick = getArmourThicknessByStandard(mode, armourType, D_g);

    const t_armour = document.getElementById("thick_armour");
    if (t_armour) {
        t_armour.value = armourThick > 0 ? formatThicknessForRule(mode, armourThick) : formatThicknessForRule(mode, 0);
    }

    let D_u = D_g + 2 * armourThick;
    
    // 5. 시스 두께 산출
    if (mode.includes("IEC")) {
        if (beddingType !== "미적용" && beddingDivision === "Inner Sheath" && armourType === "미적용") {
            sheathThick = Math.max(1.0, 0.025 * D_u + 0.9);
        } else if (beddingType !== "미적용" && beddingDivision === "Inner Sheath" && armourType !== "미적용") {
            sheathThick = Math.max(0.8, 0.025 * D_u + 0.6);
        } else {
            sheathThick = Math.max(1.0, 0.04 * D_u + 0.8);
        }
    } else if (mode === "IEEE_1580") {
        if (D_u <= 10.16) sheathThick = 1.14;
        else if (D_u <= 25.40) sheathThick = 1.52;
        else if (D_u <= 38.10) sheathThick = 2.03;
        else if (D_u <= 50.80) sheathThick = 2.39;
        else sheathThick = 2.77;
    } else if (mode === "NEMA_ICEA") {
        const dUsInch = D_u / 25.4;
        if (dUsInch <= 0.425) sheathThick = 1.14;
        else if (dUsInch <= 0.700) sheathThick = 1.52;
        else if (dUsInch <= 1.500) sheathThick = 2.03;
        else if (dUsInch <= 2.500) sheathThick = 2.79;
        else sheathThick = 3.56;
    }

    const t_sheath = document.getElementById("thick_sheath");
    if (t_sheath) {
        const sm = document.getElementById('sheath_material')?.value || '';
        t_sheath.value = (sm === '미적용') ? '0' : formatThicknessForRule(mode, sheathThick);
    }
}

// ==================== [B] 고정밀 대개혁 자재량 연산 공식 수혈 이식 완료 ====================

let calculatedResultsCache = []; 


// 사용자 요청 기준 자재 로스율 기본값 정책
function getDefaultMaterialLossRate(row) {
    const proc = String(row?.process || '');
    const mat = String(row?.material || '');
    if (proc.includes('도체') || proc.includes('D/W') || proc.includes('접지선') || mat.includes('소선') || mat.includes('D/W')) return 5;
    if (proc.includes('절연') || proc.includes('베딩') || proc.includes('시스') || proc.includes('내도') || proc.includes('외도')) return 25;
    return 10;
}
function applyDefaultMaterialLossPolicy(results) {
    (results || []).forEach(r => {
        r.loss = getDefaultMaterialLossRate(r);
        if (String(r.process||'').includes('도체') || String(r.process||'').includes('D/W') || String(r.process||'').includes('접지선')) {
            r.lossEditable = true;
        }
    });
    return results;
}


function runCableDesignCalculation() {
    try {
        if (!window.LSSharedMaterialEngine || typeof window.LSSharedMaterialEngine.calculate !== 'function') {
            throw new Error('공통 자재량 계산 엔진을 찾을 수 없습니다.');
        }
        const cfg = window.LSSharedMaterialEngine.collectConfigFromDom();
        const rule = String(cfg.thickness_rule_mode || cfg.thickness_std || 'MANUAL').toUpperCase();

        let result;
        // 사양서 부표와 동일한 공통 경로로 자동 두께를 먼저 확정한다.
        // 기존에는 메인 자재량 표는 DOM 두께값, 사양서 부표는 내부 자동두께값을 사용해
        // 두께 → OD → 자재량 → 재료비가 서로 달라질 수 있었다.
        if (rule !== 'MANUAL' && typeof window.LSSharedMaterialEngine.calculateSpecRow === 'function') {
            const sizeSel = document.getElementById('cond_size');
            const opt = sizeSel && sizeSel.options ? sizeSel.options[sizeSel.selectedIndex] : null;
            const item = opt ? {
                nominalArea: parseFloat(opt.dataset?.nominalArea || cfg.cond_size),
                sizeText: opt.textContent || cfg.cond_size,
                size: opt.value || cfg.cond_size,
                class2OD: parseFloat(opt.dataset?.class2od || opt.dataset?.class2OD || ''),
                weight: parseFloat(opt.dataset?.weight || '')
            } : null;

            const specRow = window.LSSharedMaterialEngine.calculateSpecRow(cfg, parseInt(cfg.core_num, 10) || 1, item);
            result = {
                rows: specRow.__rows || [],
                totalCost: specRow.totalCostKm || 0,
                totalWeight: specRow.weight || 0,
                finalOD: parseFloat(specRow.overallOD) || 0,
                config: cfg
            };

            const setVal = (id, v) => {
                const el = document.getElementById(id);
                if (el && Number.isFinite(Number(v))) el.value = String(v);
            };
            setVal('thick_insu', specRow.insuThick);
            setVal('thick_bedding', specRow.beddingThick);
            setVal('thick_armour', specRow.armorVal);
            setVal('thick_sheath', specRow.sheathThick);
        } else {
            result = window.LSSharedMaterialEngine.calculate(cfg);
        }

        calculatedResultsCache = result.rows || [];
        renderCalculatedTableDOM();
        return result;
    } catch (err) {
        console.error("자재 원가 산정 공통 엔진 연산 중 예외:", err);
        alert("자재량 계산 중 오류가 발생했습니다: " + (err && err.message ? err.message : err));
    }
}


function isIecOrEnMaterialRule() {
    const mode = document.getElementById("thickness_rule_mode")?.value || "";
    return ["IEC_60092","IEC_60502","EN_50264_3_1"].includes(mode) || mode.startsWith("IEC_60092") || mode.startsWith("IEC_60502") || mode.startsWith("EN_");
}
function fmtMainThick(v) {
    if (v === "-" || v === "" || v === undefined || v === null) return "-";
    const n = parseFloat(v);
    if (!isFinite(n)) return String(v);
    return isIecOrEnMaterialRule() ? n.toFixed(1) : n.toFixed(2);
}
function fmtMainOD(v, withUnit) {
    if (v === "-" || v === "" || v === undefined || v === null) return "-";
    const n = parseFloat(v);
    if (!isFinite(n)) return String(v);
    return n.toFixed(1) + (withUnit ? " mm" : "");
}
function fmtMainInt(v, suffix) {
    const n = parseFloat(String(v ?? "").replace(/,/g,""));
    if (!isFinite(n)) return "-";
    return Math.round(n).toLocaleString() + (suffix || "");
}
function fmtMainPrice(v) {
    const n = parseFloat(String(v ?? "").replace(/,/g,""));
    if (!isFinite(n)) return v ?? "";
    return Math.round(n).toLocaleString();
}

function mainNonNegative(v, fallback = 0) {
    const n = parseFloat(String(v ?? '').replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}
function mainPositiveInteger(v, fallback = 1) {
    return Math.max(1, Math.round(mainNonNegative(v, fallback)));
}
function getMainRowCost(row) {
    const weight = mainNonNegative(row?.weight, 0);
    const unitPrice = mainNonNegative(row?.unitPrice, 0);
    const loss = mainNonNegative(row?.loss, 0);
    const cost = Math.round((weight * unitPrice * (1 + loss / 100)) / 1000);
    return Number.isFinite(cost) && cost >= 0 ? cost : 0;
}

function renderCalculatedTableDOM() {
    const tbody = document.getElementById('resultTableBody');
    const tfoot = document.getElementById('tableHeaderTotalRow'); 
    if (!tbody || !tfoot) return;
    tbody.innerHTML = '';

    let totalCost = 0;
    calculatedResultsCache.forEach((r, idx) => {
        let rowCost = getMainRowCost(r);
        r.cost = rowCost;
        totalCost += rowCost;

        const thickInput = (r.thick !== "-" && r.isEditable) ? 
            `<input type="number" step="0.01" class="table-edit-input" data-idx="${idx}" data-field="thick" value="${r.thick}" oninput="syncTableEditValues(${idx})">` : r.thick;
        
        const densityInput = (r.isEditable) ? 
            `<input type="number" step="0.01" class="table-edit-input" data-idx="${idx}" data-field="density" value="${r.density}" oninput="syncTableEditValues(${idx})">` : r.density;

        const priceInput = (r.isEditable) ? 
            `<input type="number" class="table-edit-input" data-idx="${idx}" data-field="unitPrice" value="${r.unitPrice}" oninput="syncTableEditValues(${idx})">` : r.unitPrice;

        const lossInput = (r.isEditable || r.lossEditable) ? 
            `<input type="number" class="table-edit-input" data-idx="${idx}" data-field="loss" value="${r.loss}" oninput="syncTableEditValues(${idx})">` : r.loss;

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.process}</td>
            <td>${r.material}</td>
            <td style="text-align:right;">${thickInput}</td>
            <td id="table_od_${idx}" style="text-align:right;">${fmtMainOD(r.od, false)}</td>
            <td id="table_area_${idx}" style="text-align:right;">${r.area !== '-' ? fmtMainInt(r.area) : '-'}</td>
            <td id="table_layup_${idx}" style="text-align:right; color:#2563eb; font-weight:800;">${(parseFloat(r.layupRate)||0) > 0 ? (parseFloat(r.layupRate).toFixed(0) + '%') : '-'}</td>
            <td style="text-align:right;">${densityInput}</td>
            <td id="table_weight_${idx}" style="text-align:right;">${fmtMainInt(r.weight)}</td>
            <td style="text-align:right;">${priceInput}</td>
            <td style="text-align:right;">${lossInput}%</td>
            <td id="table_cost_${idx}" style="text-align:right; font-weight:800; font-size:10.5px !important;">${rowCost.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });

    const totalWeight = calculatedResultsCache.reduce((sum, r) => sum + mainNonNegative(r.weight, 0), 0);
    tfoot.innerHTML = `
        <td colspan="3" style="background-color: #e5e7eb !important; color: #111827 !important; font-size: 10px !important; text-align: center; border-bottom: 2px solid #9ca3af; font-weight: 900;">O.D: <span id="table_final_od_val" style="color: #111827 !important; font-weight: 900;">${fmtMainOD(calculatedResultsCache[calculatedResultsCache.length - 1].od, true)}</span></td>
        <td colspan="4" style="background-color: #e5e7eb !important; color: #111827 !important; font-size: 10px !important; text-align: center; border-bottom: 2px solid #9ca3af; font-weight: 900;">자재량 합계: <span id="table_final_weight_val">${fmtMainInt(totalWeight, ' kg/km')}</span></td>
        <td colspan="2" style="background-color: #e5e7eb !important; color: #111827 !important; font-size: 10px !important; text-align: center; border-bottom: 2px solid #9ca3af; font-weight: 900;">재료비 합계:</td>
        <td colspan="2" style="background-color: #e5e7eb !important; color: #b91c1c !important; font-size: 10.5px !important; text-align: right; font-weight: 900; padding-right: 12px !important; border-bottom: 2px solid #9ca3af;" id="table_final_cost_val">${totalCost.toLocaleString()} 원/m</td>
    `;
}

function syncTableEditValues(idx) {
    const table = document.getElementById("cableCalcTable");
    if (!table) return;

    const row = calculatedResultsCache[idx];
    if (!row) return;
    const inputs = table.rows[idx + 2].querySelectorAll(".table-edit-input"); 
    
    inputs.forEach(ipt => {
        const field = ipt.getAttribute("data-field");
        row[field] = parseFloat(String(ipt.value).replace(/,/g, "")) || 0;
    });

    ['thick', 'density', 'unitPrice', 'loss'].forEach(field => {
        if (Object.prototype.hasOwnProperty.call(row, field)) row[field] = mainNonNegative(row[field], 0);
    });
    let runningOD = (idx === 0) ? mainNonNegative(row.od, 0) : mainNonNegative(calculatedResultsCache[idx - 1]?.od, 0);
    const core_num = mainPositiveInteger(document.getElementById('core_num')?.value, 3);

    for (let i = idx; i < calculatedResultsCache.length; i++) {
        let r = calculatedResultsCache[i];
        if (i === 0) continue; 

        if (r.process.includes("테이프") || r.process.includes("세퍼레이터") || r.process.includes("바인더")) {
            let thick = parseFloat(r.thick) || 0.05;
            let weight = Math.PI * runningOD * thick * parseFloat(r.density) * (r.process.includes("연합") ? 1.0 : core_num);
            runningOD += (thick * 2);
            r.od = runningOD.toFixed(2);
            r.weight = weight.toFixed(2);
        }
        else if (r.process.includes("공정") || r.process.includes("내도") || r.process.includes("외도")) {
            let thick = parseFloat(r.thick) || 0.8;
            let area = Math.PI * (runningOD + thick) * thick;
            let multiplier = (r.process.includes("베딩") || r.process.includes("외장") || r.process.includes("시스")) ? 1.0 : core_num;
            let weight = area * parseFloat(r.density) * multiplier;
            runningOD += (thick * 2);
            r.od = runningOD.toFixed(2);
            r.area = area.toFixed(2);
            r.weight = weight.toFixed(2);
        }
        else if (r.process.includes("연합")) {
            let k = mainNonNegative(r.cablingFactor, 0);
            if (k <= 0) {
                k = 3.45;
                if (core_num === 1) k = 1.0;
                else if (core_num === 2) k = 2.0;
                else if (core_num === 3) k = 2.155;
                else if (core_num === 4) k = 2.414;
                else if (core_num === 5) k = 2.7;
                else if (core_num === 7) k = 3.0;
            }

            let cabling_od = runningOD * k;
            let cabling_circle_area = (Math.PI * Math.pow(cabling_od, 2)) / 4;
            let single_core_area = (Math.PI * Math.pow(runningOD, 2)) / 4;
            let total_cores_area = single_core_area * mainNonNegative(r.cablingOccupancyMultiplier, core_num);
            let filler_area = Math.max(0, cabling_circle_area - total_cores_area);
            
            let filler_weight = filler_area * mainNonNegative(r.density, 0);
            runningOD = cabling_od;
            r.od = runningOD.toFixed(2);
            r.area = filler_area.toFixed(2);
            r.weight = filler_weight.toFixed(2);
        }
        else if (r.process.includes("D/W")) {
            r.od = "-";
            r.area = "-";
        }

        const odEl = document.getElementById(`table_od_${i}`);
        const areaEl = document.getElementById(`table_area_${i}`);
        const weightEl = document.getElementById(`table_weight_${i}`);
        const costEl = document.getElementById(`table_cost_${i}`);

        if (odEl) odEl.textContent = fmtMainOD(r.od, false);
        if (areaEl) areaEl.textContent = r.area !== '-' ? fmtMainInt(r.area) : '-';
        if (weightEl) weightEl.textContent = fmtMainInt(r.weight);
        
        let rowCost = getMainRowCost(r);
        r.cost = rowCost;
        if (costEl) costEl.textContent = rowCost.toLocaleString();
    }

    calculatedResultsCache.forEach(r => { r.cost = getMainRowCost(r); });
    let totalCost = 0;
    calculatedResultsCache.forEach(r => totalCost += r.cost);
    const finalOdEl = document.getElementById("table_final_od_val");
    const finalCostEl = document.getElementById("table_final_cost_val");
    const finalWeightEl = document.getElementById("table_final_weight_val");
    const totalWeight = calculatedResultsCache.reduce((sum, r) => sum + mainNonNegative(r.weight, 0), 0);
    if (finalOdEl) finalOdEl.textContent = fmtMainOD(calculatedResultsCache[calculatedResultsCache.length - 1].od, true);
    if (finalWeightEl) finalWeightEl.textContent = fmtMainInt(totalWeight, " kg/km");
    if (finalCostEl) finalCostEl.textContent = totalCost.toLocaleString() + " 원/m";
}

// ==========================================
// SVG 드로잉 및 렌더링 물리 계산 엔진 영역
// ==========================================

function getScreenColorNew(material, type) {
    if (!type || type === '미적용') return 'none';
    if (material === 'AL/Mylar') return '#7dd3fc'; 
    if (material === 'CU/Mylar' || material.includes('구리') || material.includes('동')) return COPPER_CORE_HEX; 
    if (material === '면사') return '#ffffff'; 
    if (material === '납') return '#475569'; 
    return '#7dd3fc';
}

function drawPatternLayer(cx, cy, rCenter, thick, type, material, color) {
    if (type === 'none' || type === '미적용' || rCenter <= 0) return;
    const group = document.getElementById('mainGroup') || document.getElementById('cableSvg');
    if (type.includes('편조') || type.includes('Braid')) {
        let cnt = Math.floor(2 * Math.PI * rCenter / 5);
        if(cnt < 24) cnt = 24;
        for(let i=0; i<cnt; i++) {
            let a1 = (i / cnt) * 2 * Math.PI;
            let a2 = ((i + 0.5) / cnt) * 2 * Math.PI;
            let x1_in = cx + (rCenter - thick*0.5) * Math.cos(a1);
            let y1_in = cy + (rCenter - thick*0.5) * Math.sin(a1);
            let x1_out = cx + (rCenter + thick*0.5) * Math.cos(a2);
            let y1_out = cy + (rCenter + thick*0.5) * Math.sin(a2);
            if (material === '면사') {
                addLine(x1_in, y1_in, x1_out, y1_out, '#cbd5e1', 2.2);
                addLine(x1_in, y1_in, x1_out, y1_out, '#ffffff', 1.0);
            } else {
                addLine(x1_in, y1_in, x1_out, y1_out, color, 1.2);
            }
            let x2_in = cx + (rCenter - thick*0.5) * Math.cos(a2);
            let y2_in = cy + (rCenter - thick*0.5) * Math.sin(a2);
            let x2_out = cx + (rCenter + thick*0.5) * Math.cos(a1);
            let y2_out = cy + (rCenter + thick*0.5) * Math.sin(a1);
            if (material === '면사') {
                addLine(x2_in, y2_in, x2_out, y2_out, '#cbd5e1', 2.2);
                addLine(x2_in, y2_in, x2_out, y2_out, '#ffffff', 1.0);
            } else {
                addLine(x2_in, y2_in, x2_out, y2_out, color, 1.2);
            }
        }
    } else if (type.includes('횡권') || type.includes('Serve')) {
        let pR = thick * 0.45; 
        let circ = 2 * Math.PI * rCenter;
        let cnt = Math.floor(circ / (pR * 1.9)); 
        for(let i=0; i<cnt; i++) {
            let a = (i / cnt) * 2 * Math.PI;
            addCircle(cx + rCenter * Math.cos(a), cy + rCenter * Math.sin(a), pR, color, '#475569', 0.5);
        }
    } else {
        addCircle(cx, cy, rCenter, 'none', color, thick);
    }
}

function addCircle(cx, cy, r, fill, stroke, strokeWidth, dashArray) {
    if (r <= 0) return;
    const group = document.getElementById('mainGroup') || document.getElementById('cableSvg');
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", r);
    c.setAttribute("fill", fill || 'none');
    c.setAttribute("stroke", stroke || 'none');
    if (strokeWidth) c.setAttribute("stroke-width", strokeWidth);
    if (dashArray) c.setAttribute("stroke-dasharray", dashArray);
    group.appendChild(c);
}

function addLine(x1, y1, x2, y2, stroke, width) {
    const group = document.getElementById('mainGroup') || document.getElementById('cableSvg');
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", x1);
    l.setAttribute("y1", y1);
    l.setAttribute("x2", x2);
    l.setAttribute("y2", y2);
    l.setAttribute("stroke", stroke);
    l.setAttribute("stroke-width", width);
    group.appendChild(l);
}

function addRect(x, y, w, h, fill, stroke, strokeWidth, rx) {
    const group = document.getElementById('mainGroup') || document.getElementById('cableSvg');
    const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    r.setAttribute("x", x);
    r.setAttribute("y", y);
    r.setAttribute("width", w);
    r.setAttribute("height", h);
    r.setAttribute("fill", fill || 'none');
    r.setAttribute("stroke", stroke || 'none');
    if (strokeWidth) r.setAttribute("stroke-width", strokeWidth);
    if (rx) r.setAttribute("rx", rx);
    group.appendChild(r);
}

function addSvgText(x, y, text, fontSize, fill, anchor, weight) {
    const group = document.getElementById('mainGroup') || document.getElementById('cableSvg');
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("fill", fill || '#000000');
    t.setAttribute("font-size", fontSize || 12);
    if (anchor) t.setAttribute("text-anchor", anchor);
    if (weight) t.setAttribute("font-weight", weight);
    t.textContent = text;
    group.appendChild(t);
}

function drawSyncedGroundConductor(cx, cy, sRCond, condClass, condMat) {
    const finalStrandColor = (condMat === 'aluminum') ? '#cbd5e1' : '#b87333';
    if (condClass === 'SOLID') {
        addCircle(cx, cy, sRCond, finalStrandColor, '#475569', 0.5);
    } else if (condClass === '연선') {
        let subR = sRCond / 3;
        addCircle(cx, cy, subR * 1.02, finalStrandColor, '#475569', 0.3);
        for (let i = 0; i < 6; i++) {
            let a = i * (2 * Math.PI / 6);
            addCircle(cx + (subR * 1.95) * Math.cos(a), cy + (subR * 1.95) * Math.sin(a), subR, finalStrandColor, '#475569', 0.3);
        }
    } else if (condClass === '집합') {
        const bunchSubR = sRCond / 10;
        addCircle(cx, cy, bunchSubR * 0.9, finalStrandColor, '#475569', 0.2);
        let dist = bunchSubR * 2;
        let radiusLimit = sRCond - bunchSubR;
        while (dist < radiusLimit) {
            let circumference = 2 * Math.PI * dist;
            let bunchCount = Math.floor(circumference / (bunchSubR * 2));
            for (let i = 0; i < bunchCount; i++) {
                let angle = (i / bunchCount) * 2 * Math.PI;
                addCircle(cx + dist * Math.cos(angle), cy + dist * Math.sin(angle), bunchSubR * 0.9, finalStrandColor, '#475569', 0.2);
            }
            dist += bunchSubR * 2;
        }
    } else if (condClass === '집/복합') {
        let subR_base = sRCond / 4.5;
        for (let i = 0; i < 7; i++) {
            let angle = (i === 0) ? 0 : (i - 1) * (2 * Math.PI / 6);
            let dist = (i === 0) ? 0 : sRCond * 0.55;
            let bX_sub = cx + dist * Math.cos(angle); 
            let bY_sub = cy + dist * Math.sin(angle); 
            addCircle(bX_sub, bY_sub, subR_base * 0.45, finalStrandColor, 'none');
            for (let j = 0; j < 6; j++) {
                let a = j * (2 * Math.PI / 6);
                addCircle(bX_sub + (subR_base * 0.8) * Math.cos(a), bY_sub + (subR_base * 0.8) * Math.sin(a), subR_base * 0.4, finalStrandColor, 'none');
            }
        }
    }
}

function drawDrainWire(cx, cy, rStrandScaled) {
    let subR = rStrandScaled; 
    addCircle(cx, cy, subR * 0.98, COPPER_CORE_HEX, '#475569', 0.5); 
    for (let i = 0; i < 6; i++) {
        let a = i * 60 * Math.PI / 180;
        addCircle(cx + (subR * 2.0) * Math.cos(a), cy + (subR * 2.0) * Math.sin(a), subR * 0.98, COPPER_CORE_HEX, '#475569', 0.5);
    }
}

function calculateAndDraw() {
    handleArmorLabelUpdate();
    
    const beddingType_init = document.getElementById("bedding_type")?.value || "미적용";
    const beddingDiv_init = document.getElementById("bedding_division");
    if (beddingDiv_init) {
        beddingDiv_init.disabled = (beddingType_init !== "압출형");
    }
    
    const thicknessStdMode = document.getElementById("thickness_rule_mode")?.value || "MANUAL";
    if (thicknessStdMode !== "MANUAL") {
        applyAutomaticThicknesses();
    }
    // 단면도 계산 전에 9번 연합 배열/K값을 메인 조건 기준으로 항상 최신화한다.
    try { if (typeof syncArrayTableToUI === "function") syncArrayTableToUI(); } catch(e) { console.warn("syncArrayTableToUI failed", e); }

    const svg = document.getElementById('cableSvg');
    if (!svg) return;
    svg.innerHTML = '<g id="mainGroup"></g>';

    const volt = document.getElementById('v_rating').value;
    const coreType = document.getElementById('core_type').value;
    let coreNum = parseInt(document.getElementById('core_num').value) || 1;
    const condClass = document.getElementById('cond_class').value;
    const condMat = document.getElementById('cond_material').value; 

    const insuMaterial = document.getElementById('insu_material').value;
    const fillerMaterial = document.getElementById('filler_material').value;
    const beddingMaterial = document.getElementById('bedding_material').value;
    const sheathMaterial = document.getElementById('sheath_material').value;

    const condSizeSelect = document.getElementById('cond_size');
    if (!condSizeSelect) return;
    const condSize = condSizeSelect.value;
    const condSizeText = condSizeSelect.options[condSizeSelect.selectedIndex]?.text || '';
    const selectedOpt = condSizeSelect.options[condSizeSelect.selectedIndex];
    
    let nominalArea = 0, actualOD = 5.10; 
    if (selectedOpt) {
        actualOD = parseFloat(selectedOpt.dataset.class2od) || 5.10;
        nominalArea = parseFloat(selectedOpt.dataset.nominalArea) || 0;
    }

    const hasGround = (document.getElementById('has_ground').value === '적용') && (coreType === 'CORE') && (coreNum >= 2 && coreNum <= 5);
    let numGround = hasGround ? (parseInt(document.getElementById('num_ground').value) || 1) : 1;
    let tGround_mm = parseFloat(document.getElementById('thick_ground_insu').value) || 0.8;

    const tapeMica = document.getElementById('tape_mica').value;
    const tapeSep = document.getElementById('tape_sep').value;
    const tapeSemi = document.getElementById('tape_semi').value;
    const indSeparator = document.getElementById('ind_separator').value;
    const indShieldMaterial = document.getElementById('ind_shield_material').value;
    const indShieldType = document.getElementById('ind_shield_type').value;
    const indScreenTape = document.getElementById('ind_screen_tape').value; 
    const ovShieldMaterial = document.getElementById('ov_shield_material').value;
    const ovShieldType = document.getElementById('ov_shield_type').value;
    const armourMaterial = document.getElementById('armour_material_new').value; 
    const armourType = document.getElementById('armour_type_new').value;
    const beddingType = document.getElementById('bedding_type').value;
    const binderTape = document.getElementById('binder_tape').value;

    const inputThickInnerSemi = parseFloat(document.getElementById('thick_inner_semi').value) || 0.4;
    const inputThickInsu = parseFloat(document.getElementById('thick_insu').value) || 0.8;
    const inputThickOuterSemi = parseFloat(document.getElementById('thick_outer_semi').value) || 0.6;
    const inputThickBedding = parseFloat(document.getElementById('thick_bedding').value) || 1.2;
    const inputThickArmour = parseFloat(document.getElementById('thick_armour').value) || 1.0;
    let inputThickSheath = parseFloat(document.getElementById('thick_sheath').value); if (isNaN(inputThickSheath)) inputThickSheath = 1.6; if ((document.getElementById('sheath_material')?.value || '') === '미적용') inputThickSheath = 0;
    const tapeInsuAbove = document.getElementById('tape_insu_above').value;

    let rCond_mm = actualOD / 2; 
    let tMica_mm = (tapeMica === '적용') ? getSharedLayerSpec('tape','마이카','Tape').thickness : 0;
    let tSep_mm = (tapeSep !== '미적용') ? getSharedLayerSpec('tape',tapeSep,'Tape').thickness : 0;
    let tTapeSemi_mm = (tapeSemi !== '미적용') ? getSharedLayerSpec('tape',tapeSemi,'Tape').thickness : 0;
    let tInsuAbove_mm = (tapeInsuAbove !== '미적용') ? getSharedLayerSpec('tape',tapeInsuAbove,'Tape').thickness : 0;
    let tInnerSemi_mm = (document.getElementById('inner_semi').value === '적용') ? inputThickInnerSemi : 0;
    let tOuterSemi_mm = (document.getElementById('outer_semi').value === '적용') ? inputThickOuterSemi : 0;
    let tInsu_mm = inputThickInsu; 

    let rCoreBase_mm = rCond_mm + tTapeSemi_mm + tMica_mm + tSep_mm + tInnerSemi_mm + tInsu_mm + tOuterSemi_mm + tInsuAbove_mm;
    let tIndSep_mm = (indSeparator !== '미적용') ? getSharedLayerSpec('tape',indSeparator,'Tape').thickness : 0;
    let tIndScreen_mm = (indShieldType !== '미적용')
        ? getSharedLayerSpec('shield',indShieldMaterial,indShieldType,{thickness:(indShieldMaterial==='납')?(parseFloat(document.getElementById('thick_lead_shield').value)||1.0):undefined}).thickness : 0;
    let tIndScreenTape_mm = (indScreenTape !== '미적용') ? getSharedLayerSpec('tape',indScreenTape,'Tape').thickness : 0;

    let perBundle = (coreType==='PAIR')?2 : (coreType==='TRIAD')?3 : (coreType==='QUAD')?4 : 1;
    let bundleCoreOffsets = [];
    let rBundle_mm = 0;

    if (perBundle === 1) {
        bundleCoreOffsets.push({dx: 0, dy: 0});
        rBundle_mm = rCoreBase_mm; 
    } else {
        let rCoreBase_sc = rCoreBase_mm * 12;
        if (perBundle === 2) {
            let setDist = rCoreBase_sc * 2.05; 
            bundleCoreOffsets.push({dx: -setDist * 0.5, dy: 0}, {dx: setDist * 0.5, dy: 0});
            rBundle_mm = (setDist * 0.5 + rCoreBase_sc) / 12;
        } else if (perBundle === 3) {
            let distToCenter = rCoreBase_sc / Math.sin(Math.PI / 3) * 1.05;
            for(let k=0; k<3; k++) {
                let ang = (k * 120 - 30) * Math.PI / 180;
                bundleCoreOffsets.push({dx: distToCenter * Math.cos(ang), dy: distToCenter * Math.sin(ang)});
            }
            rBundle_mm = (distToCenter + rCoreBase_sc) / 12;
        } else if (perBundle === 4) {
            let distToCenter = rCoreBase_sc / Math.sin(Math.PI / 4) * 1.05;
            for(let k=0; k<4; k++) {
                let ang = (k * 90 - 45) * Math.PI / 180;
                bundleCoreOffsets.push({dx: distToCenter * Math.cos(ang), dy: distToCenter * Math.sin(ang)});
            }
            rBundle_mm = (distToCenter + rCoreBase_sc) / 12;
        }
    }

    let rSeparatorOuter_mm = rBundle_mm + tIndSep_mm;
    let rShieldOuter_mm = rSeparatorOuter_mm + tIndScreen_mm;
    let rShieldTapeOuter_mm = rShieldOuter_mm + tIndScreenTape_mm;
    let rFinalBundle_mm = rShieldTapeOuter_mm;

    let rGroundCond_mm = rCond_mm;
    let rGroundCoreBase_mm = rCoreBase_mm;
    let gInsuColor = document.getElementById('ground_insu_color').value;

    if (hasGround) {
        if (nominalArea > 16) {
            let ground_size = getGroundConductorSize(nominalArea, numGround);
            rGroundCond_mm = getConductorODForSize(ground_size) / 2;
        }
        rGroundCoreBase_mm = (gInsuColor === 'none') ? rGroundCond_mm : rGroundCond_mm + tGround_mm;
    }

    let layoutData = getStandardLayoutPositions(rFinalBundle_mm * 12, hasGround, coreNum, numGround, rGroundCoreBase_mm * 12);
    let rAssemblyOuter_mm = layoutData.maxCoreBoundary / 12;

    // LS 연합표준 6케이스 기준 최종 연합외경을 단면도에도 직접 반영한다.
    // CASE 1/2/4: 6번 완료 외경 기준, CASE 3/5/6: 각대차폐 시 7번 완료 외경, 아니면 대연후 외경 기준.
    try {
        const ls = resolveLsCablingStandard({ coreType: coreType, count: coreNum, sheathMethod: document.getElementById('cabling_sheath_method')?.value || 'GENERAL_EXTRUDED' });
        const odAfterStep6 = rCoreBase_mm * 2;
        const odAfterStep7 = rShieldOuter_mm * 2;
        const twistedUnitOd = (coreType === 'PAIR') ? odAfterStep6 * 2.000 : (coreType === 'TRIAD') ? odAfterStep6 * 2.155 : (coreType === 'QUAD') ? odAfterStep6 * 2.414 : odAfterStep6;
        let baseOd = odAfterStep6;
        if (['CASE_3_GENERAL_CORE_TABLE_095','CASE_5_PAIR_INDIVIDUAL_CCV','CASE_6_TRIAD_QUAD_CCV'].includes(ls.caseId)) {
            baseOd = (ls.shieldKind === 'INDIVIDUAL') ? odAfterStep7 : twistedUnitOd;
        }
        const standardAssemblyOd = baseOd * (Number(ls.k) || 1);
        if (standardAssemblyOd > 0) {
            rAssemblyOuter_mm = standardAssemblyOd / 2;
            window.lastCalculatedAutoAssemblyOD = standardAssemblyOd.toFixed(1);
            window.lastLsCablingCase = ls.caseId;
            window.lastLsCablingK = ls.k;
        }
    } catch(e) { console.warn("LS cabling OD override failed", e); }

    // [수정사항 2] 사양서부표 상속 처리를 위해 순수 자동 계산 연합외경을 무조건 전역 변수에 실시간 백업
    window.lastCalculatedAutoAssemblyOD = (rAssemblyOuter_mm * 2).toFixed(1);

    if (hasGround && document.getElementById('cabling_od_mode').value === 'MANUAL') {
        let manual_od = parseFloat(document.getElementById('manual_cabling_od').value);
        if (!isNaN(manual_od) && manual_od > 0) rAssemblyOuter_mm = manual_od / 2;
    }

    let tBinder_mm = (binderTape !== '미적용') ? getSharedLayerSpec('tape',binderTape,'Tape').thickness : 0;
    let tOvScreen_mm = (ovShieldType !== '미적용')
        ? getSharedLayerSpec('shield',ovShieldMaterial,ovShieldType,{thickness:(ovShieldMaterial==='납')?(parseFloat(document.getElementById('thick_ov_lead_shield')?.value)||1.0):undefined}).thickness : 0;
    let tBedding_mm = (beddingType !== '미적용') ? inputThickBedding : 0;
    
    let tArmour_mm = 0;
    if (armourType !== '미적용') {
        if (armourType === "SWA/AWA (횡권)" || armourType === "편조 (Braid)") {
            tArmour_mm = inputThickArmour; 
        } else {
            tArmour_mm = inputThickArmour;
        }
    }
    let tSheath_mm = inputThickSheath;

    let rBinderOuter_mm = rAssemblyOuter_mm + tBinder_mm;
    let rOvScreenOuter_mm = rBinderOuter_mm + tOvScreen_mm;
    let rBeddingOuter_mm = rOvScreenOuter_mm + tBedding_mm;
    let rArmourOuter_mm = rBeddingOuter_mm + tArmour_mm;
    let rSheathOuter_mm = rArmourOuter_mm + tSheath_mm;
    let rTotal_mm = rSheathOuter_mm;
    
    const showLabels = document.getElementById('show_labels')?.checked || false;
    
    if (showLabels) {
        svg.setAttribute("viewBox", "0 0 1250 750");
        svg.setAttribute("width", "1250");
        svg.setAttribute("height", "750");
    } else {
        svg.setAttribute("viewBox", "0 0 750 750");
        svg.setAttribute("width", "750");
        svg.setAttribute("height", "750");
    }
    
    const cx = showLabels ? 380 : 375;
    const cy = 375;
    let scaleFactor = 330 / rTotal_mm; 

    let drainWiresToDraw = [];
    let rightmostCoreX = -99999;
    let rightmostCoreY = cy;
    let rightmostCoreAngle = 0;
    let rightmostBundleX = -99999;
    let rightmostBundleY = cy;

    // SET(PAIR/TRIAD/QUAD) 구성에서는 1번 표식이 세트 중심이 아니라
    // 실제 1번 도체 중심을 가리키도록, 기준 좌표를 bundle 중심과 core 중심으로 분리한다.
    layoutData.positions.forEach((pos) => {
        if (!pos.isGround) {
            let bX = cx + ((pos.dx / 12) * scaleFactor) * Math.cos(pos.angle);
            let bY = cy + ((pos.dx / 12) * scaleFactor) * Math.sin(pos.angle);
            if (bX > rightmostBundleX) {
                rightmostBundleX = bX;
                rightmostBundleY = bY;
                rightmostCoreAngle = pos.angle;

                const firstOffset = (bundleCoreOffsets && bundleCoreOffsets.length) ? bundleCoreOffsets[0] : {dx:0, dy:0};
                const rotX = firstOffset.dx * Math.cos(pos.angle) - firstOffset.dy * Math.sin(pos.angle);
                const rotY = firstOffset.dx * Math.sin(pos.angle) + firstOffset.dy * Math.cos(pos.angle);
                rightmostCoreX = bX + (rotX / 12) * scaleFactor;
                rightmostCoreY = bY + (rotY / 12) * scaleFactor;
            }
        }
    });

    addCircle(cx, cy, rSheathOuter_mm * scaleFactor, selectedSheathColor, '#475569', 1.5);

    if (armourType !== '미적용') {
        let armColor = '#94a3b8'; 
        if (armourMaterial === '알루미늄') armColor = '#cbd5e1';
        else if (armourMaterial === '구리') armColor = COPPER_CORE_HEX;
        else if (armourMaterial === '철 (STA)') armColor = '#475569';
        else if (armourMaterial === '아라미드 얀') armColor = '#facc15'; 
        else if (armourMaterial === '폴리에스터 얀') armColor = '#e2e8f0';
        let rArmCenter_scaled = (rBeddingOuter_mm + tArmour_mm / 2) * scaleFactor;
        drawPatternLayer(cx, cy, rArmCenter_scaled, tArmour_mm * scaleFactor, armourType, armourMaterial, armColor);
    }

    if (beddingType !== '미적용') {
        let bedColor = selectedBeddingColor; 
        let bedStroke = (beddingType === 'LAPPED') ? '#94a3b8' : 'none';
        let bedDash = (beddingType === 'LAPPED') ? '4,4' : '';
        addCircle(cx, cy, rBeddingOuter_mm * scaleFactor, bedColor, bedStroke, 2.0, bedDash);
    }

    if (ovShieldType !== '미적용') {
        let scrColor = getScreenColorNew(ovShieldMaterial, ovShieldType);
        let rOvScreenCenter_scaled = (rBinderOuter_mm + tOvScreen_mm / 2) * scaleFactor;
        drawPatternLayer(cx, cy, rOvScreenCenter_scaled, tOvScreen_mm * scaleFactor, ovShieldType, ovShieldMaterial, scrColor);
    }

    if (binderTape !== '미적용') {
        let rBinderCenter_scaled = (rAssemblyOuter_mm + tBinder_mm / 2) * scaleFactor;
        addCircle(cx, cy, rBinderCenter_scaled, 'none', '#cbd5e1', tBinder_mm * scaleFactor);
    }

    addCircle(cx, cy, rAssemblyOuter_mm * scaleFactor, '#ffffff', 'none');

    if (layoutData.fillers) {
        layoutData.fillers.forEach(filler => {
            if (Math.abs(filler.dx) < 0.1 && Math.abs(filler.dy) < 0.1) return; 
            let fR = (filler.r / 12) * scaleFactor;
            addCircle(cx + (filler.dx / 12) * scaleFactor, cy + (filler.dy / 12) * scaleFactor, fR, 'none', '#cbd5e1', 1.0, '3,3');
        });
    }

    let mainCoreCounter = 0;      
    let groundCoreCounter = 0;    

    layoutData.positions.forEach((pos, bIdx) => {
        let bX = cx + ((pos.dx / 12) * scaleFactor) * Math.cos(pos.angle);
        let bY = cy + ((pos.dx / 12) * scaleFactor) * Math.sin(pos.angle);

        if (pos.isGround) {
            let sRCond = rGroundCond_mm * scaleFactor;
            let sRCore = rGroundCoreBase_mm * scaleFactor;
            if (gInsuColor !== 'none') {
                let fillHex = (gInsuColor === 'BK') ? '#1e293b' : '#22c55e'; 
                addCircle(bX, bY, sRCore, fillHex, '#cbd5e1', 0.5);
            }
            addCircle(bX, bY, sRCond, '#94a3b8', 'none');
            drawSyncedGroundConductor(bX, bY, sRCond, condClass, condMat);
            groundCoreCounter++; 
            return; 
        }

        if (coreType !== 'CORE' && indShieldType === '미적용') {
            addCircle(bX, bY, rBundle_mm * scaleFactor, 'none', '#64748b', 1.0, '3,3'); 
        }
        if (indSeparator !== '미적용') {
            let rCenter = (rBundle_mm + tIndSep_mm / 2) * scaleFactor;
            addCircle(bX, bY, rCenter, 'none', '#cbd5e1', tIndSep_mm * scaleFactor);
        }
        if (indShieldType !== '미적용') {
            let scrColor = getScreenColorNew(indShieldMaterial, indShieldType);
            let rCenter = (rSeparatorOuter_mm + tIndScreen_mm / 2) * scaleFactor;
            drawPatternLayer(bX, bY, rCenter, tIndScreen_mm * scaleFactor, indShieldType, indShieldMaterial, scrColor);
        }
        if (indScreenTape !== '미적용') {
            let visualColor = (indScreenTape === '반도전') ? '#1e293b' : '#cbd5e1'; 
            let rCenter = (rShieldOuter_mm + tIndScreenTape_mm / 2) * scaleFactor;
            addCircle(bX, bY, rCenter, 'none', visualColor, tIndScreenTape_mm * scaleFactor);
        }

        bundleCoreOffsets.forEach((offset, cIdx) => {
            let globalCoreIdx = mainCoreCounter; 
            mainCoreCounter++; 
            let radDiff = pos.angle;
            let rotX = offset.dx * Math.cos(radDiff) - offset.dy * Math.sin(radDiff);
            let rotY = offset.dx * Math.sin(radDiff) + offset.dy * Math.cos(radDiff);
            let sC_x = bX + (rotX / 12) * scaleFactor;
            let sC_y = bY + (rotY / 12) * scaleFactor;

            let sRCond = rCond_mm * scaleFactor;
            let currentBuildR_mm = rCoreBase_mm; 

            if (tapeInsuAbove !== '미적용') {
                let tapeInsuColor = (tapeInsuAbove === '반도전') ? '#1e293b' : '#cbd5e1';
                addCircle(sC_x, sC_y, (currentBuildR_mm - tInsuAbove_mm / 2) * scaleFactor, 'none', tapeInsuColor, tInsuAbove_mm * scaleFactor);
                currentBuildR_mm -= tInsuAbove_mm;
            }
            if(inputThickOuterSemi > 0 && document.getElementById('outer_semi').value === '적용') {
                addCircle(sC_x, sC_y, (currentBuildR_mm - inputThickOuterSemi / 2) * scaleFactor, 'none', '#000000', inputThickOuterSemi * scaleFactor);
                currentBuildR_mm -= inputThickOuterSemi;
            }
            const mvVoltages = ['3.6/6kV', '5KV', '6/10KV', '8.0KV', '8.7/15KV', '15KV', '12/20KV', '18/30KV', '25KV', '28KV', '35KV', '46KV', '66KV'];
            let colorIndex = globalCoreIdx;
            const syncAllColors = document.getElementById('sync_all_colors')?.checked;
            if (syncAllColors) {
                const ct = document.getElementById('core_type')?.value || 'CORE';
                const perBundle = (ct === 'PAIR') ? 2 : (ct === 'TRIAD') ? 3 : (ct === 'QUAD') ? 4 : 1;
                colorIndex = globalCoreIdx % perBundle;
            }
            let coreHex = mvVoltages.includes(volt) ? '#d4b59e' : (COLOR_HEX_MAP[selectedInsuColors[colorIndex]] || '#ffffff');
            addCircle(sC_x, sC_y, currentBuildR_mm * scaleFactor, coreHex, '#cbd5e1', 0.5);
            
            if(inputThickInnerSemi > 0 && document.getElementById('inner_semi').value === '적용') {
                addCircle(sC_x, sC_y, (currentBuildR_mm - inputThickInsu - inputThickInnerSemi / 2) * scaleFactor, 'none', '#000000', inputThickInnerSemi * scaleFactor);
            }
            let tapeBuildR_mm = rCond_mm; 
            if(tapeSemi !== '미적용') {
                tapeBuildR_mm += tTapeSemi_mm;
                addCircle(sC_x, sC_y, tapeBuildR_mm * scaleFactor, '#0f172a', '#4b5563', tTapeSemi_mm * scaleFactor);
            }
            if(tapeMica === '적용') {
                tapeBuildR_mm += tMica_mm;
                addCircle(sC_x, sC_y, tapeBuildR_mm * scaleFactor, 'none', '#6b7280', tMica_mm * scaleFactor); 
            }
            if(tapeSep !== '미적용') {
                tapeBuildR_mm += tSep_mm;
                addCircle(sC_x, sC_y, tapeBuildR_mm * scaleFactor, 'none', '#000000', tSep_mm * scaleFactor); 
                addCircle(sC_x, sC_y, (tapeBuildR_mm - tSep_mm * 0.15) * scaleFactor, 'none', '#ffffff', tSep_mm * 0.7 * scaleFactor); 
            }
            addCircle(sC_x, sC_y, sRCond, '#94a3b8', 'none'); 
            const finalStrandColor = (condMat === 'aluminum') ? '#cbd5e1' : '#b87333';
            // 내부 코어 번호 텍스트 제거: 대형 연선도체 뒤 숫자 비침 방지
            if (condClass === 'SOLID') {
                addCircle(sC_x, sC_y, sRCond, finalStrandColor, '#475569', 0.5);
            } else if (condClass === '연선') {
                let subR = sRCond / 3;
                addCircle(sC_x, sC_y, subR * 1.02, finalStrandColor, '#475569', 0.3);
                for (let i = 0; i < 6; i++) {
                    let a = i * (2 * Math.PI / 6);
                    addCircle(sC_x + (subR * 1.95) * Math.cos(a), sC_y + (subR * 1.95) * Math.sin(a), subR, finalStrandColor, '#475569', 0.3);
                }
            } else if (condClass === '집합') {
                const bunchSubR = sRCond / 10;
                addCircle(sC_x, sC_y, bunchSubR * 0.9, finalStrandColor, '#475569', 0.2);
                let dist = bunchSubR * 2;
                let radiusLimit = sRCond - bunchSubR;
                while (dist < radiusLimit) {
                    let circumference = 2 * Math.PI * dist;
                    let bunchCount2 = Math.floor(circumference / (bunchSubR * 2));
                    for (let i = 0; i < bunchCount2; i++) {
                        let angle = (i / bunchCount2) * 2 * Math.PI;
                        addCircle(sC_x + dist * Math.cos(angle), sC_y + dist * Math.sin(angle), bunchSubR * 0.9, finalStrandColor, '#475569', 0.2);
                    }
                    dist += bunchSubR * 2;
                }
            } else if (condClass === '집/복합') {
                let subR_base = sRCond / 4.5;
                for (let i = 0; i < 7; i++) {
                    let angle = (i === 0) ? 0 : (i - 1) * (2 * Math.PI / 6);
                    let dist = (i === 0) ? 0 : sRCond * 0.55;
                    let bX_sub = sC_x + dist * Math.cos(angle); 
                    let bY_sub = sC_y + dist * Math.sin(angle); 
                    addCircle(bX_sub, bY_sub, subR_base * 0.45, finalStrandColor, 'none');
                    for (let j = 0; j < 6; j++) {
                        let a = j * (2 * Math.PI / 6);
                        addCircle(bX_sub + (subR_base * 0.8) * Math.cos(a), bY_sub + (subR_base * 0.8) * Math.sin(a), subR_base * 0.4, finalStrandColor, 'none');
                    }
                }
            }
        });

        if (indShieldType !== 'none' && indShieldType !== '미적용' && indShieldType.includes('D/W')) {
            let indDwR_mm = 0.5 * rCond_mm; 
            let indDwStrandR_mm = indDwR_mm / 3;
            let dwX = bX;
            let dwY = bY;
            let tAngle = pos.angle + ((coreType === 'PAIR') ? (Math.PI / 2) : (coreType === 'TRIAD') ? (30 * Math.PI / 180) : 0);
            let dist_mm = rSeparatorOuter_mm - indDwR_mm; 
            dwX = bX + (dist_mm * scaleFactor) * Math.cos(tAngle);
            dwY = bY + (dist_mm * scaleFactor) * Math.sin(tAngle);
            drainWiresToDraw.push({ cx: dwX, cy: dwY, rStrand: indDwStrandR_mm * scaleFactor });
        }
    });

    if (ovShieldType !== '미적용' && ovShieldType.includes('D/W')) {
        let ovDwR_mm = 0.5 * rCond_mm; 
        let ovDwStrandR_mm = ovDwR_mm / 3;
        let dwDist_mm = rBinderOuter_mm - ovDwR_mm; 
        let effectiveCores = (hasGround && calculateGroundInsertType(coreNum, nominalArea, numGround) === 'symmetric_round') ? (coreNum + numGround) : coreNum;
        let ovDwAngle = (-90 + (180 / effectiveCores)) * Math.PI / 180; 
        let ovDwX = cx + (dwDist_mm * scaleFactor) * Math.cos(ovDwAngle);
        let ovDwY = cy + (dwDist_mm * scaleFactor) * Math.sin(ovDwAngle);
        drainWiresToDraw.push({ cx: ovDwX, cy: ovDwY, rStrand: ovDwStrandR_mm * scaleFactor });
    }
    drainWiresToDraw.forEach(dw => drawDrainWire(dw.cx, dw.cy, dw.rStrand));

    let tagStr = "";
    if (hasGround) {
        const groundInsertType = calculateGroundInsertType(coreNum, nominalArea, numGround);
        if (nominalArea <= 16 && groundInsertType === 'symmetric_round') {
            tagStr = `${volt} ${coreNum + numGround}C(대칭형) x ${condSizeText}`; 
        } else {
            let ground_size = getGroundConductorSize(nominalArea, numGround);
            tagStr = `${volt} ${coreNum}${coreType} x ${condSizeText} + ${numGround}G x ${ground_size}SQ`;
        }
    } else {
        tagStr = `${volt} ${coreNum}${coreType} x ${condSizeText}`;
    }
    document.getElementById('cableTagDisplay').innerText = tagStr.toUpperCase();

    if (showLabels) {
        let activeLayers = [];
        activeLayers.push({ type: 'cond', name: `Conductor (${condMat === 'aluminum' ? 'Aluminum' : 'Copper'})` });
        
        let r_ptr = rCond_mm;
        if (tapeSemi !== '미적용') {
            activeLayers.push({ type: 'core_ring', r: r_ptr + tTapeSemi_mm/2, name: `Semi-conductive Tape (${tapeSemi})` });
            r_ptr += tTapeSemi_mm;
        }
        if (tapeMica === '적용') {
            activeLayers.push({ type: 'core_ring', r: r_ptr + tMica_mm/2, name: 'Mica Fire Barrier Tape' });
            r_ptr += tMica_mm;
        }
        if (tapeSep !== '미적용') {
            activeLayers.push({ type: 'core_ring', r: r_ptr + tSep_mm/2, name: `Conductor Separator Tape (${tapeSep})` });
            r_ptr += tSep_mm;
        }
        if (document.getElementById('inner_semi').value === '적용') {
            activeLayers.push({ type: 'core_ring', r: rCoreBase_mm - inputThickInsu - inputThickInnerSemi/2, name: 'Inner Semi-con Layer' });
        }
        
        activeLayers.push({ type: 'core_ring', r: rCoreBase_mm - inputThickInsu/2, name: `Insulation (${insuMaterial})` });
        
        if (document.getElementById('outer_semi').value === '적용') {
            activeLayers.push({ type: 'core_ring', r: rCoreBase_mm - inputThickOuterSemi/2, name: 'Outer Semi-con Layer' });
        }
        if (tapeInsuAbove !== '미적용') {
            activeLayers.push({ type: 'core_ring', r: rCoreBase_mm - tInsuAbove_mm/2, name: `Insulation-above Tape (${tapeInsuAbove})` });
        }
        if (indSeparator !== '미적용') {
            activeLayers.push({ type: 'bundle_ring', r: rBundle_mm + tIndSep_mm/2, name: `Individual Separator (${indSeparator})` });
        }
        if (indShieldType !== '미적용') {
            activeLayers.push({ type: 'bundle_ring', r: rSeparatorOuter_mm + tIndScreen_mm/2, name: `Individual Shield (${indShieldMaterial})` });
        }
        if (indScreenTape !== '미적용') {
            activeLayers.push({ type: 'bundle_ring', r: rShieldOuter_mm + tIndScreenTape_mm/2, name: `Shield-above Tape (${indScreenTape})` });
        }
        
        if (coreNum > 1 || hasGround) {
            activeLayers.push({ type: 'valley', name: `Cabling & Filler (${fillerMaterial})` });
        }
        
        if (binderTape !== '미적용') {
            activeLayers.push({ type: 'outer_ring', r: rAssemblyOuter_mm + tBinder_mm/2, name: `Overall Binder Tape (${binderTape})` });
        }
        if (ovShieldType !== '미적용') {
            activeLayers.push({ type: 'outer_ring', r: rBinderOuter_mm + tOvScreen_mm/2, name: `Overall Shield (${ovShieldMaterial})` });
        }
        if (beddingType !== '미적용') {
            activeLayers.push({ type: 'outer_ring', r: rOvScreenOuter_mm + tBedding_mm/2, name: `Inner Bedding (${beddingMaterial})` });
        }
        if (armourType !== '미적용') {
            activeLayers.push({ type: 'outer_ring', r: rBeddingOuter_mm + tArmour_mm/2, name: `Metal Armour (${armourMaterial})` });
        }
        activeLayers.push({ type: 'outer_ring', r: rArmourOuter_mm + tSheath_mm/2, name: `Outer Sheath (${sheathMaterial})` });

        let N = activeLayers.length;
        let boxTop = 130, boxBottom = 620, boxHeight = boxBottom - boxTop; 
        let boxLeft = 820; 
        
        let lineSpacing = (boxHeight - 50) / (N - 1); 
        if (lineSpacing > 45) lineSpacing = 45; 
        let totalListHeight = (N - 1) * lineSpacing;
        let centerY_start = cy - totalListHeight / 2;
        
        activeLayers.forEach((layer, i) => {
            let startX, startY;
            
            if (layer.type === 'cond') {
                startX = rightmostCoreX; startY = rightmostCoreY;
            } else if (layer.type === 'core_ring') {
                let angle = rightmostCoreAngle + Math.PI / 4;
                startX = rightmostCoreX + (layer.r * scaleFactor) * Math.cos(angle);
                startY = rightmostCoreY + (layer.r * scaleFactor) * Math.sin(angle);
            } else if (layer.type === 'bundle_ring') {
                let angle = rightmostCoreAngle + Math.PI / 4;
                startX = rightmostBundleX + (layer.r * scaleFactor) * Math.cos(angle);
                startY = rightmostBundleY + (layer.r * scaleFactor) * Math.sin(angle);
            } else if (layer.type === 'valley') {
                let obstacles = [];
                layoutData.positions.forEach((pos) => {
                    let bX_pos = cx + ((pos.dx / 12) * scaleFactor) * Math.cos(pos.angle);
                    let bY_pos = cy + ((pos.dx / 12) * scaleFactor) * Math.sin(pos.angle);
                    if (pos.isGround) {
                        obstacles.push({ x: bX_pos, y: bY_pos, r: rGroundCoreBase_mm * scaleFactor });
                    } else {
                        bundleCoreOffsets.forEach((offset) => {
                            let radDiff = pos.angle;
                            let rotX = offset.dx * Math.cos(radDiff) - offset.dy * Math.sin(radDiff);
                            let rotY = offset.dx * Math.sin(radDiff) + offset.dy * Math.cos(radDiff);
                            obstacles.push({
                                x: bX_pos + (rotX / 12) * scaleFactor,
                                y: bY_pos + (rotY / 12) * scaleFactor,
                                r: rCoreBase_mm * scaleFactor
                            });
                        });
                    }
                });

                if (indShieldType !== 'none' && indShieldType !== '미적용' && indShieldType.includes('D/W')) {
                    layoutData.positions.forEach((pos) => {
                        if (!pos.isGround) {
                            let bX_pos = cx + ((pos.dx / 12) * scaleFactor) * Math.cos(pos.angle);
                            let bY_pos = cy + ((pos.dx / 12) * scaleFactor) * Math.sin(pos.angle);
                            let tAngle = pos.angle + ((coreType === 'PAIR') ? (Math.PI / 2) : (coreType === 'TRIAD') ? (30 * Math.PI / 180) : 0);
                            let dist_mm = rSeparatorOuter_mm - (0.5 * rCond_mm); 
                            obstacles.push({
                                x: bX_pos + (dist_mm * scaleFactor) * Math.cos(tAngle),
                                y: bY_pos + (dist_mm * scaleFactor) * Math.sin(tAngle),
                                r: (0.5 * rCond_mm) * scaleFactor
                            });
                        }
                    });
                }

                let bestX = cx, bestY = cy, maxClearance = -999999;
                let R_limit = rAssemblyOuter_mm * scaleFactor;

                for (let r_val = 0; r_val <= R_limit; r_val += 4) {
                    let num_angles = r_val === 0 ? 1 : 120;
                    for (let a_idx = 0; a_idx < num_angles; a_idx++) {
                        let angle = (a_idx * (360 / num_angles)) * Math.PI / 180;
                        let tx = cx + r_val * Math.cos(angle);
                        let ty = cy + r_val * Math.sin(angle);
                        
                        let minD = 999999;
                        obstacles.forEach(obs => {
                            let dx = tx - obs.x;
                            let dy = ty - obs.y;
                            let dist = Math.sqrt(dx*dx + dy*dy) - obs.r;
                            if (obs.isGround) dist -= 4; 
                            if (dist < minD) minD = dist;
                        });
                        
                        let distToOuter = R_limit - r_val;
                        let score = minD;
                        if (distToOuter < 16) score -= (16 - distToOuter) * 12; 
                        
                        if (score > maxClearance) {
                            maxClearance = score;
                            bestX = tx;
                            bestY = ty;
                        }
                    }
                }
                startX = bestX;
                startY = bestY;
            } else if (layer.type === 'outer_ring') {
                let angle = 35 * Math.PI / 180;
                startX = cx + (layer.r * scaleFactor) * Math.cos(angle);
                startY = cy + (layer.r * scaleFactor) * Math.sin(angle);
            }
            
            let endX = boxLeft + 15; 
            let endY = centerY_start + i * lineSpacing;
            
            let angleRad = 0;
            if (N > 1) {
                angleRad = (-40 + i * (80 / (N - 1))) * Math.PI / 180;
            }
            if (layer.type !== 'cond' && layer.type !== 'core_ring' && layer.type !== 'bundle_ring' && layer.type !== 'valley') {
                startX = cx + (layer.r * scaleFactor) * Math.cos(angleRad);
                startY = cy + (layer.r * scaleFactor) * Math.sin(angleRad);
            }

            const group = document.getElementById('mainGroup') || document.getElementById('cableSvg');
            
            addCircle(startX, startY, 11, '#ef4444', '#ffffff', 1.2);
            const svgNS = "http://www.w3.org/2000/svg";
            const txtNumDraw = document.createElementNS(svgNS, "text");
            txtNumDraw.setAttribute("x", startX); txtNumDraw.setAttribute("y", startY + 4.5);
            txtNumDraw.setAttribute("font-size", "13"); txtNumDraw.setAttribute("font-weight", "900");
            txtNumDraw.setAttribute("text-anchor", "middle"); txtNumDraw.setAttribute("fill", "#ffffff");
            txtNumDraw.textContent = i + 1;
            group.appendChild(txtNumDraw);
            
            addCircle(endX + 11, endY, 13, '#1e293b', 'none');
            const txtNumBox = document.createElementNS(svgNS, "text");
            txtNumBox.setAttribute("x", endX + 11); txtNumBox.setAttribute("y", endY + 4.5);
            txtNumBox.setAttribute("font-size", "13"); txtNumBox.setAttribute("font-weight", "900");
            txtNumBox.setAttribute("text-anchor", "middle"); txtNumBox.setAttribute("fill", "#ffffff");
            txtNumBox.textContent = i + 1;
            group.appendChild(txtNumBox);
            
            addSvgText(endX + 38, endY + 9, layer.name, 18, '#1e293b', 'start', '800');
        });
    }
}
