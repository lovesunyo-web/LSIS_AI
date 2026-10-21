/**
 * cable-3d-renderer.js
 * 박피형 3D 케이블 뷰어
 * - 계산 로직은 사용하지 않고 window.lastCalculatedCableData 표시 스냅샷만 읽습니다.
 * - 2D 단면도의 레이어 순서/색상/구성품을 계단식 탈피 3D로 표현합니다.
 */
(function () {
    let scene, camera, renderer, container, overlay;
    let cableGroup = null;
    let labelItems = [];
    let currentLabelMap = null;
    let currentUsedLabelNos = null;
    let currentLabelBelowRadius = 0;

    // 3D 단면도 전용 UI 상태: 회전모드에서는 번호를 숨기고 케이블만 조작합니다.
    let isReviewMode = false;
    let isPointerDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let cameraTarget = null;

    const VIEW = {
        length: 150,
        radialScale: 0.552,
        coreGapScale: 1.08,
        strandMaxRender: 61
    };

    window.addEventListener('DOMContentLoaded', () => {
        bind3DUI();
        init3D();
    });

    function bind3DUI() {
        const chk3D = document.getElementById('show_3d_view');
        const chkLabels = document.getElementById('show_labels');
        const btnCopy3D = document.getElementById('btn_copy_3d_view');
        const btnReview = document.getElementById('btn_3d_review_mode');
        const btnDefault = document.getElementById('btn_3d_default_view');

        if (btnCopy3D) btnCopy3D.addEventListener('click', copy3DViewToClipboard);
        if (btnReview) btnReview.addEventListener('click', enterReviewMode);
        if (btnDefault) btnDefault.addEventListener('click', restoreDefault3DView);

        const update3DButtons = () => {
            const visible = !!(chk3D && chk3D.checked);
            [btnCopy3D, btnReview, btnDefault].forEach(btn => {
                if (btn) btn.style.display = visible ? 'inline-flex' : 'none';
            });
            if (btnReview) btnReview.classList.toggle('is-active', isReviewMode);
        };

        if (chk3D) {
            chk3D.addEventListener('change', () => {
                const area2D = document.getElementById('canvas-2d-area');
                const area3D = document.getElementById('canvas-3d-area');
                if (!area2D || !area3D) return;

                if (chk3D.checked) {
                    area2D.className = 'panel-area split';
                    area3D.className = 'panel-area active';
                    update3DButtons();
                    setTimeout(() => {
                        resize3D();
                        buildCable3D();
                    }, 430);
                } else {
                    area2D.className = 'panel-area active';
                    area3D.className = 'panel-area hidden';
                    isReviewMode = false;
                    update3DButtons();
                }
            });
        }

        if (chkLabels) {
            chkLabels.addEventListener('change', () => {
                // 회전모드에서는 단면도 설명 체크 상태와 관계없이 3D 번호를 표시하지 않습니다.
                if (!isReviewMode) buildCable3D();
            });
        }

        window.addEventListener('resize', resize3D);

        // 기본값: 단면도 설명과 3D 보기를 모두 표시합니다.
        // DOMContentLoaded 이후 change 이벤트를 한 번 실행하여 분할 레이아웃과 캔버스 크기를 확정합니다.
        setTimeout(() => {
            update3DButtons();
            if (chk3D && chk3D.checked) chk3D.dispatchEvent(new Event('change'));
        }, 0);
    }

    function setReviewButtonState() {
        const btnReview = document.getElementById('btn_3d_review_mode');
        if (btnReview) btnReview.classList.toggle('is-active', isReviewMode);
    }

    function enterReviewMode() {
        if (!cableGroup || !renderer) return;
        isReviewMode = true;
        isPointerDragging = false;
        if (overlay) overlay.style.display = 'none';
        if (container) container.classList.add('is-3d-review');
        clearLabels();
        setReviewButtonState();
        render3D();
    }

    function restoreDefault3DView() {
        isReviewMode = false;
        isPointerDragging = false;
        if (overlay) overlay.style.display = 'block';
        if (container) container.classList.remove('is-3d-review');
        setReviewButtonState();
        // 기본 설명도는 생성 시 정의한 구도와 번호 위치를 항상 다시 계산합니다.
        buildCable3D();
    }

    function bind3DPointerControls() {
        if (!renderer || !renderer.domElement) return;
        const canvas = renderer.domElement;
        canvas.style.touchAction = 'none';

        canvas.addEventListener('pointerdown', event => {
            if (!isReviewMode || !cableGroup) return;
            isPointerDragging = true;
            lastPointerX = event.clientX;
            lastPointerY = event.clientY;
            canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId);
            event.preventDefault();
        });

        canvas.addEventListener('pointermove', event => {
            if (!isReviewMode || !isPointerDragging || !cableGroup) return;
            const dx = event.clientX - lastPointerX;
            const dy = event.clientY - lastPointerY;
            lastPointerX = event.clientX;
            lastPointerY = event.clientY;

            // 좌우는 360° 자유 회전, 상하는 뒤집힘 없이 기울기만 조절합니다.
            cableGroup.rotation.y += dx * 0.012;
            cableGroup.rotation.x = Math.max(-1.18, Math.min(1.18, cableGroup.rotation.x + dy * 0.008));
            render3D();
            event.preventDefault();
        });

        const endPointerDrag = event => {
            if (!isPointerDragging) return;
            isPointerDragging = false;
            if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
                canvas.releasePointerCapture(event.pointerId);
            }
        };
        canvas.addEventListener('pointerup', endPointerDrag);
        canvas.addEventListener('pointercancel', endPointerDrag);
        canvas.addEventListener('pointerleave', event => {
            if (event.buttons === 0) endPointerDrag(event);
        });

        canvas.addEventListener('wheel', event => {
            if (!isReviewMode || !camera || !cameraTarget) return;
            const direction = camera.position.clone().sub(cameraTarget);
            const zoom = event.deltaY > 0 ? 1.10 : 0.90;
            const nextLength = Math.max(25, Math.min(560, direction.length() * zoom));
            camera.position.copy(cameraTarget).add(direction.normalize().multiplyScalar(nextLength));
            camera.lookAt(cameraTarget);
            render3D();
            event.preventDefault();
        }, { passive: false });
    }


    function init3D() {
        container = document.getElementById('cable3DContainer');
        overlay = document.getElementById('labels3DOverlay');
        if (!container) return;

        if (typeof THREE === 'undefined' || !THREE.WebGLRenderer) {
            const msg = document.getElementById('threeMissingMessage');
            if (msg) msg.style.display = 'block';
            window.update3DCableView = function () {};
            return;
        }

        const msg = document.getElementById('threeMissingMessage');
        if (msg) msg.style.display = 'none';

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        camera = new THREE.PerspectiveCamera(34, getAspect(), 0.1, 2000);
        camera.position.set(-35, 42, 120);
        cameraTarget = new THREE.Vector3(10, 0, 0);
        camera.lookAt(cameraTarget);

        // 전역 Ambient/Directional 조명은 사용하지 않습니다.
        // 절단면은 무조명 재질로 2D 팔레트 색상을 고정하고, 측면만 국부광으로 입체감을 만듭니다.
        const key = new THREE.PointLight(0xffffff, 1.55, 240, 2);
        key.position.set(-48, 54, 78);
        scene.add(key);

        const warmRim = new THREE.PointLight(0xfff3df, 0.92, 210, 2);
        warmRim.position.set(55, 22, 44);
        scene.add(warmRim);

        const coolRim = new THREE.PointLight(0xe6f3ff, 0.62, 180, 2);
        coolRim.position.set(20, -42, -74);
        scene.add(coolRim);

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        // 2D 팔레트와의 색상 일치를 위해 필름 톤 매핑으로 인한 탈색을 방지한다.
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.toneMappingExposure = 1.0;
        if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
        container.appendChild(renderer.domElement);

        window.update3DCableView = buildCable3D;
        window.copy3DViewToClipboard = copy3DViewToClipboard;
        bind3DPointerControls();
        buildCable3D();
    }

    function defaultData() {
        return {
            coreNum: 3,
            perBundle: 1,
            strandCount: 37,
            conductorColor: '#b87333',
            coreColors: ['#ef4444', '#1e293b', '#e5e7eb'],
            radii: { conductor: 2.5, coreOuter: 6.8, finalBundle: 6.8, assemblyOuter: 15, total: 20 },
            coreLayers: [
                { key: 'conductor', name: 'Conductor', radius: 2.5, thickness: 2.5, color: '#b87333' },
                { key: 'insulation', name: 'Insulation', thickness: 3.8, color: '#e5e7eb' }
            ],
            individualLayers: [],
            drainWires3D: [],
            outerLayers: [
                { key: 'filler', name: 'Cabling & Filler', radius: 15, color: '#ffffff', applied: true },
                { key: 'bedding', name: 'Bedding', radius: 16.5, thickness: 1.5, color: '#64748b' },
                { key: 'armour', name: 'Armour', radius: 18.3, thickness: 1.8, color: '#9ca3af', pattern: '편조' },
                { key: 'sheath', name: 'Sheath', radius: 20, thickness: 1.7, color: '#111827' }
            ],
            layout: { positions: [{dx:0,dy:0,angle:0}], bundleCoreOffsets: [{dx:0,dy:0}], fillers: [] }
        };
    }

    function buildCable3D() {
        if (!scene || !renderer || typeof THREE === 'undefined') return;

        clearLabels();
        if (cableGroup) {
            scene.remove(cableGroup);
            disposeObject(cableGroup);
        }

        const data = sanitizeData(window.lastCalculatedCableData || defaultData());
        ensure3DRenderKeys(data);
        cableGroup = new THREE.Group();

        const showLabels = !isReviewMode && !!document.getElementById('show_labels')?.checked;
        currentLabelMap = normalizeLabelMap(data.labelMap || window.lastCableLabelMap || null);
        currentUsedLabelNos = new Set();

        const totalR = Math.max(data.radii?.total || 20, 1);
        const scale = VIEW.radialScale * (22 / totalR);
        const frontX = -VIEW.length * 0.48;
        const rearX = VIEW.length * 0.50;

        const corePositions = computeCorePositions(data, scale, false);
        const groundPositions = computeCorePositions(data, scale, true);
        const setPositions = computeSetPositions(data, scale);
        const coreOuterR = Math.max(getCoreOuterRadius(data) * scale, 0.5);
        const assemblyR = Math.max((data.radii?.assemblyOuter || data.radii?.finalBundle || totalR * 0.72) * scale, coreOuterR * 1.55);
        currentLabelBelowRadius = Math.max(assemblyR * 1.16, coreOuterR * 2.2, 2.2);

        const plan = makeExposurePlan(data, frontX, rearX);

        renderCoreLayers(data, plan, corePositions, scale, showLabels);
        renderGroundCores(data, plan, groundPositions, scale, showLabels);
        renderIndividualLayers(data, plan, corePositions, setPositions, coreOuterR, scale, showLabels);
        renderAssemblyBase(data, plan, corePositions, coreOuterR, assemblyR, scale, showLabels);
        renderOuterLayers(data, plan, assemblyR, scale, showLabels);
        renderDrainWires(data, plan, corePositions, setPositions, assemblyR, scale, showLabels);

        // 우측 절단면이 카메라 쪽으로 열리도록 약한 사선 회전을 적용합니다.
        cableGroup.rotation.x = -0.16;
        cableGroup.rotation.y = -0.10;
        cableGroup.rotation.z = Math.PI + 0.10;
        cableGroup.position.x = 2;

        scene.add(cableGroup);
        fitCameraToObject(cableGroup);
        render3D();
    }


    function ensure3DRenderKeys(data) {
        const assign = (layers, prefix) => {
            const counts = {};
            (layers || []).forEach((layer, idx) => {
                if (!layer) return;
                const base = layer.key || prefix || ('layer_' + idx);
                const n = counts[base] || 0;
                counts[base] = n + 1;
                layer._renderKey = n === 0 ? base : `${base}__${n}`;
            });
        };
        assign(data.coreLayers, 'core');
        assign(data.individualLayers, 'individual');
        assign(data.outerLayers, 'outer');
    }

    function layerPlanKey(layer) {
        return (layer && (layer._renderKey || layer.key)) || '';
    }

    
    function makeExposurePlan(data, frontX, rearX) {
        const plan = {};
        const coreLayers = data.coreLayers || [];
        const individualLayers = data.individualLayers || [];
        const outerLayers = (data.outerLayers || []).filter(l => l && l.applied !== false);
        const sideOuter = outerLayers.filter(l => !l.frontOnly && l.sideExposure !== 0 && l.key !== 'filler');

        const coreEnd = frontX + VIEW.length * 0.46;
        let cursor = frontX;

        const conductorLayer = coreLayers.find(l => l.key === 'conductor') || coreLayers[0];
        if (conductorLayer) {
            const len = VIEW.length * 0.13;
            plan[layerPlanKey(conductorLayer) || 'conductor'] = [cursor, cursor + len];
            cursor += len;
        }

        const otherCore = coreLayers.filter(l => l && l !== conductorLayer && l.applied !== false);
        const indivTotal = Math.min(
            VIEW.length * 0.24,
            Math.max(0, individualLayers.length) * VIEW.length * 0.070
        );
        const fixedThin = otherCore.filter(l => l.key !== 'insulation').length * VIEW.length * 0.026;
        const availableCore = Math.max(coreEnd - cursor - indivTotal, VIEW.length * 0.10);
        const insulationLen = Math.max(VIEW.length * 0.10, availableCore - fixedThin);

        otherCore.forEach(layer => {
            let len = (layer.key === 'insulation') ? insulationLen : VIEW.length * 0.026;
            if (cursor + len > coreEnd - indivTotal) len = Math.max(1.5, coreEnd - indivTotal - cursor);
            plan[layerPlanKey(layer)] = [cursor, cursor + len];
            cursor += len;
        });

        if (individualLayers.length) {
            const each = indivTotal / individualLayers.length;
            cursor = Math.max(cursor, coreEnd - indivTotal);
            individualLayers.forEach(layer => {
                plan[layerPlanKey(layer)] = [cursor, cursor + each];
                cursor += each;
            });
        }

        // 연합/개재는 측면 노출 0: 단면 face만 렌더링합니다.
        plan.filler = [coreEnd, coreEnd];

        let outerCursor = coreEnd;
        const sheath = sideOuter.find(l => l.key === 'sheath');
        const nonSheath = sideOuter.filter(l => l.key !== 'sheath');
        const sheathMin = sheath ? VIEW.length * 0.30 : 0;
        const outerEndLimit = rearX - sheathMin;
        const availableOuter = Math.max(outerEndLimit - outerCursor, VIEW.length * 0.08);

        const hasBedding = nonSheath.some(l => l.key === 'bedding');
        const hasArmour = nonSheath.some(l => l.key === 'armour');
        const hasOverall = nonSheath.some(l => l.key === 'overall_shield');

        const weights = { binder: 0.55, overall_shield: 0.95, bedding: 1.55, armour: 1.45 };
        if (hasOverall && hasBedding) weights.overall_shield = 0.85;
        if (hasBedding && hasArmour) weights.bedding = 1.55;
        if (hasArmour) weights.armour = 1.45;

        let weightSum = 0;
        nonSheath.forEach(l => { weightSum += weights[l.key] || 1.0; });

        const rawLens = nonSheath.map(layer => {
            const share = availableOuter * ((weights[layer.key] || 1.0) / Math.max(weightSum, 1));
            const minEach = Math.min(VIEW.length * 0.050, availableOuter / Math.max(nonSheath.length, 1) * 0.72);
            // 공동차폐 테이프가 항상 짧게 잘리는 기존 상한 제한은 제거합니다.
            const len = Math.max(minEach, share);
            return { layer, len };
        });
        const totalLen = rawLens.reduce((s, v) => s + v.len, 0);
        const shrink = totalLen > availableOuter ? availableOuter / totalLen : 1;

        rawLens.forEach(item => {
            const layer = item.layer;
            const len = Math.max(1.8, item.len * shrink);
            const end = Math.min(outerCursor + len, outerEndLimit);
            plan[layerPlanKey(layer)] = [outerCursor, Math.max(outerCursor + 1.5, end)];
            outerCursor = plan[layerPlanKey(layer)][1];
        });

        if (sheath) {
            plan[layerPlanKey(sheath)] = [Math.min(outerCursor, rearX - VIEW.length * 0.24), rearX];
        }

        return plan;
    }

    
    function renderCoreLayers(data, plan, corePositions, scale, showLabels) {
        corePositions.forEach((cp, idx) => {
            const colorForCore = data.coreColors?.[idx % Math.max(1, data.coreColors.length)] || '#ffffff';
            let accumR = 0;

            (data.coreLayers || []).forEach(layer => {
                if (!layer || layer.applied === false) return;
                const key = layer.key || '';
                const range = plan[layerPlanKey(layer)] || plan[key];
                if (!range || range[1] <= range[0]) return;

                if (key === 'conductor') {
                    const outerR = Math.max((layer.radius || data.radii?.conductor || layer.thickness || 1) * scale, 0.25);
                    drawConductorBundle(range[0], range[1], cp.y, cp.z, outerR, data);
                    addNumLabel(showLabels, layer.name, new THREE.Vector3(mid(range), cp.y, cp.z + outerR * 1.25));
                    accumR = outerR / scale;
                    return;
                }

                accumR += Math.max(layer.thickness || 0, 0);
                const outerR = Math.max(accumR * scale, 0.3);
                const matColor = (key === 'insulation')
                    ? colorForCore
                    : get3DMaterialColor(layer.material || layer.name || '', layer.pattern || key, layer.color || '#dddddd');
                const layerForRender = Object.assign({}, layer, { color: matColor });
                renderPatternLayer3D(layerForRender, range, outerR, Math.max((accumR - (layer.thickness || 0)) * scale, outerR * 0.96), cp.y, cp.z, false);
                addNumLabel(showLabels, layer.name, new THREE.Vector3(mid(range), cp.y, cp.z + outerR * 1.12));
            });
        });
    }

    function renderGroundCores(data, plan, groundPositions, scale, showLabels) {
        if (!data.ground || !groundPositions.length) return;
        const conductorRange = plan.conductor || Object.values(plan)[0];
        const insulationRange = plan.insulation || conductorRange;
        groundPositions.forEach((gp, idx) => {
            const rCond = Math.max((data.ground.radiusCond || data.radii?.conductor || 1) * scale, 0.22);
            const rCore = Math.max((data.ground.radiusCore || rCond / scale + 0.5) * scale, rCond * 1.25);
            drawConductorBundle(conductorRange[0], conductorRange[1], gp.y, gp.z, rCond, Object.assign({}, data, { strandCount: data.ground.strandCount || data.strandCount }));
            if (insulationRange && insulationRange[1] > insulationRange[0]) {
                cableGroup.add(makeCylinderX(insulationRange[0], insulationRange[1], rCore, makeMat(data.ground.color || '#22c55e'), 40, false, gp.y, gp.z));
            }
            if (idx === 0) addNumLabel(showLabels, 'Ground Wire', new THREE.Vector3(mid(insulationRange || conductorRange), gp.y, gp.z + rCore * 1.1));
        });
    }

    
    function renderIndividualLayers(data, plan, corePositions, setPositions, coreOuterR, scale, showLabels) {
        const layers = data.individualLayers || [];
        if (!layers.length) return;

        const baseColorByPos = {};

        layers.forEach(layer => {
            const range = plan[layerPlanKey(layer)] || plan[layer.key];
            if (!range || range[1] <= range[0]) return;

            const targetIsSet = layer.target === 'set' || layer.target === 'bundle';
            const positions = targetIsSet ? setPositions : corePositions;
            const baseRadius = targetIsSet
                ? Math.max((data.radii?.finalBundle || data.radii?.coreOuter || 1) * scale, coreOuterR)
                : coreOuterR;
            const outerR = Math.max((layer.radius || 0) * scale, baseRadius + Math.max((layer.thickness || 0.12) * scale, 0.08));
            const layerColor = get3DMaterialColor(layer.material || layer.name || '', layer.pattern || layer.key, layer.color || '#888888');
            const pattern = String(layer.pattern || layer.key || layer.name || '');

            positions.forEach((p, idx) => {
                const posKey = `${targetIsSet ? 'set' : 'core'}_${idx}`;
                let baseColor = baseColorByPos[posKey];
                if (!baseColor) {
                    baseColor = isBraidPattern(pattern) || isSpiralPattern(pattern)
                        ? getShieldBaseColor(layer, '#f8fafc')
                        : (targetIsSet ? '#ffffff' : (data.coreColors?.[idx % Math.max(1, data.coreColors.length)] || '#ffffff'));
                }
                if (isBraidPattern(pattern) || isSpiralPattern(pattern)) {
                    baseColor = baseColorByPos[posKey] || getShieldBaseColor(layer, '#f8fafc');
                }

                const renderLayer = Object.assign({}, layer, { color: layerColor, baseColor });
                renderPatternLayer3D(renderLayer, range, outerR, baseRadius, p.y, p.z, true);
                if (idx === 0) addNumLabel(showLabels, layer.name, new THREE.Vector3(mid(range), p.y, p.z + outerR * 1.12));

                if (!isBraidPattern(pattern) && !isSpiralPattern(pattern)) {
                    baseColorByPos[posKey] = layerColor;
                }
            });
        });
    }

    
    function renderAssemblyBase(data, plan, corePositions, coreOuterR, assemblyR, scale, showLabels) {
        const filler = (data.outerLayers || []).find(l => l.key === 'filler' || l.frontOnly);
        const range = plan.filler;
        if (!range) return;

        const fillerColor = (filler && get3DMaterialColor(
            filler.material || filler.name || '',
            filler.pattern || filler.key,
            filler.color
        )) || '#ffffff';
        const xFace = range[0] - 0.18;

        // 원형 디스크를 덧씌우지 않고, 실제 단면처럼 선심 외곽을 hole로 뺀 개재물 면을 만듭니다.
        // 따라서 선심 사이와 외곽의 빈 공간에만 흰색 개재물이 보입니다.
        cableGroup.add(makeFillerCutFaceX(
            xFace - 0.025,
            assemblyR,
            corePositions,
            coreOuterR * 1.008,
            fillerColor
        ));

        corePositions.forEach((cp, idx) => {
            const ccol = data.coreColors?.[idx % Math.max(1, data.coreColors.length)] || '#ffffff';
            const coreMat = makeMat(ccol, { roughness: 0.42, sheen: 0.06 });
            cableGroup.add(makeCylinderX(xFace - 0.14, xFace + 0.08, coreOuterR * 0.985, coreMat, 48, false, cp.y, cp.z));
            cableGroup.add(makeCutFaceX(xFace - 0.155, coreOuterR * 0.985, ccol, cp.y, cp.z, 48));
        });
        if (filler) addNumLabel(showLabels, filler.name, new THREE.Vector3(xFace, 0, assemblyR * 1.04));
    }

    
    function renderOuterLayers(data, plan, assemblyR, scale, showLabels) {
        const layers = (data.outerLayers || []).filter(l => l && l.applied !== false && !l.frontOnly && l.sideExposure !== 0 && l.key !== 'filler');
        let prevR = assemblyR;
        let prevColor = '#ffffff';

        layers.forEach(layer => {
            const range = plan[layerPlanKey(layer)] || plan[layer.key];
            if (!range || range[1] <= range[0]) return;
            const r = Math.max((layer.radius || 0) * scale, prevR + Math.max((layer.thickness || 0.2) * scale, 0.12));
            const color = get3DMaterialColor(layer.material || layer.name || '', layer.pattern || layer.key, layer.color || '#888888');
            const renderLayer = Object.assign({}, layer, { color, baseColor: prevColor });

            renderPatternLayer3D(renderLayer, range, r, prevR, 0, 0, true);
            addNumLabel(showLabels, layer.name, new THREE.Vector3(mid(range), 0, r * 1.05));
            prevR = r;
            if (!isBraidPattern(layer.pattern || layer.key || layer.name) && !isSpiralPattern(layer.pattern || layer.key || layer.name)) {
                prevColor = color;
            }
        });
    }

    
    function renderPatternLayer3D(layer, range, outerR, prevR, y, z, keepBase) {
        const pattern = String(`${layer.pattern || ''} ${layer.key || ''} ${layer.name || ''} ${layer.material || ''}`);
        const color = layer.color || get3DMaterialColor(layer.material || layer.name || '', pattern, '#888888');
        const cutX = range[0] - 0.028;

        // 노출된 모든 층의 절단면은 MeshBasicMaterial로 분리합니다.
        // 조명 영향을 받지 않아 2D 단면 팔레트와 동일한 색으로 유지됩니다.
        if (keepBase && prevR > 0) {
            const baseColor = layer.baseColor || getShieldBaseColor(layer, layer.key === 'armour' ? '#dbe3ea' : '#f8fafc');
            cableGroup.add(makeCylinderX(
                range[0], range[1],
                Math.max(prevR * 1.002, prevR + 0.015),
                makeMat(baseColor, { roughness: 0.76, sheen: 0.015 }),
                72, true, y, z
            ));
            cableGroup.add(makeCutFaceX(cutX - 0.004, prevR, baseColor, y, z, 72));
            cableGroup.add(makeRingCutFaceX(cutX, outerR, prevR, color, y, z, 72));
        } else {
            cableGroup.add(makeCutFaceX(cutX, outerR, color, y, z, 72));
        }

        if (isBraidPattern(pattern)) {
            addBraidOverlay(range[0], range[1], outerR * 1.006, get3DWireColor(layer, color), y, z);
            return;
        }

        if (isSpiralPattern(pattern)) {
            addSpiralWireOverlay(range[0], range[1], outerR * 1.006, get3DWireColor(layer, color), y, z);
            return;
        }

        if (isTapePattern(pattern)) {
            const tapeIsMetal = isMetalLayer(layer) && !isNonMetalTapeLayer(layer);
            const mat = makeMat(color, {
                metalness: tapeIsMetal ? 0.30 : 0.0,
                roughness: tapeIsMetal ? 0.35 : 0.62,
                sheen: tapeIsMetal ? 0.02 : 0.05
            });
            cableGroup.add(makeCylinderX(range[0], range[1], outerR, mat, 72, true, y, z));
            addTapeWrapOverlay(range[0], range[1], outerR * 1.008, getTapeSeamColor(color), y, z);
            return;
        }

        const mat = makeMat(color, {
            metalness: isMetalLayer(layer) ? 0.62 : 0.0,
            roughness: layer.key === 'sheath' ? 0.28 : 0.45,
            sheen: isMetalLayer(layer) ? 0.01 : 0.07
        });
        cableGroup.add(makeCylinderX(range[0], range[1], outerR, mat, 72, true, y, z));
    }

    

    function findDrainRange(plan, data, wire) {
        const direct = plan[wire.layerKey] || plan[wire.sourceKey];
        if (direct && direct[1] > direct[0]) return direct;

        const candidates = [];
        const allLayers = [].concat(data.individualLayers || [], data.outerLayers || []);
        allLayers.forEach(layer => {
            if (!layer) return;
            const key = layerPlanKey(layer);
            const sameKey = layer.key === wire.layerKey || layer.key === wire.sourceKey;
            const hasDrain = hasDrainPattern(layer.pattern);
            if ((sameKey || hasDrain) && plan[key] && plan[key][1] > plan[key][0]) {
                candidates.push(plan[key]);
            }
        });
        if (candidates.length) return candidates[0];

        return plan.overall_shield || null;
    }

    function renderDrainWires(data, plan, corePositions, setPositions, assemblyR, scale, showLabels) {
        const wires = Array.isArray(data.drainWires3D) ? data.drainWires3D.slice() : [];
        (data.individualLayers || []).forEach(l => {
            if (hasDrainPattern(l.pattern) && !wires.some(w => w.sourceKey === l.key)) {
                wires.push({ target: l.target || 'core', sourceKey: l.key, layerKey: l.key, name: 'D/W', color: '#c47a34' });
            }
        });
        (data.outerLayers || []).forEach(l => {
            if (hasDrainPattern(l.pattern) && !wires.some(w => w.sourceKey === l.key)) {
                wires.push({ target: l.key === 'overall_shield' ? 'overall' : 'outer', sourceKey: l.key, layerKey: l.key, name: 'D/W', color: '#c47a34' });
            }
        });

        const hasOverallDrainWire = wires.some(w => w && (w.target === 'overall' || w.targetMode === 'overall'));
        let labelDone = false;
        wires.forEach(w => {
            const range = findDrainRange(plan, data, w);
            if (!range) return;
            const color = w.color || '#c47a34';

            if (w.target === 'individual' || w.target === 'core' || w.target === 'set') {
                const positions = (w.targetMode === 'set' || w.target === 'set') ? setPositions : corePositions;
                positions.forEach((p, idx) => {
                    const r = Math.max(((w.radius || data.radii?.coreOuter || 1) * scale), 0.6);
                    const baseAngle = Math.atan2(p.z || 0, p.y || 0);
                    const angle = Number.isFinite(baseAngle) && Math.abs(p.y) + Math.abs(p.z) > 0.1 ? baseAngle : Math.PI * 0.22;
                    const protrude = Math.max(18, Math.min(30, r * 3.8));
                    addDrainWire3D(range[0], p.y, p.z, r * 1.10, color, { angle, protrude, strands: 7 });
                    if (!hasOverallDrainWire && !labelDone && idx === 0) {
                        addNumLabel(showLabels, w.name || 'D/W', new THREE.Vector3(range[0] - protrude * 0.58, p.y, p.z + r * 1.75));
                        labelDone = true;
                    }
                });
            } else {
                // 공동차폐 D/W: 차폐테이프 우측 상단에서 위쪽으로 빠져나오는 모습으로 표시합니다.
                const r = Math.max(assemblyR * 1.04, 0.8);
                const protrude = Math.max(20, Math.min(32, r * 3.4));
                const overallAngle = Math.PI * 0.75;
                const endPos = addDrainWire3D(range[0], 0, 0, r, color, { angle: overallAngle, protrude, strands: 7 });
                if (!labelDone) {
                    addNumLabel(showLabels, w.name || 'D/W', endPos || new THREE.Vector3(
                        range[0] - protrude,
                        Math.cos(overallAngle + 0.46) * (r * 1.12 + Math.max(r * 0.72, 4.2)),
                        Math.sin(overallAngle + 0.46) * (r * 1.12 + Math.max(r * 0.72, 4.2))
                    ), { keepWorldPosition: true });
                    labelDone = true;
                }
            }
        });
    }

    
    function addBraidOverlay(x1, x2, radius, color, y, z) {
        const len = Math.max(Math.abs(x2 - x1), 1);
        const tubeR = Math.max(radius * 0.018, 0.115);
        const mat = makeMat(color || '#dbe3ea', { metalness: 0.52, roughness: 0.30 });
        const baseLines = Math.max(10, Math.min(18, Math.floor(radius * 1.25)));
        const lines = baseLines * 2;
        // 편조 소선이 케이블 길이방향에 더 가깝게 보이도록 피치를 길게 조정합니다.
        // 각도는 원주방향 기준으로 높게 잡고, 회전수는 줄여 축방향 성분을 크게 합니다.
        const braidAngleFromHoop = THREE.MathUtils.degToRad(74);
        const braidTurnsByAngle = len / Math.max(2 * Math.PI * radius * Math.tan(braidAngleFromHoop), 1.0);
        const turns = Math.max(0.32, Math.min(1.05, braidTurnsByAngle));

        for (let dir of [1, -1]) {
            for (let i = 0; i < lines; i++) {
                const pts = [];
                const phase = i / lines * Math.PI * 2;
                for (let s = 0; s <= 42; s++) {
                    const t = s / 42;
                    const x = x1 + (x2 - x1) * t;
                    const a = phase + dir * t * Math.PI * 2 * turns;
                    pts.push(new THREE.Vector3(x, (y || 0) + Math.cos(a) * radius, (z || 0) + Math.sin(a) * radius));
                }
                const curve = new THREE.CatmullRomCurve3(pts);
                cableGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 42, tubeR, 8, false), mat));
            }
        }
    }


    function addSpiralWireOverlay(x1, x2, radius, color, y, z) {
        const len = Math.max(Math.abs(x2 - x1), 1);
        const tubeR = Math.max(radius * 0.035, 0.24);
        const mat = makeMat(color || '#dbe3ea', { metalness: 0.56, roughness: 0.26 });
        const baseWires = Math.max(12, Math.min(26, Math.floor((Math.PI * 2 * radius) / (tubeR * 1.45))));
        const wires = baseWires * 2;
        // 횡권 소선도 케이블 길이방향에 가깝게 보이도록 편조보다 더 긴 피치로 조정합니다.
        const spiralAngleFromHoop = THREE.MathUtils.degToRad(82);
        const spiralTurnsByAngle = len / Math.max(2 * Math.PI * radius * Math.tan(spiralAngleFromHoop), 1.0);
        const turns = Math.max(0.16, Math.min(0.42, spiralTurnsByAngle));

        for (let i = 0; i < wires; i++) {
            const pts = [];
            const phase = i / wires * Math.PI * 2;
            for (let s = 0; s <= 44; s++) {
                const t = s / 44;
                const x = x1 + (x2 - x1) * t;
                const a = phase + t * Math.PI * 2 * turns;
                pts.push(new THREE.Vector3(x, (y || 0) + Math.cos(a) * radius, (z || 0) + Math.sin(a) * radius));
            }
            const curve = new THREE.CatmullRomCurve3(pts);
            cableGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 44, tubeR, 9, false), mat));
        }
    }


    function addTapeWrapOverlay(x1, x2, radius, color, y, z) {
        const len = Math.max(Math.abs(x2 - x1), 1);
        const mat = makeMat(color || '#cbd5e1', { metalness: 0.02, roughness: 0.44 });
        const strips = 1;
        const turns = Math.max(1.0, len / Math.max(radius * 9.5, 1.0));
        for (let i = 0; i < strips; i++) {
            const pts = [];
            const phase = i / strips * Math.PI * 2;
            for (let s = 0; s <= 36; s++) {
                const t = s / 36;
                const x = x1 + (x2 - x1) * t;
                const a = phase + t * Math.PI * 2 * turns;
                pts.push(new THREE.Vector3(x, (y || 0) + Math.cos(a) * radius, (z || 0) + Math.sin(a) * radius));
            }
            cableGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, Math.max(radius * 0.006, 0.045), 5, false), mat));
        }
    }

    
    function addDrainWire3D(startX, y, z, radius, color, opt) {
        opt = opt || {};
        const strandCount = Math.max(3, opt.strands || 7);
        const copper = color || '#c47a34';
        const mat = makeMat(copper, { metalness: 0.62, roughness: 0.24 });
        const tubeR = Math.max(radius * 0.012, 0.055);
        const protrude = Math.max(14, Math.min(34, opt.protrude || radius * 3.8));
        const baseAngle = Number.isFinite(opt.angle) ? opt.angle : Math.PI * 0.22;
        const steps = 42;
        const strandSpread = Math.max(tubeR * 2.4, 0.10);

        for (let k = 0; k < strandCount; k++) {
            const pts = [];
            const phase = (k / strandCount) * Math.PI * 2;
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const smooth = t * t * (3 - 2 * t);
                const x = startX - protrude * t;
                const a = baseAngle + smooth * 0.46;
                const radialLift = radius * (1.02 + 0.10 * t) + Math.max(radius * 0.72, 4.2) * smooth;
                const twist = phase + t * Math.PI * 2 * 4.2;
                const oy = Math.cos(twist) * strandSpread;
                const oz = Math.sin(twist) * strandSpread;
                pts.push(new THREE.Vector3(
                    x,
                    y + Math.cos(a) * radialLift + oy,
                    z + Math.sin(a) * radialLift + oz
                ));
            }
            const curve = new THREE.CatmullRomCurve3(pts);
            cableGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, steps, tubeR, 6, false), mat));
        }

        const endAngle = baseAngle + 0.46;
        const endLift = radius * 1.12 + Math.max(radius * 0.72, 4.2);
        return new THREE.Vector3(
            startX - protrude,
            y + Math.cos(endAngle) * endLift,
            z + Math.sin(endAngle) * endLift
        );
    }

    function computeSetPositions(data, scale) {
        const layout = data.layout || {};
        const positions = layout.positions || [];
        const result = [];
        positions.forEach(pos => {
            if (pos.isGround) return;
            const baseY = ((pos.dx || 0) / 12) * Math.cos(pos.angle || 0) * scale * VIEW.coreGapScale;
            const baseZ = ((pos.dx || 0) / 12) * Math.sin(pos.angle || 0) * scale * VIEW.coreGapScale;
            result.push({ y: baseY, z: baseZ, isGround: false });
        });
        if (!result.length) result.push({ y: 0, z: 0 });
        return result;
    }

    function computeCorePositions(data, scale, wantGround) {
        const result = [];
        const layout = data.layout || {};
        const positions = layout.positions || [];
        const offsets = (layout.bundleCoreOffsets && layout.bundleCoreOffsets.length) ? layout.bundleCoreOffsets : [{dx:0,dy:0}];

        positions.forEach(pos => {
            if (!!pos.isGround !== !!wantGround) return;
            const baseY = ((pos.dx || 0) / 12) * Math.cos(pos.angle || 0) * scale * VIEW.coreGapScale;
            const baseZ = ((pos.dx || 0) / 12) * Math.sin(pos.angle || 0) * scale * VIEW.coreGapScale;
            if (pos.isGround) {
                result.push({ y: baseY, z: baseZ, isGround: true });
                return;
            }
            offsets.forEach(off => {
                const a = pos.angle || 0;
                const oy = ((off.dx || 0) * Math.cos(a) - (off.dy || 0) * Math.sin(a)) / 12 * scale * VIEW.coreGapScale;
                const oz = ((off.dx || 0) * Math.sin(a) + (off.dy || 0) * Math.cos(a)) / 12 * scale * VIEW.coreGapScale;
                result.push({ y: baseY + oy, z: baseZ + oz, isGround: false });
            });
        });

        if (!result.length && !wantGround) {
            const count = Math.max(1, parseInt(data.coreNum || 1, 10) * Math.max(1, parseInt(data.perBundle || 1, 10)));
            const rr = Math.max((data.radii?.coreOuter || 5) * scale * 1.45, 1);
            if (count === 1) result.push({y:0,z:0});
            else {
                for (let i=0; i<count; i++) {
                    const a = -Math.PI/2 + i * Math.PI * 2 / count;
                    result.push({ y: Math.cos(a) * rr, z: Math.sin(a) * rr });
                }
            }
        }
        return result;
    }

    function sanitizeData(d) {
        const base = defaultData();
        d = d || base;
        d.radii = d.radii || base.radii;
        d.coreLayers = (d.coreLayers && d.coreLayers.length) ? d.coreLayers : base.coreLayers;
        d.individualLayers = Array.isArray(d.individualLayers) ? d.individualLayers : [];
        d.drainWires3D = Array.isArray(d.drainWires3D) ? d.drainWires3D : [];
        d.outerLayers = d.outerLayers || [];
        d.coreColors = d.coreColors || base.coreColors;
        d.layout = d.layout || base.layout;
        return d;
    }

    function getCoreOuterRadius(data) {
        let r = 0;
        (data.coreLayers || []).forEach(l => {
            if (l.key === 'conductor') r = Math.max(r, l.radius || data.radii?.conductor || l.thickness || 1);
            else r += Math.max(l.thickness || 0, 0);
        });
        return Math.max(r, data.radii?.coreOuter || 1);
    }

    function makeCylinderX(x1, x2, radius, material, radialSegments, openEnded, y, z) {
        const len = Math.max(Math.abs(x2 - x1), 0.05);
        const geom = new THREE.CylinderGeometry(radius, radius, len, radialSegments || 48, 1, !!openEnded);
        geom.rotateZ(Math.PI / 2);
        geom.translate((x1 + x2) / 2, y || 0, z || 0);
        return new THREE.Mesh(geom, material);
    }

    function makeCutMat(color) {
        return new THREE.MeshBasicMaterial({
            color: new THREE.Color(color || '#cccccc'),
            side: THREE.DoubleSide
        });
    }

    function makeCutFaceX(x, radius, color, y, z, radialSegments) {
        const geom = new THREE.CircleGeometry(Math.max(radius, 0.01), radialSegments || 72);
        geom.rotateY(Math.PI / 2);
        const mesh = new THREE.Mesh(geom, makeCutMat(color));
        mesh.position.set(x, y || 0, z || 0);
        return mesh;
    }

    function makeRingCutFaceX(x, outerR, innerR, color, y, z, radialSegments) {
        const safeInner = Math.max(0.001, Math.min(innerR || 0.001, outerR - 0.002));
        const geom = new THREE.RingGeometry(safeInner, Math.max(outerR, safeInner + 0.002), radialSegments || 72);
        geom.rotateY(Math.PI / 2);
        const mesh = new THREE.Mesh(geom, makeCutMat(color));
        mesh.position.set(x, y || 0, z || 0);
        return mesh;
    }

    function makeFillerCutFaceX(x, outerR, corePositions, coreR, color) {
        const shape = new THREE.Shape();
        shape.absarc(0, 0, Math.max(outerR, 0.02), 0, Math.PI * 2, false);
        (corePositions || []).forEach(cp => {
            const hole = new THREE.Path();
            hole.absarc(-(cp.z || 0), cp.y || 0, Math.max(coreR, 0.02), 0, Math.PI * 2, true);
            shape.holes.push(hole);
        });

        const geom = new THREE.ShapeGeometry(shape, 72);
        geom.rotateY(Math.PI / 2);
        const mesh = new THREE.Mesh(geom, makeCutMat(color));
        mesh.position.set(x, 0, 0);
        return mesh;
    }

    function makeMat(color, opt) {
        opt = opt || {};
        const baseColor = new THREE.Color(color || '#cccccc');
        // 미세 발광은 색을 바꾸기 위한 전역광이 아니라, 무광 재질의 검은 눌림을 방지합니다.
        const emissive = baseColor.clone().multiplyScalar(opt.emissiveIntensity ?? 0.035);
        return new THREE.MeshStandardMaterial({
            color: baseColor,
            emissive,
            emissiveIntensity: opt.emissiveIntensity ?? 0.035,
            metalness: opt.metalness ?? 0,
            roughness: opt.roughness ?? 0.5,
            side: THREE.DoubleSide
        });
    }

    function drawConductorBundle(x1, x2, y, z, radius, data) {
        const strandCount = Math.max(1, parseInt(data.strandCount || 37, 10));
        const color = data.conductorColor || '#d48a42';
        // 2D 도체색을 유지하면서 과도하게 검어지지 않도록 은은한 금속 광택만 적용한다.
        const mat = makeMat(color, { metalness: 0.72, roughness: 0.22, emissiveIntensity: 0.025 });
        const condClass = String(data.condClass || '').toLowerCase();
        const groupCount = Number((String(data.condStrandConfig || '').match(/^\s*(\d+)/) || [])[1] || 0);
        const compacted = /원형압축|압축/.test(condClass);

        if (strandCount <= 1 || condClass === 'solid') {
            cableGroup.add(makeCylinderX(x1, x2, radius, mat, 40, true, y, z));
            cableGroup.add(makeCutFaceX(x1 - 0.03, radius, color, y, z, 40));
            return;
        }

        // 집합: 단일 다발을 촘촘한 소선 군으로 표현
        if (/집합/.test(condClass) || (/집\/복합/.test(condClass) && groupCount === 1)) {
            drawStrandCluster(x1, x2, y, z, radius, Math.min(Math.max(strandCount, 19), VIEW.strandMaxRender), mat, compacted);
            return;
        }

        // 집/복합: 다발 그룹이 모인 단면 형상을 3D에서도 분리해 표현
        if (/집\/복합/.test(condClass) && groupCount > 1) {
            const visibleGroups = Math.min(Math.max(groupCount, 2), 7);
            const groupRadius = radius / (visibleGroups >= 7 ? 3.1 : 2.35);
            for (let i = 0; i < visibleGroups; i++) {
                const angle = visibleGroups === 1 ? 0 : (i === 0 ? 0 : (i - 1) * Math.PI * 2 / Math.max(visibleGroups - 1, 1));
                const dist = i === 0 ? 0 : Math.max(radius - groupRadius * 1.18, 0);
                drawStrandCluster(
                    x1, x2, y + Math.cos(angle) * dist, z + Math.sin(angle) * dist,
                    groupRadius, Math.min(7, Math.max(3, Math.round(strandCount / visibleGroups))), mat, false
                );
            }
            return;
        }

        drawStrandCluster(x1, x2, y, z, radius, strandCount, mat, compacted);
    }

    function drawStrandCluster(x1, x2, y, z, radius, strandCount, mat, compacted) {
        const drawCount = Math.min(strandCount, VIEW.strandMaxRender);
        const strandR = Math.max(radius / (Math.sqrt(drawCount) * 1.55), 0.055);
        const positions = strandLayout(drawCount, strandR * 2.05, radius - strandR * 1.2);
        positions.forEach(p => {
            const curvePts = [];
            const steps = 16;
            const twist = 0.55;
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const x = x1 + (x2 - x1) * t;
                const a = Math.atan2(p.z, p.y) + t * Math.PI * 2 * twist;
                const rr = Math.sqrt(p.y * p.y + p.z * p.z);
                curvePts.push(new THREE.Vector3(x, y + Math.cos(a) * rr, z + Math.sin(a) * rr));
            }
            const curve = new THREE.CatmullRomCurve3(curvePts);
            cableGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, strandR, compacted ? 4 : (drawCount > 37 ? 5 : 7), false), mat));
            // 소선도 절단면에서 원형 단면이 읽히도록 조명 비의존 cut face를 추가합니다.
            cableGroup.add(makeCutFaceX(x1 - 0.035, strandR * 0.94, mat.color, y + p.y, z + p.z, compacted ? 4 : 7));
        });
    }

    function strandLayout(count, pitch, maxR) {
        const pts = [{y:0,z:0}];
        let ring = 1;
        while (pts.length < count) {
            const n = ring * 6;
            const r = Math.min(ring * pitch, maxR);
            for (let i=0; i<n && pts.length<count; i++) {
                const a = i / n * Math.PI * 2;
                pts.push({ y: Math.cos(a) * r, z: Math.sin(a) * r });
            }
            ring++;
        }
        return pts;
    }

    function getAspect() {
        return Math.max(1, container?.clientWidth || 1) / Math.max(1, container?.clientHeight || 1);
    }

    function resize3D() {
        if (!renderer || !camera || !container) return;
        camera.aspect = getAspect();
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
        if (cableGroup) fitCameraToObject(cableGroup);
        render3D();
    }

    function isBraidPattern(pattern) {
        return /편조|braid/i.test(String(pattern || ''));
    }

    function isSpiralPattern(pattern) {
        return /횡권|AWA|GSWA|SWA|wire armour|wire armor|철선|연선외장/i.test(String(pattern || '')) && !isBraidPattern(pattern);
    }

    function isTapePattern(pattern) {
        return /tape|테이프|binder|mylar|마이카|separator|세퍼레이터|반도전|PET|polyester|폴리에스터|부직포|non[\s-]*woven|우레탄글라스|고무입면|나일론|nylon|폴리이미드|polyimide|STA/i.test(String(pattern || ''));
    }

    function hasDrainPattern(pattern) {
        return /D\s*\/\s*W|Drain\s*Wire|드레인/i.test(String(pattern || ''));
    }

    function isNonMetalTapeLayer(layer) {
        const s = `${layer?.key || ''} ${layer?.name || ''} ${layer?.material || ''} ${layer?.pattern || ''}`;
        return /반도전|semi[\s-]*con|semi|tetron|테트론|부직포|non[\s-]*woven|\bPER\b|\bPET\b|polyester|폴리에스터|우레탄글라스|나일론|nylon|고무입면|마이카|mica|폴리이미드|polyimide|\bPP\b|polypropylene|폴리프로필렌/i.test(s);
    }

    function isMetalLayer(layer) {
        const s = `${layer.key || ''} ${layer.name || ''} ${layer.material || ''} ${layer.pattern || ''}`;
        if (isTapePattern(s) && isNonMetalTapeLayer(layer)) return false;
        return /도체|Conductor|구리|동|Copper|Cu|Aluminum|알루미늄|AL|외장|Armour|Shield|차폐|Braid|편조|SWA|AWA|STA|GSWA|납/i.test(s);
    }

    
    function get3DMaterialColor(material, pattern, fallback) {
        const s = `${material || ''} ${pattern || ''}`;
        if (/AL\s*\/\s*MYLAR|AL\s*MYLAR|AL-?MYLAR|알루미늄\s*마이라/i.test(s)) return '#bfefff';
        if (/CU\s*\/\s*MYLAR|CU\s*MYLAR|CU-?MYLAR|구리\s*마이라/i.test(s)) return '#d9a679';

        if (/반도전|semi[\s-]*con|semi|tetron|테트론/i.test(s)) return '#050505';
        if (/부직포|non[\s-]*woven|\bPER\b|\bPET\b|polyester|폴리에스터|separator|세퍼레이터|우레탄글라스|나일론|nylon|고무입면/i.test(s)) return '#ffffff';
        if (/마이카|mica/i.test(s)) return '#0b2a1d';
        if (/폴리이미드|polyimide|\bPI\s*tape\b/i.test(s)) return '#6b4a2f';
        if (/\bPP\b|polypropylene|폴리프로필렌/i.test(s)) return '#d1d5db';

        if (/납|Lead/i.test(s)) return '#475569';
        if (/아라미드/i.test(s)) return '#facc15';
        if (/면사|Fibre|Fiber|Yarn/i.test(s)) return '#ffffff';

        // 명시 색상에 없는 재질은 2D snapshot에서 전달된 색상과 일치시킵니다.
        return fallback || '#cccccc';
    }

    function get3DWireColor(layer, fallback) {
        const s = `${layer?.key || ''} ${layer?.name || ''} ${layer?.material || ''} ${layer?.pattern || ''}`;
        if (/구리|동|Copper|\bCU\b/i.test(s)) return '#c47a34';
        if (/면사|Fibre|Fiber|Yarn/i.test(s)) return '#ffffff';
        if (/알루미늄|Aluminum|\bAL\b|AWA|아연|GSWA|Galvanized|아연도|철선|steel|SWA|STA/i.test(s)) return '#dbe3ea';
        return fallback || '#dbe3ea';
    }

    function getShieldBaseColor(layer, fallback) {
        const s = `${layer?.key || ''} ${layer?.name || ''} ${layer?.material || ''} ${layer?.pattern || ''}`;
        if (/AL\s*\/\s*MYLAR|AL\s*MYLAR|AL-?MYLAR/i.test(s)) return '#bfefff';
        if (/CU\s*\/\s*MYLAR|CU\s*MYLAR|CU-?MYLAR/i.test(s)) return '#d9a679';
        if (/반도전|semi|tetron|테트론/i.test(s)) return '#050505';
        if (/부직포|non[\s-]*woven|\bPER\b|\bPET\b|polyester|폴리에스터|separator|세퍼레이터|우레탄글라스|나일론|nylon|고무입면/i.test(s)) return '#ffffff';
        if (/마이카|mica/i.test(s)) return '#0b2a1d';
        if (/\bPP\b|polypropylene|폴리프로필렌/i.test(s)) return '#d1d5db';
        return fallback || '#f8fafc';
    }

    function getTapeSeamColor(color) {
        try {
            const c = new THREE.Color(color || '#cbd5e1');
            const isWhiteLike = c.r > 0.88 && c.g > 0.88 && c.b > 0.88;
            if (isWhiteLike) return '#d1d5db';
            c.r = Math.min(1, c.r + 0.08);
            c.g = Math.min(1, c.g + 0.08);
            c.b = Math.min(1, c.b + 0.08);
            return '#' + c.getHexString();
        } catch (e) {
            return '#cbd5e1';
        }
    }

    function brightenColor(color, amount) {
        try {
            const c = new THREE.Color(color || '#cccccc');
            c.r = Math.min(1, c.r + amount);
            c.g = Math.min(1, c.g + amount);
            c.b = Math.min(1, c.b + amount);
            return '#' + c.getHexString();
        } catch (e) {
            return color || '#cccccc';
        }
    }

    function mid(range) {
        return (range[0] + range[1]) / 2;
    }

    function normalizeLabelKey(text) {
        return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function normalizeLabelMap(map) {
        if (!map) return null;
        const out = {};
        Object.keys(map).forEach(k => {
            const n = parseInt(map[k], 10);
            if (Number.isFinite(n) && n > 0) out[normalizeLabelKey(k)] = n;
        });
        return Object.keys(out).length ? out : null;
    }


    function isCenterLabel3D(text) {
        const s = String(text || '').toLowerCase();
        return s.includes('연합') || s.includes('개재') || s.includes('filler');
    }

    function normalizeLabelPosition3D(text, worldPosition) {
        const p = worldPosition && worldPosition.clone ? worldPosition.clone() : new THREE.Vector3();
        if (isCenterLabel3D(text)) {
            // 연합/개재 번호만 선심 사이의 케이블 중앙에 둡니다.
            p.y = 0;
            p.z = 0;
            return p;
        }

        // 설명 번호는 리더선 없이 각 구성품의 화면상 아래쪽에 배치합니다.
        // x축(박피 단계)은 유지하여 각 번호가 해당 구성품 아래에 정렬됩니다.
        const r0 = Math.sqrt((p.y || 0) * (p.y || 0) + (p.z || 0) * (p.z || 0));
        const r = Math.max(r0, currentLabelBelowRadius || 2.4);
        p.y = r * 1.18;
        p.z = r * 0.62;
        return p;
    }

    function addNumLabel(show, text, worldPosition, opt) {
        if (!show || !overlay) return;
        opt = opt || {};

        let n = null;
        if (currentLabelMap) {
            n = currentLabelMap[normalizeLabelKey(text)];
            if (!n && /D\s*\/\s*W/i.test(text || '')) n = currentLabelMap[normalizeLabelKey('D/W')];
            if (!n) return;
            if (currentUsedLabelNos && currentUsedLabelNos.has(n)) return;
            currentUsedLabelNos.add(n);
        } else {
            n = labelItems.length + 1;
        }

        const div = document.createElement('div');
        div.className = 'label-3d-num';
        div.textContent = String(n);
        div.title = text || '';
        overlay.appendChild(div);
        labelItems.push({
            element: div,
            pos: opt.keepWorldPosition
                ? (worldPosition && worldPosition.clone ? worldPosition.clone() : new THREE.Vector3())
                : normalizeLabelPosition3D(text, worldPosition)
        });
    }

    function clearLabels() {
        if (overlay) overlay.innerHTML = '';
        labelItems = [];
        currentUsedLabelNos = null;
    }

    function updateLabels() {
        if (!camera || !container) return;
        const w2 = container.clientWidth / 2;
        const h2 = container.clientHeight / 2;

        labelItems.forEach(item => {
            let wp = item.pos.clone();
            if (cableGroup) wp.applyMatrix4(cableGroup.matrixWorld);
            wp.project(camera);
            if (wp.z > 1 || wp.x < -1.2 || wp.x > 1.2 || wp.y < -1.2 || wp.y > 1.2) {
                item.element.style.display = 'none';
                return;
            }
            item.element.style.left = `${wp.x * w2 + w2}px`;
            item.element.style.top = `${-wp.y * h2 + h2}px`;
            item.element.style.display = 'block';
        });
    }

    async function copy3DViewToClipboard() {
        if (!renderer || !container) {
            alert('3D 화면이 준비되지 않았습니다.');
            return;
        }
        render3D();
        const rect = container.getBoundingClientRect();
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(rect.width * (window.devicePixelRatio || 1)));
        canvas.height = Math.max(1, Math.round(rect.height * (window.devicePixelRatio || 1)));
        const ctx = canvas.getContext('2d');
        const ratio = canvas.width / Math.max(rect.width, 1);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const rCanvas = renderer.domElement.getBoundingClientRect();
        ctx.drawImage(
            renderer.domElement,
            Math.round((rCanvas.left - rect.left) * ratio),
            Math.round((rCanvas.top - rect.top) * ratio),
            Math.round(rCanvas.width * ratio),
            Math.round(rCanvas.height * ratio)
        );

        if (overlay) {
            overlay.querySelectorAll('.label-3d-num').forEach(el => {
                const st = window.getComputedStyle(el);
                if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return;
                const er = el.getBoundingClientRect();
                const cx = (er.left - rect.left + er.width / 2) * ratio;
                const cy = (er.top - rect.top + er.height / 2) * ratio;
                const rad = Math.max(er.width, er.height) * ratio / 2;
                ctx.beginPath();
                ctx.arc(cx, cy, rad, 0, Math.PI * 2);
                ctx.fillStyle = st.backgroundColor || '#ef4444';
                ctx.fill();
                ctx.lineWidth = Math.max(1, 1.5 * ratio);
                ctx.strokeStyle = st.borderTopColor || '#ffffff';
                ctx.stroke();
                ctx.fillStyle = st.color || '#ffffff';
                ctx.font = `${st.fontWeight || '900'} ${Math.max(8, parseFloat(st.fontSize || '10') * ratio)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.textContent || '', cx, cy + 0.5 * ratio);
            });
        }

        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            alert('3D 화면 이미지 복사 완료');
        } catch (e) {
            console.warn(e);
            const win = window.open();
            if (win) win.document.write('<img src="' + canvas.toDataURL('image/png') + '">');
            else alert('브라우저 권한으로 클립보드 복사가 차단되었습니다.');
        }
    }

    function fitCameraToObject(obj) {
        if (!obj || !camera) return;
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const fov = camera.fov * Math.PI / 180;
        const aspect = Math.max(camera.aspect || 1, 0.1);
        const verticalFit = Math.max(size.y, size.z, size.x * 0.34);
        const horizontalFit = Math.max(size.x, size.y, size.z) / aspect;
        const fitDim = Math.max(verticalFit, horizontalFit);
        let dist = Math.abs(fitDim / (2 * Math.tan(fov / 2))) * 1.07;

        const dir = new THREE.Vector3(-0.32, 0.34, 1.0).normalize();
        camera.position.copy(center).add(dir.multiplyScalar(dist));
        // 화면 중심을 우측·상단으로 조금 이동하여 좌측 하단의 둥근 단부 노출을 줄인다.
        cameraTarget = new THREE.Vector3(center.x + 11, center.y + 3, center.z);
        camera.lookAt(cameraTarget);
        camera.near = Math.max(dist / 100, 0.1);
        camera.far = dist * 100;
        camera.updateProjectionMatrix();
    }

    function render3D() {
        if (!renderer || !scene || !camera) return;
        renderer.render(scene, camera);
        updateLabels();
    }

    function disposeObject(obj) {
        obj.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose && m.dispose());
                else child.material.dispose && child.material.dispose();
            }
        });
    }
})();
