
const fs=require('fs'), vm=require('vm'), path=require('path');
const base=__dirname;
const ctx={console, setTimeout, clearTimeout, Math, Number, String, Object, Array, JSON, Date, parseFloat, parseInt, isFinite};
ctx.window=ctx; ctx.global=ctx; ctx.document=undefined;
vm.createContext(ctx);
for(const f of ['conductor-db.js','conductor-utils.js','shared-material-engine.js']){
  vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),ctx,{filename:f});
}
const E=ctx.LSSharedMaterialEngine;
let pass=0, fail=0, details=[];
function ok(cond,msg){ if(cond){pass++;}else{fail++;details.push(msg);} }
const baseCfg={
  core_type:'PAIR', core_num:3, cond_material:'copper', conductorStandard:'IEC', cond_class:'연선', cond_size:'1.5',
  cond_coating:'A', insu_material:'XLPE', thick_insu:0.8, inner_semi:'미적용', outer_semi:'미적용',
  tape_mica:'미적용', tape_sep:'미적용', tape_semi:'미적용', tape_insu_above:'미적용',
  ind_separator:'미적용', ind_shield_type:'미적용', ind_screen_tape:'미적용',
  binder_tape:'미적용', ov_shield_type:'미적용', bedding_type:'미적용', armour_type:'미적용',
  sheath_material:'PVC', thick_sheath:1.6, filler_material:'PP', thickness_std:'MANUAL',
  lme_usd_t:13500,scr_usd_t:415,exchange_rate:1500,markup_rate:5
};
const mats=['AL/Mylar','CU/Mylar','구리 (동)','면사','납'];
const methods=['Tape (테이프)','Tape + D/W (드레인와이어 포함)','Braid (편조)','Serve (횡권)'];
for(const scope of ['ind','ov']){
  for(const mat of mats) for(const method of methods){
    const c={...baseCfg};
    c[scope+'_shield_material']=mat; c[scope+'_shield_type']=method;
    c.thick_lead_shield=1.0; c[scope+'_dw_size_ref']='1.5';
    const r=E.calculate(c);
    const row=r.rows.find(x=>x.process.includes(scope==='ind'?'개별 차폐':'공동 차폐'));
    ok(!!row,`${scope}/${mat}/${method}: 차폐 행 누락`);
    ok(row && Number(row.weight)>0,`${scope}/${mat}/${method}: 중량 0`);
    ok(row && Number(row.od)>0,`${scope}/${mat}/${method}: 외경 누락`);
    ok(row && String(row.material).toUpperCase().includes(mat.includes('구리')?'구리':mat.split(' ')[0].toUpperCase()),`${scope}/${mat}/${method}: 재질명 불일치(${row&&row.material})`);
    ok(row && ['TAPE','BRAID','SERVE','LEAD'].includes(row.method),`${scope}/${mat}/${method}: 공법 코드 누락`);
    ok(r.finalOD>0,`${scope}/${mat}/${method}: 최종외경 오류`);
    if(method.includes('D/W')){
      const dw=r.rows.find(x=>x.process.includes(scope==='ind'?'개별 D/W':'공동 D/W'));
      ok(!!dw,`${scope}/${mat}/${method}: D/W 누락`);
      if(scope==='ov') {
        const one=E.calculate({...c,core_num:1}).rows.find(x=>x.process.includes('공동 D/W'));
        const five=E.calculate({...c,core_num:5}).rows.find(x=>x.process.includes('공동 D/W'));
        ok(one && five && Number(one.weight)===Number(five.weight),'공동 D/W가 선심 수만큼 증가함');
      }
    }
  }
}
const tapeMaterials=['PET','부직포','우레탄글라스','고무입면','마이카','폴리이미드','나일론','반도전','TETRON'];
for(const mat of tapeMaterials){
  const r=E.calculate({...baseCfg,tape_sep:mat,tape_semi:mat,tape_insu_above:mat,ind_shield_type:'Tape (테이프)',ind_shield_material:'AL/Mylar',ind_separator:mat,ind_screen_tape:mat,binder_tape:mat});
  for(const proc of ['도체 세퍼레이터','반도전 테이프','절연위 테이프','개별 차폐 세퍼레이터','개별차폐위 테이프','연합 바인더']){
    const row=r.rows.find(x=>x.process.includes(proc));
    ok(!!row,`${mat}/${proc}: 행 누락`);
    ok(row && Number(row.weight)>0,`${mat}/${proc}: 중량 0`);
  }
}
const armourMats=['아연도철선','알루미늄','구리','철 (STA)','아라미드 얀','폴리에스터 얀'];
const armourMethods=['SWA/AWA (횡권)','STA (테이프)','편조 (Braid)'];
for(const mat of armourMats) for(const method of armourMethods){
  const r=E.calculate({...baseCfg,armour_material:mat,armour_type:method,thick_armour:0.5});
  const row=r.rows.find(x=>x.process.includes('외장 공정'));
  ok(!!row,`${mat}/${method}: 외장 행 누락`);
  ok(row && Number(row.weight)>0,`${mat}/${method}: 외장 중량 0`);
  ok(row && Number(row.od)>0,`${mat}/${method}: 외장 외경 누락`);
}
const lead=E.calculate({...baseCfg,ind_shield_material:'납',ind_shield_type:'Tape (테이프)',thick_lead_shield:1.7});
const leadRow=lead.rows.find(x=>x.process.includes('개별 차폐'));
ok(leadRow && Number(leadRow.thick)===1.7,'납 두께 입력 미반영');
const finalDw=E.calculate({...baseCfg,sheath_material:'미적용',ov_shield_material:'AL/Mylar',ov_shield_type:'Tape + D/W (드레인와이어 포함)'});
ok(finalDw.finalOD>0,'마지막 행 D/W일 때 최종 외경 0');
const semi=E.calculate({...baseCfg,tape_semi:'TETRON'});
ok(semi.rows.some(x=>x.process.includes('반도전 테이프')),'반도전 테이프 누락');
const semiNonwoven=E.calculate({...baseCfg,tape_semi:'부직포'});
const semiNonwovenRow=semiNonwoven.rows.find(x=>x.process.includes('반도전 테이프'));
ok(semiNonwovenRow && semiNonwovenRow.material==='반도전 부직포 테이프','반도전 테이프/부직포 재질 인식 오류');
ok(semiNonwovenRow && Number(semiNonwovenRow.density)===1.15,'반도전 테이프/부직포 밀도 적용 오류');
ok(semiNonwovenRow && Number(semiNonwovenRow.unitPrice)===14500,'반도전 테이프/부직포 단가 적용 오류');
ok(semiNonwovenRow && Number(semiNonwovenRow.thick)===0.11,'반도전 테이프/부직포 두께 적용 오류');
const ground=E.calculate({...baseCfg,core_type:'CORE',core_num:3,has_ground:'적용',num_ground:1,thick_ground_insu:0.8});
ok(ground.rows.some(x=>x.process.includes('접지선 도체')),'접지선 도체 누락');
ok(ground.rows.some(x=>x.process.includes('접지선 절연')),'접지선 절연 누락');
const spec=E.calculateSpecRow(baseCfg,3,null);
const direct=E.calculate({...baseCfg,core_num:3});
ok(Math.abs(Number(spec.overallOD)-Number(direct.finalOD))<0.11,'메인/사양서 최종외경 불일치');
ok(spec.totalCostKm===direct.totalCost,'메인/사양서 재료비 불일치');

// 확대 회귀 매트릭스: 구조/심수/차폐 범위/재질/공법
for(const coreType of ['CORE','PAIR','TRIAD','QUAD']){
  for(const count of [1,2,3,7]){
    for(const scope of ['ind','ov']){
      for(const mat of mats) for(const method of methods){
        const c={...baseCfg,core_type:coreType,core_num:count,sheath_material:'PVC',thick_sheath:1.6};
        c[scope+'_shield_material']=mat; c[scope+'_shield_type']=method;
        c.thick_lead_shield=1.1; c.thick_ov_lead_shield=1.3;
        const r=E.calculate(c);
        ok(Array.isArray(r.rows)&&r.rows.length>=4,`matrix ${coreType}/${count}/${scope}/${mat}/${method}: 행 생성 실패`);
        ok(Number.isFinite(r.totalCost)&&r.totalCost>=0,`matrix ${coreType}/${count}/${scope}/${mat}/${method}: 비용 오류`);
        ok(Number.isFinite(r.totalWeight)&&r.totalWeight>0,`matrix ${coreType}/${count}/${scope}/${mat}/${method}: 중량 오류`);
        ok(Number.isFinite(r.finalOD)&&r.finalOD>0,`matrix ${coreType}/${count}/${scope}/${mat}/${method}: 외경 오류`);
        const ods=r.rows.map(x=>Number(x.od)).filter(x=>Number.isFinite(x)&&x>0);
        ok(ods.every((x,i)=>i===0 || x+1e-9>=ods[i-1]),`matrix ${coreType}/${count}/${scope}/${mat}/${method}: 외경 역전`);
      }
    }
  }
}
const ovLead=E.calculate({...baseCfg,ov_shield_material:'납',ov_shield_type:'Tape (테이프)',thick_ov_lead_shield:1.9});
const ovLeadRow=ovLead.rows.find(x=>x.process.includes('공동 차폐'));
ok(ovLeadRow && Number(ovLeadRow.thick)===1.9,'공동 납 차폐 전용 두께 미반영');

// Stability regression: invalid numeric inputs must not produce negative or non-finite results.
const unstableInput={...baseCfg,
  core_num:-3, thick_insu:-0.8, thick_inner_semi:-0.4, thick_outer_semi:-0.6,
  thick_bedding:-1.2, thick_armour:-1, thick_sheath:-1.6, thick_ground_insu:-0.8,
  thick_lead_shield:-1, thick_ov_lead_shield:-1, num_ground:-2,
  lme_usd_t:-13500, scr_usd_t:-415, exchange_rate:-1500, markup_rate:-5,
  calculated_copper_price:-100, insu_base_price:-3400, bedding_base_price:-2400,
  sheath_base_price:-2800, loss_conductor:-5, loss_insulation:-25,
  loss_bedding:-25, loss_sheath:-25, loss_other:-10, od_tolerance_percent:-5
};
const stableResult=E.calculate(unstableInput);
ok(stableResult.config.core_num===1,'stability: core count was not normalized to one');
ok(Number.isFinite(stableResult.totalCost) && stableResult.totalCost>=0,'stability: total cost is invalid');
ok(Number.isFinite(stableResult.totalWeight) && stableResult.totalWeight>=0,'stability: total weight is invalid');
ok(Number.isFinite(stableResult.finalOD) && stableResult.finalOD>0,'stability: final OD is invalid');
stableResult.rows.forEach((row,index)=>{
  ['od','area','weight','density','unitPrice','loss','cost'].forEach(key=>{
    if(row[key]===undefined || row[key]==='-') return;
    const value=Number(row[key]);
    ok(Number.isFinite(value) && value>=0,`stability: row ${index} ${key} is invalid`);
  });
});
const stableSpec=E.calculateSpecRow(unstableInput,-7,null,{thick_insu:-1,thick_sheath:-1});
ok(stableSpec.cores===1,'stability: spec row core count was not normalized');
ok(Number.isFinite(Number(stableSpec.overallOD)) && Number(stableSpec.overallOD)>0,'stability: spec row OD is invalid');
ok(Number.isFinite(Number(stableSpec.tolerance)) && Number(stableSpec.tolerance)>=0,'stability: spec row tolerance is invalid');

console.log(JSON.stringify({pass,fail,details},null,2));
process.exit(fail?1:0);
