// conductor-standard-ui.js
// 도체 표준별 메인 화면 구조 선택 및 A/TA 적용 조건 동기화
(function(){
  const $=id=>document.getElementById(id);
  const STRUCTURES={
    IEC:[['연선','연선 (Class 2)'],['집/복합','집/복합 (Class 5)']],
    ASTM:[['solid','SOLID'],['연선','연선'],['집/복합','집/복합']],
    IEEE_1580:[['집/복합','Type P 집/복합']]
  };

  function syncIeeeAvailability(){
    const coating=String($('cond_coating')?.value||'A').toUpperCase();
    const standard=$('conductorStandard');
    if(!standard) return false;
    const ieee=[...standard.options].find(option=>option.value==='IEEE_1580');
    if(ieee) {
      ieee.disabled=coating==='A';
      ieee.title=coating==='A'?'A(연동선)에서는 IEEE 1580을 선택할 수 없습니다.':'';
    }
    if(coating==='A' && standard.value==='IEEE_1580'){
      standard.value=[...standard.options].some(option=>option.value==='ASTM'&&!option.disabled)?'ASTM':'IEC';
      return true;
    }
    return false;
  }

  function syncStructureOptions(){
    syncIeeeAvailability();
    const standard=$('conductorStandard')?.value||'IEC';
    const structure=$('cond_class');
    if(!structure) return;
    const previous=structure.value;
    const coating=String($('cond_coating')?.value||'A').toUpperCase();
    // ASTM A/TA 모두 SOLID 선택을 제공한다. 실제 규격 목록은 DB의 도금 종류로 필터링한다.
    const options=(STRUCTURES[standard]||STRUCTURES.IEC);
    structure.innerHTML=options.map(([value,text])=>`<option value="${value}">${text}</option>`).join('');
    structure.value=options.some(([value])=>value===previous)?previous:options[0][0];
  }

  function refreshConductor(){
    if(typeof window.updateConductorSizes==='function') window.updateConductorSizes();
    if(typeof window.handleCondSizeChange==='function') window.handleCondSizeChange();
  }

  window.updateAstmClassOptions=function(){};
  window.handleConductorStandardChange=function(){
    syncStructureOptions();
    refreshConductor();
  };
  window.handleConductorStructureChange=function(){
    refreshConductor();
  };
  window.handleConductorCoatingChange=function(){
    syncStructureOptions();
    refreshConductor();
  };

  document.addEventListener('DOMContentLoaded',()=>{
    syncStructureOptions();
  });
  window.syncConductorStructureOptions=syncStructureOptions;
})();
