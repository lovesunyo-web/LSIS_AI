(function(){
  'use strict';
  let checking=false;
  window.openFullSpecIfAvailable=async function(event){
    if(event && typeof event.preventDefault==='function') event.preventDefault();
    if(checking) return false;
    checking=true;
    try{
      if(!window.FullSpecDB) throw new Error('FULL SPEC 저장소를 불러오지 못했습니다.');
      const count=typeof window.FullSpecDB.countItems==='function'
        ? await window.FullSpecDB.countItems()
        : (await window.FullSpecDB.getItems()).length;
      if(count<1){
        alert('추가된 SPEC이 없습니다.\n사양서부표에서 “FULL SPEC에 추가”를 먼저 실행해 주세요.');
        return false;
      }
      window.open('full-spec.html?v=20260916-performance-overview-1','_blank','noopener');
      return false;
    }catch(e){
      console.error(e);
      alert('FULL SPEC 항목을 확인할 수 없습니다.');
      return false;
    }finally{
      checking=false;
    }
  };
})();
