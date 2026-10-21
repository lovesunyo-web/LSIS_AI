// ======================================================================
// [3] SVG 실시간 드로잉 및 렌더링 물리 계산 엔진 (오류 및 집복합 정렬 교정본)
// ======================================================================


// Converts values used in the on-drawing layer legend to English.
// UI input values remain unchanged; this affects only the cross-section description.
function toEnglishLayerValue(value) {
    const dictionary = {
        // Main-view cross-section legend: translate all Korean UI values only here.
        // The input controls keep their original Korean values.
        '미적용': 'Not Applied',
        '적용': 'Applied',
        '반도전': 'Semi-conductive',
        '연선': 'Stranded',
        '원형압축 연선': 'Circular Compacted Stranded',
        '집합': 'Bunched',
        '집/복합': 'Bunched/Composite',
        '구리 (동)': 'Copper',
        '구리': 'Copper',
        '동': 'Copper',
        '알루미늄': 'Aluminum',
        '아연도철선': 'GSW',
        '철 (STA)': 'Steel Tape (STA)',
        '면사': 'Cotton Yarn',
        '납': 'Lead',
        '아라미드 얀': 'Aramid Yarn',
        '폴리에스터 얀': 'Polyester Yarn',
        '실리콘': 'Silicone',
        '나일론': 'Nylon',
        '부직포 0.13': 'Non-woven Fabric 0.13',
        '부직포': 'Non-woven Fabric',
        '우레탄글라스': 'Polyurethane Glass',
        '고무입면': 'Rubberized Fabric',
        '마이카': 'Mica',
        '폴리이미드': 'Polyimide',
        '이너시스': 'Inner Sheath',
        '이너커버링': 'Inner Covering',
        '압출형': 'Extruded',
        '테이프식': 'Lapped',
        '횡권': 'Serve',
        '편조': 'Braid',
        '드레인와이어 포함': 'with Drain Wire',
        '동테이프': 'Copper Tape',
        '동편조': 'Copper Braid',
        '알루미늄 테이프': 'Aluminum Tape',
        '세퍼레이터': 'Separator',
        '테이프': 'Tape',
        '개재': 'Filler',
        '연합': 'Cabling'
    };
    let result = String(value == null ? '' : value);
    Object.keys(dictionary)
        .sort((a, b) => b.length - a.length)
        .forEach(key => { result = result.split(key).join(dictionary[key]); });
    return result;
}

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

// 라인 그리기 누락 감지 방지
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

function addPolygon(points, fill, stroke, strokeWidth) {
    const group = document.getElementById('mainGroup') || document.getElementById('cableSvg');
    const p = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    p.setAttribute("points", points.map(pt => pt[0] + "," + pt[1]).join(" "));
    p.setAttribute("fill", fill || 'none');
    p.setAttribute("stroke", stroke || 'none');
    if (strokeWidth) p.setAttribute("stroke-width", strokeWidth);
    p.setAttribute("stroke-linejoin", "round");
    group.appendChild(p);
}

function addSvgText(x, y, text, fontSize, fill, anchor, weight) {
    const group = document.getElementById('mainGroup') || document.getElementById('cableSvg');
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("fill", fill || '#000000');
    t.setAttribute("font-size", fontSize || 12);
    t.setAttribute("font-family", "Noto Sans KR, Malgun Gothic, sans-serif");
    if (anchor) t.setAttribute("text-anchor", anchor);
    if (weight) t.setAttribute("font-weight", weight);
    t.textContent = text;
    group.appendChild(t);
}


function drawConcentricStrandedConductor(cx, cy, sRCond, strandCount, fillColor, strokeColor) {
    const ringsMap = {7:[6], 19:[6,12], 37:[6,12,18], 61:[6,12,18,24], 91:[6,12,18,24,30]};
    const rings = ringsMap[strandCount] || ringsMap[7];
    const maxRing = rings.length;
    const subR = sRCond / (2 * maxRing + 1);
    addCircle(cx, cy, subR * 0.98, fillColor, strokeColor, 0.25);
    rings.forEach((cnt, idx) => {
        const ringNo = idx + 1;
        const dist = subR * 2 * ringNo;
        for (let i = 0; i < cnt; i++) {
            const a = (i / cnt) * 2 * Math.PI;
            addCircle(cx + dist * Math.cos(a), cy + dist * Math.sin(a), subR * 0.98, fillColor, strokeColor, 0.25);
        }
    });
}
function drawCompactedCircularConductor(cx, cy, sRCond, fillColor, strokeColor) {
    // 개략 표현: 압축 전 원형 소선이 서로 맞물리며 마름모/다각형으로 변형된 형상.
    addCircle(cx, cy, sRCond, fillColor, strokeColor, 0.65);
    const cellR=sRCond*0.29, ringR=sRCond*0.55;
    const diamond=(x,y,rot,scale)=>{
        const pts=[];
        for(let i=0;i<4;i++){
            const a=rot+i*Math.PI/2;
            const rr=(i%2===0?cellR:cellR*0.72)*scale;
            pts.push([x+rr*Math.cos(a),y+rr*Math.sin(a)]);
        }
        addPolygon(pts,fillColor,strokeColor,0.28);
    };
    // 중심 소선
    const centerPts=[];
    for(let i=0;i<6;i++){
        const a=Math.PI/6+i*Math.PI/3;
        centerPts.push([cx+cellR*0.82*Math.cos(a),cy+cellR*0.82*Math.sin(a)]);
    }
    addPolygon(centerPts,fillColor,strokeColor,0.28);
    // 외곽 6개 소선을 방사 방향으로 압축된 마름모로 표시
    for(let i=0;i<6;i++){
        const a=i*Math.PI/3;
        diamond(cx+ringR*Math.cos(a),cy+ringR*Math.sin(a),a,1.0);
    }
}

function getDrawingStrandCount(condSizeText, nominalArea) {
    // The selected construction is authoritative.  This keeps the cross-section
    // synchronized with ASTM Tables 11/12/13/15 rather than a size-only estimate.
    const selected = document.getElementById('cond_size')?.selectedOptions?.[0];
    const selectedCount = Number(selected?.dataset?.totalWireCount || 0);
    if (Number.isFinite(selectedCount) && selectedCount > 0) return selectedCount;
    const std = document.getElementById('conductorStandard')?.value || 'IEC';
    if (typeof window.getStrandCountBySize === 'function') return window.getStrandCountBySize(std, condSizeText, nominalArea);
    return 7;
}

function isBunchedCompositeConductor(condClass) {
    if (condClass !== '집/복합') return condClass === '집합';
    const selectedConfig = document.getElementById('cond_strand_config')?.selectedOptions?.[0];
    const selectedSize = document.getElementById('cond_size')?.selectedOptions?.[0];
    const strandConfig = selectedConfig?.dataset?.strandConfig || selectedConfig?.value ||
        selectedSize?.dataset?.strandConfig || '';
    if (window.LSConductorUtils?.isBunchedConstruction) {
        return window.LSConductorUtils.isBunchedConstruction(strandConfig);
    }
    const match = String(strandConfig).match(/^\s*(\d+)/);
    return !!match && Number(match[1]) === 1;
}

// 집합/집복합 도체의 외층 소선이 도체 외경(절연체 내측)에 접하도록
// 실제 배치 외곽반경을 산출한 뒤 도체 반경까지 균일 확대하여 그린다.
function drawBunchedConductor(cx, cy, conductorR, fillColor, strokeColor) {
    const subR = conductorR / 10;
    const dots = [{x: 0, y: 0, r: subR * 0.9}];
    let dist = subR * 2;
    const radiusLimit = conductorR - subR;
    while (dist < radiusLimit) {
        const count = Math.max(1, Math.floor((2 * Math.PI * dist) / (subR * 2)));
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * 2 * Math.PI;
            dots.push({x: dist * Math.cos(angle), y: dist * Math.sin(angle), r: subR * 0.9});
        }
        dist += subR * 2;
    }
    const outerR = Math.max(...dots.map(dot => Math.hypot(dot.x, dot.y) + dot.r));
    const scale = outerR > 0 ? conductorR / outerR : 1;
    dots.forEach(dot => addCircle(
        cx + dot.x * scale, cy + dot.y * scale, dot.r * scale,
        fillColor, strokeColor, 0.2
    ));
}

function drawCompositeConductor(cx, cy, conductorR, fillColor, strokeColor) {
    const bundleR = conductorR / 4.5;
    const dots = [];
    for (let i = 0; i < 7; i++) {
        const angle = i === 0 ? 0 : (i - 1) * (2 * Math.PI / 6);
        const dist = i === 0 ? 0 : conductorR * 0.55;
        const bx = dist * Math.cos(angle), by = dist * Math.sin(angle);
        dots.push({x: bx, y: by, r: bundleR * 0.45});
        for (let j = 0; j < 6; j++) {
            const a = j * (2 * Math.PI / 6);
            dots.push({
                x: bx + bundleR * 0.8 * Math.cos(a),
                y: by + bundleR * 0.8 * Math.sin(a),
                r: bundleR * 0.4
            });
        }
    }
    const outerR = Math.max(...dots.map(dot => Math.hypot(dot.x, dot.y) + dot.r));
    const scale = outerR > 0 ? conductorR / outerR : 1;
    dots.forEach(dot => addCircle(
        cx + dot.x * scale, cy + dot.y * scale, dot.r * scale,
        fillColor, strokeColor, 0.2
    ));
}

function drawSyncedGroundConductor(cx, cy, sRCond, condClass, condMat) {
    const finalStrandColor = (condMat === 'aluminum') ? '#cbd5e1' : '#b87333';
    if (String(condClass || '').toUpperCase() === 'SOLID') {
        addCircle(cx, cy, sRCond, finalStrandColor, '#475569', 0.5);
    } else if (condClass === '연선') {
        drawConcentricStrandedConductor(cx, cy, sRCond, getDrawingStrandCount('', 0), finalStrandColor, '#475569');
    } else if (condClass === '원형압축 연선' || condClass === '압축') {
        drawCompactedCircularConductor(cx, cy, sRCond, finalStrandColor, '#475569');
    } else if (isBunchedCompositeConductor(condClass)) {
        drawBunchedConductor(cx, cy, sRCond, finalStrandColor, '#475569');
    } else if (condClass === '집/복합') {
        drawCompositeConductor(cx, cy, sRCond, finalStrandColor, '#475569');
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

// [★ 오류 수정 지점 1] getGroundConductorSize 내부의 stdSizes 배열 규격 완벽 정상화
function getGroundConductorSize(mainSize, numGround) {
    if (mainSize <= 16) return mainSize;
    let target = (mainSize / 2.0) / numGround;
    const stdSizes = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630];
    for (let s of stdSizes) {
        if (s >= target) return s;
    }
    return stdSizes[stdSizes.length - 1];
}

function getDrawingTapeThickness(material, process, fallback) {
    if (!material || material === '미적용') return 0;
    try {
        if (window.LSSharedMaterialEngine && typeof window.LSSharedMaterialEngine.getTapeSpec === 'function') {
            const spec=window.LSSharedMaterialEngine.getTapeSpec(material, process || '');
            const t=parseFloat(spec && spec.thickness);
            if (Number.isFinite(t)) return t;
        }
    } catch(e) {}
    return fallback;
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

    const svg = document.getElementById('cableSvg');
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
    let inputThickSheath = parseFloat(document.getElementById('thick_sheath').value); if (isNaN(inputThickSheath)) inputThickSheath = 1.6; if (sheathMaterial === '미적용') inputThickSheath = 0;
    const tapeInsuAbove = document.getElementById('tape_insu_above').value;

    let rCond_mm = actualOD / 2; 
    let tMica_mm = getDrawingTapeThickness(tapeMica, '마이카 테이프', 0.14);
    let tSep_mm = getDrawingTapeThickness(tapeSep, '도체 세퍼레이터', 0.15);
    let tTapeSemi_mm = getDrawingTapeThickness(tapeSemi, '반도전 테이프', 0.11);
    let tTapeInsuAbove_mm = getDrawingTapeThickness(tapeInsuAbove, '절연위 테이프', 0.15);
    let tIndSep_mm = getDrawingTapeThickness(indSeparator, '개별 차폐 세퍼레이터', 0.15);
    let tIndScreenTape_mm = getDrawingTapeThickness(indScreenTape, '개별차폐위 테이프', 0.15);
    let tBinder_mm = getDrawingTapeThickness(binderTape, '연합 바인더 테이프', 0.15);
    let tInnerSemi_mm = (document.getElementById('inner_semi').value === '적용') ? inputThickInnerSemi : 0;
    let tOuterSemi_mm = (document.getElementById('outer_semi').value === '적용') ? inputThickOuterSemi : 0;
    let tInsu_mm = inputThickInsu; 

    let rCoreBase_mm = rCond_mm + tTapeSemi_mm + tMica_mm + tSep_mm + tInnerSemi_mm + tInsu_mm + tOuterSemi_mm + tTapeInsuAbove_mm;
    let tIndScreen_mm = (indShieldType !== '미적용') ? ((indShieldMaterial === '납') ? (parseFloat(document.getElementById('thick_lead_shield').value) || 1.0) : 0.2) : 0;

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
    let rFinalBundle_mm = rShieldTapeOuter_mm + ((coreType !== 'CORE') ? tBinder_mm : 0);

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

    // 단면도는 항상 기하 배치 외경을 사용한다.
    // 수동/LS 계산 연합외경은 자재량·부표 계산용이며, 도면의 선심 배치를 압축하지 않는다.

    let tOvScreen_mm = (ovShieldType !== '미적용') ? 0.3 : 0;
    let tBedding_mm = (beddingType !== '미적용') ? inputThickBedding : 0;
    
    let tArmour_mm = 0;
    if (armourType !== '미적용') {
        if (armourType === "SWA/AWA (횡권)" || armourType === "편조 (Braid)") {
            tArmour_mm = inputThickArmour; 
        } else {
            tArmour_mm = inputThickArmour;
        }
    }
    let tSheath_mm = (sheathMaterial === '미적용') ? 0 : inputThickSheath;

    let rBinderOuter_mm = rAssemblyOuter_mm + tBinder_mm;
    let rOvScreenOuter_mm = rBinderOuter_mm + tOvScreen_mm;
    let rBeddingOuter_mm = rOvScreenOuter_mm + tBedding_mm;
    let rArmourOuter_mm = rBeddingOuter_mm + tArmour_mm;
    let rSheathOuter_mm = rArmourOuter_mm + tSheath_mm;
    let rTotal_mm = rSheathOuter_mm;
    
    const showLabels = document.getElementById('show_labels')?.checked || false;
    window.lastCableLabelMap = null;
    
    if (showLabels) {
        // 우측 단면도 설명의 긴 재질명이 잘리지 않도록 설명 영역을 넓게 확보합니다.
        svg.setAttribute("viewBox", "0 0 1650 750");
        svg.setAttribute("width", "1650");
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

    if (sheathMaterial !== '미적용' && tSheath_mm > 0) addCircle(cx, cy, rSheathOuter_mm * scaleFactor, selectedSheathColor, '#475569', 1.5);

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
        if (coreType !== 'CORE' && binderTape !== '미적용') {
            let rCenter = (rShieldTapeOuter_mm + tBinder_mm / 2) * scaleFactor;
            addCircle(bX, bY, rCenter, 'none', '#cbd5e1', tBinder_mm * scaleFactor);
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
                addCircle(sC_x, sC_y, (currentBuildR_mm - tTapeInsuAbove_mm / 2) * scaleFactor, 'none', tapeInsuColor, tTapeInsuAbove_mm * scaleFactor);
                currentBuildR_mm -= tTapeInsuAbove_mm;
            }
            if(inputThickOuterSemi > 0 && document.getElementById('outer_semi').value === '적용') {
                addCircle(sC_x, sC_y, (currentBuildR_mm - inputThickOuterSemi / 2) * scaleFactor, 'none', '#000000', inputThickOuterSemi * scaleFactor);
                currentBuildR_mm -= inputThickOuterSemi;
            }
            const mvVoltages = ['3.6/6kV', '5KV', '6/10KV', '8.0KV', '8.7/15KV', '15KV', '12/20KV', '18/30KV', '25KV', '35KV', '66KV'];
            let colorIndex = globalCoreIdx;
            const syncAllColors = document.getElementById('sync_all_colors')?.checked;
            if (syncAllColors) {
                const ct = document.getElementById('core_type')?.value || 'CORE';
                const perBundle = (ct === 'PAIR') ? 2 : (ct === 'TRIAD') ? 3 : (ct === 'QUAD') ? 4 : 1;
                colorIndex = globalCoreIdx % perBundle;
            }
            let coreHex = mvVoltages.includes(volt) ? '#d4b59e' : (COLOR_HEX_MAP[selectedInsuColors[colorIndex]] || '#ffffff');
            // 흰색 계열 절연체는 채움색은 유지하고, 외곽선만 조금 진하게 표시한다.
            // 기본 WH 팔레트는 #f8fafc를 사용하므로 #ffffff만 비교하면 적용되지 않는다.
            const normalizedCoreHex = String(coreHex || '').trim().toLowerCase();
            const isWhiteInsulation = selectedInsuColors[colorIndex] === 'WH'
                || ['#fff', '#ffffff', '#f8fafc'].includes(normalizedCoreHex);
            const insulationStroke = isWhiteInsulation ? '#94a3b8' : '#cbd5e1';
            const insulationStrokeWidth = isWhiteInsulation ? 2 : 0.5;
            addCircle(sC_x, sC_y, currentBuildR_mm * scaleFactor, coreHex, insulationStroke, insulationStrokeWidth);
            
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
            const finalStrandColor = (condMat === 'aluminum') ? '#cbd5e1' : '#b87333';
            // SOLID는 소선이 하나이므로 흰색 바탕 없이 도체 외경 전체를 금속색으로 채운다.
            if (String(condClass || '').toUpperCase() === 'SOLID') {
                addCircle(sC_x, sC_y, sRCond, finalStrandColor, '#475569', 0.5);
            } else {
                addCircle(sC_x, sC_y, sRCond, '#ffffff', 'none');
                if (condClass === '연선') {
                const strandCount = getDrawingStrandCount(condSizeText, nominalArea);
                drawConcentricStrandedConductor(sC_x, sC_y, sRCond, strandCount, finalStrandColor, '#475569');
            } else if (condClass === '원형압축 연선' || condClass === '압축') {
                drawCompactedCircularConductor(sC_x, sC_y, sRCond, finalStrandColor, '#475569');
            } else if (isBunchedCompositeConductor(condClass)) {
                drawBunchedConductor(sC_x, sC_y, sRCond, finalStrandColor, '#475569');
            } else if (condClass === '집/복합') {
                drawCompositeConductor(sC_x, sC_y, sRCond, finalStrandColor, '#475569');
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
            drainWiresToDraw.push({ cx: dwX, cy: dwY, rStrand: indDwStrandR_mm * scaleFactor, kind: 'ind' });
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
        drainWiresToDraw.push({ cx: ovDwX, cy: ovDwY, rStrand: ovDwStrandR_mm * scaleFactor, kind: 'ov' });
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
            activeLayers.push({ type: 'core_ring', r: r_ptr + tTapeSemi_mm/2, name: `Semi-conductive Tape (${toEnglishLayerValue(tapeSemi)})` });
            r_ptr += tTapeSemi_mm;
        }
        if (tapeMica === '적용') {
            activeLayers.push({ type: 'core_ring', r: r_ptr + tMica_mm/2, name: 'Mica Fire Barrier Tape' });
            r_ptr += tMica_mm;
        }
        if (tapeSep !== '미적용') {
            activeLayers.push({ type: 'core_ring', r: r_ptr + tSep_mm/2, name: `Conductor Separator (${toEnglishLayerValue(tapeSep)})` });
            r_ptr += tSep_mm;
        }
        if (document.getElementById('inner_semi').value === '적용') {
            activeLayers.push({ type: 'core_ring', r: rCoreBase_mm - inputThickInsu - inputThickInnerSemi/2, name: 'Inner Semi-con Layer' });
        }
        
        activeLayers.push({ type: 'core_ring', r: rCoreBase_mm - inputThickInsu/2, name: `Insulation (${toEnglishLayerValue(insuMaterial)})` });
        
        if (document.getElementById('outer_semi').value === '적용') {
            activeLayers.push({ type: 'core_ring', r: rCoreBase_mm - inputThickOuterSemi/2, name: 'Outer Semi-con Layer' });
        }
        if (tapeInsuAbove !== '미적용') {
            activeLayers.push({ type: 'core_ring', r: rCoreBase_mm - tTapeInsuAbove_mm/2, name: `Insulation-above Tape (${toEnglishLayerValue(tapeInsuAbove)})` });
        }
        if (indSeparator !== '미적용') {
            activeLayers.push({ type: 'bundle_ring', r: rBundle_mm + tIndSep_mm/2, name: `Individual Separator (${toEnglishLayerValue(indSeparator)})` });
        }
        if (indShieldType !== '미적용') {
            activeLayers.push({ type: 'bundle_ring', r: rSeparatorOuter_mm + tIndScreen_mm/2, name: `Individual Shield (${toEnglishLayerValue(indShieldMaterial)})` });
            if (indShieldType.includes('D/W')) {
                const indDw = drainWiresToDraw.find(dw => dw.kind === 'ind');
                if (indDw) activeLayers.push({ type: 'dw_point', x: indDw.cx, y: indDw.cy, name: 'D/W' });
            }
        }
        if (indScreenTape !== '미적용') {
            activeLayers.push({ type: 'bundle_ring', r: rShieldOuter_mm + tIndScreenTape_mm/2, name: `Shield-above Tape (${toEnglishLayerValue(indScreenTape)})` });
        }
        
        if (coreNum > 1 || hasGround) {
            activeLayers.push({ type: 'valley', name: `Cabling / Filler (${toEnglishLayerValue(fillerMaterial)})` });
        }
        
        if (binderTape !== '미적용') {
            activeLayers.push({ type: 'outer_ring', r: rAssemblyOuter_mm + tBinder_mm/2, name: `Overall Binder Tape (${toEnglishLayerValue(binderTape)})` });
        }
        if (ovShieldType !== '미적용') {
            activeLayers.push({ type: 'outer_ring', r: rBinderOuter_mm + tOvScreen_mm/2, name: `Overall Shield (${toEnglishLayerValue(ovShieldMaterial)})` });
            if (ovShieldType.includes('D/W')) {
                const ovDw = drainWiresToDraw.find(dw => dw.kind === 'ov');
                if (ovDw) activeLayers.push({ type: 'dw_point', x: ovDw.cx, y: ovDw.cy, name: 'D/W' });
            }
        }
        if (beddingType !== '미적용') {
            activeLayers.push({ type: 'outer_ring', r: rOvScreenOuter_mm + tBedding_mm/2, name: `Inner Bedding (${toEnglishLayerValue(beddingMaterial)})` });
        }
        if (armourType !== '미적용') {
            activeLayers.push({ type: 'outer_ring', r: rBeddingOuter_mm + tArmour_mm/2, name: `Metal Armour (${toEnglishLayerValue(armourMaterial)})` });
        }
        if (sheathMaterial !== '미적용' && tSheath_mm > 0) activeLayers.push({ type: 'outer_ring', r: rArmourOuter_mm + tSheath_mm/2, name: `Outer Sheath (${toEnglishLayerValue(sheathMaterial)})` });

        window.lastCableLabelMap = {};
        activeLayers.forEach((layer, idx) => {
            if (layer && layer.name && window.lastCableLabelMap[layer.name] == null) {
                window.lastCableLabelMap[layer.name] = idx + 1;
            }
        });

        let N = activeLayers.length;
        let boxTop = 95, boxBottom = 665, boxHeight = boxBottom - boxTop; 
        let boxLeft = 820; 
        
        let lineSpacing = N > 1 ? (boxHeight - 40) / (N - 1) : 0; 
        if (lineSpacing > 72) lineSpacing = 72; 
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
            } else if (layer.type === 'dw_point') {
                startX = layer.x;
                startY = layer.y + 16; // D/W 번호는 D/W 아래쪽에 표시
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
            if (layer.type !== 'cond' && layer.type !== 'core_ring' && layer.type !== 'bundle_ring' && layer.type !== 'valley' && layer.type !== 'dw_point') {
                startX = cx + (layer.r * scaleFactor) * Math.cos(angleRad);
                startY = cy + (layer.r * scaleFactor) * Math.sin(angleRad);
            }

            const group = document.getElementById('mainGroup') || document.getElementById('cableSvg');
            
            addCircle(startX, startY, 26, '#ef4444', '#ffffff', 2.2);
            const svgNS = "http://www.w3.org/2000/svg";
            const txtNumDraw = document.createElementNS(svgNS, "text");
            txtNumDraw.setAttribute("x", startX); txtNumDraw.setAttribute("y", startY + 4.5);
            txtNumDraw.setAttribute("font-size", "28"); txtNumDraw.setAttribute("font-weight", "900"); txtNumDraw.setAttribute("font-family", "Noto Sans KR, Malgun Gothic, sans-serif");
            txtNumDraw.setAttribute("text-anchor", "middle"); txtNumDraw.setAttribute("fill", "#ffffff");
            txtNumDraw.textContent = i + 1;
            group.appendChild(txtNumDraw);
            
            addCircle(endX + 26, endY, 30, '#1e293b', 'none');
            const txtNumBox = document.createElementNS(svgNS, "text");
            txtNumBox.setAttribute("x", endX + 26); txtNumBox.setAttribute("y", endY + 9);
            txtNumBox.setAttribute("font-size", "30"); txtNumBox.setAttribute("font-weight", "900"); txtNumBox.setAttribute("font-family", "Noto Sans KR, Malgun Gothic, sans-serif");
            txtNumBox.setAttribute("text-anchor", "middle"); txtNumBox.setAttribute("fill", "#ffffff");
            txtNumBox.textContent = i + 1;
            group.appendChild(txtNumBox);
            
            addSvgText(endX + 70, endY + 9, layer.name, 28, '#1e293b', 'start', '800');
        });
    }


    // 설명 텍스트 길이에 따라 실제 도면 전체(단면도 + 지시선 + 설명)의 경계를 계산합니다.
    // 고정 viewBox를 사용하면 설명이 길어질수록 단면도가 한쪽으로 치우쳐 보일 수 있으므로,
    // 실제 콘텐츠의 중앙이 항상 캔버스 중앙에 오도록 viewBox를 다시 맞춥니다.
    requestAnimationFrame(() => {
        const drawingGroup = document.getElementById('mainGroup');
        if (!drawingGroup) return;

        try {
            const bounds = drawingGroup.getBBox();
            const paddingX = showLabels ? 48 : 24;
            const paddingY = 32;
            const viewX = Math.floor(bounds.x - paddingX);
            const viewY = Math.floor(bounds.y - paddingY);
            const viewWidth = Math.ceil(bounds.width + paddingX * 2);
            const viewHeight = Math.ceil(bounds.height + paddingY * 2);

            if (viewWidth > 0 && viewHeight > 0) {
                svg.setAttribute('viewBox', `${viewX} ${viewY} ${viewWidth} ${viewHeight}`);
                svg.setAttribute('width', viewWidth);
                svg.setAttribute('height', viewHeight);
                svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }
        } catch (error) {
            // getBBox를 지원하지 않는 환경에서는 기존 기본 viewBox를 유지합니다.
            console.warn('도면 중심 정렬 범위 계산에 실패했습니다.', error);
        }
    });

    // ----------------------------------------------------
    // [3D View Bridge - read-only snapshot]
    // 기존 2D/자재/IEC 계산 로직은 변경하지 않고, calculateAndDraw() 내부에서
    // 이미 산출된 값만 3D 렌더러로 전달합니다.
    // ----------------------------------------------------
    try {
        const mv3DVoltages = ['3.6/6kV', '5KV', '6/10KV', '8.0KV', '8.7/15KV', '15KV', '12/20KV', '18/30KV', '25KV', '35KV', '66KV'];
        const syncAll3DColors = document.getElementById('sync_all_colors')?.checked;
        const coreColors3D = [];
        const displayCoreCount3D = Math.max(1, coreNum * perBundle);
        for (let ci = 0; ci < displayCoreCount3D; ci++) {
            let colorIndex3D = ci;
            if (syncAll3DColors) colorIndex3D = ci % perBundle;
            coreColors3D.push(mv3DVoltages.includes(volt) ? '#d4b59e' : (COLOR_HEX_MAP[selectedInsuColors[colorIndex3D]] || '#ffffff'));
        }

        const selectedStrandConfig3D = document.getElementById('cond_strand_config')?.selectedOptions?.[0]?.dataset?.strandConfig ||
            document.getElementById('cond_strand_config')?.value || '';
        const strandCount3D = (String(condClass || '').toUpperCase() === 'SOLID') ? 1 : getDrawingStrandCount(condSizeText, nominalArea);
        // 3D 도체는 2D 단면도와 동일한 도체 색상을 사용한다.
        const conductorColor3D = (condMat === 'aluminum') ? '#cbd5e1' : '#b87333';

        const coreLayerData3D = [];
        coreLayerData3D.push({
            key: 'conductor',
            name: `Conductor (${condMat === 'aluminum' ? 'Aluminum' : 'Copper'})`,
            thickness: Math.max(rCond_mm, 0.01),
            radius: rCond_mm,
            color: conductorColor3D,
            applied: true,
            exposure: 'short'
        });
        if (tapeSemi !== '미적용') coreLayerData3D.push({
            key: 'tape_semi',
            name: `Semi-conductive Tape (${toEnglishLayerValue(tapeSemi)})`,
            thickness: tTapeSemi_mm,
            color: '#0f172a',
            applied: true,
            exposure: 'thin'
        });
        if (tapeMica === '적용') coreLayerData3D.push({
            key: 'mica',
            name: 'Mica Fire Barrier Tape',
            thickness: tMica_mm,
            color: '#e5e7eb',
            applied: true,
            exposure: 'thin'
        });
        if (tapeSep !== '미적용') coreLayerData3D.push({
            key: 'separator',
            name: `Conductor Separator (${toEnglishLayerValue(tapeSep)})`,
            thickness: tSep_mm,
            color: '#f8fafc',
            applied: true,
            exposure: 'thin'
        });
        if (document.getElementById('inner_semi')?.value === '적용' && tInnerSemi_mm > 0) coreLayerData3D.push({
            key: 'inner_semi',
            name: 'Inner Semi-con Layer',
            thickness: tInnerSemi_mm,
            color: '#050505',
            applied: true,
            exposure: 'thin'
        });
        coreLayerData3D.push({
            key: 'insulation',
            name: `Insulation (${toEnglishLayerValue(insuMaterial)})`,
            thickness: tInsu_mm,
            color: coreColors3D[0] || '#ffffff',
            coreColors: coreColors3D,
            applied: true,
            exposure: 'long'
        });
        if (document.getElementById('outer_semi')?.value === '적용' && tOuterSemi_mm > 0) coreLayerData3D.push({
            key: 'outer_semi',
            name: 'Outer Semi-con Layer',
            thickness: tOuterSemi_mm,
            color: '#050505',
            applied: true,
            exposure: 'thin'
        });
        if (tapeInsuAbove !== '미적용') coreLayerData3D.push({
            key: 'tape_insu_above',
            name: `Insulation-above Tape (${toEnglishLayerValue(tapeInsuAbove)})`,
            thickness: tTapeInsuAbove_mm,
            color: (tapeInsuAbove === '반도전') ? '#1e293b' : '#cbd5e1',
            applied: true,
            exposure: 'thin'
        });

        const individualLayerData3D = [];
        const individualTarget3D = (coreType === 'CORE') ? 'core' : 'set';
        if (indSeparator !== '미적용' && tIndSep_mm > 0) individualLayerData3D.push({
            key: 'individual_separator',
            name: `Individual Separator (${toEnglishLayerValue(indSeparator)})`,
            thickness: tIndSep_mm,
            radius: rSeparatorOuter_mm,
            color: '#cbd5e1',
            applied: true,
            pattern: indSeparator,
            material: indSeparator,
            target: individualTarget3D,
            exposure: 'between_insulation_assembly'
        });
        if (indShieldType !== '미적용' && tIndScreen_mm > 0) individualLayerData3D.push({
            key: 'individual_shield',
            name: `Individual Shield (${toEnglishLayerValue(indShieldMaterial)})`,
            thickness: tIndScreen_mm,
            radius: rShieldOuter_mm,
            color: getScreenColorNew(indShieldMaterial, indShieldType),
            applied: true,
            pattern: indShieldType,
            material: indShieldMaterial,
            target: individualTarget3D,
            hasDrainWire: /D\s*\/\s*W/i.test(indShieldType),
            exposure: 'between_insulation_assembly'
        });
        if (indScreenTape !== '미적용' && tIndScreenTape_mm > 0) individualLayerData3D.push({
            key: 'individual_shield_tape',
            name: `Shield-above Tape (${toEnglishLayerValue(indScreenTape)})`,
            thickness: tIndScreenTape_mm,
            radius: rShieldTapeOuter_mm,
            color: (indScreenTape === '반도전') ? '#1e293b' : '#cbd5e1',
            applied: true,
            pattern: indScreenTape,
            material: indScreenTape,
            target: individualTarget3D,
            exposure: 'between_insulation_assembly'
        });

        const drainWireData3D = [];
        if (indShieldType !== '미적용' && /D\s*\/\s*W/i.test(indShieldType)) {
            drainWireData3D.push({
                target: individualTarget3D,
                targetMode: individualTarget3D,
                sourceKey: 'individual_shield',
                layerKey: 'individual_shield',
                name: 'D/W',
                material: '구리',
                color: '#b87333',
                radius: (individualTarget3D === 'core') ? rCoreBase_mm : rBundle_mm
            });
        }
        if (ovShieldType !== '미적용' && /D\s*\/\s*W/i.test(ovShieldType)) {
            drainWireData3D.push({
                target: 'overall',
                sourceKey: 'overall_shield',
                layerKey: 'overall_shield',
                name: 'D/W',
                material: '구리',
                color: '#b87333',
                radius: rBinderOuter_mm || rAssemblyOuter_mm
            });
        }

        const outerLayerData3D = [];
        // 연합부/개재는 측면 탈피 길이 0: 3D에서는 얇은 단면 표시용 디스크만 사용합니다.
        if (coreNum > 1 || hasGround) outerLayerData3D.push({
            key: 'filler',
            name: `Cabling / Filler (${toEnglishLayerValue(fillerMaterial)})`,
            thickness: Math.max(rAssemblyOuter_mm - rFinalBundle_mm, 0.01),
            radius: rAssemblyOuter_mm,
            color: '#ffffff',
            applied: true,
            frontOnly: true,
            sideExposure: 0
        });
        if (binderTape !== '미적용') outerLayerData3D.push({
            key: 'binder',
            name: `Overall Binder Tape (${toEnglishLayerValue(binderTape)})`,
            thickness: tBinder_mm,
            radius: rBinderOuter_mm,
            color: '#cbd5e1',
            applied: true,
            exposure: 'thin'
        });
        if (ovShieldType !== '미적용') outerLayerData3D.push({
            key: 'overall_shield',
            name: `Overall Shield (${toEnglishLayerValue(ovShieldMaterial)})`,
            thickness: tOvScreen_mm,
            radius: rOvScreenOuter_mm,
            color: getScreenColorNew(ovShieldMaterial, ovShieldType),
            applied: true,
            pattern: ovShieldType,
            material: ovShieldMaterial,
            exposure: 'long'
        });
        if (beddingType !== '미적용') outerLayerData3D.push({
            key: 'bedding',
            name: `Inner Bedding (${toEnglishLayerValue(beddingMaterial)})`,
            thickness: tBedding_mm,
            radius: rBeddingOuter_mm,
            color: selectedBeddingColor || '#64748b',
            applied: true,
            exposure: 'long'
        });
        if (armourType !== '미적용') {
            let armColor3D = '#94a3b8';
            if (armourMaterial === '알루미늄') armColor3D = '#cbd5e1';
            else if (armourMaterial === '구리') armColor3D = '#b87333';
            else if (armourMaterial === '철 (STA)') armColor3D = '#475569';
            else if (armourMaterial === '아라미드 얀') armColor3D = '#facc15';
            else if (armourMaterial === '폴리에스터 얀') armColor3D = '#e2e8f0';
            outerLayerData3D.push({
                key: 'armour',
                name: `Metal Armour (${toEnglishLayerValue(armourMaterial)})`,
                thickness: tArmour_mm,
                radius: rArmourOuter_mm,
                color: armColor3D,
                applied: true,
                pattern: armourType,
                material: armourMaterial,
                exposure: 'long'
            });
        }
        if (sheathMaterial !== '미적용' && tSheath_mm > 0) outerLayerData3D.push({
            key: 'sheath',
            name: `Outer Sheath (${toEnglishLayerValue(sheathMaterial)})`,
            thickness: tSheath_mm,
            radius: rSheathOuter_mm,
            color: selectedSheathColor || '#1e293b',
            applied: true,
            exposure: 'extra_long'
        });

        window.lastCalculatedCableData = {
            version: '3d-snapshot-v6',
            labelMap: window.lastCableLabelMap || null,
            voltage: volt,
            coreType,
            coreNum,
            perBundle,
            hasGround,
            numGround,
            condClass,
            condMat,
            condSizeText,
            condStrandConfig: selectedStrandConfig3D,
            strandCount: strandCount3D,
            conductorColor: conductorColor3D,
            coreColors: coreColors3D,
            radii: {
                conductor: rCond_mm,
                coreOuter: rCoreBase_mm,
                finalBundle: rFinalBundle_mm,
                assemblyOuter: rAssemblyOuter_mm,
                total: rTotal_mm
            },
            coreLayers: coreLayerData3D.filter(l => l.applied !== false && (l.thickness > 0 || l.key === 'conductor')),
            individualLayers: individualLayerData3D.filter(l => l.applied !== false && l.thickness > 0),
            drainWires3D: drainWireData3D,
            outerLayers: outerLayerData3D.filter(l => l.applied !== false),
            layout: {
                positions: (layoutData.positions || []).map(p => ({
                    dx: p.dx, dy: p.dy || 0, angle: p.angle || 0, isGround: !!p.isGround
                })),
                bundleCoreOffsets: (bundleCoreOffsets || []).map(o => ({ dx: o.dx, dy: o.dy })),
                fillers: (layoutData.fillers || []).map(f => ({ dx: f.dx, dy: f.dy, r: f.r }))
            },
            ground: hasGround ? {
                radiusCond: rGroundCond_mm,
                radiusCore: rGroundCoreBase_mm,
                color: (gInsuColor === 'none') ? conductorColor3D : ((gInsuColor === 'BK') ? '#1e293b' : '#22c55e')
            } : null
        };

        if (window.update3DCableView) window.update3DCableView();
    } catch (e) {
        console.warn('3D 브릿지 데이터 생성 실패:', e);
    }

}

function copySvgToClipboard() {
    const svgElement = document.getElementById('cableSvg');
    const viewBox = svgElement.viewBox.baseVal;
    const width = Math.max(1, Math.ceil(viewBox.width || Number(svgElement.getAttribute('width')) || 750));
    const height = Math.max(1, Math.ceil(viewBox.height || Number(svgElement.getAttribute('height')) || 750));
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height; 
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob(blob => {
            const item = new ClipboardItem({ "image/png": blob });
            navigator.clipboard.write([item]).then(() => {
                alert('단면도 고해상도 이미지가 클립보드에 PNG 포맷으로 복사되었습니다!');
            }).catch(() => alert('클립보드 복사에 실패했습니다.'));
        }, 'image/png');
    };
    image.src = blobURL;
}

async function copySvgAsVectorToClipboard() {
    const svgElement = document.getElementById('cableSvg');
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const htmlString = `<html><body><!--StartFragment-->${svgString}<!--EndFragment--></body></html>`;
    try {
        const blobSvg = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const blobHtml = new Blob([htmlString], { type: "text/html;charset=utf-8" });
        const blobText = new Blob([svgString], { type: "text/plain;charset=utf-8" });
        const item = new ClipboardItem({
            "image/svg+xml": blobSvg, "text/html": blobHtml, "text/plain": blobText
        });
        await navigator.clipboard.write([item]);
        alert('PPT 편집용 벡터 그림(SVG)이 복사되었습니다! PPT에서 Ctrl+V 하신 후 "그룹 해제" 하여 편집하세요.');
    } catch(err) {
        alert('벡터 복사에 실패했습니다.');
    }
}
