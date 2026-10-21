
(function(){
  'use strict';
  function readJson(key,def){try{return JSON.parse(sessionStorage.getItem(key)||localStorage.getItem(key)||JSON.stringify(def));}catch(e){return def;}}
  function cleanCableType(name,voltage){
    let s=String(name||'').trim();
    if(voltage) s=s.replace(new RegExp(String(voltage).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'),' ');
    s=s.replace(/\b\d+(?:\.\d+)?\s*(?:\/\s*\d+(?:\.\d+)?)?\s*k?v\b/ig,' ');
    s=s.replace(/\b\d+\s*(?:C|P|T|Q)(?:\s*\+\s*\d+\s*E)?\s*(?:X|×)\s*\d+(?:\.\d+)?\s*(?:SQMM|SQ|MM2|㎟|mm²)\b/ig,' ');
    s=s.replace(/\b\d+\s*(?:C|P|T|Q)(?:\s*\+\s*\d+\s*E)?\b/ig,' ');
    s=s.replace(/\b\d+(?:\.\d+)?\s*(?:SQMM|SQ|MM2|㎟|mm²)\b/ig,' ');
    s=s.replace(/\([^)]*(?:BN|BK|BL|GY|RD|WH|GN\/YL)[^)]*\)/ig,' ');
    return s.replace(/\s{2,}/g,' ').replace(/^[,\-–\s]+|[,\-–\s]+$/g,'').trim()||String(name||'Cable Type');
  }
  function fingerprint(value){
    const text=JSON.stringify(value||{});let hash=2166136261;
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return ('0000000'+(hash>>>0).toString(16)).slice(-8);
  }
  function objectOrEmpty(value){return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
  function techRowId(row,index){return [row?.cores||'',row?.sizeText||row?.nominalArea||'',index].join('|');}
  function indexList(value,length){
    if(!Array.isArray(value))return null;
    return [...new Set(value.filter(index=>Number.isInteger(index)&&index>=0&&index<length))];
  }
  function sourceStatus(cfg,form,allRows,selectedRows,rows,tech,drawing2D,drawing3D,techMeta){
    const chosenRows=Array.isArray(selectedRows)?selectedRows:[];
    const sourceRows=Array.isArray(allRows)?allRows:[];
    const capturedRows=Array.isArray(rows)?rows:[];
    const selected=chosenRows.length>0;
    const technicalRows=Array.isArray(tech)?tech:[];
    const selectedTechRows=Array.isArray(techMeta?.selectedRows)?techMeta.selectedRows:null;
    const selectedTechCount=selectedTechRows===null?technicalRows.length:selectedTechRows.length;
    const selectedColumns=Array.isArray(techMeta?.columns)?techMeta.columns:[];
    return {
      schemaVersion:3,
      lifecycle:selected?'SPEC_CONFIRMED':'DRAFT',
      specSheet:{confirmed:selected,selectedRows:chosenRows.length,totalRows:sourceRows.length,capturedRows:capturedRows.length},
      techData:{available:technicalRows.length>0&&selectedTechCount>0,count:selectedTechCount,totalRows:technicalRows.length,selectedColumns:selectedColumns.length,synchronized:techMeta?.synchronized===true?true:techMeta?.synchronized===false?false:null,conditionsAvailable:Object.keys(objectOrEmpty(techMeta?.conditions)).length>0},
      drawings:{twoD:!!drawing2D,threeD:!!drawing3D},
      fingerprint:fingerprint({cfg,form,rows:capturedRows,tech:technicalRows,techMeta}),
      capturedAt:new Date().toISOString()
    };
  }
  function getSnapshot(){
    if(typeof window.saveForm==='function') window.saveForm();
    const cfg=readJson('cable_design_main_config',{});
    const form=readJson('cable_spec_sheet_form',{});
    const rawRows=readJson('cable_spec_rows',[]);
    const allRows=Array.isArray(rawRows)?rawRows:[];
    const rawSelectedRows=readJson('cable_spec_selected_rows',[]);
    const selectedRows=Array.isArray(rawSelectedRows)?rawSelectedRows:[];
    const rows=selectedRows.length?allRows.filter((_,i)=>selectedRows.includes(i)):allRows;
    const rawTech=readJson('cable_tech_rows',[]);
    const storedTech=Array.isArray(rawTech)?rawTech:[];
    const techEdits=objectOrEmpty(readJson('cable_tech_manual_edits',{}));
    const tech=storedTech.map(row=>{const current=objectOrEmpty(row);return Object.assign({},current,objectOrEmpty(techEdits[current.id]));});
    const rawTechColumns=readJson('cable_tech_selected_columns',[]);
    const techColumns=Array.isArray(rawTechColumns)?rawTechColumns.filter(key=>typeof key==='string'):[];
    const techSelectedRows=indexList(readJson('cable_tech_selected_rows',null),tech.length);
    const techConditions=objectOrEmpty(readJson('cable_tech_conditions',{}));
    const rawTechRowIds=readJson('cable_tech_row_ids',[]);
    const techRowIds=Array.isArray(rawTechRowIds)?rawTechRowIds.filter(id=>typeof id==='string'):[];
    const expectedTechRowIds=rows.map((row,index)=>techRowId(row,index));
    const synchronized=techRowIds.length?techRowIds.length===expectedTechRowIds.length&&techRowIds.every((id,index)=>id===expectedTechRowIds[index]):null;
    const techMeta={columns:techColumns,selectedRows:techSelectedRows,conditions:techConditions,rowIds:techRowIds,synchronized};
    const voltage=String(form.voltage||cfg.v_rating||'').trim();
    const fullName=String(form.cableType||cfg.cable_name||cfg.product_name||'Cable').trim();
    const cableType=cleanCableType(fullName,voltage);
    const drawing2D=sessionStorage.getItem('cable_2d_drawing')||'';
    const drawing3D=sessionStorage.getItem('cable_3d_drawing')||'';
    const source=sourceStatus(cfg,form,allRows,selectedRows,rows,tech,drawing2D,drawing3D,techMeta);
    return {
      id:'ITEM-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
      order:Date.now(), savedAt:new Date().toISOString(),
      ratedVoltage:voltage, cableType, fullDesignation:[voltage,fullName].filter(Boolean).join(' '),
      schemaVersion:3, lifecycle:source.lifecycle, source,
      cfg, form, rows, tech, techMeta, drawing2D, drawing3D
    };
  }
  window.addCurrentSpecToFullSpec=async function(){
    try{
      const snap=getSnapshot();
      const items=await FullSpecDB.getItems();
      const same=items.find(x=>x.ratedVoltage===snap.ratedVoltage&&x.fullDesignation===snap.fullDesignation);
      if(same && !confirm('동일한 SPEC SHEET가 이미 있습니다. 새 항목으로 추가하시겠습니까?')) return;
      await FullSpecDB.putItem(snap);
      alert('현재 SPEC SHEET를 FULL SPEC 프로젝트에 추가했습니다.\nCable Type: '+snap.cableType);
    }catch(e){
      console.error(e); alert('FULL SPEC 추가 중 오류가 발생했습니다: '+e.message);
    }
  };
})();
