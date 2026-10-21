// 전역 DOM 헬퍼 보강
(function(global){
  if (typeof global.$ !== 'function') {
    global.$ = function(id){ return document.getElementById(id); };
  }
})(window);

// ----------------------------------------------------------------------
// [최종 통합] CORS 우회 및 가로형 양식 사양서 부표 app2.js
// ----------------------------------------------------------------------

let config = {};
let cachedRows = [];
let isLocked = false;

// LS 연합외경 계수/CASE 표준 데이터는 shared-material-engine.js의 단일 원천만 사용합니다.

const styleNode = document.createElement("style");
styleNode.innerHTML = `
    #core_range_group, #core_individual_group {
        width: 100% !important;
    }
    .core-chk-label, .size-chk {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #334155 !important;
        background: #ffffff !important;
        padding: 5px 10px !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 6px !important;
        cursor: pointer;
        transition: all 0.15s ease !important;
    }
    .core-chk-label:hover, .size-chk:hover {
        border-color: #3b82f6 !important;
        background-color: #eff6ff !important;
    }
`;
document.head.appendChild(styleNode);

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

function getStandardInsuThickWithValidation(std, nominalArea, material, voltage, nemaLevel, sizeText) {
    const isMV = ['3.6/6kV', '5KV', '6/10KV', '8.0KV', '8.7/15KV', '15KV', '12/20KV', '18/30KV', '25KV', '35KV', '66KV'].includes(voltage);
    const isLV_Control = ['150/250V', '250V', '300V'].includes(voltage);
    let value = 0.8;
    let success = true;

    if (std === 'MANUAL') {
        return { value: parseFloat(config.thick_insu) || 0.8, success: true };
    }

    if (std === 'IEC_60092-353') {
        if (isMV) { success = false; value = 0.0; }
        else if (["XLPE", "HEPR", "XLPO", "LSX"].includes(material)) {
            if (nominalArea <= 16) value = 0.7;
            else if (nominalArea <= 35) value = 0.9;
            else if (nominalArea <= 120) value = 1.1;
            else if (nominalArea <= 185) value = 1.2;
            else value = 1.4;
        } else if (["EPR", "LSE"].includes(material)) {
            if (nominalArea <= 16) value = 1.0;
            else if (nominalArea <= 35) value = 1.2;
            else if (nominalArea <= 120) value = 1.4;
            else value = 1.6;
        } else { value = 1.0; }
    }
    else if (std === 'IEC_60092-354') {
        if (!isMV) { success = false; value = 0.0; }
        else {
            if (voltage.includes("3.6/6")) value = 2.5;
            else if (voltage.includes("6/10")) value = 3.4;
            else if (voltage.includes("8.7/15") || voltage.includes("15KV")) value = 4.5;
            else if (voltage.includes("12/20")) value = 5.5;
            else if (voltage.includes("18/30") || voltage.includes("35KV")) value = 8.0;
            else { value = 0.0; success = false; }
        }
    }
    else if (std === 'IEC_60092-376') {
        if (!isLV_Control || nominalArea > 2.5) { success = false; value = 0.0; }
        else {
            if (nominalArea <= 0.75) value = 0.5;
            else value = 0.6;
        }
    }
    else if (std === 'IEC_60502-1') {
        if (isMV) { success = false; value = 0.0; }
        else if (["XLPE", "HEPR", "XLPO"].includes(material)) {
            if (nominalArea <= 16) value = 0.7;
            else if (nominalArea <= 35) value = 0.9;
            else if (nominalArea === 50) value = 1.0;
            else if (nominalArea <= 95) value = 1.1;
            else if (nominalArea === 120) value = 1.2;
            else if (nominalArea === 150) value = 1.4;
            else value = 1.6;
        } else if (["EPR", "LSE"].includes(material)) {
            if (nominalArea <= 16) value = 1.0;
            else if (nominalArea <= 35) value = 1.2;
            else if (nominalArea <= 70) value = 1.4;
            else if (nominalArea <= 120) value = 1.6;
            else if (nominalArea === 150) value = 1.8;
            else if (nominalArea === 185) value = 2.0;
            else if (nominalArea === 240) value = 2.2;
            else value = 2.4;
        } else { value = 1.0; }
    }
    else if (std === 'IEC_60502-2') {
        if (!isMV) { success = false; value = 0.0; }
        else {
            if (voltage.includes("3.6/6")) value = 2.5;
            else if (voltage.includes("6/10")) value = 3.4;
            else if (voltage.includes("8.7/15")) value = 4.5;
            else if (voltage.includes("12/20")) value = 5.5;
            else if (voltage.includes("18/30")) value = 8.0;
            else { value = 0.0; success = false; }
        }
    }
    else if (std === 'IEEE_1580') {
        if (voltage.includes("300V")) {
            value = ["실리콘", "S", "LSS"].includes(material) ? 0.63 : 0.51;
        } else if (voltage.includes("600V") || voltage.includes("1000V") || voltage.includes("0.6/1kV")) {
            if (["실리콘", "S", "LSS", "PVC"].includes(material)) {
                if (nominalArea <= 6.0) value = 1.14;
                else if (nominalArea <= 35.0) value = 1.52;
                else if (nominalArea <= 107.0) value = 2.03;
                else value = 2.41;
            } else {
                if (nominalArea <= 6.0) value = 0.76;
                else if (nominalArea <= 35.0) value = 1.14;
                else if (nominalArea <= 107.0) value = 1.40;
                else value = 1.65;
            }
        } else {
            if (["실리콘", "S", "LSS", "PVC"].includes(material)) {
                if (nominalArea <= 7.0) value = 1.52;
                else if (nominalArea <= 34.0) value = 1.78;
                else if (nominalArea <= 107.0) value = 2.29;
                else value = 2.67;
            } else {
                if (nominalArea <= 7.0) value = 1.14;
                else if (nominalArea <= 34.0) value = 1.40;
                else if (nominalArea <= 107.0) value = 1.65;
                else value = 1.90;
            }
        }
    } else if (std === 'NEMA_ICEA') {
        let mils = 0;
        if (!isMV) {
            if (nominalArea <= 6.0) {
                mils = (nemaLevel === "133%") ? 45 : 30;
            } else if (nominalArea <= 35.0) {
                mils = (nemaLevel === "133%") ? 60 : 45;
            } else if (nominalArea <= 107.0) {
                mils = (nemaLevel === "133%") ? 80 : 55;
            } else if (nominalArea <= 253.0) {
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
        if (mils > 0) value = parseFloat((mils * 0.0254).toFixed(2));
        else { value = 0.0; success = false; }
    }

    return { value, success };
}


function getArmourThicknessByStandard(std, armourType, diameterUnderArmour) {
    if (!armourType || armourType === "미적용") return { armorVal: 0, armorThick: 0 };
    const type = String(armourType);
    let armorVal = 0;

    if (std && std.startsWith("IEC_60092")) {
        if (type.includes("편조") || type.includes("Braid")) {
            if (diameterUnderArmour <= 10.0) armorVal = 0.2;
            else if (diameterUnderArmour <= 30.0) armorVal = 0.3;
            else armorVal = 0.4;
        } else if (type.includes("횡권") || type.includes("SWA") || type.includes("AWA")) {
            if (diameterUnderArmour <= 15.0) armorVal = 0.8;
            else if (diameterUnderArmour <= 25.0) armorVal = 1.25;
            else if (diameterUnderArmour <= 35.0) armorVal = 1.6;
            else if (diameterUnderArmour <= 45.0) armorVal = 2.0;
            else if (diameterUnderArmour <= 60.0) armorVal = 2.5;
            else armorVal = 3.15;
        } else if (type.includes("테이프") || type.includes("STA")) {
            armorVal = 0.5;
        } else armorVal = 1.0;
        return { armorVal, armorThick: armorVal };
    }

    if (std && std.startsWith("IEC_60502")) {
        if (type.includes("편조") || type.includes("Braid")) {
            if (diameterUnderArmour <= 10.0) armorVal = 0.2;
            else if (diameterUnderArmour <= 30.0) armorVal = 0.3;
            else armorVal = 0.4;
        } else if (type.includes("횡권") || type.includes("SWA") || type.includes("AWA")) {
            if (diameterUnderArmour <= 10.0) armorVal = 0.8;
            else if (diameterUnderArmour <= 15.0) armorVal = 1.25;
            else if (diameterUnderArmour <= 25.0) armorVal = 1.6;
            else if (diameterUnderArmour <= 35.0) armorVal = 2.0;
            else if (diameterUnderArmour <= 60.0) armorVal = 2.5;
            else armorVal = 3.15;
        } else if (type.includes("테이프") || type.includes("STA")) {
            armorVal = diameterUnderArmour <= 30.0 ? 0.2 : 0.5;
        } else armorVal = 1.0;
        return { armorVal, armorThick: armorVal };
    }

    if (type.includes("편조") || type.includes("Braid")) {
        if (diameterUnderArmour <= 10.0) armorVal = 0.3;
        else if (diameterUnderArmour <= 30.0) armorVal = 0.4;
        else armorVal = 0.5;
    } else if (type.includes("횡권") || type.includes("SWA") || type.includes("AWA")) {
        if (diameterUnderArmour <= 15.0) armorVal = 0.8;
        else if (diameterUnderArmour <= 25.0) armorVal = 1.25;
        else if (diameterUnderArmour <= 35.0) armorVal = 1.6;
        else if (diameterUnderArmour <= 45.0) armorVal = 2.0;
        else if (diameterUnderArmour <= 60.0) armorVal = 2.5;
        else armorVal = 3.15;
    } else if (type.includes("테이프") || type.includes("STA")) {
        armorVal = 0.5;
    } else armorVal = 1.0;
    return { armorVal, armorThick: armorVal };
}

function formatThicknessForRule(std, value) {
    const num = parseFloat(value) || 0;
    if (typeof isNorthAmericanRule === "function" ? isNorthAmericanRule(std) : (std === "IEEE_1580" || std === "NEMA_ICEA" || String(std).includes("AEIC") || String(std).includes("ICEA") || String(std).includes("NEMA"))) {
        return num.toFixed(2);
    }
    return num.toFixed(1);
}


function getLSAssemblyFactor(type, count) {
    if (window.LSCablingStandard && typeof window.LSCablingStandard.factor === 'function') {
        return window.LSCablingStandard.factor(type, count, {
            core_type: config.core_type,
            cabling_sheath_method: config.cabling_sheath_method,
            ind_shield_type: config.ind_shield_type,
            ov_shield_type: config.ov_shield_type
        });
    }
    throw new Error('LSCablingStandard is not loaded. Check shared-material-engine.js load order.');
}

document.addEventListener("DOMContentLoaded", () => {
    const saved = sessionStorage.getItem("cable_design_main_config");
    if (saved) {
        try { config = JSON.parse(saved); } catch(e) { console.error("Config 로드 실패:", e); }
    }
    // 도체 표준은 메인화면에서 상속된 값을 우선 사용한다.
    // 사양서 기준 재판별은 도체 DB 키를 흔들기 때문에 금지한다.
    if (window.LSConductorUtils) {
        config.cond_material = LSConductorUtils.normalizeMaterial(config.cond_material || 'copper');
        config.conductorStandard = LSConductorUtils.normalizeStandard(config.conductorStandard || config.conductor_standard || 'IEC');
        config.cond_class = LSConductorUtils.normalizeClass(config.conductorStandard, config.cond_class || '연선');
    }
    
    document.title = config.spec_title || ((config.spec_seq ? config.spec_seq + ". " : "") + (config.cable_name || "CABLE ENGINE"));
    const pageMainTitle = document.getElementById("pageMainTitle");
    if (pageMainTitle) {
        pageMainTitle.textContent = "" + (config.spec_title || ((config.spec_seq ? config.spec_seq + ". " : "") + (config.cable_name || "CABLE ENGINE")));
    }

    const coreInputLabel = document.getElementById("core_input_label");
    const coreListInput = document.getElementById("core_list_input");
    if (coreInputLabel && coreListInput) {
        if (config.core_type === "PAIR") {
            coreInputLabel.textContent = "Pairs 수 리스트 (쉼표로 구분)";
            coreListInput.value = "1~4,8,12,16,24,30";
        } else if (config.core_type === "TRIAD") {
            coreInputLabel.textContent = "Triads 수 리스트 (쉼표로 구분)";
            coreListInput.value = "1~4,8,12,16,20";
        } else {
            coreInputLabel.textContent = "선심수(Cores) 리스트 (쉼표로 구분)";
            coreListInput.value = "1~5,7,10,12,14,16,19,24,27,30,37,48,60,101";
        }
    }

    const sizeContainer = document.getElementById("size_checkbox_container");
    if (sizeContainer && typeof CONDUCTOR_DATABASE_NEW !== 'undefined') {
        sizeContainer.innerHTML = "";
        
        const selectAllSizeLbl = document.createElement("label");
        selectAllSizeLbl.className = "size-chk";
        selectAllSizeLbl.style.backgroundColor = "#eff6ff";
        selectAllSizeLbl.style.borderColor = "#3b82f6";
        selectAllSizeLbl.innerHTML = `<input type="checkbox" id="size_select_all" checked> <b style="color:#2563eb;">전체 선택</b>`;
        sizeContainer.appendChild(selectAllSizeLbl);

        config.conductorStandard = getEffectiveConductorStandard();
        const rawDbPath = getStrictConductorSizeListForSpec();
        // 동일 사이즈의 복수 소선구성은 체크 목록과 부표에 최상단 1건만 표시한다.
        const _seenSpecSizes = new Set();
        const dbPath = rawDbPath.filter(item => {
            const key=String(item.nominalArea);
            if(_seenSpecSizes.has(key)) return false;
            _seenSpecSizes.add(key);
            return true;
        });
        if (!dbPath.length) {
            const warn = document.createElement("div");
            warn.className = "size-chk";
            warn.style.color = "#b91c1c";
            warn.textContent = `도체 DB 조회 실패: material=${config.cond_material}, standard=${config.conductorStandard}, class=${config.cond_class}`;
            sizeContainer.appendChild(warn);
        }
        dbPath.forEach(item => {
            const lbl = document.createElement("label");
            lbl.className = "size-chk";
            lbl.innerHTML = `<input type="checkbox" class="size-chk-item" value="${item.nominalArea}" data-size-text="${item.size}" data-class2od="${item.class2OD}" data-weight="${item.weight}" checked> ${item.size}`;
            sizeContainer.appendChild(lbl);
        });

        selectAllSizeLbl.querySelector('input').addEventListener('change', (e) => {
            const checked = e.target.checked;
            sizeContainer.querySelectorAll('.size-chk-item').forEach(chk => {
                if(!chk.disabled) chk.checked = checked;
            });
        });

        sizeContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('size-chk-item')) {
                const allChks = sizeContainer.querySelectorAll('.size-chk-item');
                const checkedChks = sizeContainer.querySelectorAll('.size-chk-item:checked');
                const selectAll = document.getElementById('size_select_all');
                if (selectAll) {
                    selectAll.checked = (allChks.length === checkedChks.length);
                }
            }
        });
    }

    const configDisplay = document.getElementById("configDisplay");
    if (configDisplay) {
        configDisplay.innerHTML = `
            <div class="info-item">전압 등급: <span>${config.v_rating}</span></div>
            <div class="info-item">도체 재질: <span>${config.cond_material === "copper" ? "동 (구리)" : "알루미늄"}</span></div>
            <div class="info-item">도체 표준: <span>${config.conductorStandard}</span></div>
            <div class="info-item">도체 등급: <span>${config.cond_class}</span></div>
            <div class="info-item">절연 재질: <span>${config.insu_material}</span></div>
            <div class="info-item">베딩 종류: <span>${config.bedding_type}</span></div>
            <div class="info-item">아머 종류: <span>${config.armour_type}</span></div>
            <div class="info-item">시스 재질: <span>${config.sheath_material}</span></div>
            <div class="info-item">두께 기준: <span>${config.thickness_std || "MANUAL"}</span></div>
            <div class="info-item">연합외경: <span>${config.assembly_od_auto || "자동계산"}</span></div>
            <div class="info-break"></div>
        `;
    }

    setTimeout(() => {
        if (typeof generateSpecTable === "function") generateSpecTable();
    }, 0);
});

function parseCoreRangeInput(input) {
    const result = new Set();
    String(input || "").split(",").forEach(part => {
        const token = part.trim();
        if (!token) return;
        const m = token.match(/^(\d+)\s*(?:~|-|–)\s*(\d+)$/);
        if (m) {
            let a = parseInt(m[1], 10), b = parseInt(m[2], 10);
            if (a > b) [a, b] = [b, a];
            for (let n = a; n <= b; n++) result.add(n);
        } else {
            const n = parseInt(token, 10);
            if (!isNaN(n) && n > 0) result.add(n);
        }
    });
    return Array.from(result).filter(n => n > 0).sort((a,b)=>a-b);
}

function getInheritedValue(id, fallback = "") {
    if (Object.prototype.hasOwnProperty.call(config, id)) return config[id];
    return fallback;
}

function getEffectiveConductorStandard() {
    const std = config.conductorStandard || config.conductor_standard || "IEC";
    return window.LSConductorUtils ? LSConductorUtils.normalizeStandard(std) : std;
}

function normalizeSpecConductorClass(std, cls) {
    return window.LSConductorUtils ? LSConductorUtils.normalizeClass(std, cls) : (cls || "연선");
}

function getStrictConductorSizeListForSpec() {
    if (window.LSConductorUtils) {
        config.cond_material = LSConductorUtils.normalizeMaterial(config.cond_material || "copper");
        config.conductorStandard = LSConductorUtils.normalizeStandard(config.conductorStandard || config.conductor_standard || "IEC");
        config.cond_class = LSConductorUtils.normalizeClass(config.conductorStandard, config.cond_class || "연선");
        // 동일 도체 크기에 소선구성이 여러 개인 경우 사양서 부표에는 최상단 구성만 1회 표시한다.
        const seen = new Set();
        return LSConductorUtils.getList(config).filter(item => {
            const key=String(item.nominalArea);
            if(seen.has(key)) return false;
            seen.add(key);
            return true;
        }).map(item => ({
            nominalArea: parseFloat(item.nominalArea),
            size: item.size || item.sizeText || String(item.nominalArea),
            class2OD: parseFloat(item.class2OD),
            weight: parseFloat(item.weight)
        }));
    }
    return [];
}

function formatSpecCondSize(sizeText) {
    // 단위는 부표 헤더에만 표시한다. IEC/ASTM/IEEE 값 셀에는 도체 사이즈만 유지한다.
    return String(sizeText || "")
        .replace(/\s*(SQMM|㎟|MM2|AWG|KCMIL|MCM)\b/gi, "")
        .trim();
}

function generateSpecTable() {
    if (isLocked) return;
    try {
        config.conductorStandard = getEffectiveConductorStandard();
        const std = (typeof normalizeThicknessRuleForCalc === "function") ? normalizeThicknessRuleForCalc(config.thickness_std || config.thickness_rule_mode || "MANUAL", config.v_rating) : (config.thickness_std || "MANUAL");
        const nemaLevel = config.nema_level || "100%";
        
        const coreInputVal = document.getElementById("core_list_input").value;
        let coreList = parseCoreRangeInput(coreInputVal);
                                   
        if (coreList.length === 0) {
            alert("선심수(Cores/Pairs) 리스트를 올바르게 입력해 주세요.");
            return;
        }

        let sizeList = [];
        document.querySelectorAll(".size-chk-item:checked").forEach(chk => {
            sizeList.push({
                nominalArea: parseFloat(chk.value),
                sizeText: chk.getAttribute("data-size-text"),
                class2OD: parseFloat(chk.getAttribute("data-class2od")),
                weight: parseFloat(chk.getAttribute("data-weight"))
            });
        });

        if (sizeList.length === 0) {
            alert("도체 규격을 최소 1개 이상 선택하셔야 합니다.");
            return;
        }

        coreList.sort((a, b) => a - b);
        const tbody = document.getElementById("specTableBody");
        tbody.innerHTML = "";
        cachedRows = [];
        let globalIdx = 0;

        const coresPairsHeader = document.getElementById("coresPairsHeader");
        if (coresPairsHeader) {
            let titleText = "No. of cores";
            if (config.core_type === "PAIR") titleText = "No. of Pairs";
            else if (config.core_type === "TRIAD") titleText = "No. of Triads";
            else if (config.core_type === "QUAD") titleText = "No. of Quads";
            
            coresPairsHeader.style.textAlign = "center";
            coresPairsHeader.innerHTML = `
                <div style="position:relative; display:flex; justify-content:center; align-items:center; width:100%;">
                    <span>${titleText}</span>
                    <input type="checkbox" class="col-selector-chk" data-col-idx="0" checked style="position:absolute; right:2px; cursor:pointer; width:12px; height:12px;">
                </div>
            `;
        }

        const condSizeHeader = document.getElementById("condSizeHeader");
        if (condSizeHeader) {
            const unit = (["ASTM","IEEE_1580"].includes(String(config.conductorStandard).toUpperCase())) ? "AWG/kcmil" : "SQMM";
            condSizeHeader.style.textAlign = "center";
            condSizeHeader.innerHTML = `
                <div style="position:relative; display:flex; justify-content:center; align-items:center; width:100%;">
                    <span>Cond. Size<br>(${unit})</span>
                    <input type="checkbox" class="col-selector-chk" data-col-idx="1" checked style="position:absolute; right:2px; cursor:pointer; width:12px; height:12px;">
                </div>
            `;
        }

        const ths = document.querySelectorAll("#specTable th");
        let thMap = {
            2: "Cond. O.D.",
            3: "Insulation Thick.",
            4: "Assembly O.D.",
            5: "Inner Sheath Thick.",
            6: "Inner Sheath O.D.",
            7: "Armor Wire Dia.",
            8: "Outer Sheath Thick.",
            9: "Overall O.D.",
            10: "O.D ±",
            11: "Approx. Weight"
        };
        
        for (let key in thMap) {
            let colTh = ths[key - 2]; 
            if (key == 2) colTh = ths[2];
            if (key == 3) colTh = ths[3];
            if (key == 4) colTh = ths[4];
            if (key == 5) colTh = ths[5];
            if (key == 6) colTh = ths[6];
            if (key == 7) colTh = ths[7];
            if (key == 8) colTh = ths[8];
            if (key == 9) colTh = ths[9];
            if (key == 10) colTh = ths[10];
            if (key == 11) colTh = ths[11];
            
            if (colTh) {
                let label = thMap[key];
                const bd = (config.bedding_division === "Inner Sheath") ? "Inner Sheath" : "Inner Covering";
                if (key == 2) label = "Cond. O.D.<br>(mm)";
                if (key == 3) label = "Insulation Thick.<br>(mm)";
                if (key == 4) label = "Assembly O.D.<br>(mm)";
                if (key == 5) label = bd + " Thick.<br>(mm)";
                if (key == 6) label = bd + " O.D.<br>(mm)";
                if (key == 7) label = "Armor Wire Dia. / Tape Thick.<br>(mm)";
                if (key == 8) label = "Outer Sheath Thick.<br>(mm)";
                if (key == 9) label = "Overall O.D.<br>(mm)";
                if (key == 10) label = "O.D ±<br>(mm)";
                if (key == 11) label = "Approx. Weight<br>(kg/km)";

                colTh.style.textAlign = "center";
                colTh.innerHTML = `
                    <div style="position:relative; display:flex; justify-content:center; align-items:center; width:100%; min-height:22px;">
                        <span style="font-size:10.5px; text-align:center;">${label}</span>
                        <input type="checkbox" class="col-selector-chk" data-col-idx="${key}" checked style="position:absolute; right:2px; cursor:pointer; width:12px; height:12px;">
                    </div>
                `;
            }
        }

        coreList.forEach(cores => {
            sizeList.forEach(item => {
                try {
                    const rowData = computeSingleRow(cores, item, std, nemaLevel);
                    cachedRows.push(rowData);
                    appendRowDOM(rowData, globalIdx++);
                } catch (rowErr) {
                    console.error(`선심수 ${cores} / 크기 ${item?.sizeText} 연산 도중 에러 무시 처리:`, rowErr);
                }
            });
        });

        // 품명 표시 행은 사양서부표 상단이 아니라 부표 바로 위에 표시한다.
        const nameArea = document.getElementById("productNameEditArea");
        if (nameArea) nameArea.style.display = "flex";

        document.getElementById("catalogCard").style.display = "block";
    } catch (gErr) {
        console.error("일괄 부표 작성 크래시 차단:", gErr);
        alert("일괄 부표 생성 중 에러가 발생했습니다. 입력을 다시 확인해 주세요.");
    }
}

function clearSpecTable() {
    if (isLocked) return;
    document.getElementById("specTableBody").innerHTML = "";
    document.getElementById("catalogCard").style.display = "none";
}

function computeSingleRow(cores, item, std, nemaLevel) {
    if (!window.LSSharedMaterialEngine || typeof LSSharedMaterialEngine.calculateSpecRow !== "function") {
        throw new Error("공통 계산 엔진을 찾을 수 없습니다.");
    }
    config.thickness_std = std || config.thickness_std || config.thickness_rule_mode || "MANUAL";
    config.nema_level = nemaLevel || config.nema_level || "100%";
    const tol = document.getElementById('od_tolerance_percent');
    if (tol) config.od_tolerance_percent = tol.value || '5';
    const row = LSSharedMaterialEngine.calculateSpecRow(config, cores, item);
    row.std = std || row.std;
    return row;
}



function getSpecLossRate(key) {
    const defaults = { conductor:5, insulation:25, bedding:25, sheath:25, other:10 };
    const input = document.getElementById('spec_loss_' + key);
    const fromInput = input ? parseFloat(input.value) : NaN;
    if (!isNaN(fromInput)) {
        config['loss_' + key] = fromInput;
        return fromInput;
    }
    const fromConfig = parseFloat(config['loss_' + key]);
    return isNaN(fromConfig) ? defaults[key] : fromConfig;
}
function getSpecUnitPrice(key, fallback) {
    const idMap = {
        copper:'spec_copper_price',
        insulation:'spec_insu_price',
        bedding:'spec_bedding_price',
        sheath:'spec_sheath_price'
    };
    const input = document.getElementById(idMap[key]);
    const v = input ? parseFloat(input.value) : NaN;
    if (!isNaN(v)) {
        if (key === 'copper') config.calculated_copper_price = String(v);
        if (key === 'insulation') config.insu_base_price = String(v);
        if (key === 'bedding') config.bedding_base_price = String(v);
        if (key === 'sheath') config.sheath_base_price = String(v);
        return v;
    }
    return fallback;
}
function getFillerInfoForSpec() {
    const key = config.filler_material || 'PP';
    const map = {
        'PP': { density: 0.90, price: 4000 },
        'EPDM': { density: 1.20, price: 13900 },
        'PVC': { density: 1.40, price: 3000 },
        '실리콘': { density: 1.15, price: 6000 },
        '나일론': { density: 1.14, price: 4500 },
        'NDPA': { density: 1.14, price: 4500 }
    };
    return map[key] || map.PP;
}

function appendRowDOM(row, idx) {
    const tbody = document.getElementById("specTableBody");
    const tr = document.createElement("tr");
    const isNorth = (row.std === "NEMA_ICEA" || row.std === "IEEE_1580");
    const insuDisp = row.insuThick > 0 ? formatThicknessForRule(row.std, row.insuThick) : formatThicknessForRule(row.std, 0);
    const bedDisp = row.beddingThick > 0 ? formatThicknessForRule(row.std, row.beddingThick) : formatThicknessForRule(row.std, 0);
    const armDisp = row.armorVal > 0 ? formatThicknessForRule(row.std, row.armorVal) : formatThicknessForRule(row.std, 0);
    const shDisp = row.sheathThick > 0 ? formatThicknessForRule(row.std, row.sheathThick) : formatThicknessForRule(row.std, 0);
    const insuClass = row.insuSuccess ? "cell-input" : "cell-input calc-failed-input";
    const beddingClass = row.beddingSuccess ? "cell-input" : "cell-input calc-failed-input";
    const armorClass = row.armorSuccess ? "cell-input" : "cell-input calc-failed-input";
    const sheathClass = row.sheathSuccess ? "cell-input" : "cell-input calc-failed-input";

    let coreSuffix = "C";
    if (config.core_type === "PAIR") coreSuffix = "P";
    else if (config.core_type === "TRIAD") coreSuffix = "T";
    else if (config.core_type === "QUAD") coreSuffix = "Q";

    const numericSize = formatSpecCondSize(row.sizeText);

    tr.innerHTML = `
        <td class="col-bold" data-col-idx="0" style="text-align:center;">${row.cores}${coreSuffix}</td>
        <td class="col-bold" data-col-idx="1" style="text-align:center;">${numericSize}</td>
        <td class="col-num" data-col-idx="2">${row.condOD}</td>
        <td data-col-idx="3"><input type="number" step="0.01" class="cell-input ${insuClass}" data-idx="${idx}" data-field="insuThick" value="${insuDisp}"></td>
        <td class="col-num col-bold" id="assemblyOD_${idx}" data-col-idx="4">${row.insuSuccess ? row.assemblyOD : '오류'}</td>
        <td data-col-idx="5"><input type="number" step="0.01" class="cell-input ${beddingClass}" data-idx="${idx}" data-field="beddingThick" value="${bedDisp}"></td>
        <td class="col-num" id="beddingOD_${idx}" data-col-idx="6">${row.beddingSuccess ? row.beddingOD : '오류'}</td>
        <td data-col-idx="7"><input type="number" step="0.01" class="cell-input ${armorClass}" data-idx="${idx}" data-field="armorVal" value="${armDisp}"></td>
        <td data-col-idx="8"><input type="number" step="0.01" class="cell-input ${sheathClass}" data-idx="${idx}" data-field="sheathThick" value="${shDisp}"></td>
        <td class="col-num col-bold" id="overallOD_${idx}" data-col-idx="9">${row.overallOD}</td>
        <td class="col-num" id="tolerance_${idx}" data-col-idx="10">±${row.tolerance}</td>
        <td class="col-num" id="weight_${idx}" data-col-idx="11">${row.weight.toLocaleString()}</td>
        <td class="col-num col-bold" id="materialCost_${idx}" data-col-idx="12">${(row.totalCostKm || 0).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
}

function recalculateTable() {
    if (isLocked) return;
    try {
        const tbody = document.getElementById("specTableBody");
        if (!tbody) return;
        const rows = tbody.querySelectorAll("tr");
        rows.forEach(tr => {
            const inputs = tr.querySelectorAll(".cell-input");
            if (!inputs.length) return;
            const idx = parseInt(inputs[0].getAttribute("data-idx"));
            const r = cachedRows[idx];
            if (!r) return;

            const overrides = {};
            inputs.forEach(ipt => {
                const f = ipt.getAttribute("data-field");
                overrides[f] = parseFloat(ipt.value) || 0;
            });
            const cfgOverrides = {
                thick_insu: overrides.insuThick,
                thick_bedding: overrides.beddingThick,
                thick_armour: overrides.armorVal,
                thick_sheath: overrides.sheathThick
            };
            const item = {
                nominalArea: r.nominalArea || parseFloat(String(r.sizeText||"").replace(/[^0-9.]/g,'')),
                sizeText: r.sizeText,
                size: r.sizeText,
                class2OD: parseFloat(r.condOD),
                weight: r.dbWeight
            };
            if (document.getElementById('od_tolerance_percent')) config.od_tolerance_percent = document.getElementById('od_tolerance_percent').value || '5';
            const recalced = LSSharedMaterialEngine.calculateSpecRow(config, r.cores, item, cfgOverrides);
            Object.assign(r, recalced);

            const setText = (sel, text) => { const el = tr.querySelector(sel); if (el) el.textContent = text; };
            setText(`#assemblyOD_${idx}`, r.assemblyOD);
            setText(`#beddingOD_${idx}`, r.beddingOD);
            setText(`#overallOD_${idx}`, r.overallOD);
            setText(`#tolerance_${idx}`, `±${r.tolerance}`);
            setText(`#weight_${idx}`, Number(r.weight||0).toLocaleString());
            setText(`#materialCost_${idx}`, Number(r.totalCostKm||0).toLocaleString());
        });
    } catch(err) {
        console.error("수치 수동 변경 재계산 도중 크래시:", err);
        alert("부표 재계산 중 오류: " + (err && err.message ? err.message : err));
    }
}


function copySpecTableToClipboard() {
    const table = document.getElementById('specTable');
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
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(tableText).then(() => {
            alert('사양서 규격 데이터 표가 클립보드에 복사되었습니다! 엑셀(Excel)에 붙여넣어 편집해 보세요.');
        }).catch(err => {
            alert('클립보드 자동 복사에 실패했습니다. 표 전체를 드래그해 수동 복사해 주세요.');
        });
    } else {
        const txtArea = document.createElement("textarea");
        txtArea.value = tableText;
        txtArea.style.position = "fixed";
        txtArea.style.opacity = "0";
        document.body.appendChild(txtArea);
        txtArea.focus();
        txtArea.select();
        try {
            document.execCommand('copy');
            alert('사양서 규격 데이터 표가 복사되었습니다!');
        } catch(e) {
            alert('사내 보안 또는 브라우저 제한으로 복사에 실패했습니다.');
        }
        document.body.removeChild(txtArea);
    }
}


/* =========================================================
 * Integrated from integrated_spec_module during refactor.
 * Original script reference removed from HTML.
 * ========================================================= */
// integrated_spec_module - final spec screen layout/actions/copy/main navigation
(function(){
  const SIZES=[0.5,0.75,1,1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300,400,500,630,800,1000];
  function $(id){return document.getElementById(id);}
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  function loadConfig(){try{const s=sessionStorage.getItem('cable_design_main_config'); if(s){window.config=Object.assign(window.config||{},JSON.parse(s));}}catch(e){}}

  function nval(id, def){ const el=$(id); const v=el?parseFloat(el.value):NaN; return isNaN(v)?def:v; }
  function updateConfigFromSpecInputs(){
    if(!window.config) window.config={};
    const c=window.config;
    if($('spec_copper_price')) c.calculated_copper_price = String($('spec_copper_price').value||'').replace(/,/g,'');
    if($('spec_insu_price')) c.insu_base_price = String($('spec_insu_price').value||'').replace(/,/g,'');
    if($('spec_bedding_price')) c.bedding_base_price = String($('spec_bedding_price').value||'').replace(/,/g,'');
    if($('spec_sheath_price')) c.sheath_base_price = String($('spec_sheath_price').value||'').replace(/,/g,'');
    ['conductor','insulation','bedding','sheath','other'].forEach(k=>{
      const el=$('spec_loss_'+k); if(el) c['loss_'+k]=String(el.value||'').replace(/,/g,'');
    });
    if($('od_tolerance_percent')) c.od_tolerance_percent = String($('od_tolerance_percent').value||'5').replace(/,/g,'') || '5';
    if($('batch_product_name')) { c.cable_name = $('batch_product_name').value || 'CABLE ENGINE'; c.product_name = c.cable_name; c.spec_title = c.cable_name; }
  }

  function getEffectiveConductorStandard(){
    const c=window.config||{};
    const std=c.conductorStandard || c.conductor_standard || 'IEC';
    return window.LSConductorUtils ? LSConductorUtils.normalizeStandard(std) : std;
  }
  function normalizeSpecConductorClass(std, cls){
    return window.LSConductorUtils ? LSConductorUtils.normalizeClass(std, cls) : (cls || '연선');
  }
  function getStrictConductorSizeList(){
    const c=window.config||{};
    if(window.LSConductorUtils){
      c.cond_material=LSConductorUtils.normalizeMaterial(c.cond_material||'copper');
      c.conductorStandard=LSConductorUtils.normalizeStandard(c.conductorStandard||c.conductor_standard||'IEC');
      c.cond_class=LSConductorUtils.normalizeClass(c.conductorStandard, c.cond_class||'연선');
      return LSConductorUtils.getList(c).map(x=>({nominalArea:parseFloat(x.nominalArea), size:x.size||x.sizeText||String(x.nominalArea), class2OD:parseFloat(x.class2OD), weight:parseFloat(x.weight)}));
    }
    return [];
  }
  function cleanCondSizeText(txt){
    const isAstm=String((window.config||{}).conductorStandard||'').toUpperCase()==='ASTM';
    return String(txt||'').replace(/\s*(SQMM|㎟|MM2)\b/gi,'').replace(isAstm?/\s*(AWG|KCMIL|MCM)\b/gi:/a^/,'').trim();
  }
  function isNumericLikeText(v){
    const s=String(v||'').replace(/,/g,'').replace(/^±/,'').trim();
    return s!=='' && /^-?\d+(\.\d+)?$/.test(s);
  }
  function alignSpecTable(){
    const table=$('specTable'); if(!table) return;
    table.querySelectorAll('thead th').forEach(th=>{
      th.style.textAlign='center';
      th.style.verticalAlign='middle';
      const div=th.querySelector('div');
      const chk=th.querySelector('.col-selector-chk');
      if(div){
        div.style.position='relative';
        div.style.justifyContent='center';
        div.style.alignItems='center';
        div.style.width='100%';
      }
      if(chk){
        chk.style.position='absolute';
        chk.style.right='2px';
      }
    });
    table.querySelectorAll('tbody tr').forEach(tr=>{
      [...tr.cells].forEach((td,idx)=>{
        const col=parseInt(td.dataset.colIdx||idx,10);
        const inp=td.querySelector('input');
        const val=(inp?inp.value:td.innerText).trim();
        if(col===0 || col===1) td.style.textAlign='center';
        else if(td.classList.contains('col-num') || isNumericLikeText(val)) td.style.textAlign='right';
      });
    });
  }
  function specHeaderDefinitions(){
    const c=window.config||{};
    const isAstm=String(c.conductorStandard||'').toUpperCase()==='ASTM';
    const bd=(c.bedding_division==='Inner Sheath')?'Inner Sheath':'Inner Covering';
    const coreLabel=(c.core_type==='PAIR')?'Pairs':(c.core_type==='TRIAD')?'Triads':(c.core_type==='QUAD')?'Quads':'Cores';
    return [
      {col:0, main:'No. of', sub:coreLabel, unit:''},
      {col:1, main:'Cond.', sub:'Size', unit:isAstm?'AWG/kcmil':'SQMM'},
      {col:2, main:'Cond.', sub:'O.D.', unit:'mm'},
      {col:3, main:'Insulation', sub:'Thick.', unit:'mm'},
      {col:4, main:'Assembly', sub:'O.D.', unit:'mm'},
      {col:5, main:bd, sub:'Thick.', unit:'mm'},
      {col:6, main:bd, sub:'O.D.', unit:'mm'},
      {col:7, main:'Armor Wire', sub:'Dia./Tape', unit:'mm'},
      {col:8, main:'Outer Sheath', sub:'Thick.', unit:'mm'},
      {col:9, main:'Overall', sub:'O.D.', unit:'mm'},
      {col:10, main:'O.D', sub:'±', unit:'mm'},
      {col:11, main:'Approx.', sub:'Weight', unit:'kg/km'},
      {col:12, main:'재료비', sub:'Material Cost', unit:'원/m'}
    ];
  }

  function ensureSpecHeaders(){
    const table=$('specTable'); if(!table) return;
    let thead=table.querySelector('thead');
    if(!thead){ thead=document.createElement('thead'); table.insertBefore(thead, table.firstChild); }
    const prevChecked=new Map([...table.querySelectorAll('.col-selector-chk')].map(ch=>[parseInt(ch.dataset.colIdx,10), ch.checked]));
    const defs=specHeaderDefinitions();
    thead.innerHTML='<tr></tr>';
    const row=thead.querySelector('tr');
    defs.forEach(def=>{
      const th=document.createElement('th');
      th.dataset.colIdx=String(def.col);
      th.style.width='7.69%';
      th.style.textAlign='center';
      th.style.verticalAlign='middle';
      if(def.col===0) th.id='coresPairsHeader';
      if(def.col===1) th.id='condSizeHeader';
      const checked=prevChecked.has(def.col)?prevChecked.get(def.col):true;
      th.innerHTML=`<div style="position:relative;width:100%;min-height:44px;padding-right:14px;">
        <div class="spec-header-cell">
          <span class="h-main">${def.main}</span>
          <span class="h-sub">${def.sub}</span>
          <span class="h-unit">${def.unit?`(${def.unit})`:''}</span>
        </div>
        <input type="checkbox" class="col-selector-chk" data-col-idx="${def.col}" ${checked?'checked':''} style="position:absolute;right:2px;top:2px;cursor:pointer;width:12px;height:12px;">
      </div>`;
      row.appendChild(th);
    });
    alignSpecTable();
  }
  function renderInheritedConfig(){
    loadConfig();
    const box=$('configDisplay'); if(!box) return;
    const c=window.config||{};
    const clean=(v,def='미적용')=>(v===undefined||v===null||v==='')?def:v;
    const esc=(v)=>String(v ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const simple=(v)=>String(clean(v,'미적용')).replace(/\s*\([^)]*\)\s*/g,'').trim() || '미적용';
    const isAstm=String(c.conductorStandard||'').toUpperCase()==='ASTM';
    const rawSize=String(clean(c.cond_size,'')).replace(/\s*(SQMM|㎟|MM2)\b/gi,'').trim();
    const size = rawSize ? (isAstm ? rawSize : rawSize + ' SQMM') : '';
    const productOnly = clean(c.cable_name||c.product_name,'CABLE ENGINE');
    const coreSuffix = c.core_type==='PAIR'?'P':c.core_type==='TRIAD'?'T':c.core_type==='QUAD'?'Q':'C';
    const representative = [
      clean(c.v_rating,''), productOnly,
      clean(c.core_num,'') + coreSuffix,
      'x', size
    ].filter(Boolean).join(' ');

    const conductorInfo = [
      clean(c.conductorStandard||c.conductor_standard,'IEC'),
      clean(c.cond_coating,'A'),
      clean(c.cond_class,'연선')
    ].filter(Boolean).join(' ');
    const beddingKind = (c.standard_iec60092_bedding_inner_mode && c.standard_iec60092_bedding_inner_mode !== '미적용')
      ? simple(c.standard_iec60092_bedding_inner_mode)
      : (c.bedding_division === 'Inner Sheath' ? '이너시스' : (c.bedding_type && c.bedding_type !== '미적용' ? simple(c.bedding_type) : '미적용'));
    const beddingText = beddingKind === '미적용' ? '미적용' : [beddingKind, clean(c.bedding_material,'PVC')].filter(Boolean).join(', ');
    const armourType = simple(c.armour_type || c.armour_type_new || '미적용');
    const armourText = armourType === '미적용' ? '미적용' : [armourType, clean(c.armour_material || c.armour_material_new,'아연도철선')].filter(Boolean).join(', ');
    const inheritText = [
      `도체 정보 (${conductorInfo})`,
      `내도 (${clean(c.inner_semi,'미적용')})`,
      `절연 (${clean(c.insu_material,'XLPE')})`,
      `외도 (${clean(c.outer_semi,'미적용')})`,
      `베딩 (${beddingText})`,
      `외장 (${armourText})`,
      `시스 (${clean(c.sheath_material,'PVC')})`
    ].join(' ');

    const digits=(v,def)=> {
      const raw=String(v==null||v===''?def:v).replace(/,/g,'');
      const n=Number(raw);
      return Number.isFinite(n) ? n.toLocaleString() : raw;
    };
    const copper=digits(c.calculated_copper_price,21916);
    const fmt=digits;
    box.classList.add('spec-config-grid');
    box.innerHTML=`
      <div class="spec-config-line spec-representative-line">
        <span><b>대표 제품</b> : <em>${esc(representative)}</em></span>
      </div>
      <div class="spec-config-line spec-inherit-line">
        <span><b>상속 정보</b> : <em>${esc(inheritText)}</em></span>
      </div>
      <div class="spec-config-line compact spec-price-line">
        <span>구리 단가 <input id="spec_copper_price" class="spec-mini-input" type="text" inputmode="numeric" value="${esc(copper)}"> 원/kg</span>
        <span>절연 <input id="spec_insu_price" class="spec-mini-input" type="text" inputmode="numeric" value="${esc(fmt(c.insu_base_price,3400))}"> 원/kg</span>
        <span>${(c.bedding_division==='Inner Sheath'?'Inner Sheath':'Inner Covering')} <input id="spec_bedding_price" class="spec-mini-input" type="text" inputmode="numeric" value="${esc(fmt(c.bedding_base_price,2400))}"> 원/kg</span>
        <span>시스 <input id="spec_sheath_price" class="spec-mini-input" type="text" inputmode="numeric" value="${esc(fmt(c.sheath_base_price,2800))}"> 원/kg</span>
        <span>도체 Loss <input id="spec_loss_conductor" class="spec-mini-input" type="text" inputmode="decimal" value="${esc(fmt(c.loss_conductor,5))}"> %</span>
        <span>절연 Loss <input id="spec_loss_insulation" class="spec-mini-input" type="text" inputmode="decimal" value="${esc(fmt(c.loss_insulation,25))}"> %</span>
        <span>베딩 Loss <input id="spec_loss_bedding" class="spec-mini-input" type="text" inputmode="decimal" value="${esc(fmt(c.loss_bedding,25))}"> %</span>
        <span>시스 Loss <input id="spec_loss_sheath" class="spec-mini-input" type="text" inputmode="decimal" value="${esc(fmt(c.loss_sheath,25))}"> %</span>
        <span>기타 Loss <input id="spec_loss_other" class="spec-mini-input" type="text" inputmode="decimal" value="${esc(fmt(c.loss_other,10))}"> %</span>
        <span>O.D ± <input id="od_tolerance_percent" class="spec-mini-input" type="text" inputmode="decimal" value="${esc(fmt(c.od_tolerance_percent,5))}"> %</span>
      </div>`;

    // 품명(수정가능)은 상단 정보창이 아니라 아래쪽 부표 바로 위에 배치한다.
    const card=$('catalogCard');
    const table=$('specTable');
    let area=$('productNameEditArea');
    if(card && table){
      if(!area){
        area=document.createElement('div');
        area.id='productNameEditArea';
        area.className='spec-product-name-area';
        card.insertBefore(area, table);
      }
      area.style.display = (card.style.display === 'none') ? 'none' : 'flex';
      area.innerHTML=`
        <label class="spec-product-edit-label" for="batch_product_name">품명(수정가능)</label>
        <input id="batch_product_name" class="spec-product-input" type="text" value="${esc(productOnly)}" autocomplete="off">
      `;
    }

    const productInput=$('batch_product_name');
    if(productInput){
      productInput.addEventListener('input',()=>{
        if(!window.config) window.config={};
        window.config.cable_name = productInput.value || 'CABLE ENGINE';
        window.config.product_name = productInput.value || 'CABLE ENGINE';
        window.config.spec_title = productInput.value || representative;
        try{ sessionStorage.setItem('cable_design_main_config', JSON.stringify(window.config)); }catch(e){}
        const title=$('pageMainTitle');
        if(title) title.textContent = '' + (productInput.value || representative);
      });
      const title=$('pageMainTitle');
      if(title) title.textContent = '' + (productInput.value || representative);
    }
    box.querySelectorAll('input').forEach(inp=>{
      if(inp.id==='batch_product_name') return;
      const normalize=()=>{
        const raw=String(inp.value||'').replace(/,/g,'').trim();
        if(raw!=='' && !isNaN(Number(raw))) inp.value=Number(raw).toLocaleString();
      };
      inp.addEventListener('blur', normalize);
      inp.addEventListener('input',()=>{
        updateConfigFromSpecInputs();
        if($('specTableBody')?.children.length && typeof recalculateTable==='function') recalculateTable();
      });
    });
    const cardBox=box.closest('.info-card');
    if(cardBox) cardBox.classList.add('inherited-config-panel');
  }

  window.goBackToMain=function(){
    // file:// 환경에서는 opener 접근이 브라우저 보안 오류를 만들 수 있으므로 직접 이동 처리
    if (window.location.protocol !== 'file:') {
      try{ if(window.opener && !window.opener.closed){ window.opener.focus(); return; } }catch(e){}
    }
    window.location.href='index.html';
  };


  window.guardedGenerateSpecTable=function(){
    if(window.__specLocked){
      alert('이미 확정된 부표입니다. 수정하려면 확정해제 후 다시 작업하세요.');
      return;
    }
    return window.generateSpecTable && window.generateSpecTable();
  };
  window.guardedClearSpecTable=function(){
    if(window.__specLocked){
      alert('이미 확정된 부표입니다. 수정하려면 확정해제 후 다시 작업하세요.');
      return;
    }
    return window.clearSpecTable && window.clearSpecTable();
  };

  function buildControls(){
    loadConfig();
    const panel=$('inputControlPanel'); if(!panel) return;
    panel.classList.add('spec-wide-console');
    const grid=panel.querySelector('.control-grid'); if(!grid) return;
    grid.innerHTML=`
      <div class="spec-core-box">
        <div class="spec-box-title">선심수 선택</div>
        <div class="spec-inline-row">
          <label class="spec-core-check-title"><input id="core_range_enabled" type="checkbox" checked> 범위 선택</label><input id="core_start_input" type="number" value="1" min="1">
          <span>~</span><input id="core_end_input" type="number" value="3" min="1">
        </div>
        <div class="spec-inline-row">
          <label class="spec-core-check-title"><input id="core_list_enabled" type="checkbox"> 개별 선택</label><input id="core_list_input" type="text" value="" placeholder="예: 1,2,3,5 또는 1~3">
        </div>
        <input id="thickness_rule_mode_spec" type="hidden" value="${(window.config&&window.config.thickness_std)||'MANUAL'}">
      </div>
      <div class="spec-size-box">
        <div class="spec-size-head"><span class="spec-box-title">도체 선택</span><label class="spec-all-check"><input type="checkbox" id="size_select_all" checked> 전체선택</label></div>
        <div class="checkbox-scroll-box spec-size-grid" id="size_checkbox_container"></div>
      </div>
      <div class="spec-button-zone">
        <div class="spec-button-group spec-write-group">
          <button class="spec-btn spec-blue" onclick="guardedGenerateSpecTable()">부표작성</button>
          <button class="spec-btn spec-gray" onclick="guardedClearSpecTable()">초기화</button>
          <button class="spec-btn spec-black" id="specLockBtn" onclick="toggleSpecLock()">확정</button>
        </div>
        <div class="spec-button-group spec-copy-group">
          <button class="spec-btn spec-red" onclick="if(typeof recalculateTable===\'function\') recalculateTable(); else guardedGenerateSpecTable();">수정값 재계산</button>
          <button class="spec-btn spec-gray" onclick="copySelectedSpecAsImage()">선택복사</button>
          <button class="spec-btn spec-gray" onclick="copySpecTableToExcel()">엑셀복사</button>
        </div>
      </div>`;
    buildSizeChecks();
  }

  function buildSizeChecks(){
    const box=$('size_checkbox_container'); if(!box) return;
    const prev = new Set([...box.querySelectorAll('.size-chk-item:checked')].map(ch=>String(ch.value)));
    const hadItems = box.querySelectorAll('.size-chk-item').length > 0;
    let list=[];
    try{ list=getStrictConductorSizeList(); }catch(e){ list=[]; }
    list.sort((a,b)=>parseFloat(a.nominalArea)-parseFloat(b.nominalArea));
    box.innerHTML='';
    if(!list.length){
      const warn=document.createElement('div');
      warn.className='size-chk';
      warn.style.color='#b91c1c';
      warn.textContent=`도체 DB 조회 실패: material=${(window.config||{}).cond_material}, standard=${(window.config||{}).conductorStandard}, class=${(window.config||{}).cond_class}`;
      box.appendChild(warn);
    }
    list.forEach(item=>{
      const lbl=document.createElement('label');
      lbl.className='size-chk size-chk-item-label';
      const checked = hadItems ? prev.has(String(item.nominalArea)) : true;
      lbl.innerHTML=`<input type="checkbox" class="size-chk-item" value="${item.nominalArea}" data-size-text="${item.size}" data-class2od="${item.class2OD}" data-weight="${item.weight}" ${checked?'checked':''}> ${item.size}`;
      box.appendChild(lbl);
    });
    const all=$('size_select_all');
    if(all){
      const sync=()=>{ const items=[...box.querySelectorAll('.size-chk-item')]; all.checked=items.length>0 && items.every(ch=>ch.checked); };
      if(!all.dataset.bound){all.dataset.bound='1'; all.onchange=e=>box.querySelectorAll('.size-chk-item').forEach(ch=>ch.checked=e.target.checked);}
      box.onchange=sync; sync();
    }
  }

  function applyHeaderAndLabels(){
    document.querySelectorAll('#specTable thead tr:nth-child(2)').forEach(tr=>tr.remove());
    document.querySelectorAll('#specTable th').forEach(th=>{ th.rowSpan=1; th.style.textAlign='center'; th.style.verticalAlign='middle'; });
    const nameLbl=document.querySelector('#productNameEditArea .spec-product-edit-label');
    if(nameLbl) nameLbl.textContent='품명(수정가능)';
    const nameArea=document.getElementById('productNameEditArea');
    if(nameArea) nameArea.style.display='flex';
    const card=document.querySelector('.info-card'); if(card) card.classList.add('inherited-highlight');
    ensureSpecHeaders();
  }

  function getCoreInputValue(){
    const parts=[];
    const rangeOn=$('core_range_enabled')?.checked;
    const listOn=$('core_list_enabled')?.checked;
    if(rangeOn){
      const a=parseInt($('core_start_input')?.value||'1',10), b=parseInt($('core_end_input')?.value||'3',10);
      parts.push(`${Math.min(a,b)}~${Math.max(a,b)}`);
    }
    if(listOn){
      const list=($('core_list_input')?.value||'').trim();
      if(list) parts.push(list);
    }
    if(!rangeOn && !listOn){
      const list=($('core_list_input')?.value||'').trim();
      if(list) parts.push(list);
    }
    return parts.join(',');
  }


  let origGen=null, origClear=null;
  let suppressInitialAutoGenerate=true;
  function wrapFunctions(){
    if(typeof window.generateSpecTable==='function' && !origGen){
      origGen=window.generateSpecTable;
      window.generateSpecTable=function(){
        if(suppressInitialAutoGenerate && !(window.event && window.event.isTrusted)){
          suppressInitialAutoGenerate=false;
          clearSpecInitialView();
          return;
        }
        suppressInitialAutoGenerate=false;
        if(window.__specLocked){
          alert('이미 확정된 부표입니다. 수정하려면 확정해제 후 다시 작업하세요.');
          return;
        }
        loadConfig(); updateConfigFromSpecInputs();
        const hidden=$('core_list_input');
        const v=getCoreInputValue();
        if(hidden) hidden.value=v;
        const r=origGen.apply(this,arguments);
        setTimeout(()=>{applyHeaderAndLabels(); addMaterialCostIfMissing();},30);
        return r;
      };
    }
    if(typeof window.clearSpecTable==='function' && !origClear){
      origClear=window.clearSpecTable;
      window.clearSpecTable=function(){
        if(window.__specLocked){
          alert('이미 확정된 부표입니다. 수정하려면 확정해제 후 다시 작업하세요.');
          return;
        }
        const r=origClear.apply(this,arguments);
        return r;
      };
    }
  }

  window.toggleSpecLock=function(){
    window.__specLocked=!window.__specLocked;
    const locked=!!window.__specLocked;
    const btn=$('specLockBtn'); if(btn) btn.textContent=locked?'확정해제':'확정';

    const lockSelectors=[
      '#specTable input',
      '#batch_product_name',
      '#productNameEditArea input',
      '#configDisplay input',
      '#inputControlPanel input',
      '#inputControlPanel select',
      '#size_checkbox_container input'
    ];
    document.querySelectorAll(lockSelectors.join(',')).forEach(el=>{ el.disabled=locked; });

    function isAllowedCopyButton(el){
      const t=(el.textContent||'').trim();
      const on=String(el.getAttribute('onclick')||'');
      return t.includes('선택복사') || t.includes('엑셀복사') || on.includes('copySelectedSpecAsImage') || on.includes('copySpecTableToExcel');
    }

    document.querySelectorAll('#inputControlPanel button, .spec-button-zone button').forEach(el=>{
      if(el.id === 'specLockBtn'){
        el.disabled=false;
        el.classList.remove('spec-lock-keep-active');
      }else if(isAllowedCopyButton(el)){
        el.disabled=false;                  // 선택복사/엑셀복사는 잠그지 않음
        el.classList.add('spec-lock-keep-active');
      }else{
        el.disabled=locked;                 // 나머지는 모두 잠금
        el.classList.remove('spec-lock-keep-active');
      }
    });
    if(btn) btn.disabled=false;
    const panel=$('inputControlPanel'); if(panel) panel.classList.toggle('spec-lock-disabled', locked);
    try{ if(typeof window.ensureTinyButtonEmojis==='function') window.ensureTinyButtonEmojis(); }catch(e){}
  };
  function unlockInputs(){
    window.__specLocked=false;
    const btn=$('specLockBtn'); if(btn) btn.textContent='확정';
    document.querySelectorAll('#specTable input, #batch_product_name, #productNameEditArea input, #configDisplay input, #inputControlPanel input, #inputControlPanel select, #size_checkbox_container input').forEach(el=>el.disabled=false);
    document.querySelectorAll('#inputControlPanel button, .spec-button-zone button').forEach(el=>{ el.disabled=false; el.classList.remove('spec-lock-keep-active'); });
    const panel=$('inputControlPanel'); if(panel) panel.classList.remove('spec-lock-disabled');
    try{ if(typeof window.ensureTinyButtonEmojis==='function') window.ensureTinyButtonEmojis(); }catch(e){}
  }

  function addMaterialCostIfMissing(){
    // 중량 바로 우측에 재료비(원/m) 열을 동일 서식으로 유지
    const table=$('specTable'); if(!table) return;
    const head=table.querySelector('thead tr:first-child'); if(head){
      [...head.children].forEach(th=>{ if(th.innerText.trim()==='' || th.style.background==='transparent') th.remove(); });
      let costTh=[...head.children].find(th=>(th.innerText||'').includes('재료비') || (th.innerText||'').includes('Material Cost'));
      if(!costTh){ costTh=document.createElement('th'); head.appendChild(costTh); }
      costTh.dataset.colIdx='12';
      costTh.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;"><span>재료비(원/m)</span><input type="checkbox" class="col-selector-chk" data-col-idx="12"></div>';
    }
    document.querySelectorAll('#specTableBody tr').forEach(tr=>{
      [...tr.children].forEach(td=>{ if((td.innerText||'').trim()==='' && !td.querySelector('input')) td.remove(); });
      let td=tr.querySelector('[data-col-idx="12"]');
      if(!td){ td=document.createElement('td'); td.className='col-num col-bold'; td.dataset.colIdx='12'; tr.appendChild(td); }
      if(!td.innerText.trim() || td.innerText.trim()==='-'){
        const idx=Array.from(tr.parentNode.children).indexOf(tr);
        const r=(window.cachedRows||[])[idx];
        td.textContent=(r&&r.totalCostKm?Number(r.totalCostKm).toLocaleString():'0');
      }
    });
    document.querySelectorAll('.col-selector-chk[data-col-idx="4"], .col-selector-chk[data-col-idx="12"]').forEach(ch=>{ ch.checked=false; });
    ensureSpecHeaders();
    alignSpecTable();
    document.querySelectorAll('#specTable th').forEach(th=>{ th.style.width='7.69%'; });
  }

  window.copySpecTableToExcel=function(){
    const table=$('specTable'); if(!table){alert('복사할 부표가 없습니다.');return;}
    ensureSpecHeaders(); alignSpecTable();
    const clone=table.cloneNode(true);
    clone.querySelectorAll('.row-selector-cell, .row-selector-header').forEach(el=>el.remove());
    clone.querySelectorAll('input').forEach(inp=>{
      if(inp.type==='checkbox'){ inp.remove(); return; }
      const span=document.createElement('span'); span.textContent=inp.value; span.style.display='inline-block'; span.style.width='100%'; span.style.textAlign='right'; inp.replaceWith(span);
    });
    const cols=13;
    clone.style.tableLayout='fixed';
    clone.style.width='100%';
    clone.querySelectorAll('thead th, tbody td').forEach(cell=>{
      cell.style.width=(100/cols)+'%';
      cell.style.minWidth=(100/cols)+'%';
      cell.style.maxWidth=(100/cols)+'%';
      cell.style.verticalAlign='middle';
    });
    clone.querySelectorAll('thead th').forEach(th=>{
      th.style.textAlign='center';
      th.style.fontWeight='900';
    });
    clone.querySelectorAll('tbody tr').forEach(tr=>{
      [...tr.cells].forEach((td,idx)=>{
        const col=parseInt(td.dataset.colIdx||idx,10);
        const val=(td.innerText||'').trim();
        if(col===0 || col===1) td.style.textAlign='center';
        else if(td.classList.contains('col-num') || isNumericLikeText(val)) td.style.textAlign='right';
      });
    });
    const html='<html><body>'+clone.outerHTML+'</body></html>';
    const txt=[...clone.rows].map(r=>[...r.cells].map(c=>(c.innerText||'').trim()).join('\t')).join('\n');
    if(navigator.clipboard && window.ClipboardItem){
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], {type:'text/html'}),
        'text/plain': new Blob([txt], {type:'text/plain'})
      })]).then(()=>alert('엑셀복사 완료')).catch(()=>{
        const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); alert('엑셀복사 완료');
      });
    }else{
      const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); alert('엑셀복사 완료');
    }
  };

  function selectedColumnIndexes(){
    const checks=[...document.querySelectorAll('.col-selector-chk')];
    const selected=checks.filter(ch=>ch.checked).map(ch=>parseInt(ch.dataset.colIdx,10));
    return selected.length?selected:[0,1,2,3,5,7,8,9,10,11];
  }
  window.copySelectedSpecAsImage=async function(){
    const table=$('specTable'); if(!table || !$('specTableBody')?.children.length){alert('복사할 부표가 없습니다.');return;}
    ensureSpecHeaders(); alignSpecTable();
    const cols=selectedColumnIndexes();
    const defs=specHeaderDefinitions();
    const defMap=new Map(defs.map(d=>[d.col,d]));
    const name=($('batch_product_name')?.value||((window.config&&window.config.cable_name)||'CABLE ENGINE')).trim();
    const bodyRows=[...table.querySelectorAll('tbody tr')].filter(tr=>!tr.querySelector('.row-selector-chk') || tr.querySelector('.row-selector-chk').checked);
    const header=cols.map(i=>{
      const d=defMap.get(i) || {main:'',sub:'',unit:''};
      return [d.main, d.sub, d.unit?`(${d.unit})`:'' ];
    });
    const rows=bodyRows.map(tr=>cols.map(i=>{
      const cell=tr.querySelector(`[data-col-idx="${i}"]`);
      if(!cell) return '';
      const inp=cell.querySelector('input'); return (inp?inp.value:cell.innerText).trim();
    }));

    // 선택복사 이미지는 부표 위에 품명 한 줄만 표시합니다.
    const font='12px Arial', headerFont='bold 11px Arial', pad=8, bodyRowH=24, headerH=48, titleH=36;
    const colW=Math.max(96, Math.floor(1200 / Math.max(cols.length,1)));
    const w=Math.min(Math.max(colW*cols.length+2,720),4000);
    const h=Math.min(titleH+headerH+rows.length*bodyRowH+2,4000);
    const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d'); ctx.textBaseline='middle';

    function drawFittedText(text, x, y, maxW, fontPx, color, weight='900', minPx=9){
      let px=fontPx;
      ctx.fillStyle=color;
      ctx.font=`${weight} ${px}px Arial`;
      while(px > minPx && ctx.measureText(text).width > maxW){
        px -= 1;
        ctx.font=`${weight} ${px}px Arial`;
      }
      ctx.fillText(text, x, y);
    }

    ctx.fillStyle='#dbeafe'; ctx.fillRect(1,1,w-2,titleH-2);
    ctx.strokeStyle='#93c5fd'; ctx.lineWidth=1.5; ctx.strokeRect(1,1,w-2,titleH-2);
    ctx.textAlign='left';
    drawFittedText(name, 14, titleH/2, w-28, 18, '#050505', '900', 10);

    let y=titleH;
    ctx.font=headerFont;
    let x=1;
    header.forEach((parts,i)=>{
      ctx.fillStyle='#1e293b'; ctx.fillRect(x,y,colW,headerH);
      ctx.strokeStyle='#cbd5e1'; ctx.strokeRect(x,y,colW,headerH);
      ctx.fillStyle='#ffffff'; ctx.textAlign='center';
      ctx.fillText(parts[0]||'', x+colW/2, y+12);
      ctx.fillText(parts[1]||'', x+colW/2, y+25);
      ctx.fillStyle='#bfdbfe';
      ctx.fillText(parts[2]||'', x+colW/2, y+39);
      x+=colW;
    });
    y+=headerH;
    ctx.font=font;
    rows.forEach((r,ri)=>{
      let x=1;
      ctx.fillStyle=ri%2?'#ffffff':'#f8fafc'; ctx.fillRect(1,y,w-2,bodyRowH);
      cols.forEach((col,i)=>{
        ctx.strokeStyle='#cbd5e1'; ctx.strokeRect(x,y,colW,bodyRowH); 
        ctx.fillStyle='#0f172a';
        const text=r[i]||'';
        if(col===0 || col===1){ ctx.textAlign='center'; ctx.fillText(text,x+colW/2,y+bodyRowH/2); }
        else if(isNumericLikeText(text)){ ctx.textAlign='right'; ctx.fillText(text,x+colW-pad,y+bodyRowH/2); }
        else { ctx.textAlign='left'; ctx.fillText(text,x+pad,y+bodyRowH/2); }
        x+=colW;
      });
      y+=bodyRowH;
    });
    ctx.textAlign='left';
    try{const blob=await new Promise(res=>canvas.toBlob(res,'image/png')); await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]); alert('선택 항목 이미지 복사 완료');}
    catch(e){console.warn(e); const win=window.open(); win.document.write('<img src="'+canvas.toDataURL('image/png')+'">');}
  };


  function clearSpecInitialView(){
    const body=$('specTableBody'); if(body) body.innerHTML='';
    const card=$('catalogCard'); if(card) card.style.display='none';
    const nameArea=$('productNameEditArea'); if(nameArea) nameArea.style.display='none';
    window.cachedRows=[];
    unlockInputs();
  }

  function init(){
    loadConfig();
    // 외부 동기화/스토리지 이벤트에서도 같은 렌더 함수를 재사용할 수 있도록 공개
    window.renderInheritedConfig = renderInheritedConfig;
    window.buildSpecSizeChecks = buildSizeChecks;
    window.applySpecHeaderAndLabels = applyHeaderAndLabels;

    buildControls(); renderInheritedConfig(); applyHeaderAndLabels(); wrapFunctions(); clearSpecInitialView();
    setTimeout(()=>{wrapFunctions(); buildSizeChecks(); renderInheritedConfig(); clearSpecInitialView();},80);
  }
  ready(init);
})();


/* =========================================================
 * 2026-07-03 requested spec patch
 * - 사양서부표 생성 버튼도 소형 이모티콘 자동 부여
 * - 메인 PART1 변경 broadcast 수신 시 미확정 부표만 재동기화
 * ========================================================= */
(function(){
  if(window.__lsRequest20260703SpecPatch) return;
  window.__lsRequest20260703SpecPatch = true;

  // Decorative button emojis were removed to keep all screens visually consistent.
  window.ensureTinyButtonEmojis = function(){ return; };
  function refreshIcons(){}

  window.addEventListener('storage', function(e){
    if(e.key !== 'cable_design_main_config_broadcast' || window.__specLocked) return;
    try{
      const payload=JSON.parse(e.newValue || '{}');
      if(!payload || !payload.config) return;
      window.config = Object.assign(window.config || {}, payload.config);
      sessionStorage.setItem('cable_design_main_config', JSON.stringify(window.config));
      if(typeof window.renderInheritedConfig === 'function') window.renderInheritedConfig();
      if(typeof window.buildSpecSizeChecks === 'function') window.buildSpecSizeChecks();
      if(document.getElementById('specTableBody')?.children.length && typeof window.generateSpecTable === 'function'){
        window.generateSpecTable();
      }
      if(typeof window.applySpecHeaderAndLabels === 'function') window.applySpecHeaderAndLabels();
      refreshIcons();
    }catch(err){ console.warn('메인화면 config 동기화 실패:', err); }
  });
})();


/* TECH DATA / SPEC SHEET 확정 연동 */
(function () {
  function safeStore(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.warn('저장 실패:', e); return false; }
  }
  window.confirmSpecTableRows = function () {
    try {
      if (!Array.isArray(cachedRows) || cachedRows.length === 0) {
        alert('확정할 사양서 부표가 없습니다. 먼저 “부표 일괄 작성”을 실행해 주세요.');
        return;
      }
      if (typeof recalculateTable === 'function') recalculateTable();
      const body = document.getElementById('specTableBody');
      if (body && !body.children.length) {
        alert('확정할 사양서 부표가 없습니다.');
        return;
      }
      const selectedColumns = Array.from(document.querySelectorAll('.col-selector-chk'))
        .filter(function (el) { return el.checked; })
        .map(function (el) { return Number(el.dataset.colIdx); })
        .filter(Number.isFinite);
      safeStore('cable_spec_rows', cachedRows);
      safeStore('cable_design_main_config', config || {});
      safeStore('cable_spec_selected_columns', selectedColumns.length ? selectedColumns : [0,1,2,3,5,7,8,9,10,11]);
      window.__specRowsConfirmed = true;
      alert('사양서 부표가 확정되었습니다. TECH DATA와 SPEC SHEET에서 확정된 데이터를 사용할 수 있습니다.');
    } catch (e) {
      console.error(e); alert('부표 확정 중 오류가 발생했습니다.');
    }
  };
  window.openTechDataPage = function () {
    if (!Array.isArray(cachedRows) || !cachedRows.length) {
      alert('먼저 사양서 부표를 작성한 뒤 “확정”을 눌러주세요.');
      return;
    }
    if (!window.__specRowsConfirmed && !confirm('현재 부표를 확정하고 TECH DATA를 여시겠습니까?')) return;
    if (!window.__specRowsConfirmed) window.confirmSpecTableRows();
    window.open('tech-data.html?instance=' + Date.now(), '_blank');
  };
  window.openSpecSheetPage = function () {
    if (!sessionStorage.getItem('cable_spec_rows')) {
      alert('먼저 사양서 부표를 확정해 주세요.');
      return;
    }
    window.open('spec-sheet.html?instance=' + Date.now(), '_blank');
  };
})();

/* Confirmed-row selection and downstream linkage */
(function(){
  function store(key,value){try{sessionStorage.setItem(key,JSON.stringify(value));}catch(e){}}
  function rowChecks(){return [...document.querySelectorAll('#specTableBody .row-selector-chk')];}
  function selectedIndexes(){return rowChecks().filter(x=>x.checked).map(x=>Number(x.dataset.rowIndex)).filter(Number.isFinite);}
  function syncMaster(){
    const all=rowChecks(), master=document.getElementById('specRowSelectAll');
    if(master){master.checked=!!all.length&&all.every(x=>x.checked);master.indeterminate=all.some(x=>x.checked)&&!master.checked;}
  }
  function ensureRowSelectors(){
    const table=document.getElementById('specTable'), body=document.getElementById('specTableBody');
    if(!table||!body)return;
    const head=table.querySelector('thead tr');
    if(head&&!head.querySelector('.row-selector-header')){
      const th=document.createElement('th');th.className='row-selector-header';th.style.cssText='width:24px;min-width:24px;padding:0;border-right:0;text-align:center;vertical-align:middle;';
      th.innerHTML='<input id="specRowSelectAll" type="checkbox" title="Select all rows" style="margin:0;width:14px;height:14px;">';
      head.insertBefore(th,head.firstChild);
      th.querySelector('input').addEventListener('change',e=>{rowChecks().forEach(x=>x.checked=e.target.checked);syncMaster();});
    }
    [...body.rows].forEach((tr,i)=>{
      tr.dataset.rowIndex=String(i);
      if(!tr.querySelector('.row-selector-cell')){
        const td=document.createElement('td');td.className='row-selector-cell';td.style.cssText='width:24px;min-width:24px;text-align:center;padding:0;border-right:0;vertical-align:middle;';
        td.innerHTML=`<input class="row-selector-chk" data-row-index="${i}" type="checkbox" checked style="width:14px;height:14px;margin:0;">`;
        tr.insertBefore(td,tr.firstChild);
        td.querySelector('input').addEventListener('change',syncMaster);
      }
    });
    syncMaster();
  }
  const observer=new MutationObserver(()=>ensureRowSelectors());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{childList:true,subtree:true}));
  else observer.observe(document.body,{childList:true,subtree:true});
  window.confirmSpecTableRows=function(){
    try{
      if(!Array.isArray(cachedRows)||!cachedRows.length){alert('확정할 사양서 부표가 없습니다. 먼저 부표작성을 실행하세요.');return false;}
      if(typeof window.recalculateTable==='function')window.recalculateTable();
      ensureRowSelectors();
      const selected=selectedIndexes();
      if(!selected.length){alert('SPEC SHEET에 가져올 행을 하나 이상 선택하세요.');return false;}
      const selectedColumns=[...document.querySelectorAll('.col-selector-chk:checked')].map(x=>Number(x.dataset.colIdx)).filter(Number.isFinite);
      store('cable_spec_rows',cachedRows);
      store('cable_spec_selected_rows',selected);
      store('cable_design_main_config',window.config||{});
      store('cable_spec_selected_columns',selectedColumns.length?selectedColumns:[0,1,2,3,5,7,8,9,10,11]);
      window.__specRowsConfirmed=true;
      return true;
    }catch(e){console.error(e);alert('부표 확정 중 오류가 발생했습니다.');return false;}
  };
  const oldToggle=window.toggleSpecLock;
  if(oldToggle)window.toggleSpecLock=function(){
    if(!window.__specLocked&&!window.confirmSpecTableRows())return;
    return oldToggle.apply(this,arguments);
  };
  const oldOpenTech=window.openTechDataPage;
  window.openTechDataPage=function(){
    if(!window.__specRowsConfirmed&&!window.confirmSpecTableRows())return;
    return oldOpenTech?oldOpenTech.apply(this,arguments):window.open('tech-data.html?instance='+Date.now(),'_blank');
  };
  const oldOpenSpec=window.openSpecSheetPage;
  window.openSpecSheetPage=function(){
    if(!window.__specRowsConfirmed&&!window.confirmSpecTableRows())return;
    return oldOpenSpec?oldOpenSpec.apply(this,arguments):window.open('spec-sheet.html?instance='+Date.now(),'_blank');
  };
  window.addEventListener('load',()=>setTimeout(ensureRowSelectors,50));
})();
