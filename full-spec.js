
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const getVal=(o,k,d='')=>o&&o[k]!==undefined?o[k]:d;
let items=[], candidates=[], manualEdits={}, project=null, requirementsLibrary=null;
 let workflow={status:'DRAFT',changedAt:'',reviewedAt:'',issuedAt:''};
 const workflowStepIds=['collect','document','standards','review','publish'];
 let uiState={activeStep:'collect'};
  let appReady=false, requirementLibraryTimer, requirementLibraryRedrawNeeded=false;
  let draftRenderTimer, previewIsDirty=false;
  const requirementLibraryApi=()=>window.FullSpecRequirements||null;
  const copyJson=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const libraryRows=kind=>Array.isArray(requirementsLibrary?.[kind])?requirementsLibrary[kind]:[];
   const libraryRecord=(kind,id)=>libraryRows(kind).find(row=>row.id===id);
   const productPackageRef=index=>'10.'+(Number(index)+1);
   function librarySourceFor(row){return row?.sourceId?libraryRecord('sources',row.sourceId):null;}
  function libraryRequirementIssues(row){
   const issues=[],source=librarySourceFor(row),filled=value=>String(value??'').trim()!=='';
   if(!source)issues.push('controlled source is not registered');
   else{
    if(source.status!=='APPROVED')issues.push('controlled source is not APPROVED');
    if(!filled(source.standard||source.title||row.standard))issues.push('source document number/title is missing');
    if(!filled(source.edition||row.edition))issues.push('source edition/revision is missing');
    if(!filled(source.clause||row.clause||source.table||row.table||source.page||row.page))issues.push('source clause, table or page is missing');
   }
   if(!['test','material'].includes(row?.category))issues.push('row type is invalid');
   if(row?.category==='test'){
    if(!filled(row.test||row.title))issues.push('test item is missing');
    if(!['ROUTINE','TYPE','SAMPLE'].includes(row.testClass))issues.push('test class is missing');
    if(!filled(row.method||row.methodClause))issues.push('test method is missing');
   }
   if(row?.category==='material'){
    if(!filled(row.property||row.title))issues.push('property item is missing');
    if(!filled(row.material)&&!filled(row.appliesWhen?.profileId))issues.push('material or applicable profile is missing');
   }
   if(filled(row?.appliesWhen?.productRef)&&!items.some(item=>item.id===row.appliesWhen.productRef))issues.push('applicable product scope is not a current SPEC SHEET ID');
   if(!filled(row?.comparator)&&!filled(row?.value))issues.push('requirement value or pass/fail comparator is missing');
   return issues;
  }
   function approvedLibraryRequirements(category){
   return libraryRows('requirements').filter(row=>{
    if(row.status!=='APPROVED'||(category&&row.category!==category))return false;
    return !libraryRequirementIssues(row).length;
   });
  }
  function libraryRuleValues(value){
   const values=Array.isArray(value)?value:String(value??'').split(/[|,]/);
   return values.map(value=>String(value??'').trim().toLowerCase()).filter(Boolean);
  }
  function libraryRuleMatches(rule,actual){
   if(rule===undefined||rule===null||rule===''||(Array.isArray(rule)&&!rule.length)||rule==='*')return true;
   if(typeof rule==='boolean')return Array.isArray(actual)?actual.some(value=>String(value).toLowerCase()===String(rule)):actual===rule||String(actual).toLowerCase()===String(rule);
   const expected=libraryRuleValues(rule),actualValues=libraryRuleValues(actual);
   return expected.some(value=>actualValues.includes(value));
  }
  function roleLayerNames(roleId){
   return {
    cable:['Completed cable','Cable'],
    conductor:['Conductor'],
    insulation:['Insulation'],
    innerSheath:['Inner Sheath / Bedding','Bedding / Inner covering','Inner sheath','Bedding','Inner covering'],
    outerSheath:['Outer Sheath','Sheath','Outer jacket'],
    screen:['Screen','Individual screen','Collective screen'],
    armour:['Armour','Armor']
   }[roleId]||[roleId||'Completed cable'];
  }
  function itemHasArmour(item){
   const c=item?.cfg||{};
   return active(c.armour_material_new)||active(c.armour_type_new)||active(c.armour_type);
  }
  function firePerformanceFor(item){
   const flags=itemFlags(item),text=[item?.fullDesignation,item?.cableType,item?.cfg?.sheath_material,item?.form?.sheath].filter(Boolean).join(' ');
   const out=[];
   if(flags.fire)out.push('Fire-resistant','Fire resistant');
   if(/HALOGEN|SHF|LSZH|HF-/i.test(text))out.push('Halogen-free','Halogen free');
   return out;
  }
  function libraryProfileIdsFor(item,roleId,material){
   const layers=roleLayerNames(roleId);
   return libraryRows('materialProfiles').filter(profile=>{
    const applies=profile.appliesWhen||{};
    return libraryRuleMatches(profile.material||applies.material,material)
     && libraryRuleMatches(profile.layer||applies.layer,layers);
   }).map(profile=>profile.id);
  }
  function libraryContextForItem(item,itemIndex,roleId='cable',material=''){
   const c=item?.cfg||{},f=item?.form||{},profiles=[...new Set([...profileIds(item),...libraryProfileIdsFor(item,roleId,material)])];
   const cableFamily=[...new Set([...profileIds(item),standardKeyFor(item),item?.cableType||'',item?.fullDesignation||''].filter(Boolean))];
   const conductor=[value(c,'cond_material'),value(c,'cond_class'),value(c,'cond_coating')].filter(Boolean);
   return {
    profileId:profiles,
    cableFamily,
    voltage:[item?.ratedVoltage||'',value(c,'ratedVoltage')],
    conductor,
    material,
    layer:roleLayerNames(roleId),
    hasArmour:itemHasArmour(item),
    firePerformance:firePerformanceFor(item),
    productRef:[item?.id||'']
   };
  }
  function libraryRequirementMatches(requirement,context){
   const applies=requirement?.appliesWhen||{};
   const keys=['profileId','cableFamily','voltage','conductor','material','layer','hasArmour','firePerformance','productRef'];
   return keys.every(key=>libraryRuleMatches(applies[key],context?.[key]))
    && libraryRuleMatches(requirement?.material,context?.material)
    && libraryRuleMatches(requirement?.layer,context?.layer);
  }
  function libraryRequirementCriterion(requirement){
   const main=[requirement?.comparator,requirement?.value,requirement?.unit].filter(value=>String(value??'').trim()).join(' ');
   return main||'As specified by the approved source';
  }
  function libraryRequirementSource(requirement,matchedItems=[]){
   const source=librarySourceFor(requirement)||{};
   const reference=[
    source.standard||requirement.standard||source.title||requirement.sourceId||'Controlled source',
    source.edition||requirement.edition,
    source.clause||requirement.clause?('Clause '+(source.clause||requirement.clause)):'',
    source.table||requirement.table?('Table '+(source.table||requirement.table)):'',
    source.page||requirement.page?('p.'+(source.page||requirement.page)):''
   ].filter(Boolean).join(' | ');
   const packages=matchedItems.map(item=>productPackageRef(items.indexOf(item))).filter((value,index,array)=>array.indexOf(value)===index);
   return '['+(requirement.id||'REQ')+'] '+reference+(packages.length?' | Product package: '+packages.join(', '):'');
  }
  function testGroupForLibraryRequirement(requirement){
   return {ROUTINE:'Routine Test',SAMPLE:'Sample Test',TYPE:'Type Test',NONE:'Other Test'}[requirement?.testClass]||'Other Test';
  }
const certs=[
 {key:'dqs',logo:'assets/dqs-logo.png',name:'DQS',text:'ISO 9001\nISO 14001\nISO 45001\nISO 50001'},
 {key:'iris',logo:'assets/iris-logo.png',name:'TÜV / IRIS',text:'ISO 22163'},
 {key:'lrqa',logo:'assets/lrqa-logo.png',name:'LRQA',text:'ISO 9001\nISO 14001'},
 {key:'ias',logo:'assets/ias-logo.png',name:'IAS',text:'ISO 45001'},
 {key:'kepic',logo:'assets/kepic-logo.png',name:'KEPIC',text:'KEPIC-EN'}
];
const fixedCoverCerts=[
 {name:'DQS',logo:'assets/dqs-logo.png',text:'ISO 9001 \u00b7 ISO 14001\nISO 45001 \u00b7 ISO 50001'},
 {name:'IRIS',logo:'assets/iris-logo.png',text:'ISO\n22163'},
 {name:'LRQA',logo:'assets/lrqa-logo.png',text:'ISO 9001 \u00b7\nISO 14001'},
 {name:'IAS',logo:'assets/ias-logo.png',text:'ISO 45001'},
 {name:'KEPIC',logo:'assets/kepic-logo.png',text:'KEPIC-EN'}
];
function fieldIds(){return ['docTitle','productName','specNo','revNo','issuedDate','application','preparedBy','reviewedBy','approvedBy','language','scopeText'];}
function formData(){const o={};fieldIds().forEach(id=>o[id]=$(id)?.value||'');o.certs=certs.map(c=>({...c,enabled:($('cert-enabled-'+c.key)||{}).checked!==false,text:($('cert-'+c.key)||{}).value||c.text}));return o;}
function active(v){return !['','미적용','없음','none','n/a','na','false','0','not applicable'].includes(String(v??'').trim().toLowerCase());}
function value(cfg,...keys){for(const k of keys){if(active(cfg?.[k]))return String(cfg[k]);}return '';}
function detectMV(v){const nums=(String(v).match(/\d+(?:\.\d+)?/g)||[]).map(Number);return nums.some(n=>n>=3.6)||/\bMV\b/i.test(String(v));}
 function normalizeWorkflow(data){
  const next=Object.assign({status:'DRAFT',changedAt:'',reviewedAt:'',issuedAt:''},data||{});
  if(!['DRAFT','IN_REVIEW','ISSUED'].includes(next.status))next.status='DRAFT';
  return next;
 }
 function normalizeUiState(data){
  const activeStep=data&&workflowStepIds.includes(data.activeStep)?data.activeStep:'collect';
  return {activeStep};
 }
function workflowLabel(status=workflow.status){return {DRAFT:'DRAFT',IN_REVIEW:'IN REVIEW',ISSUED:'ISSUED'}[status]||'DRAFT';}
function workflowClass(status=workflow.status){return status==='ISSUED'?'workflow-issued':status==='IN_REVIEW'?'workflow-review':'workflow-draft';}
function isPlaceholder(value){
 const text=String(value??'').trim().toLowerCase();
 return !text||/^\[.+\]$/.test(text)||text.includes('confirmation required')||text.includes('확인 필요');
}
function sourceInfo(item){return item&&item.source?item.source:null;}
function sourceChips(item){
 const source=sourceInfo(item);
 if(!source)return `<div class='item-statuses'><span class='status-chip status-warn'>LEGACY SNAPSHOT</span></div>`;
 const chips=[];
 chips.push(`<span class='status-chip ${source.specSheet?.confirmed?'status-ok':'status-error'}'>${source.specSheet?.confirmed?'SPEC CONFIRMED':'SPEC DRAFT'}</span>`);
 const techOk=source.techData?.available&&source.techData?.synchronized!==false;
 const techLabel=source.techData?.available?(source.techData?.synchronized===false?'TECH STALE':'TECH DATA'):'NO TECH DATA';
 chips.push('<span class="status-chip '+(techOk?'status-ok':'status-warn')+'">'+techLabel+'</span>');
 chips.push(`<span class='status-chip ${(source.drawings?.twoD||source.drawings?.threeD)?'status-ok':'status-warn'}'>${(source.drawings?.twoD||source.drawings?.threeD)?'DRAWING':'NO DRAWING'}</span>`);
 return `<div class='item-statuses'>${chips.join('')}</div>`;
}
 function collectPreflight(){
 const errors=[],warnings=[],f=formData();
 const add=(level,message)=>{(level==='error'?errors:warnings).push(message);};
 [['Product Name',f.productName],['Spec. No.',f.specNo],['Application',f.application],['Prepared By',f.preparedBy]].forEach(([label,value])=>{if(isPlaceholder(value))add('error',`${label} is required.`);});
 if(!items.length)add('error','Add at least one confirmed SPEC SHEET to the Full Spec project.');
 items.forEach((item,index)=>{
  const name=item.fullDesignation||item.cableType||`SPEC SHEET ${index+1}`,source=sourceInfo(item);
  if(!source){add('warning',`${name}: legacy snapshot; re-add it after confirming the SPEC SHEET.`);return;}
  if(!source.specSheet?.confirmed)add('error',`${name}: SPEC SHEET is not confirmed.`);
  if(!(source.specSheet?.capturedRows>0))add('error',`${name}: no selected dimension rows were captured.`);
  if(!source.techData?.available)add('warning',`${name}: TECH DATA is not available.`);
  if(source.techData?.synchronized===false)add('warning',name+': TECH DATA does not match the current confirmed SPEC SHEET rows. Regenerate it before issue.');
  if(source.techData?.available&&!source.techData?.conditionsAvailable)add('warning',name+': TECH DATA was captured without calculation-condition metadata.');
  if(!(source.drawings?.twoD||source.drawings?.threeD))add('warning',`${name}: no section drawing was captured.`);
 });
  candidatePreflightFindings(add);
 if(workflow.status==='ISSUED'){
  [['Reviewed By',f.reviewedBy],['Approved By',f.approvedBy]].forEach(([label,value])=>{if(isPlaceholder(value))add('error',`${label} is required before an issued document can be retained.`);});
 }
  return {errors,warnings};
 }
 function requiredDocumentProgress(){
  const f=formData(),required=['productName','specNo','application','preparedBy'];
  return {total:required.length,done:required.filter(id=>!isPlaceholder(f[id])).length};
 }
 function confirmedSpecProgress(){
  const confirmed=items.filter(item=>{
   const source=sourceInfo(item);
   return !!(source?.specSheet?.confirmed&&source.specSheet?.capturedRows>0);
  }).length;
  return {total:items.length,confirmed};
 }
 function standardProgress(){
   const approved=candidates.filter(candidate=>candidate.approved);
   const libraryApproved=approvedLibraryRequirements();
   return {total:candidates.length+libraryRows('requirements').length,approved:approved.length+libraryApproved.length,scoped:approved.filter(candidate=>scopeIsConfirmed(candidate)).length+libraryApproved.length};
 }
 function workflowStepSummaries(result){
  const spec=confirmedSpecProgress(),doc=requiredDocumentProgress(),standards=standardProgress();
  const collectComplete=spec.total>0&&spec.confirmed===spec.total;
  const documentComplete=doc.done===doc.total;
  const standardsComplete=standards.approved>0&&standards.scoped===standards.approved;
  return {
   collect:{state:collectComplete?'complete':spec.total?'attention':'todo',detail:`${spec.confirmed}/${spec.total} confirmed SPEC SHEET(s)`},
   document:{state:documentComplete?'complete':'attention',detail:`${doc.done}/${doc.total} required field(s)`},
    standards:{state:!standards.total?'todo':!standards.approved?'todo':standardsComplete?'complete':'attention',detail:!standards.total?'No controlled STD requirement':standards.approved?`${standards.scoped}/${standards.approved} approved requirement(s) scoped`:'Choose applicable requirements'},
   review:{state:result.errors.length?'attention':result.warnings.length?'attention':'complete',detail:`${result.errors.length} error / ${result.warnings.length} warning`},
   publish:{state:workflow.status==='ISSUED'?'complete':'todo',detail:workflow.status==='ISSUED'?'Document issued':workflow.status==='IN_REVIEW'?'In review':'Export after review'}
  };
 }
 function workflowNextAction(summaries,result){
  if(summaries.collect.state!=='complete')return {step:'collect',title:'Collect confirmed SPEC SHEETs',detail:'Add at least one confirmed item with selected dimension rows.'};
  if(summaries.document.state!=='complete')return {step:'document',title:'Complete document information',detail:'Fill in the required document fields before issue.'};
  if(summaries.standards.state==='attention'||(summaries.standards.state==='todo'&&(candidates.length||libraryRows('requirements').length)))return {step:'standards',title:'Review STD requirements',detail:'Approve only applicable requirements and confirm their scope.'};
  if(result.errors.length||result.warnings.length)return {step:'review',title:'Review preflight findings',detail:result.errors.length?'Correct the blocking errors before export.':'Resolve or acknowledge the remaining warnings.'};
  return {step:'publish',title:'Review and publish',detail:'The draft is ready for HTML, PDF/print, or PPTX export.'};
 }
 function renderWorkflowSteps(result=collectPreflight()){
  document.documentElement.classList.add('workflow-initialized');
  const summaries=workflowStepSummaries(result);
  if(!workflowStepIds.includes(uiState.activeStep))uiState.activeStep='collect';
  document.querySelectorAll('[data-workflow-pane]').forEach(pane=>{pane.hidden=pane.dataset.workflowPane!==uiState.activeStep;});
  document.querySelectorAll('[data-workflow-target]').forEach(button=>{
   const step=button.dataset.workflowTarget,summary=summaries[step];if(!summary)return;
   const activeStep=step===uiState.activeStep;
   button.classList.toggle('is-active',activeStep);
   button.classList.toggle('is-complete',summary.state==='complete');
   button.classList.toggle('is-attention',summary.state==='attention');
   button.dataset.workflowState=summary.state;
   if(activeStep)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
   const detail=button.querySelector('small');if(detail)detail.textContent=summary.detail;
  });
  const target=$('workflowSummary'),next=workflowNextAction(summaries,result);
  if(target)target.innerHTML=`<span class=workflow-summary-label>NEXT ACTION</span><strong>${esc(next.title)}</strong><span>${esc(next.detail)}</span>`;
  return summaries;
 }
 function setWorkflowNavigationEnabled(enabled){
  document.querySelectorAll('[data-workflow-target]').forEach(button=>{button.disabled=!enabled;});
 }
 window.setActiveWorkflowStep=function(step){
  if(!appReady||!workflowStepIds.includes(step))return false;
  uiState.activeStep=step;renderWorkflowSteps();
  persistProject(false).catch(error=>console.error(error));
  return true;
 };
 function renderPreflight(result=collectPreflight()){
  const target=$('preflightSummary');
  if(target){
   const count=`<div class='preflight-counts'><span class='status-chip ${result.errors.length?'status-error':'status-ok'}'>ERROR ${result.errors.length}</span><span class='status-chip ${result.warnings.length?'status-warn':'status-ok'}'>WARNING ${result.warnings.length}</span></div>`;
   const lines=[...result.errors.map(x=>`<li><b>Error:</b> ${esc(x)}</li>`),...result.warnings.map(x=>`<li><b>Warning:</b> ${esc(x)}</li>`)].join('');
   target.innerHTML=count+(lines?`<ul class='preflight-list'>${lines}</ul>`:`<div class='preflight-empty'>Ready for review. No preflight findings.</div>`);
  }
  renderWorkflowSteps(result);
  return result;
 }
function refreshWorkflowUi(){const select=$('documentStatus');if(select)select.value=workflow.status;}
window.runPreflight=function(){return renderPreflight(collectPreflight());};
function issueGate(action){
 const result=window.runPreflight();
 if(result.errors.length){alert(`${action} is blocked until ${result.errors.length} preflight error(s) are corrected.`);return false;}
 if(result.warnings.length&&!confirm(`${result.warnings.length} warning(s) remain. Continue with ${action}?`))return false;
 return true;
}
function editable(key,text,tag='div',cls='contenteditable'){
 const val=manualEdits[key]!==undefined?manualEdits[key]:text;
 return `<${tag} class="${cls}" contenteditable="true" data-edit="${esc(key)}">${esc(val).replace(/\n/g,'<br>')}</${tag}>`;
}
function initCertEditor(){
  const target=$('certEditor');if(!target)return;
  if(target.previousElementSibling?.tagName==='H3')target.previousElementSibling.remove();
  target.remove();
}
function makeDefaultScope(){
 const f=formData(), volts=[...new Set(items.map(x=>x.ratedVoltage).filter(Boolean))].join(', ')||'[Rated Voltage]';
 const types=[...new Set(items.map(x=>x.cableType).filter(Boolean))].join(', ')||'[Cable Type]';
 if(f.language==='ko') return `본 사양서는 ${volts} ${types} 케이블의 구조, 재질, 치수, 전기적 특성, 시험, 마킹 및 포장에 대한 최소 요구사항을 규정한다. 적용 용도는 ${f.application||'[확인 필요]'}이며, 세부 요구조건은 업로드된 적용 규격 및 승인된 설계자료에 따른다.`;
 return `This specification defines the minimum requirements for the construction, materials, dimensions, electrical characteristics, tests, marking and packing of ${volts} ${types} cables. The cables are intended for ${f.application||'[confirmation required]'} and shall comply with the uploaded applicable standards and the approved design data.`;
}
function renderItemList(){
 if(!items.length){$('itemList').innerHTML=`<div class='empty'>수집된 SPEC SHEET가 없습니다.</div>`;return;}
 $('itemList').innerHTML=items.map((x,i)=>`<div class='item'><span>${i+1}</span><div><b>${esc(x.ratedVoltage)} / ${esc(x.cableType)}</b><span>${esc(x.fullDesignation)}</span>${sourceChips(x)}</div><div><button onclick='moveItem(${JSON.stringify(x.id)},-1)'>↑</button><button onclick='moveItem(${JSON.stringify(x.id)},1)'>↓</button><button onclick='removeItem(${JSON.stringify(x.id)})'>삭제</button></div></div>`).join('');
}
window.moveItem=async(id,d)=>{
 const i=items.findIndex(x=>x.id===id),j=i+d;if(i<0||j<0||j>=items.length)return;
 [items[i],items[j]]=[items[j],items[i]];items.forEach((x,n)=>x.order=n);
 for(const x of items)await FullSpecDB.putItem(x);renderItemList();generateDraft();
};
window.removeItem=async id=>{if(!confirm('이 SPEC SHEET를 FULL SPEC에서 삭제하시겠습니까?'))return;await FullSpecDB.deleteItem(id);items=items.filter(x=>x.id!==id);renderItemList();generateDraft();};
function stripSize(name){
 let s=String(name||'');
 s=s.replace(/\b\d+\s*(?:C|P|T|Q)(?:\s*\+\s*\d+\s*E)?\s*(?:X|×)\s*\d+(?:\.\d+)?\s*(?:SQMM|SQ|MM2|㎟|mm²)\b/ig,' ');
 s=s.replace(/\b\d+\s*(?:C|P|T|Q)(?:\s*\+\s*\d+\s*E)?\b/ig,' ');
 s=s.replace(/\b\d+(?:\.\d+)?\s*(?:SQMM|SQ|MM2|㎟|mm²)\b/ig,' ');
 return s.replace(/\s{2,}/g,' ').trim();
}

const layerOrder=[
 'conductor','fireResistingLayer','separator','conductorScreen','insulation',
 'insulationScreenNonMetallic','insulationScreenMetallic','coreIdentification',
 'individualScreen','cabling','filler','binderTape','collectiveScreen',
 'innerCovering','innerSheath','bedding','reinforcement','armour','vfdEmcShield','outerSheath'
];
const layerTitles={
 conductor:'Conductor',fireResistingLayer:'Fire-resisting Layer',separator:'Separator',
 conductorScreen:'Conductor Screen',insulation:'Insulation',
 insulationScreenNonMetallic:'Insulation Screen – Non-metallic Screen',
 insulationScreenMetallic:'Insulation Screen – Metallic Screen',
 coreIdentification:'Core Identification',individualScreen:'Individual / Component Screen',
 cabling:'Cabling and Assembly',filler:'Filler',binderTape:'Binder Tape',
 collectiveScreen:'Collective Screen',innerCovering:'Inner Covering',
 innerSheath:'Inner Sheath',bedding:'Bedding',reinforcement:'Reinforcement Layer',
 armour:'Armour',vfdEmcShield:'VFD / EMC Shield',outerSheath:'Outer Sheath'
};
function typeName(item){return stripSize(item.cableType||item.fullDesignation||'Cable Type');}
function itemFlags(item){
 const n=(item.fullDesignation+' '+item.cableType).toUpperCase(), c=item.cfg||{};
 return {
  mv:detectMV(item.ratedVoltage),
  fire:/\bFRT[-\s]/.test(n)||active(c.tape_mica),
  torsion:/\(T\)|TORSION/.test(n),
  reel:/REEL/.test(n),
  vfd:/VFD|EMC/.test(n)
 };
}
const profileNames={generic:'General cable',mv:'Medium voltage cable',marine:'Marine cable',ieee:'IEEE 1580 cable',nema:'ICEA / NEMA / AEIC cable',rail:'EN railway cable',fire:'Fire-resistant cable',reel:'Reeling cable',vfd:'VFD / EMC cable'};
const standardScopeNames={ieee1580:'IEEE 1580',iec60092:'IEC 60092',en50264:'EN 50264',iceaNemaAeic:'ICEA / NEMA / AEIC',iec60502:'IEC 60502',project:'Project-defined standard'};
const materialRoleNames={cable:'Cable system',conductor:'Conductor',insulation:'Insulation',innerSheath:'Inner sheath / bedding',outerSheath:'Outer sheath',screen:'Screen',armour:'Armour'};
const propertyMaterialRoleNames={insulation:'Insulation',innerSheath:'Inner sheath / bedding',outerSheath:'Outer sheath'};
const materialFamilyNames={xlpe:'XLPE / crosslinked polyolefin',epr:'EPR / EPDM / rubber',pvc:'PVC',halogenFree:'Halogen-free / LSZH',other:'Other material'};
function scopeList(value){return Array.isArray(value)?[...new Set(value.map(v=>String(v||'').trim()).filter(Boolean))]:[];}
function allowedScopeList(value,labels){return scopeList(value).filter(id=>Object.prototype.hasOwnProperty.call(labels,id));}
function emptyCandidateScope(){return {profileIds:[],standardIds:[],materialRoleIds:[],materialFamilies:[],appliesToAll:false,confirmed:false};}
function candidateScope(candidate){
 const raw=candidate&&candidate.scope&&typeof candidate.scope==='object'?candidate.scope:{};
 const roleLabels=candidate&&candidate.category==='property'?propertyMaterialRoleNames:materialRoleNames;
 return {
  profileIds:allowedScopeList(raw.profileIds,profileNames),
  standardIds:allowedScopeList(raw.standardIds,standardScopeNames),
  materialRoleIds:allowedScopeList(raw.materialRoleIds,roleLabels),
  materialFamilies:allowedScopeList(raw.materialFamilies,materialFamilyNames),
   appliesToAll:raw.appliesToAll===true&&candidate?.category!=='property',
  confirmed:raw.confirmed===true
 };
}
function normalizeCandidate(candidate){
 const next=Object.assign({},candidate||{});
 next.approved=next.approved===true;
 next.scope=candidateScope(next);
 return next;
}
function normalizeCandidates(list){return Array.isArray(list)?list.map(normalizeCandidate):[];}
function standardKeyFor(item){
 const c=item.cfg||{},text=[c.thickness_rule_mode,c.thickness_std,c.conductorStandard,c.conductor_standard,item.ratedVoltage].filter(Boolean).join(' ').toUpperCase();
 if(/IEEE[_ ]?1580/.test(text))return 'ieee1580';
 if(/IEC[_ ]?60092/.test(text))return 'iec60092';
 if(/EN[_ ]?50264/.test(text))return 'en50264';
 if(/ICEA|NEMA|AEIC|WC70|WC71|WC74|WC57/.test(text))return 'iceaNemaAeic';
 if(/IEC[_ ]?60502/.test(text))return 'iec60502';
 return 'project';
}
function materialFamilyIdsFor(material){
 const text=String(material||'').toUpperCase(),ids=[];
 if(/HALOGEN|SHF|LSZH|HF-/.test(text))ids.push('halogenFree');
 if(/XLPE|XLP|XL-EVA/.test(text))ids.push('xlpe');
 if(/EPR|EPDM|RUBBER/.test(text))ids.push('epr');
 if(/PVC/.test(text))ids.push('pvc');
 if(!ids.length)ids.push('other');
 return [...new Set(ids)];
}
function materialFamilyFor(material){return materialFamilyIdsFor(material)[0]||'other';}
function itemMaterialFamilyIds(item){
 const c=item?.cfg||{},f=item?.form||{},materials=[
  value(c,'insu_material','standard_insu_material')||f.insulation||'',
  value(c,'bedding_material'),
  value(c,'sheath_material')||f.sheath||'',
  value(c,'ind_shield_material','ov_shield_material'),
  value(c,'armour_material_new')
 ];
 return [...new Set(materials.filter(Boolean).flatMap(materialFamilyIdsFor))];
}
function scopeContext(item,options={}){
 const material=options.material||'';
 return {
  item:item||null,
  profileIds:item?profileIds(item):['generic'],
  standardIds:item?[standardKeyFor(item)]:['project'],
  materialRoleIds:options.roleId?[options.roleId]:[],
  materialFamilies:material?materialFamilyIdsFor(material):(options.roleId==='cable'&&item?itemMaterialFamilyIds(item):[])
 };
}
function standardFor(item){
 const c=item.cfg||{},text=[c.thickness_rule_mode,c.thickness_std,c.conductorStandard,c.conductor_standard,item.ratedVoltage].filter(Boolean).join(' ').toUpperCase();
 if(/IEEE[_ ]?1580/.test(text))return 'IEEE 1580';
 if(/IEC[_ ]?60092/.test(text))return 'IEC 60092';
 if(/EN[_ ]?50264/.test(text))return 'EN 50264';
 if(/ICEA|NEMA|AEIC|WC70|WC71|WC74|WC57/.test(text))return 'ICEA / NEMA / AEIC';
 if(/IEC[_ ]?60502/.test(text))return 'IEC 60502';
 return 'Applicable project standard';
}
function profileIds(item){
 const c=item.cfg||{},flags=itemFlags(item),text=[c.thickness_rule_mode,c.thickness_std,c.conductorStandard,c.conductor_standard].filter(Boolean).join(' ').toUpperCase(),ids=[];
 if(flags.mv)ids.push('mv');
 if(/IEEE[_ ]?1580/.test(text))ids.push('ieee');
 else if(/IEC[_ ]?60092/.test(text))ids.push('marine');
 else if(/EN[_ ]?50264/.test(text))ids.push('rail');
 else if(/ICEA|NEMA|AEIC|WC70|WC71|WC74|WC57/.test(text))ids.push('nema');
 if(flags.fire)ids.push('fire');
 if(flags.reel)ids.push('reel');
 if(flags.vfd)ids.push('vfd');
 return [...new Set(['generic',...ids])];
}
function scopeHasSelection(scope,candidate){
 const materialScoped=scope.materialRoleIds.length||scope.materialFamilies.length;
 if(candidate?.category==='property')return !!materialScoped;
 return !!(scope.appliesToAll||scope.profileIds.length||scope.standardIds.length||materialScoped);
}
function scopeIsConfirmed(candidate){const scope=candidateScope(candidate);return scope.confirmed&&scopeHasSelection(scope,candidate);}
function anyScopeMatch(required,actual){return !required.length||required.some(id=>actual.includes(id));}
function candidateMatchesScope(candidate,context){
 const scope=candidateScope(candidate),ctx=context||{};
 if(!scopeIsConfirmed(candidate))return false;
 const base=scope.appliesToAll||(anyScopeMatch(scope.profileIds,ctx.profileIds||[])&&anyScopeMatch(scope.standardIds,ctx.standardIds||[]));
 return base
  && anyScopeMatch(scope.materialRoleIds,ctx.materialRoleIds||[])
  && anyScopeMatch(scope.materialFamilies,ctx.materialFamilies||[]);
}
function candidateScopeText(candidate){
 const scope=candidateScope(candidate),parts=[];
 if(scope.appliesToAll)parts.push('All collected items');
 else {
  if(scope.profileIds.length)parts.push('Profiles: '+scope.profileIds.map(id=>profileNames[id]||id).join(', '));
  if(scope.standardIds.length)parts.push('Standards: '+scope.standardIds.map(id=>standardScopeNames[id]||id).join(', '));
  if(scope.materialRoleIds.length)parts.push('Roles: '+scope.materialRoleIds.map(id=>materialRoleNames[id]||id).join(', '));
  if(scope.materialFamilies.length)parts.push('Materials: '+scope.materialFamilies.map(id=>materialFamilyNames[id]||id).join(', '));
 }
 return parts.length?parts.join(' | '):'Scope not mapped';
}
function approved(category,contexts){
 const list=Array.isArray(contexts)?contexts:(contexts?[contexts]:[]);
 if(!list.length)return [];
 return candidates.filter(x=>x.approved&&x.category===category&&scopeIsConfirmed(x)&&list.some(context=>candidateMatchesScope(x,context)));
}
function profileSummary(){
 const result=[],seen=new Set();
 items.forEach(item=>profileIds(item).forEach(id=>{const text=profileNames[id]||id;if(!seen.has(text)){seen.add(text);result.push(text);}}));
 return result;
}
function constructionFor(item){
 const c=item.cfg||{}, f=item.form||{}, flags=itemFlags(item), rows=[];
 const add=(id,detail,meta={})=>rows.push({id,name:layerTitles[id],detail,...meta});
 const stdHint=(type,roleId='cable',material='')=>{
   const hit=approved('thickness',scopeContext(item,{roleId,material})).find(x=>x.text.toLowerCase().includes(type.toLowerCase()));
   return hit?` ${hit.text} (Source: ${hit.file}, p.${hit.page})`:' The nominal and minimum thickness shall comply with the applicable standard and the approved SPEC SHEETS.';
 };
 const rawMat=value(c,'cond_material')||'copper', coating=value(c,'cond_coating');
 const condMaterial=[coating,rawMat].filter(Boolean).join(' ').replace(/\b(?:copper\s+){2,}/i,'copper ');
 const rawClass=value(c,'cond_class')||'[confirmation required]', condClass=/^class\s/i.test(rawClass)?rawClass:`Class ${rawClass}`;
 add('conductor',`The conductor shall consist of ${condMaterial} wires complying with ${value(c,'conductorStandard')||'IEC 60228'}, ${condClass}. Conductor construction and maximum resistance shall be as specified in the applicable SPEC SHEETS.`);
 if(flags.fire) add('fireResistingLayer',`A suitable fire-resisting mica tape shall be applied over the conductor. The tape construction and application shall comply with the applicable fire-resistance requirement and the approved cable design.`);
 if(active(c.tape_sep)) add('separator',`A suitable separator tape (${c.tape_sep}) may be applied over the conductor where required for processing, compatibility or easy stripping.`,{optional:true});
 const hasCondScreen=flags.mv||active(c.inner_semi)||active(c.tape_semi);
 if(hasCondScreen) add('conductorScreen',`The conductor screen shall consist of ${[value(c,'tape_semi'),value(c,'inner_semi')].filter(Boolean).join(' and ')||'a semi-conducting tape and/or extruded semi-conducting compound'} applied over the conductor.${stdHint('conductor screen','screen')}`,{scope:flags.reel?'Power cores':''});
 const insu=value(c,'insu_material','standard_insu_material')||f.insulation||'[Insulation material]';
 add('insulation',`The insulation shall consist of ${insu} uniformly applied over the conductor${hasCondScreen?' screen':''}.${stdHint('insulation','insulation',insu)}`);
 if(flags.mv||active(c.outer_semi)){
   add('insulationScreenNonMetallic',`The non-metallic insulation screen shall consist of ${value(c,'outer_semi')||'an extruded semi-conducting compound and/or semi-conducting tape'} applied directly over the insulation.`,{scope:flags.reel?'Power cores':''});
   if(active(c.tape_insu_above)||active(c.ind_shield_material)||/\(S\)/i.test(item.cableType||'')){
     add('insulationScreenMetallic',`The metallic screen shall consist of ${value(c,'tape_insu_above','ind_shield_material','ind_shield_type')||'tinned copper wires'} applied over the non-metallic insulation screen. The screen cross-sectional area and application shall comply with the applicable standard and approved design.`);
   }
 }else if(active(c.ind_shield_material)||active(c.ind_shield_type)){
   add('individualScreen',`Each applicable core, pair, triad or functional unit shall be individually screened with ${value(c,'ind_shield_material')||''} ${value(c,'ind_shield_type')||'screen'}. A drain wire shall be included where specified in the applicable SPEC SHEETS.`);
 }
 const multicore=(item.rows||[]).some(r=>Number(r.cores)>1)||/\b(?:[2-9]\d*)\s*(?:C|P|T|Q)\b/i.test(item.fullDesignation||'')||flags.reel;
 if(multicore){
   add('cabling',`The insulated cores or functional units shall be assembled with a suitable direction and length of lay in accordance with the approved design.`);
   if(active(c.filler_material)||flags.reel) add('filler',`${value(c,'filler_material')||'Suitable non-hygroscopic'} fillers shall be applied where necessary to fill the interstices and obtain the required cable form.`,{optional:!flags.reel});
   if(active(c.binder_tape)||flags.reel) add('binderTape',`${value(c,'binder_tape')||'A suitable'} binder tape shall be applied over the assembled cores where required.`);
 }
 if(active(c.ov_shield_material)||active(c.ov_shield_type)) add('collectiveScreen',`A collective screen consisting of ${value(c,'ov_shield_material')||''} ${value(c,'ov_shield_type')||'screen'} shall be applied over the cable assembly. A drain wire shall be included where specified.`);
 const bedDivision=String(value(c,'bedding_division','bedding_type')).toLowerCase();
 if(active(c.bedding_type)||active(c.bedding_material)){
   const id=bedDivision.includes('cover')?'innerCovering':bedDivision.includes('bedding')?'bedding':'innerSheath';
   const beddingMaterial=value(c,'bedding_material')||'[Inner covering material]';
   add(id,`${beddingMaterial} shall be applied over the cable assembly by ${/extrud/i.test(String(c.bedding_type))?'extrusion':'the method specified in the approved design'}.${stdHint('sheath','innerSheath',beddingMaterial)}`);
 }else if(flags.reel) add('innerCovering',`A poly chloroprene rubber inner covering shall be applied over the assembled power and earth cores.`);
 if(flags.reel||/ARAMID|REINFORC/i.test([c.armour_material_new,c.armour_type_new,c.armour_type].join(' '))){
   add('reinforcement',`An aramid yarn braid reinforcement layer shall be applied uniformly over the inner covering to provide the required tensile strength and repeated-flexing performance.`);
 }else if(active(c.armour_type_new)||active(c.armour_type)||active(c.armour_material_new)){
   add('armour',`${value(c,'armour_material_new')||''} ${value(c,'armour_type_new','armour_type')||'armour'} shall be applied over the inner covering in accordance with the applicable standard and approved design.`);
 }
 if(flags.vfd) add('vfdEmcShield',`The VFD / EMC shield shall be applied as specified in the applicable SPEC SHEETS to provide the required electromagnetic compatibility performance.`);
 const sheath=value(c,'sheath_material')||f.sheath||'';
 if(active(sheath)) add('outerSheath',`The outer sheath shall consist of ${sheath} uniformly applied over the underlying layer.${stdHint('sheath','outerSheath',sheath)}`);
 return rows;
}
function applicability(itemsForLayer){
 const allNames=[...new Set(items.map(typeName))], names=[...new Set(itemsForLayer.map(x=>typeName(x.item)))];
 if(names.length===allNames.length)return {suffix:'',intro:''};
 const flags=itemsForLayer.map(x=>x.flags);
 let group='';
 if(flags.every(x=>x.mv))group='MV Cable Types';
 else if(flags.every(x=>x.fire))group='Fire-resistant Cable Types';
 else if(flags.every(x=>x.torsion))group='Torsional Cable Types';
 else if(flags.every(x=>x.reel))group='Reel Cable Types';
 else if(flags.every(x=>x.vfd))group='VFD / EMC Cable Types';
 if(group)return {suffix:` (for ${group})`,intro:names.length>3?`This clause applies to the following cable types: ${names.join(', ')}.`:''};
 if(names.length<=3)return {suffix:` (for ${names.join(', ')})`,intro:''};
 return {suffix:' (for selected cable types)',intro:`This clause applies to the following cable types: ${names.join(', ')}.`};
}
function unifiedConstructionClauses(){
 const map=new Map();
 items.forEach(item=>{
   const flags=itemFlags(item);
   constructionFor(item).forEach(row=>{
     if(!map.has(row.id))map.set(row.id,[]);
     map.get(row.id).push({item,row,flags});
   });
 });
 const clauses=[];
 layerOrder.forEach(id=>{
   const entries=map.get(id); if(!entries?.length)return;
   const app=applicability(entries), variants=new Map();
   entries.forEach(e=>{
     const key=e.row.detail.replace(/\s+/g,' ').trim();
     if(!variants.has(key))variants.set(key,{detail:e.row.detail,entries:[],scope:e.row.scope||''});
     variants.get(key).entries.push(e);
   });
   clauses.push({id,title:layerTitles[id],app,variants:[...variants.values()]});
 });
 return clauses;
}
function descriptionFor(item){
  const c=item?.cfg||{},f=item?.form||{},parts=[],add=text=>{const clean=String(text||'').replace(/\s+/g,' ').trim();if(clean&&!parts.includes(clean))parts.push(clean);};
  const insulation=value(c,'insu_material','standard_insu_material')||f.insulation;
  if(active(insulation))add(insulation+' insulation');
  if(active(c.ind_shield_material)||active(c.ind_shield_type))add([value(c,'ind_shield_material'),value(c,'ind_shield_type')||'individual screen'].filter(Boolean).join(' '));
  if(active(c.ov_shield_material)||active(c.ov_shield_type))add([value(c,'ov_shield_material'),value(c,'ov_shield_type')||'collective screen'].filter(Boolean).join(' '));
  const bedding=value(c,'bedding_material'),beddingKind=/cover/i.test(String(value(c,'bedding_division','bedding_type')))?'inner covering':'bedding / inner sheath';
  if(active(bedding)||active(c.bedding_type))add((bedding||'Approved')+' '+beddingKind);
  if(itemHasArmour(item)){const armourMaterial=value(c,'armour_material_new'),armourType=value(c,'armour_type_new','armour_type')||'armour';add([armourMaterial,armourType].filter(Boolean).join(' '));}
  const sheath=value(c,'sheath_material')||f.sheath;
  if(active(sheath))add(sheath+' outer sheath');
  if(!parts.length)parts.push(...constructionFor(item).map(row=>row.name).filter(name=>!['Cabling and Assembly','Separator','Binder Tape','Filler'].includes(name)));
  return parts.join(', ')+' cable';
}
function itemLabel(item,index){return item.fullDesignation||item.cableType||('SPEC SHEET '+(index+1));}
function overviewVoltage(item){
 return item?.ratedVoltage||value(item?.form,'voltage')||value(item?.cfg,'v_rating','ratedVoltage')||'[Rated Voltage]';
}
function overviewProductName(item,index){
 return stripSize(item?.cableType||item?.fullDesignation||itemLabel(item,index))||'Cable product';
}
function matchingItems(candidate,roleId='cable',material='',itemList=items){
 return (itemList||[]).filter(item=>candidateMatchesScope(candidate,scopeContext(item,{roleId,material})));
}
function testContextsForItem(item){
 const c=item.cfg||{},f=item.form||{},contexts=[scopeContext(item,{roleId:'cable'})];
 const add=(roleId,material)=>contexts.push(scopeContext(item,{roleId,material}));
 add('conductor',value(c,'cond_material'));
 add('insulation',value(c,'insu_material','standard_insu_material')||f.insulation||'');
 if(active(c.bedding_type)||active(c.bedding_material))add('innerSheath',value(c,'bedding_material'));
 add('outerSheath',value(c,'sheath_material')||f.sheath||'');
 if(active(c.ind_shield_material)||active(c.ind_shield_type)||active(c.ov_shield_material)||active(c.ov_shield_type))add('screen',value(c,'ind_shield_material','ov_shield_material'));
 if(active(c.armour_material_new)||active(c.armour_type_new)||active(c.armour_type))add('armour',value(c,'armour_material_new'));
  return contexts;
 }
 function libraryTestContextsForItem(item,itemIndex){
  const c=item.cfg||{},f=item.form||{},contexts=[libraryContextForItem(item,itemIndex,'cable','')];
  const add=(roleId,material)=>contexts.push(libraryContextForItem(item,itemIndex,roleId,material));
  add('conductor',value(c,'cond_material'));
  add('insulation',value(c,'insu_material','standard_insu_material')||f.insulation||'');
  if(active(c.bedding_type)||active(c.bedding_material))add('innerSheath',value(c,'bedding_material'));
  add('outerSheath',value(c,'sheath_material')||f.sheath||'');
  if(active(c.ind_shield_material)||active(c.ind_shield_type)||active(c.ov_shield_material)||active(c.ov_shield_type))add('screen',value(c,'ind_shield_material','ov_shield_material'));
  if(itemHasArmour(item))add('armour',value(c,'armour_material_new'));
  return contexts;
 }
function matchingTestItems(candidate,itemList=items){
 return (itemList||[]).filter(item=>testContextsForItem(item).some(context=>candidateMatchesScope(candidate,context)));
}
function candidateSource(candidate,matchedItems){
 const applies=(matchedItems||[]).map((item,index)=>itemLabel(item,index)).join(', ')||'No matching collected item';
 return (candidate.file||'STD')+' p.'+(candidate.page||'?')+' | '+candidateScopeText(candidate)+' | Applies to: '+applies;
}
const profileTestTemplates={
 generic:[['Routine Test','Conductor resistance test'],['Routine Test','Voltage test'],['Sample Test','Conductor examination and dimensional check'],['Type Test – Electrical','Electrical type tests applicable to the cable design'],['Type Test – Non-Electrical','Non-electrical and material tests applicable to the cable design']],
 mv:[['Type Test – Electrical','Partial discharge and dielectric performance tests, where applicable']],
 marine:[['Type Test – Non-Electrical','Flame propagation and marine approval tests, where applicable']],
 ieee:[['Type Test – Non-Electrical','Oil, flame, ozone and mechanical tests, where applicable']],
 nema:[['Type Test – Non-Electrical','Insulation and jacket qualification tests, where applicable']],
 rail:[['Type Test – Non-Electrical','Fire, smoke and toxicity performance tests, where applicable']],
 fire:[['Type Test – Non-Electrical','Circuit integrity / fire-resistance test, where applicable']],
 reel:[['Type Test – Non-Electrical','Repeated flexing and torsion performance test, where applicable']],
 vfd:[['Type Test – Electrical','Screen continuity and EMC performance test, where applicable']]
};
function profileDraftTests(){
 const out=[],seen=new Set(),relevant=items.length?items:[{cfg:{},ratedVoltage:''}];
 relevant.forEach(item=>{const standard=standardFor(item);profileIds(item).forEach(id=>(profileTestTemplates[id]||[]).forEach(entry=>{
  const key=entry[0]+'|'+entry[1]+'|'+standard;if(seen.has(key))return;seen.add(key);
  out.push({group:entry[0],clause:'',item:entry[1],method:standard+' / [Clause confirmation required]',remark:'',source:'Profile draft - STD clause confirmation required'});
 }));});
 return out;
}
function scopedProfileDraftTests(){
 const rows=new Map(),relevant=items.length?items:[{cfg:{},ratedVoltage:'',fullDesignation:'General cable'}];
 relevant.forEach((item,itemIndex)=>{
  const standard=standardFor(item);
  profileIds(item).forEach(profileId=>(profileTestTemplates[profileId]||[]).forEach((entry,entryIndex)=>{
   const key=[entry[0],entry[1],standard,profileId].join('|');
   if(!rows.has(key))rows.set(key,{group:entry[0],clause:'',item:entry[1],method:standard+' / [Clause confirmation required]',remark:'',items:[],editKey:'profile-'+profileId+'-'+standardKeyFor(item)+'-'+entryIndex});
   rows.get(key).items.push(item);
  }));
 });
 return [...rows.values()].map(row=>Object.assign(row,{source:'Profile draft - STD clause confirmation required | Applies to: '+row.items.map((item,index)=>itemLabel(item,index)).join(', ')}));
}
 function libraryTestRows(){
  const rows=[];
  approvedLibraryRequirements('test').forEach(requirement=>{
   const matched=items.filter((item,itemIndex)=>libraryTestContextsForItem(item,itemIndex).some(context=>libraryRequirementMatches(requirement,context)));
   if(!matched.length)return;
   const method=[requirement.method,requirement.methodClause].filter(value=>String(value??'').trim()).join(' / ')||librarySourceFor(requirement)?.standard||'Approved source method';
   const remark=[libraryRequirementCriterion(requirement),requirement.condition,requirement.evidence?'Evidence: '+requirement.evidence:''].filter(value=>String(value??'').trim()).join(' | ');
   rows.push({group:testGroupForLibraryRequirement(requirement),clause:requirement.clause||librarySourceFor(requirement)?.clause||'',item:requirement.test||requirement.title||requirement.id,method,remark,source:libraryRequirementSource(requirement,matched),editKey:'library-'+requirement.id});
  });
  return rows;
 }
 function defaultTests(){
 const manual=[];
 candidates.filter(x=>x.approved&&x.category==='test'&&scopeIsConfirmed(x)).forEach(candidate=>{
  const matched=matchingTestItems(candidate,items);
  if(!matched.length)return;
  manual.push({group:candidate.testGroup||'Type Test – Non-Electrical',clause:candidate.clause||'',item:candidate.text,method:candidate.standard||candidate.file,remark:'',source:candidateSource(candidate,matched),editKey:'candidate-'+candidate.id});
 });
  return [...scopedProfileDraftTests(),...manual,...libraryTestRows()];
}
function profilePropertyRows(role,material){
 const text=String(material||'').toUpperCase(),rows=[
  {property:'Tensile strength before ageing',unit:'N/mm²'},
  {property:'Elongation at break before ageing',unit:'%'},
  {property:'Ageing condition and variation',unit:'-'}
 ];
 if(/XLPE|EPR|EPDM|RUBBER|EVA/.test(text))rows.push({property:'Hot set / thermal deformation property, where applicable',unit:'-'});
 if(/PVC/.test(text))rows.push({property:'Thermal stability / loss of mass property, where applicable',unit:'-'});
 if(/HALOGEN|SHF|HF|LSZH/.test(text))rows.push({property:'Halogen acid gas and smoke property, where applicable',unit:'-'});
 return rows.map(row=>Object.assign(row,{requirement:'[STD clause confirmation required]',source:'Profile draft - STD clause confirmation required'}));
}
 function libraryPropertyRows(roleId,material,itemList){
  const rows=[];
  approvedLibraryRequirements('material').forEach(requirement=>{
   const matched=(itemList||[]).filter(item=>{
    const itemIndex=items.indexOf(item);
    return libraryRequirementMatches(requirement,libraryContextForItem(item,itemIndex,roleId,material));
   });
   if(!matched.length)return;
   const condition=[requirement.condition,requirement.method,requirement.methodClause].filter(value=>String(value??'').trim()).join(' | ');
   rows.push({property:requirement.property||requirement.title||requirement.id,unit:requirement.unit||'',requirement:libraryRequirementCriterion(requirement)+(condition?' ('+condition+')':''),source:libraryRequirementSource(requirement,matched),editKey:'library-'+requirement.id});
  });
  return rows;
 }
 function defaultProperties(roleId,material,itemList){
 const manual=[];
 candidates.filter(x=>x.approved&&x.category==='property'&&scopeIsConfirmed(x)).forEach(candidate=>{
  const matched=matchingItems(candidate,roleId,material,itemList);
  if(!matched.length)return;
  manual.push({property:candidate.text,unit:candidate.unit||'',requirement:candidate.requirement||'[Extracted value confirmation]',source:candidateSource(candidate,matched),editKey:'candidate-'+candidate.id});
 });
  return [...profilePropertyRows(roleId,material),...manual,...libraryPropertyRows(roleId,material,itemList)];
}
function materialForRole(item,roleId){
 const c=item.cfg||{},f=item.form||{};
 if(roleId==='insulation')return value(c,'insu_material','standard_insu_material')||f.insulation||'[Insulation Material]';
 if(roleId==='innerSheath')return value(c,'bedding_material')||'[Inner Sheath Material]';
 return value(c,'sheath_material')||f.sheath||'[Outer Sheath Material]';
}
function propertyContexts(){
 const grouped=new Map(),roles=[
  {id:'insulation',label:'Insulation',active:()=>true},
  {id:'innerSheath',label:'Inner Sheath / Bedding',active:item=>active((item.cfg||{}).bedding_type)||active((item.cfg||{}).bedding_material)},
  {id:'outerSheath',label:'Outer Sheath',active:()=>true}
 ];
 items.forEach((item,itemIndex)=>roles.forEach(role=>{
  if(!role.active(item))return;
  const material=materialForRole(item,role.id),key=role.id+'|'+String(material).trim().toUpperCase().replace(/\s+/g,' ');
  if(!grouped.has(key))grouped.set(key,{key,roleId:role.id,role:role.label,material,items:[]});
  grouped.get(key).items.push(item);
 }));
  return [...grouped.values()];
}
function thicknessContextsForItem(item){
 const c=item.cfg||{},f=item.form||{},flags=itemFlags(item),contexts=[];
 const add=(term,roleId,material)=>contexts.push({term,context:scopeContext(item,{roleId,material})});
 if(flags.mv||active(c.inner_semi)||active(c.tape_semi))add('conductor screen','screen',value(c,'tape_semi','inner_semi'));
 add('insulation','insulation',value(c,'insu_material','standard_insu_material')||f.insulation||'');
 if(active(c.bedding_type)||active(c.bedding_material))add('sheath','innerSheath',value(c,'bedding_material'));
 if(active(value(c,'sheath_material')||f.sheath||''))add('sheath','outerSheath',value(c,'sheath_material')||f.sheath||'');
 return contexts;
}
function matchingThicknessItems(candidate,itemList=items){
 const text=String(candidate.text||'').toLowerCase();
 return (itemList||[]).filter(item=>thicknessContextsForItem(item).some(entry=>text.includes(entry.term)&&candidateMatchesScope(candidate,entry.context)));
}
 function candidateHasCurrentMatch(candidate){
 if(candidate.category==='test')return matchingTestItems(candidate,items).length>0;
 if(candidate.category==='property')return propertyContexts().some(entry=>matchingItems(candidate,entry.roleId,entry.material,entry.items).length>0);
 if(candidate.category==='thickness')return matchingThicknessItems(candidate,items).length>0;
  return false;
 }
 function hasApprovedLibraryTestForItem(item,itemIndex){
  return approvedLibraryRequirements('test').some(requirement=>libraryTestContextsForItem(item,itemIndex).some(context=>libraryRequirementMatches(requirement,context)));
 }
 function hasApprovedLibraryPropertyForItem(item,itemIndex,roleId,material){
  return approvedLibraryRequirements('material').some(requirement=>libraryRequirementMatches(requirement,libraryContextForItem(item,itemIndex,roleId,material)));
 }
function candidateDescription(candidate){
 const text=String(candidate.text||'').replace(/\s+/g,' ').trim().slice(0,100);
 return (candidate.category||'candidate').toUpperCase()+' '+(candidate.file||'STD')+' p.'+(candidate.page||'?')+(text?': '+text:'');
}
function candidateScopeReason(candidate){
 const scope=candidateScope(candidate);
 if(!scope.confirmed)return 'scope confirmation is required';
 if(candidate.category==='property'&&!scope.materialRoleIds.length&&!scope.materialFamilies.length)return 'property scope requires a material role or material family';
 return 'scope has no valid selection';
}
function candidatePreflightFindings(add){
 const scoped=candidates.filter(candidate=>candidate.approved&&['test','property','thickness'].includes(candidate.category));
  scoped.forEach(candidate=>{
   if(!scopeIsConfirmed(candidate))add('error',candidateDescription(candidate)+': '+candidateScopeReason(candidate)+'.');
   else if(!candidateHasCurrentMatch(candidate))add('warning',candidateDescription(candidate)+': confirmed scope matches no current collected item.');
  });
  libraryRows('requirements').filter(requirement=>requirement.status==='APPROVED').forEach(requirement=>{
   const issues=libraryRequirementIssues(requirement);
   if(issues.length)add('error','Requirement '+(requirement.id||'[unnamed]')+': '+issues.join('; ')+'.');
  });
  if(!items.length)return;
 const level=workflow.status==='ISSUED'?'error':'warning';
  const missing=items.filter((item,itemIndex)=>!candidates.some(candidate=>candidate.approved&&candidate.category==='test'&&scopeIsConfirmed(candidate)&&matchingTestItems(candidate,[item]).length)&&!hasApprovedLibraryTestForItem(item,itemIndex));
 if(missing.length)add(level,'No confirmed scoped test candidate applies to: '+missing.map(item=>itemLabel(item)).join(', ')+'.');
 propertyContexts().forEach(entry=>{
   const present=candidates.some(candidate=>candidate.approved&&candidate.category==='property'&&scopeIsConfirmed(candidate)&&matchingItems(candidate,entry.roleId,entry.material,entry.items).length)||entry.items.every(item=>hasApprovedLibraryPropertyForItem(item,items.indexOf(item),entry.roleId,entry.material));
  if(!present)add(level,'No confirmed scoped property candidate applies to '+entry.role+' / '+entry.material+' for: '+entry.items.map(item=>itemLabel(item)).join(', ')+'.');
 });
}
function header(page,total,title){
 const f=formData();
 const currentPage=page||'__PAGE__';
 return `<div class="fs-header"><div class="logo"><img src="assets/ls-cable-logo.png"></div><div class="head-title">${esc(title||f.productName||'CABLE TECHNICAL SPECIFICATION')}</div><div class="meta"><div><b>Spec. No.</b><span>${esc(f.specNo)}</span></div><div><b>Revision No.</b><span>${esc(f.revNo)}</span></div><div><b>Issued Date</b><span>${esc(f.issuedDate)}</span></div><div><b>Page</b><span>${currentPage} / ${total}</span></div></div></div>`;
}
function footer(){return `<div class="page-footer">Please consult with LS Cable &amp; System in advance and obtain approval prior to contract execution. This document is subject to controlled revision.</div>`;}

const fixedCoverCertifications=[
 {logo:'assets/dqs-logo.png',name:'DQS',label:'ISO 9001 &middot; ISO 14001 &middot;<br>ISO 45001 &middot; ISO 50001'},
 {logo:'assets/iris-logo.png',name:'IRIS',label:'ISO<br>22163'},
 {logo:'assets/lrqa-logo.png',name:'LRQA',label:'ISO 9001 &middot;<br>ISO 14001'},
 {logo:'assets/ias-logo.png',name:'IAS',label:'ISO 45001'},
 {logo:'assets/kepic-logo.png',name:'KEPIC',label:'KEPIC-EN'}
];
function fixedCertStrip(){
 return `<div class="cover-certifications" aria-label="System certifications">${fixedCoverCertifications.map(c=>`<div class="cover-cert"><img src="${c.logo}" alt="${c.name}"><span>${c.label}</span></div>`).join('')}</div>`;
}
function certStrip(){
 const activeCerts=formData().certs.filter(c=>c.enabled&&active(c.text));
 return `<div class="cover-certifications">${activeCerts.map(c=>`<div class="cover-cert"><img src="${esc(c.logo)}" alt="${esc(c.name)}"><span>${esc(c.text).replace(/\n/g,' · ')}</span></div>`).join('')}</div>`;
}
function revisionRows(){
 const baseRevs=(project?.revisions||[]);
 const revs=(baseRevs.length?baseRevs:[{rev:'0',date:formData().issuedDate,description:'Initial Issue',prepared:formData().preparedBy,reviewed:formData().reviewedBy,approved:formData().approvedBy}])
  .filter(r=>Object.values(r||{}).some(Boolean)).slice().sort((a,b)=>Number(b.rev)-Number(a.rev)).slice(0,3);
 while(revs.length<1)revs.push({});
 return revs.map((r,i)=>`<tr><td contenteditable data-rev="${i}" data-k="rev">${esc(r?.rev||'')}</td><td contenteditable data-rev="${i}" data-k="date">${esc(r?.date||'')}</td><td contenteditable data-rev="${i}" data-k="description">${esc(r?.description||'')}</td><td contenteditable data-rev="${i}" data-k="prepared">${esc(r?.prepared||'')}</td><td contenteditable data-rev="${i}" data-k="reviewed">${esc(r?.reviewed||'')}</td><td contenteditable data-rev="${i}" data-k="approved">${esc(r?.approved||'')}</td></tr>`).join('');
}
function coverTags(){
 const tags=new Set();
 tags.add(workflowLabel());
 items.forEach(it=>{const f=itemFlags(it);if(f.mv)tags.add('MV');if(f.torsion)tags.add('TORSIONAL');if(f.reel)tags.add('REELING');if(f.fire)tags.add('FIRE RESISTANT');if(f.vfd)tags.add('EMC / VFD');});
 if(items.some(it=>/HALOGEN|SHF|HF-|XL-EVA/i.test(it.fullDesignation||'')))tags.add('HALOGEN FREE');
 const volts=[...new Set(items.map(x=>x.ratedVoltage).filter(Boolean))];volts.slice(0,2).forEach(v=>tags.add(v));
 return [...tags].slice(0,6);
}
function coverPage(){
 const f=formData(), visual=items.find(x=>x.drawing2D||x.drawing3D), img=visual?.drawing2D||visual?.drawing3D||'';
  return `<section class="fs-page cover-page">${fixedCertStrip()}${header(1,'__TOTAL__','FULL SPECIFICATION')}
 <div class="cover-hero">
   <div class="cover-copy">
    <div class="cover-kicker">${esc(f.application||'ENGINEERED CABLE SYSTEM')}</div>
    <div class="specification">FULL SPECIFICATION</div>
    <div class="product">${editable('cover.product',f.docTitle+'\n'+f.productName,'div','product contenteditable')}</div>
    <div class="cover-tags">${coverTags().map(t=>`<span>${esc(t)}</span>`).join('')}</div>
   </div>
   <div class="cover-visual">${img?`<img src="${img}" alt="Cable construction">`:`<div class="cable-motif"><i></i><i></i><i></i></div>`}</div>
 </div>
 <table class="doc-table cover-revision"><thead><tr><th>Rev.</th><th>Issue Date</th><th>Description</th><th>Prepared by</th><th>Reviewed by</th><th>Approved by</th></tr></thead><tbody>${revisionRows()}</tbody></table>${footer()}</section>`;
}
function page2(){
  const scope=$('scopeText').value||makeDefaultScope();
  const design='Design and installation conditions, including rated voltage, installation method, ambient conditions, routing and protection, shall comply with the purchase order, applicable standards, approved drawings and the relevant TECH DATA.';
  return `<section class="fs-page">${header(2,'__TOTAL__')}<div class="section-title">2. SCOPE, DESIGN &amp; INSTALLATION CONDITIONS</div><div class="subsection-title">2.1 SCOPE</div>${editable('scope',scope,'div','paragraph contenteditable')}<div class="subsection-title">2.2 DESIGN &amp; INSTALLATION BASIS</div>${editable('designConditions',design,'div','paragraph contenteditable')}<p class="source-note">The product-specific construction, dimensions and calculation conditions are controlled in the Product Data Packages of Section 10.</p>${footer()}</section>`;
}
 function applicableStandardsPage(){
  const rows=[],seen=new Set(),add=(standard,edition,reference,status)=>{const key=[standard,edition,reference].join('|');if(!standard||seen.has(key))return;seen.add(key);rows.push({standard,edition,reference,status});};
  const approvedSourceIds=new Set(approvedLibraryRequirements().map(requirement=>requirement.sourceId));
  libraryRows('sources').filter(source=>approvedSourceIds.has(source.id)).forEach(source=>add(source.standard||source.title,source.edition,[source.clause&&'Clause '+source.clause,source.table&&'Table '+source.table,source.page&&'p.'+source.page].filter(Boolean).join(' / '),source.status));
  candidates.filter(candidate=>candidate.approved&&scopeIsConfirmed(candidate)).forEach(candidate=>add(candidate.standard||candidate.file,'',candidate.page?'p.'+candidate.page:'','CANDIDATE APPROVED'));
  const body=rows.map(row=>'<tr><td>'+esc(row.standard)+'</td><td>'+esc(row.edition)+'</td><td>'+esc(row.reference)+'</td><td>'+esc(row.status)+'</td></tr>').join('')||'<tr><td colspan="4">Applicable standards shall be registered in the controlled Requirement Library.</td></tr>';
  return '<section class="fs-page">'+header(0,'__TOTAL__')+'<div class="section-title">3. APPLICABLE STANDARDS</div><table class="content-table"><thead><tr><th>Standard / controlled source</th><th>Edition / Rev.</th><th>Clause / Table / Page</th><th>Status</th></tr></thead><tbody>'+body+'</tbody></table><p class="source-note">Only a requirement with both its source and row marked APPROVED is emitted as a confirmed value in Sections 5 and 6.</p>'+footer()+'</section>';
 }
 const overviewRowsPerPage=8;
 function productOverviewPages(){
  const chunks=[];
  for(let start=0;start<items.length;start+=overviewRowsPerPage)chunks.push(items.slice(start,start+overviewRowsPerPage));
  if(!chunks.length)chunks.push([]);
  return chunks.map((chunk,pageIndex)=>{
   const rows=chunk.map((item,rowIndex)=>{
    const itemIndex=pageIndex*overviewRowsPerPage+rowIndex,key=packageItemKey(item,itemIndex);
    return '<tr><td>'+esc(overviewVoltage(item))+'</td><td>'+esc(overviewProductName(item,itemIndex))+'</td><td>'+editable('overview.'+key,descriptionFor(item),'div','contenteditable')+'</td><td><a href="#package-'+esc(key)+'">'+productPackageRef(itemIndex)+'</a></td></tr>';
   }).join('');
   const continuation=chunks.length>1?' ('+(pageIndex+1)+'/'+chunks.length+')':'';
   return '<section class="fs-page"'+(pageIndex===0?' id="product-overview"':'')+'>'+header(0,'__TOTAL__')+'<div class="section-title">4. PRODUCT OVERVIEW'+continuation+'</div><table class="content-table"><thead><tr><th>Rated Voltage</th><th>Product Name</th><th>Construction &amp; Material Description</th><th>Product Data Package</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4">Add confirmed SPEC SHEET data to create a product overview.</td></tr>')+'</tbody></table><p class="source-note">Generated product rows: '+items.length+'. Each row is linked to the matching Product Data Package in Section 10.</p>'+footer()+'</section>';
  });
 }
 function identificationMarkingPackagingPages(){
  const insulation=[...new Set(items.map(item=>materialForRole(item,'insulation')).filter(Boolean))].join(', ')||'[Insulation material]';
  const sheath=[...new Set(items.map(item=>materialForRole(item,'outerSheath')).filter(Boolean))].join(', ')||'[Outer sheath material]';
  const identification='<div class="subsection-title">7.1 INSULATION</div>'+editable('identification.insulation','Insulated cores shall be identified by the approved colour code, number marking or other controlled identification method for the applicable cable design. Materials represented in this specification: '+insulation+'.','div','paragraph contenteditable')+'<div class="subsection-title">7.2 OUTER SHEATH</div>'+editable('identification.sheath','The outer sheath shall be identified by its approved colour, compound designation and any project-specific marking requirement. Materials represented in this specification: '+sheath+'.','div','paragraph contenteditable');
  const marking=editable('marking','The cable shall be durably marked at regular intervals with the manufacturer name or trade mark, cable designation, rated voltage, conductor size, year of manufacture and any project-required identification. Marking content, spacing and legibility shall comply with the approved source and purchase order.','div','paragraph contenteditable');
  const packaging=editable('packaging','The cable shall be supplied on a suitable drum, reel or coil that protects the product during handling, transport and storage. Each package shall be labelled with the purchase order reference, cable designation, length, gross weight and handling information. Any project-specific packing or preservation requirement shall take precedence.','div','paragraph contenteditable');
  return [
   '<section class="fs-page">'+header(0,'__TOTAL__')+'<div class="section-title">7. IDENTIFICATION</div>'+identification+footer()+'</section>',
   '<section class="fs-page">'+header(0,'__TOTAL__')+'<div class="section-title">8. CABLE MARKING</div>'+marking+footer()+'</section>',
   '<section class="fs-page">'+header(0,'__TOTAL__')+'<div class="section-title">9. PACKAGING</div>'+packaging+footer()+'</section>'
  ];
 }

function constructionPages(){
 const clauses=unifiedConstructionClauses(), chunks=[];
 for(let i=0;i<clauses.length;i+=5)chunks.push(clauses.slice(i,i+5));
 return chunks.map((chunk,pi)=>`<section class="fs-page">${header(0,'__TOTAL__')}<div class="section-title">2.3 CONSTRUCTION DESIGN BASIS</div>
 ${chunk.map(cl=>{
   const n=clauses.indexOf(cl)+1;
   const variants=cl.variants.map((v,vi)=>{
     const va=applicability(v.entries), scope=v.scope?` This requirement applies to ${v.scope}.`:'';
     if(cl.variants.length===1)return `${va.intro?`<p class="clause-app">${esc(va.intro)}</p>`:''}${editable(`construction.${cl.id}.common`,v.detail+scope,'div','clause-body contenteditable')}`;
      return `<div class="variant-title">2.3.${n}.${vi+1}${va.suffix}</div>${va.intro?`<p class="clause-app">${esc(va.intro)}</p>`:''}${editable(`construction.${cl.id}.${vi+1}`,v.detail+scope,'div','clause-body contenteditable')}`;
   }).join('');
    return `<div class="construction-clause"><div class="clause-title">2.3.${n} ${esc(cl.title)}${esc(cl.app.suffix)}</div>${cl.app.intro?`<p class="clause-app">${esc(cl.app.intro)}</p>`:''}${variants}</div>`;
 }).join('')}${footer()}</section>`);
}
function testPage(){
 const tests=defaultTests(), groups=['Routine Test','Sample Test','Type Test – Electrical','Type Test – Non-Electrical'];
 const tables=groups.map((g,gi)=>{const rs=tests.filter(r=>(r.group||r.remark||'Type Test – Non-Electrical')===g);return `<div class="subsection-title">5.${gi+1} ${g}</div><table class="content-table"><thead><tr><th>Clause</th><th>Test Item</th><th>Test Method</th><th>Remark</th></tr></thead><tbody>${rs.map((r,i)=>`<tr><td>${esc(r.clause)}</td><td>${editable('test.'+gi+'.'+i,r.item)}</td><td>${editable('testmethod.'+gi+'.'+i,r.method)}</td><td>${editable('testremark.'+gi+'.'+i,r.remark||'')}</td></tr>`).join('')||'<tr><td colspan="4">[Applicable items to be confirmed from uploaded STD]</td></tr>'}</tbody></table>`}).join('');
  return `<section class="fs-page">${header(0,'__TOTAL__')}<div class="section-title">5. TEST METHODS AND REQUIREMENTS</div>${tables}<p class="source-note">Profile basis: ${esc(profileSummary().join(', ')||'General cable')}. Profile rows are drafting guidance only; only user-approved requirements extracted from uploaded standards shall be treated as confirmed values.</p>${footer()}</section>`;
}
function scopedTestPage(){
 const tests=defaultTests(),fallback=profileTestTemplates.generic[4]?.[0]||'Type Test';
 const found=[...new Set(tests.map(row=>row.group||row.remark||fallback))];
  const preferred=['Routine Test','Type Test – Electrical','Type Test – Non-Electrical','Type Test','Sample Test','Other Test'];
 const groups=[...preferred.filter(group=>found.includes(group)),...found.filter(group=>!preferred.includes(group))];
 const tables=groups.map((group,groupIndex)=>{
  const rows=tests.filter(row=>(row.group||row.remark||fallback)===group);
  const body=rows.map((row,rowIndex)=>{
   const rowKey=row.editKey||('profile-'+groupIndex+'-'+rowIndex);
   return `<tr><td>${esc(row.clause)}</td><td>${editable('test.'+rowKey,row.item)}</td><td>${editable('testmethod.'+rowKey,row.method)}</td><td>${editable('testremark.'+rowKey,row.remark||'')}</td><td>${esc(row.source||'')}</td></tr>`;
  }).join('')||'<tr><td colspan="5">[Applicable items to be confirmed from uploaded STD]</td></tr>';
  return `<div class="subsection-title">5.${groupIndex+1} ${esc(group)}</div><table class="content-table"><thead><tr><th>Clause</th><th>Test Item</th><th>Test Method</th><th>Remark</th><th>Source / applicability</th></tr></thead><tbody>${body}</tbody></table>`;
 }).join('');
  return `<section class="fs-page">${header(0,'__TOTAL__')}<div class="section-title">5. TEST METHODS AND REQUIREMENTS</div>${tables}<p class="source-note">Profile basis: ${esc(profileSummary().join(', ')||'General cable')}. Profile rows are drafting guidance only; only user-approved requirements extracted from uploaded standards shall be treated as confirmed values.</p>${footer()}</section>`;
}
 function pageRowChunks(rows,size=8){
  const chunks=[];
  for(let start=0;start<rows.length;start+=size)chunks.push({rows:rows.slice(start,start+size),start});
  return chunks.length?chunks:[{rows:[],start:0}];
 }
 function scopedTestPages(){
  const tests=defaultTests(),fallback='Type Test';
  const found=[...new Set(tests.map(row=>row.group||row.remark||fallback))];
  const rank=group=>{const text=String(group||'').toLowerCase();if(/^routine/.test(text))return 0;if(/^type/.test(text)&&/non.?electrical/.test(text))return 2;if(/^type/.test(text)&&/electrical/.test(text))return 1;if(/^type/.test(text))return 3;if(/^sample/.test(text))return 4;return 5;};
  const groups=found.map((group,index)=>({group,index})).sort((a,b)=>rank(a.group)-rank(b.group)||a.index-b.index).map(entry=>entry.group),tables=[];
  groups.forEach((group,groupIndex)=>{
   const rows=tests.filter(row=>(row.group||row.remark||fallback)===group),chunks=pageRowChunks(rows,6);
   chunks.forEach((chunk,chunkIndex)=>tables.push({group,groupIndex,rows:chunk.rows,start:chunk.start,part:chunkIndex+1,total:chunks.length}));
  });
  if(!tables.length)tables.push({group:'Test requirements',groupIndex:0,rows:[],start:0,part:1,total:1});
  const pages=[],limit=6;let current=[],count=0;
  tables.forEach(table=>{const size=Math.max(1,table.rows.length);if(current.length&&count+size>limit){pages.push(current);current=[];count=0;}current.push(table);count+=size;if(count>=limit){pages.push(current);current=[];count=0;}});
  if(current.length)pages.push(current);
  return pages.map((page,pageIndex)=>{
   const tablesHtml=page.map(table=>{
    const continuation=table.total>1?' ('+table.part+'/'+table.total+')':'';
    const body=table.rows.map((row,rowOffset)=>{const rowIndex=table.start+rowOffset,rowKey=row.editKey||('profile-'+table.groupIndex+'-'+rowIndex);return '<tr><td>'+esc(row.clause)+'</td><td>'+editable('test.'+rowKey,row.item)+'</td><td>'+editable('testmethod.'+rowKey,row.method)+'</td><td>'+editable('testremark.'+rowKey,row.remark||'')+'</td><td>'+esc(row.source||'')+'</td></tr>';}).join('')||'<tr><td colspan="5">[Applicable items to be confirmed from uploaded STD]</td></tr>';
    return '<div class="subsection-title">5.'+(table.groupIndex+1)+' '+esc(table.group)+continuation+'</div><table class="content-table"><thead><tr><th>Clause</th><th>Test Item</th><th>Test Method</th><th>Remark</th><th>Source / applicability</th></tr></thead><tbody>'+body+'</tbody></table>';
   }).join('');
   const continuation=pages.length>1?' ('+(pageIndex+1)+'/'+pages.length+')':'';
   const note=pageIndex===pages.length-1?'<p class="source-note">Profile basis: '+esc(profileSummary().join(', ')||'General cable')+'. Profile rows are drafting guidance only; only user-approved requirements extracted from uploaded standards shall be treated as confirmed values.</p>':'';
   return '<section class="fs-page">'+header(0,'__TOTAL__')+'<div class="section-title">5. TEST METHODS AND REQUIREMENTS'+continuation+'</div>'+tablesHtml+note+footer()+'</section>';
  });
 }
 function propertyPages(){
 const contexts=propertyContexts();
 if(!contexts.length)contexts.push({key:'insulation|placeholder',roleId:'insulation',role:'Insulation',material:'[Insulation Material]',items:[]});
 return contexts.map((m,mi)=>{
  const rows=defaultProperties(m.roleId,m.material,m.items),scopeKey=m.key.replace(/[^a-z0-9]+/ig,'-').replace(/^-|-$/g,'');
   return `<section class="fs-page">${header(0,'__TOTAL__')}<div class="section-title">6. INSULATION, BEDDING &amp; SHEATH MATERIAL PROPERTIES</div><div class="subsection-title">6.${mi+1} ${esc(m.role)} – ${esc(m.material)}</div><table class="content-table"><thead><tr><th>Description</th><th>Unit</th><th>Requirement</th><th>Source</th></tr></thead><tbody>${rows.map((r,i)=>{const rowKey=r.editKey||('profile-'+i);return `<tr><td>${editable(`prop.${scopeKey}.${rowKey}`,r.property)}</td><td>${esc(r.unit)}</td><td>${editable(`propval.${scopeKey}.${rowKey}`,r.requirement)}</td><td>${esc(r.source)}</td></tr>`;}).join('')}</tbody></table>${footer()}</section>`;
 });
 }
 function propertyPagesPaged(){
  const contexts=propertyContexts();
  if(!contexts.length)contexts.push({key:'insulation|placeholder',roleId:'insulation',role:'Insulation',material:'[Insulation Material]',items:[]});
  return contexts.flatMap((m,mi)=>{
   const rows=defaultProperties(m.roleId,m.material,m.items),scopeKey=m.key.replace(/[^a-z0-9]+/ig,'-').replace(/^-|-$/g,''),chunks=pageRowChunks(rows,8);
   return chunks.map((chunk,chunkIndex)=>{
    const continuation=chunks.length>1?' ('+(chunkIndex+1)+'/'+chunks.length+')':'';
    const body=chunk.rows.map((row,rowOffset)=>{const rowIndex=chunk.start+rowOffset,rowKey=row.editKey||('profile-'+rowIndex);return '<tr><td>'+editable('prop.'+scopeKey+'.'+rowKey,row.property)+'</td><td>'+esc(row.unit)+'</td><td>'+editable('propval.'+scopeKey+'.'+rowKey,row.requirement)+'</td><td>'+esc(row.source)+'</td></tr>';}).join('')||'<tr><td colspan="4">No controlled property rows were registered for this material.</td></tr>';
    return '<section class="fs-page">'+header(0,'__TOTAL__')+'<div class="section-title">6. INSULATION, BEDDING &amp; SHEATH MATERIAL PROPERTIES</div><div class="subsection-title">6.'+(mi+1)+' '+esc(m.role)+' - '+esc(m.material)+continuation+'</div><table class="content-table"><thead><tr><th>Description</th><th>Unit</th><th>Requirement</th><th>Source</th></tr></thead><tbody>'+body+'</tbody></table>'+footer()+'</section>';
   });
  });
 }
 const techColumnLabels={cores:'No. of Cores',size:'Conductor Size',r20:'DC Resistance Max. (Ohm/km)',rhot:'DC Resistance at conductor temperature (Ohm/km)',ir:'Insulation Resistance Min. (Mohm-km)',amp:'Allowable Current (A)',shortCircuit:'Short Circuit Current (kA / 1 s)',L:'Inductance L (mH/km)',C:'Capacitance C (uF/km)',X:'Reactance X (Ohm/km)',Z:'Impedance Z (Ohm/km)',Z0:'Zero-sequence Impedance Z0 (Ohm/km)'};
const defaultTechColumns=['cores','size','r20','rhot','ir','amp','shortCircuit','L','C','X','Z','Z0'];
function technicalColumnKeys(item){
 const stored=Array.isArray(item.techMeta?.columns)?item.techMeta.columns:[];
 const keys=stored.filter(key=>Object.prototype.hasOwnProperty.call(techColumnLabels,key));
 return [...new Set(['cores','size',...(keys.length?keys:defaultTechColumns)])];
}
function technicalRowsFor(item){
 const data=Array.isArray(item.tech)?item.tech:[];
 const selected=Array.isArray(item.techMeta?.selectedRows)?item.techMeta.selectedRows:null;
 const indexes=selected===null?data.map((_,index)=>index):selected;
 return indexes.filter(index=>Number.isInteger(index)&&index>=0&&index<data.length).map(index=>({index,tech:data[index]||{},spec:(item.rows||[])[index]||{}}));
}
function technicalValue(row,key){
 if(key==='cores')return row.spec.cores??row.spec.coreCount??'';
 if(key==='size')return String(row.spec.sizeText||row.spec.size||row.spec.nominalArea||'').replace(/\s*(?:SQMM|AWG|KCMIL|MCM)\b/gi,'');
 return row.tech[key]??'';
}
function technicalConditions(item){
 const c=item.techMeta?.conditions||{},out=[];
 const add=(label,key,suffix='')=>{if(c[key]!==undefined&&c[key]!==null&&String(c[key]).trim())out.push(label+': '+c[key]+suffix);};
 add('Conductor temperature','condTemp',' °C');add('Installation','install');add('Ambient','ambient',' °C');add('Frequency','frequency',' Hz');add('Earthing','earth');add('DC standard','dcStandard');add('IR standard','irStandard');
 return out.join(' | ');
}
function technicalDataPages(itemList=items,startIndex=0){
  const out=[];
  itemList.forEach((item,itemOffset)=>{const itemIndex=startIndex+itemOffset;
  const rows=technicalRowsFor(item),keys=technicalColumnKeys(item),dynamic=keys.filter(key=>key!=='cores'&&key!=='size');
  const columnGroups=[];
  if(!dynamic.length)columnGroups.push(['cores','size']);
  for(let start=0;start<dynamic.length;start+=6)columnGroups.push(['cores','size',...dynamic.slice(start,start+6)]);
  const rowGroups=[];
  for(let start=0;start<rows.length;start+=16)rowGroups.push(rows.slice(start,start+16));
  if(!rowGroups.length)rowGroups.push([]);
  const dataStatus=item.source?.techData||{},conditions=technicalConditions(item);
  columnGroups.forEach((cols,columnIndex)=>rowGroups.forEach((group,rowIndex)=>{
   const position=(columnGroups.length>1?' / column set '+(columnIndex+1)+' of '+columnGroups.length:'')+(rowGroups.length>1?' / rows '+(rowIndex+1)+' of '+rowGroups.length:'');
     const heading=productPackageRef(itemIndex)+'.4 TECHNICAL DATA — '+packageDisplayTitle(item,itemIndex)+position;
    const dataNote=!dataStatus.available?' No TECH DATA was captured for this item; generate it from the confirmed SPEC SHEET before issue.':(dataStatus.synchronized===false?' The TECH DATA source was changed after calculation and should be regenerated.':'');
    const captureNote=columnIndex===0&&rowIndex===0?'<p class=tech-data-note><b>Captured calculation conditions:</b> '+esc(conditions||'No calculation condition was captured.')+'. Values are linked snapshot data and require confirmation against the applicable standard.'+dataNote+'</p>':'';
   const headers=cols.map(key=>'<th>'+esc(techColumnLabels[key]||key)+'</th>').join('');
   const body=group.length?group.map(row=>'<tr>'+cols.map(key=>'<td>'+esc(technicalValue(row,key))+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+cols.length+'">No selected technical-data rows were captured.</td></tr>';
     out.push('<section class="fs-page">'+header(0,'__TOTAL__')+'<div class="section-title">10. PRODUCT DATA PACKAGES</div><div class="subsection-title">'+esc(heading)+'</div>'+captureNote+'<table class="data-table tech-data-table"><thead><tr>'+headers+'</tr></thead><tbody>'+body+'</tbody></table>'+footer()+'</section>');
  }));
 });
 return out;
}
const dimCols=[['cores','No. of Cores'],['sizeText','Cond. Size'],['condOD','Cond. O.D.'],['insuThick','Insulation Thick.'],['beddingThick','Inner Sheath Thick.'],['beddingOD','Inner Sheath O.D.'],['armourWireDia','Armour Wire Dia.'],['sheathThick','Outer Sheath Thick.'],['overallOD','Overall O.D.'],['tolerance','Tolerance'],['weight','Approx. Weight']];
function sourceAppendixPages(){
 // Source artifacts are intentionally excluded from the issued document.
 // A controlled source appendix can be added here in a later release.
 return [];
}
function packageItemKey(item,index){
 const raw=String(item?.id||item?.fullDesignation||item?.cableType||'item-'+index);
 const simple=raw.replace(/[^a-z0-9]+/ig,'-').replace(/^-|-$/g,'').toLowerCase();
 if(simple)return simple;
 let hash=0;for(let i=0;i<raw.length;i++)hash=((hash*31)+raw.charCodeAt(i))>>>0;
 return 'item-'+hash.toString(36);
}
function packageTitle(item,index){return itemLabel(item,index)||('SPEC SHEET '+(index+1));}
function packageDisplayTitle(item,index){
 const key='package.'+packageItemKey(item,index)+'.title';
 return manualEdits[key]!==undefined?manualEdits[key]:packageTitle(item,index);
}
function packageDimensionPagesForItem(item,itemIndex){
  const chunks=[];for(let i=0;i<(item.rows||[]).length;i+=12)chunks.push(item.rows.slice(i,i+12));if(!chunks.length)chunks.push([]);
  const number=productPackageRef(itemIndex),key=packageItemKey(item,itemIndex),title=packageDisplayTitle(item,itemIndex);
 return chunks.map((rows,chunkIndex)=>{
  const continuation=chunks.length>1?' ('+(chunkIndex+1)+'/'+chunks.length+')':'';
   const drawings=chunkIndex===0?'<div class="subsection-title">'+number+'.1 SECTION DRAWING (2D PREFERRED)</div><div class="drawing-grid"><div class="drawing-box"><b>2D SECTION DRAWING</b>'+(item.drawing2D?'<img src="'+item.drawing2D+'" alt="2D section drawing">':'<span>No 2D section drawing was captured.</span>')+'</div><div class="drawing-box"><b>3D AUXILIARY VIEW</b>'+(item.drawing3D?'<img src="'+item.drawing3D+'" alt="3D cable view">':'<span>No 3D drawing was captured.</span>')+'</div></div>':'';
   const layers=chunkIndex===0?'<div class="subsection-title">'+number+'.2 LAYERED CONSTRUCTION</div><table class="content-table"><thead><tr><th>Layer</th><th>Construction / material description</th></tr></thead><tbody>'+constructionFor(item).map(layer=>'<tr><td>'+esc(layer.name)+'</td><td>'+esc(layer.detail)+'</td></tr>').join('')+'</tbody></table>':'';
  const body=rows.length?rows.map(r=>'<tr>'+dimCols.map(c=>'<td>'+esc(r[c[0]]??r.nominalArea??'')+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="11">No selected dimension, construction or weight rows were captured.</td></tr>';
   return '<section class="fs-page"'+(chunkIndex===0?' id="package-'+key+'"':'')+'>'+header(0,'__TOTAL__')+'<div class="section-title">10. PRODUCT DATA PACKAGES</div><div class="subsection-title">'+number+' '+editable('package.'+key+'.title',title,'span','contenteditable')+'</div>'+drawings+layers+'<div class="subsection-title">'+number+'.3 DIMENSIONS, CONSTRUCTION AND WEIGHT'+continuation+'</div><table class="data-table"><thead><tr>'+dimCols.map(c=>'<th>'+c[1]+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table>'+footer()+'</section>';
 });
}
 function packagePagesForItem(item,itemIndex){
  const number=productPackageRef(itemIndex),key=packageItemKey(item,itemIndex),title=packageDisplayTitle(item,itemIndex);
  const drawing='<section class="fs-page" id="package-'+key+'">'+header(0,'__TOTAL__')+'<div class="section-title">10. PRODUCT DATA PACKAGES</div><div class="subsection-title">'+number+' '+editable('package.'+key+'.title',title,'span','contenteditable')+'</div><div class="subsection-title">'+number+'.1 SECTION DRAWING (2D PREFERRED)</div><div class="drawing-grid"><div class="drawing-box"><b>2D SECTION DRAWING</b>'+(item.drawing2D?'<img src="'+item.drawing2D+'" alt="2D section drawing">':'<span>No 2D section drawing was captured.</span>')+'</div><div class="drawing-box"><b>3D AUXILIARY VIEW</b>'+(item.drawing3D?'<img src="'+item.drawing3D+'" alt="3D cable view">':'<span>No 3D drawing was captured.</span>')+'</div></div>'+footer()+'</section>';
  const layerChunks=pageRowChunks(constructionFor(item),6);
  const layers=layerChunks.map((chunk,chunkIndex)=>{
   const continuation=layerChunks.length>1?' ('+(chunkIndex+1)+'/'+layerChunks.length+')':'';
   const body=chunk.rows.map(layer=>'<tr><td>'+esc(layer.name)+'</td><td>'+esc(layer.detail)+'</td></tr>').join('')||'<tr><td colspan="2">No layered construction was captured.</td></tr>';
   return '<section class="fs-page">'+header(0,'__TOTAL__')+'<div class="section-title">10. PRODUCT DATA PACKAGES</div><div class="subsection-title">'+number+' '+esc(title)+'</div><div class="subsection-title">'+number+'.2 LAYERED CONSTRUCTION'+continuation+'</div><table class="content-table"><thead><tr><th>Layer</th><th>Construction / material description</th></tr></thead><tbody>'+body+'</tbody></table>'+footer()+'</section>';
  });
  const dimensionChunks=pageRowChunks(item.rows||[],12);
  const dimensions=dimensionChunks.map((chunk,chunkIndex)=>{
   const continuation=dimensionChunks.length>1?' ('+(chunkIndex+1)+'/'+dimensionChunks.length+')':'';
   const body=chunk.rows.map(row=>'<tr>'+dimCols.map(column=>'<td>'+esc(row[column[0]]??row.nominalArea??'')+'</td>').join('')+'</tr>').join('')||'<tr><td colspan="11">No selected dimension, construction or weight rows were captured.</td></tr>';
   return '<section class="fs-page">'+header(0,'__TOTAL__')+'<div class="section-title">10. PRODUCT DATA PACKAGES</div><div class="subsection-title">'+number+' '+esc(title)+'</div><div class="subsection-title">'+number+'.3 DIMENSIONS, CONSTRUCTION AND WEIGHT'+continuation+'</div><table class="data-table"><thead><tr>'+dimCols.map(column=>'<th>'+column[1]+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table>'+footer()+'</section>';
  });
  return [drawing,...layers,...dimensions];
 }
 function dataPackagePages(){
  if(!items.length)return ['<section class="fs-page">'+header(0,'__TOTAL__')+'<div class="section-title">10. PRODUCT DATA PACKAGES</div><p class="paragraph">No confirmed SPEC SHEET data package was collected. Add and confirm a SPEC SHEET before issuing this document.</p>'+footer()+'</section>'];
 return items.flatMap((item,index)=>[
   ...packagePagesForItem(item,index),
  ...technicalDataPages([item],index)
 ]);
}
function patchPages(pages){
 const list=Array.isArray(pages)?pages:[pages],total=list.length;
 return list.map((page,index)=>String(page).replace(/__PAGE__/g,String(index+1)).replace(/__TOTAL__/g,String(total))).join('');
}
window.generateDraft=function(){
  if(!$('scopeText').value.trim())$('scopeText').value=makeDefaultScope();
      const pages=[coverPage(),page2(),...constructionPages(),applicableStandardsPage(),...productOverviewPages(),...scopedTestPages(),...propertyPagesPaged(),...identificationMarkingPackagingPages(),...dataPackagePages()];
   $('preview').innerHTML=patchPages(pages);
   $('preview').querySelectorAll('.drawing-box img').forEach(image=>{image.loading='lazy';image.decoding='async';});
   bindEdits();
   previewIsDirty=false;
   const previewState=$('previewState');if(previewState)previewState.textContent='Updated · '+pages.length+' page(s)';
   renderPreflight();
};
function scheduleDraftRender(delay=700){
 clearTimeout(draftRenderTimer);
 previewIsDirty=true;
 const previewState=$('previewState');if(previewState)previewState.textContent='Draft update queued';
 draftRenderTimer=setTimeout(()=>{previewIsDirty=false;window.generateDraft();},Math.max(0,Number(delay)||0));
}
window.goToProductOverview=function(){
 const target=document.getElementById('product-overview');
 if(!target)return false;
 target.scrollIntoView({behavior:'smooth',block:'start'});
 return true;
};
function bindEdits(){
 document.querySelectorAll('[data-edit]').forEach(el=>el.addEventListener('input',()=>{manualEdits[el.dataset.edit]=el.innerText;}));
}
window.resetManualDraft=function(){if(confirm('직접 수정한 본문을 자동 초안으로 복원하시겠습니까?')){manualEdits={};$('scopeText').value=makeDefaultScope();generateDraft();}};
 let standardDiagnostics=[];
 const standardReferencePattern=/\b(?:KS(?:\s+(?:C|IEC|EN|ISO))?|IEC|IEEE|ISO|UL|EN|BS|JIS|ASTM|NEMA|ICEA|AEIC)\s*(?:[A-Z]{1,4}\s*)?\d{2,6}(?:\s*[-–]\s*\d{1,6})*/i;
 const standardCategoryPatterns={
  thickness:[/\b(?:minimum|average|nominal|overall|insulation|sheath)?\s*thickness\b/i,/\bt\s*min\b/i,/(?:최소|평균|공칭|절연|시스|피복|외피|내피)?\s*두께/],
  test:[/\b(?:type|routine|sample|electrical|dielectric|voltage withstand|withstand voltage|insulation resistance|conductor resistance|dc resistance|capacitance|hot set|pressure test|flame|smoke|halogen|cold bend|cold impact|water immersion)\b/i,/형식\s*시험|루틴\s*시험|정기\s*시험|샘플\s*시험|전기\s*시험|내전압|절연\s*저항|도체\s*저항|직류\s*저항|정전\s*용량|열\s*세트|가압\s*시험|난연|화염|연기|할로겐|저온\s*(?:굴곡|굽힘|충격)|냉간\s*(?:굴곡|굽힘|충격)|수침\s*시험|시험/],
  property:[/\b(?:tensile strength|elongation(?: at break)?|ageing|aging|heat aging|hot set|pressure test|pH|conductivity|ozone|loss of mass|thermal stability)\b/i,/인장\s*강도|신장(?:률)?|신율|노화|열\s*노화|열\s*세트|가압\s*시험|p\s*h|전도도|오존|질량\s*감소|열\s*안정/]
 };
 function cleanStandardLine(value){return String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').replace(/\s+/g,' ').trim();}
 function createStandardPage(page,lines,meta={}){
  const clean=(Array.isArray(lines)?lines:[]).map(cleanStandardLine).filter(Boolean);
  return {page:Math.max(1,Number(page)||1),lines:clean,text:clean.join('\n'),textItemCount:Number(meta.textItemCount)||0,characterCount:clean.join('').length,source:meta.source||'text'};
 }
 function standardPageFromText(text,page=1,source='text'){return createStandardPage(page,String(text??'').split(/\r?\n/),{source});}
 function pdfItemsToLines(items){
  const tokens=(items||[]).map((item,index)=>({text:cleanStandardLine(item?.str),x:Number(item?.transform?.[4]),y:Number(item?.transform?.[5]),hasEOL:!!item?.hasEOL,index})).filter(item=>item.text);
  if(!tokens.length)return [];
  if(!tokens.every(item=>Number.isFinite(item.x)&&Number.isFinite(item.y))){
   const lines=[],current=[];
   tokens.forEach(item=>{current.push(item.text);if(item.hasEOL){lines.push(current.join(' '));current.length=0;}});
   if(current.length)lines.push(current.join(' '));
   return lines;
  }
  const rows=[],tolerance=2.5;
  [...tokens].sort((a,b)=>Math.abs(a.y-b.y)>tolerance?b.y-a.y:a.x-b.x).forEach(item=>{
   let row=rows.find(entry=>Math.abs(entry.y-item.y)<=tolerance);
   if(!row){row={y:item.y,items:[]};rows.push(row);}
   row.items.push(item);
  });
  return rows.sort((a,b)=>b.y-a.y).map(row=>row.items.sort((a,b)=>a.x-b.x||a.index-b.index).map(item=>item.text).join(' '));
 }
 async function parsePdf(file){
 if(!window.pdfjsLib)throw new Error('PDF.js를 불러오지 못했습니다.');
 pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise, pages=[];
  for(let p=1;p<=pdf.numPages;p++){
   const page=await pdf.getPage(p),tc=await page.getTextContent();
   pages.push(createStandardPage(p,pdfItemsToLines(tc.items),{source:'pdf',textItemCount:tc.items.length}));
  }
 return pages;
}
 function normalizeStandardPages(pages){
  return (Array.isArray(pages)?pages:[]).map((entry,index)=>{
   if(typeof entry==='string')return standardPageFromText(entry,index+1);
   const page=Number(entry?.page??entry?.number??index+1)||index+1;
   if(Array.isArray(entry?.lines))return createStandardPage(page,entry.lines,entry);
   return standardPageFromText(entry?.text||'',page,entry?.source||'text');
  });
 }
 function standardReferenceForPage(page){
  const lines=page?.lines||[];
  for(let index=0;index<lines.length;index++){
   const nearby=lines[index]+' '+(lines[index+1]||'');
   const match=nearby.match(standardReferencePattern);if(match)return match[0].replace(/\s+/g,' ').trim();
  }
  return '';
 }
 function standardReferenceForPages(pages,fallback){
  for(const page of normalizeStandardPages(pages)){const standard=standardReferenceForPage(page);if(standard)return standard;}
  return fallback;
 }
 function matchesStandardPattern(kind,text){return (standardCategoryPatterns[kind]||[]).some(pattern=>pattern.test(text));}
 function standardCandidateCategory(text){
  if(matchesStandardPattern('property',text))return 'property';
  if(matchesStandardPattern('thickness',text))return 'thickness';
  if(matchesStandardPattern('test',text))return 'test';
  return '';
 }
 function standardTestGroup(text){
  if(/\broutine\b|루틴\s*시험|정기\s*시험/i.test(text))return 'Routine Test';
  if(/\bsample\b|샘플\s*시험|표본\s*시험/i.test(text))return 'Sample Test';
  if(/\belectrical\b|전기\s*시험|내전압|절연\s*저항|도체\s*저항|직류\s*저항|정전\s*용량/i.test(text))return 'Type Test ??Electrical';
  return 'Type Test ??Non-Electrical';
 }
 function standardLineSegments(page){
  const lines=page?.lines||[],out=[];
  lines.forEach((line,index)=>{
   const following=lines[index+1]||'',needsFollowing=line.length<220&&following&&!/[.!?;:]$/.test(line);
   const source=needsFollowing?line+' '+following:line;
   source.split(/(?<=[.;:])\s+(?=[A-Za-z0-9가-힣])/).map(cleanStandardLine).filter(segment=>segment.length>8).forEach(text=>out.push({text,lineStart:index+1,lineEnd:needsFollowing?index+2:index+1}));
  });
  return out;
 }
function detectCandidatesLegacy(file,pages){
 const out=[],std=(pages.join(' ').match(/\b(?:IEC|IEEE|ISO|UL|EN|BS|KS|JIS)\s*\d+(?:-\d+)*/i)||[])[0]||file.name;
 pages.forEach((text,pi)=>{
   const sentences=text.split(/(?<=[.;])\s+|\s{3,}/).map(x=>x.trim()).filter(x=>x.length>8);
   sentences.forEach(s=>{
     let category='';
     if(/\b(thickness|minimum thickness|average thickness|nominal thickness|tmin)\b/i.test(s))category='thickness';
     else if(/\b(test|voltage withstand|resistance|capacitance|hot set|flame|smoke|halogen|cold bend|cold impact)\b/i.test(s))category='test';
     if(/\b(tensile strength|elongation|ageing|aging|hot set|pressure test|pH|conductivity|ozone|loss of mass)\b/i.test(s))category='property';
     if(category){let testGroup='';if(category==='test'){if(/routine/i.test(s))testGroup='Routine Test';else if(/sample/i.test(s))testGroup='Sample Test';else if(/electrical/i.test(s))testGroup='Type Test – Electrical';else testGroup='Type Test – Non-Electrical';}out.push({id:'C'+Date.now()+Math.random(),category,testGroup,text:s.slice(0,380),file:file.name,page:pi+1,standard:std,approved:false});}
   });
 });
 return out.slice(0,160).map(normalizeCandidate);
}
function detectCandidates(file,pages){
 const records=normalizeStandardPages(pages),out=[],defaultStandard=standardReferenceForPages(records,file.name),seen=new Set();
 records.forEach(page=>{
  const standard=standardReferenceForPage(page)||defaultStandard;
  standardLineSegments(page).forEach(segment=>{
   const category=standardCandidateCategory(segment.text);if(!category)return;
   const text=segment.text.slice(0,380),key=[page.page,category,text.replace(/\s+/g,' ').toLowerCase()].join('|');
   if(seen.has(key))return;seen.add(key);
   out.push({id:'C'+Date.now()+Math.random(),category,testGroup:category==='test'?standardTestGroup(text):'',text,file:file.name,page:page.page,sourceLine:segment.lineStart,sourceLineEnd:segment.lineEnd,standard,approved:false});
  });
 });
 return out.slice(0,160).map(normalizeCandidate);
}
function makeStandardDiagnostic(file,pages,candidateCount,options={}){
 const records=normalizeStandardPages(pages),pageCount=records.length,textPages=records.filter(page=>page.characterCount>0),characters=records.reduce((sum,page)=>sum+page.characterCount,0),textItems=records.reduce((sum,page)=>sum+page.textItemCount,0),warnings=[];
 if(options.error)warnings.push(options.error);
 if(pageCount&&!textPages.length)warnings.push('No selectable text was found. Paste copied text or OCR output in the manual-text analyzer.');
 else if(pageCount&&characters/pageCount<24)warnings.push('Very little selectable text was found; this PDF may be scanned or table-only.');
 if(textPages.length&&!candidateCount)warnings.push('Text was read, but no configured Korean or English requirement pattern matched. Review manually or paste the relevant clause.');
 return {file:file?.name||'Manual standard text',kind:options.manual?'manual text':/\.txt$/i.test(file?.name||'')?'text file':'PDF',pageCount,textPages:textPages.length,characters,textItems,candidates:candidateCount,warnings,error:options.error||'',manual:options.manual===true};
}
function renderStdDiagnostics(){
 const target=$('stdDiagnostics');if(!target)return;
 if(!standardDiagnostics.length){target.innerHTML='<div class=help>No STD analysis diagnostics yet.</div>';return;}
 target.innerHTML='<h3>ANALYSIS DIAGNOSTICS</h3>'+standardDiagnostics.map(diagnostic=>{
  const severity=diagnostic.error?' std-diagnostic-error':diagnostic.warnings.length?' std-diagnostic-warning':'';
  const stats=`${diagnostic.kind} · ${diagnostic.pageCount} page(s) · ${diagnostic.textPages} text page(s) · ${diagnostic.candidates} candidate(s)`;
  const counts=`${diagnostic.characters.toLocaleString()} character(s), ${diagnostic.textItems.toLocaleString()} PDF text item(s)`;
  const notes=diagnostic.warnings.length?'<ul>'+diagnostic.warnings.map(note=>'<li>'+esc(note)+'</li>').join('')+'</ul>':'';
  return '<article class=std-diagnostic'+severity+'><b>'+esc(diagnostic.file)+'</b><small>'+esc(stats)+'</small><small>'+esc(counts)+'</small>'+notes+'</article>';
 }).join('');
}
window.parseLegacyStandards=async function(){
 const files=[...$('stdFiles').files];if(!files.length){alert('STD 파일을 선택해 주세요.');return;}
 $('stdStatus').textContent='분석 중...';candidates=[];
 try{
  for(const file of files){
   let pages;if(/\.txt$/i.test(file.name))pages=[await file.text()];else pages=await parsePdf(file);
   candidates.push(...detectCandidates(file,pages));
  }
  $('stdStatus').textContent=`${files.length}개 파일에서 ${candidates.length}개 후보를 추출했습니다. 원문과 대조 후 승인하세요.`;
  renderCandidates();
 }catch(e){console.error(e);$('stdStatus').textContent='분석 오류: '+e.message;}
};
window.parseStandards=async function(){
 const files=[...$('stdFiles').files];
 if(!files.length){alert('Select one or more standard files first.');return;}
  const previous=normalizeCandidates(candidates),parsed=[];standardDiagnostics=[];
 $('stdStatus').textContent='Analyzing standards...';
  let failed=0;
  for(const file of files){
   try{
    let pages;
    if(/\.txt$/i.test(file.name))pages=[await file.text()];
    else pages=await parsePdf(file);
    const found=detectCandidates(file,pages);parsed.push(...found);standardDiagnostics.push(makeStandardDiagnostic(file,pages,found.length));
   }catch(error){
    failed++;console.error(error);
    standardDiagnostics.push(makeStandardDiagnostic(file,[],0,{error:'Could not analyze this file: '+error.message}));
   }
  }
  candidates=mergeParsedCandidates(parsed,previous);
  const retained=Math.max(0,candidates.length-parsed.length);
  $('stdStatus').textContent=files.length+' file(s) analyzed. '+parsed.length+' candidate(s) found. '+retained+' unmatched existing candidate(s) retained.'+(failed?' '+failed+' file(s) need attention.':'');
  renderStdDiagnostics();
  renderCandidates();
  generateDraft();
  persistProject(false).catch(error=>console.error(error));
};
 window.parseManualStandardText=async function(){
  const raw=$('stdManualText')?.value||'',source=($('stdManualSource')?.value||'').trim()||'Manual standard text',page=Math.max(1,Number($('stdManualPage')?.value)||1);
  if(!raw.trim()){alert('Paste standard text or OCR output before analyzing.');return [];}
  const file={name:source},pages=[standardPageFromText(raw,page,'manual')],parsed=detectCandidates(file,pages),previous=normalizeCandidates(candidates);
  candidates=mergeParsedCandidates(parsed,previous);
  standardDiagnostics=standardDiagnostics.filter(diagnostic=>!diagnostic.manual);
  standardDiagnostics.push(makeStandardDiagnostic(file,pages,parsed.length,{manual:true}));
  const retained=Math.max(0,candidates.length-parsed.length);
  $('stdStatus').textContent='Manual text analyzed. '+parsed.length+' candidate(s) found. '+retained+' unmatched existing candidate(s) retained.';
  renderStdDiagnostics();renderCandidates();generateDraft();persistProject(false).catch(error=>console.error(error));
  return parsed;
 };
 function candidateFingerprint(candidate){
 return [
  candidate.file||'',
  candidate.page||'',
  candidate.category||'',
  String(candidate.text||'').replace(/\s+/g,' ').trim().toLowerCase()
 ].join('|');
}
function mergeParsedCandidates(parsed,previous){
 const old=normalizeCandidates(previous),byFingerprint=new Map();
 old.forEach(candidate=>{
  const fingerprint=candidateFingerprint(candidate);
  if(!byFingerprint.has(fingerprint))byFingerprint.set(fingerprint,candidate);
 });
 const seen=new Set(),merged=normalizeCandidates(parsed).map(candidate=>{
  const fingerprint=candidateFingerprint(candidate),prior=byFingerprint.get(fingerprint);
  seen.add(fingerprint);
  if(!prior)return candidate;
  return normalizeCandidate(Object.assign({},candidate,{
   id:prior.id||candidate.id,
   approved:prior.approved,
   scope:prior.scope,
   clause:prior.clause??candidate.clause,
   unit:prior.unit??candidate.unit,
   requirement:prior.requirement??candidate.requirement
  }));
 });
 return [...old.filter(candidate=>!seen.has(candidateFingerprint(candidate))),...merged];
}
function scopeMultiSelect(candidateId,key,label,labels,selected,disabled){
 const options=Object.entries(labels).map(([id,name])=>`<option value="${esc(id)}"${selected.includes(id)?' selected':''}>${esc(name)}</option>`).join('');
 return `<label class="candidate-scope-field"><span>${esc(label)}</span><select multiple size="3" data-candidate-scope-select="${esc(candidateId)}" data-scope-key="${esc(key)}"${disabled?' disabled':''}>${options}</select></label>`;
}
function scopeAllControl(candidate,id,scope){
 if(candidate.category==='property')return '<span class="help">All-items scope is unavailable for property candidates.</span>';
 return '<label><input type="checkbox" data-candidate-scope-toggle="appliesToAll" data-candidate-id="'+id+'" '+(scope.appliesToAll?'checked':'')+'> Apply to all collected items</label>';
}
function candidateScopeEditor(candidate){
 const scope=candidateScope(candidate),id=esc(candidate.id),locked=scope.appliesToAll,roles=candidate.category==='property'?propertyMaterialRoleNames:materialRoleNames;
 const state=scopeIsConfirmed(candidate),propertyNote=candidate.category==='property'?' Property candidates require a material role or material family.':'';
 return `<div class="candidate-scope"><div class="candidate-scope-state"><span class="status-chip ${state?'status-ok':'status-warn'}">${state?'SCOPE CONFIRMED':'SCOPE NOT CONFIRMED'}</span><label><input type="checkbox" data-candidate-scope-toggle="confirmed" data-candidate-id="${id}" ${scope.confirmed?'checked':''}> Confirm scope</label>${scopeAllControl(candidate,id,scope)}</div><div class="candidate-scope-options">${scopeMultiSelect(candidate.id,'profileIds','Profiles',profileNames,scope.profileIds,locked)}${scopeMultiSelect(candidate.id,'standardIds','Standard group',standardScopeNames,scope.standardIds,locked)}${scopeMultiSelect(candidate.id,'materialRoleIds','Material role',roles,scope.materialRoleIds,locked)}${scopeMultiSelect(candidate.id,'materialFamilies','Material family',materialFamilyNames,scope.materialFamilies,locked)}</div><div class="help">Scope: ${esc(candidateScopeText(candidate))}. Changing scope requires confirmation again.${propertyNote}</div></div>`;
}
function updateCandidate(id,mutate){
 const index=candidates.findIndex(candidate=>candidate.id===id);
 if(index<0)return;
 const next=normalizeCandidate(candidates[index]);
 mutate(next);
 candidates[index]=normalizeCandidate(next);
}
function candidateCard(candidate){
  const canCopy=['test','property'].includes(candidate.category);
  const copy=canCopy?`<div class="library-record-actions"><button type="button" data-copy-candidate="${esc(candidate.id)}">요구사항 라이브러리 초안으로 복사</button></div>`:'';
  return `<div class="candidate"><label class="candidate-approval"><input type="checkbox" data-candidate="${esc(candidate.id)}" ${candidate.approved?'checked':''}><span>${esc(candidate.text)}<small>${esc(candidate.file)} / p.${candidate.page} / ${esc(candidate.standard)}</small></span></label>${candidateScopeEditor(candidate)}${copy}</div>`;
}
function refreshCandidates(){renderCandidates();scheduleDraftRender(500);persistProject(false).catch(error=>console.error(error));}
function bindCandidateControls(){
 document.querySelectorAll('[data-candidate]').forEach(control=>control.addEventListener('change',()=>{
  updateCandidate(control.dataset.candidate,candidate=>{candidate.approved=control.checked;});refreshCandidates();
 }));
 document.querySelectorAll('[data-candidate-scope-toggle]').forEach(control=>control.addEventListener('change',()=>{
  updateCandidate(control.dataset.candidateId,candidate=>{
   const key=control.dataset.candidateScopeToggle;
   candidate.scope[key]=control.checked;
   if(key!=='confirmed'){
    candidate.scope.confirmed=false;
    if(key==='appliesToAll'&&control.checked){candidate.scope.profileIds=[];candidate.scope.standardIds=[];candidate.scope.materialRoleIds=[];candidate.scope.materialFamilies=[];}
   }
  });refreshCandidates();
 }));
  document.querySelectorAll('[data-candidate-scope-select]').forEach(control=>control.addEventListener('change',()=>{
   updateCandidate(control.dataset.candidateScopeSelect,candidate=>{candidate.scope[control.dataset.scopeKey]=[...control.selectedOptions].map(option=>option.value);candidate.scope.confirmed=false;});refreshCandidates();
  }));
  document.querySelectorAll('[data-copy-candidate]').forEach(control=>control.addEventListener('click',()=>copyCandidateToLibrary(control.dataset.copyCandidate)));
 }
function renderCandidates(){
 candidates=normalizeCandidates(candidates);
 const target=$('stdCandidates');if(!target)return;
 const groups=['thickness','test','property'];
 target.innerHTML=groups.map(group=>`<h3>${group.toUpperCase()}</h3>${candidates.filter(candidate=>candidate.category===group).map(candidateCard).join('')||'<div class="help">후보 없음</div>'}`).join('');
  bindCandidateControls();
 }
 const libraryCollections={source:'sources',profile:'materialProfiles',requirement:'requirements'};
 const libraryFields={
  source:['sourceType','title','standard','edition','clause','table','page','status','notes'],
  profile:['sourceId','name','layer','material','status','notes'],
  requirement:['sourceId','category','testClass','property','test','layer','material','comparator','value','unit','condition','method','methodClause','clause','status','evidence','appliesWhen.profileId','appliesWhen.voltage','appliesWhen.cableFamily','appliesWhen.firePerformance','appliesWhen.productRef','appliesWhen.hasArmour','notes']
 };
 const libraryLabels={sourceType:'출처 구분',title:'출처 제목',standard:'표준 / 문서번호',edition:'판본 / Rev.',clause:'조항',table:'표 번호',page:'원문 페이지',status:'승인 상태',notes:'검토 메모',sourceId:'출처 ID',name:'프로필명',layer:'층 / Layer',material:'재질 / Compound',category:'행 종류',testClass:'시험 구분',property:'물성 항목',test:'시험 항목',comparator:'비교기호',value:'요구값',unit:'단위',condition:'조건',method:'시험방법',methodClause:'시험방법 조항',evidence:'증빙 기록','appliesWhen.profileId':'적용 프로필','appliesWhen.voltage':'적용 전압','appliesWhen.cableFamily':'케이블군','appliesWhen.firePerformance':'내화 / HF 조건','appliesWhen.productRef':'적용 제품 (고정 ID)','appliesWhen.hasArmour':'아머 조건'};
 function libraryRowsByKind(kind){return libraryRows(libraryCollections[kind]||kind);}
 function libraryRecordByKind(kind,id){return libraryRowsByKind(kind).find(row=>row.id===id);}
 function libraryFieldValue(record,path){return String(path).split('.').reduce((value,key)=>value&&value[key]!==undefined?value[key]:'',record);}
 function libraryControl(kind,record,path){
  const value=libraryFieldValue(record,path),label=libraryLabels[path]||path,data='data-library-field data-library-kind="'+esc(kind)+'" data-library-id="'+esc(record.id)+'" data-library-path="'+esc(path)+'"';
  const wide=['condition','notes'].includes(path)?' class="library-span-2"':'';
  if(path==='status')return '<label'+wide+'><span>'+label+'</span><select '+data+'><option'+(value==='DRAFT'?' selected':'')+'>DRAFT</option><option'+(value==='REVIEW'?' selected':'')+'>REVIEW</option><option'+(value==='APPROVED'?' selected':'')+'>APPROVED</option><option'+(value==='OBSOLETE'?' selected':'')+'>OBSOLETE</option></select></label>';
  if(path==='category')return '<label'+wide+'><span>'+label+'</span><select '+data+'><option value="material"'+(value==='material'?' selected':'')+'>Material property</option><option value="test"'+(value==='test'?' selected':'')+'>Test requirement</option></select></label>';
   if(path==='testClass')return '<label'+wide+'><span>'+label+'</span><select '+data+'><option value="NONE"'+(value==='NONE'?' selected':'')+'>Not classified</option><option value="ROUTINE"'+(value==='ROUTINE'?' selected':'')+'>Routine</option><option value="TYPE"'+(value==='TYPE'?' selected':'')+'>Type</option><option value="SAMPLE"'+(value==='SAMPLE'?' selected':'')+'>Sample</option></select></label>';
   if(path==='appliesWhen.productRef'){const products=[['','모든 제품'],...items.filter(item=>item.id).map((item,index)=>[item.id,productPackageRef(index)+' — '+itemLabel(item,index)])];if(value&&!products.some(option=>option[0]===value))products.push([value,'Invalid / legacy scope: '+value]);return '<label'+wide+'><span>'+label+'</span><select '+data+'>'+products.map(option=>'<option value="'+esc(option[0])+'"'+(option[0]===value?' selected':'')+'>'+esc(option[1])+'</option>').join('')+'</select></label>';}
  if(['condition','notes'].includes(path))return '<label'+wide+'><span>'+label+'</span><textarea rows="3" '+data+'>'+esc(value)+'</textarea></label>';
  return '<label'+wide+'><span>'+label+'</span><input '+data+' value="'+esc(value)+'"></label>';
 }
 function libraryRecordCard(kind,record){
  const name=record.title||record.name||record.test||record.property||record.standard||record.id;
  const chip='<span class="status-chip '+(record.status==='APPROVED'?'status-ok':record.status==='REVIEW'?'status-warn':'status-neutral')+'">'+esc(record.status||'DRAFT')+'</span>';
  return '<details class="library-record"><summary><span>'+esc(name)+' <small>'+esc(record.id)+'</small></span>'+chip+'</summary><div class="library-record-grid"><label><span>ID</span><input value="'+esc(record.id)+'" readonly></label>'+libraryFields[kind].map(path=>libraryControl(kind,record,path)).join('')+'</div><div class="library-record-actions"><button type="button" data-library-delete data-library-kind="'+esc(kind)+'" data-library-id="'+esc(record.id)+'">삭제</button></div></details>';
 }
 function renderRequirementLibrary(){
  const summary=$('requirementLibrarySummary'),sources=$('requirementLibrarySources'),profiles=$('requirementLibraryProfiles'),requirements=$('requirementLibraryRows');
  if(!summary||!sources||!profiles||!requirements)return;
  if(!requirementsLibrary){summary.textContent='요구사항 라이브러리를 불러오는 중입니다.';return;}
  const approved=approvedLibraryRequirements(),approvedSources=libraryRows('sources').filter(row=>row.status==='APPROVED').length;
  summary.innerHTML='<span>'+libraryRows('sources').length+'개 출처</span><span>'+libraryRows('materialProfiles').length+'개 프로필</span><span>'+libraryRows('requirements').length+'개 요구사항</span><span class="library-approved">'+approvedSources+'개 승인 출처 / '+approved.length+'개 확정 출력행</span>';
  sources.innerHTML=libraryRows('sources').map(row=>libraryRecordCard('source',row)).join('')||'<p class="help">관리 출처를 추가하세요.</p>';
  profiles.innerHTML=libraryRows('materialProfiles').map(row=>libraryRecordCard('profile',row)).join('')||'<p class="help">재질 프로필은 재사용 범위를 명확하게 합니다.</p>';
  requirements.innerHTML=libraryRows('requirements').map(row=>libraryRecordCard('requirement',row)).join('')||'<p class="help">시험 또는 물성 요구사항을 추가하세요.</p>';
  bindRequirementLibraryControls();
 }
 function setRequirementLibraryField(record,path,value){
  const keys=String(path).split('.');let target=record;
  while(keys.length>1){const key=keys.shift();if(!target[key]||typeof target[key]!=='object')target[key]={};target=target[key];}
  target[keys[0]]=value;
 }
 function syncRequirementLibrary(redraw=false){
  const api=requirementLibraryApi();if(!api||!requirementsLibrary)return Promise.resolve();
  return api.save(requirementsLibrary).then(saved=>{requirementsLibrary=saved;return appReady?persistProject(false):null;}).then(()=>{if(redraw)scheduleDraftRender(250);});
 }
  function scheduleRequirementLibrarySync(redraw=false){
   requirementLibraryRedrawNeeded=requirementLibraryRedrawNeeded||redraw;
   clearTimeout(requirementLibraryTimer);
   requirementLibraryTimer=setTimeout(()=>{const needsDraft=requirementLibraryRedrawNeeded;requirementLibraryRedrawNeeded=false;syncRequirementLibrary(needsDraft).catch(error=>console.error(error));},900);
  }
 function bindRequirementLibraryControls(){
  document.querySelectorAll('[data-library-field]').forEach(control=>{
   const update=()=>{
    const record=libraryRecordByKind(control.dataset.libraryKind,control.dataset.libraryId);if(!record)return;
    setRequirementLibraryField(record,control.dataset.libraryPath,control.value);
    const path=control.dataset.libraryPath,dependentApproved=control.dataset.libraryKind==='source'&&libraryRows('requirements').some(row=>row.sourceId===record.id&&row.status==='APPROVED');
    if(['status','category','testClass'].includes(path))renderRequirementLibrary();
    scheduleRequirementLibrarySync(path==='status'||record.status==='APPROVED'||dependentApproved);
   };
   control.addEventListener(control.tagName==='SELECT'?'change':'input',update);
  });
  document.querySelectorAll('[data-library-delete]').forEach(button=>button.addEventListener('click',()=>deleteRequirementLibraryRecord(button.dataset.libraryKind,button.dataset.libraryId)));
 }
 function nextRequirementLibraryId(prefix,kind){
  const used=new Set(libraryRowsByKind(kind).map(row=>row.id));let id=prefix+'-'+Date.now().toString(36).toUpperCase(),number=2;
  while(used.has(id))id=prefix+'-'+Date.now().toString(36).toUpperCase()+'-'+number++;
  return id;
 }
 function deleteRequirementLibraryRecord(kind,id){
  const rows=libraryRowsByKind(kind),index=rows.findIndex(row=>row.id===id);if(index<0)return;
  const referenced=kind==='source'?[...libraryRows('materialProfiles'),...libraryRows('requirements')].some(row=>row.sourceId===id):kind==='profile'?libraryRows('requirements').some(row=>libraryRuleValues(row.appliesWhen?.profileId).includes(String(id).toLowerCase())):false;
  if(referenced){alert('다른 라이브러리 행이 이 ID를 사용 중입니다. 연결을 변경한 뒤 삭제하세요.');return;}
  if(!confirm(id+'을(를) 삭제할까요?'))return;
  rows.splice(index,1);renderRequirementLibrary();scheduleRequirementLibrarySync();
 }
 function requirementLibraryPanel(){const panel=$('requirementLibraryPanel');if(panel)panel.open=true;}
 window.addRequirementSource=function(){
  if(!requirementsLibrary)return;
  requirementsLibrary.sources.push({id:nextRequirementLibraryId('SRC','source'),sourceType:'STD',title:'New controlled source',standard:'',edition:'',clause:'',table:'',page:'',status:'DRAFT',notes:''});
  requirementLibraryPanel();renderRequirementLibrary();scheduleRequirementLibrarySync();
 };
 window.addMaterialProfile=function(){
  if(!requirementsLibrary)return;
  requirementsLibrary.materialProfiles.push({id:nextRequirementLibraryId('MP','profile'),sourceId:libraryRows('sources')[0]?.id||'',name:'New material profile',layer:'',material:'',status:'DRAFT',notes:''});
  requirementLibraryPanel();renderRequirementLibrary();scheduleRequirementLibrarySync();
 };
 window.addLibraryRequirement=function(){
  if(!requirementsLibrary)return;
  requirementsLibrary.requirements.push({id:nextRequirementLibraryId('REQ','requirement'),sourceId:libraryRows('sources')[0]?.id||'',category:'material',testClass:'NONE',property:'',test:'',layer:'',material:'',comparator:'',value:'',unit:'',condition:'',method:'',methodClause:'',clause:'',evidence:'',status:'DRAFT',appliesWhen:{profileId:'',cableFamily:'',voltage:'',conductor:'',material:'',layer:'',hasArmour:'',firePerformance:'',productRef:'',notes:''},notes:''});
  requirementLibraryPanel();renderRequirementLibrary();scheduleRequirementLibrarySync();
 };
 window.saveRequirementLibrary=async function(){
  await syncRequirementLibrary(true);renderRequirementLibrary();alert('요구사항 라이브러리를 이 브라우저와 현재 Full Spec 프로젝트에 저장했습니다.');
 };
 function copyCandidateToLibrary(candidateId){
  const candidate=candidates.find(row=>row.id===candidateId);if(!candidate||!['test','property'].includes(candidate.category)||!requirementsLibrary)return;
  const standard=candidate.standard||candidate.file||'Uploaded STD';
  let source=libraryRows('sources').find(row=>(row.standard||row.title)===standard);
  if(!source){source={id:nextRequirementLibraryId('SRC','source'),sourceType:'STD',title:standard,standard,edition:'',clause:'',table:'',page:String(candidate.page||''),status:'DRAFT',notes:'Created from uploaded STD candidate. Confirm controlled edition, clause and approval.'};requirementsLibrary.sources.push(source);}
  const scope=candidateScope(candidate);
  requirementsLibrary.requirements.push({id:nextRequirementLibraryId('REQ','requirement'),sourceId:source.id,category:candidate.category==='test'?'test':'material',testClass:/routine/i.test(candidate.testGroup||'')?'ROUTINE':/sample/i.test(candidate.testGroup||'')?'SAMPLE':'TYPE',property:candidate.category==='property'?candidate.text:'',test:candidate.category==='test'?candidate.text:'',layer:'',material:'',comparator:'',value:candidate.requirement||'',unit:candidate.unit||'',condition:'',method:candidate.standard||candidate.file||'',methodClause:'',clause:candidate.clause||'',evidence:'',status:'DRAFT',appliesWhen:{profileId:'',cableFamily:scope.appliesToAll?'':scope.profileIds.join('|'),voltage:'',conductor:'',material:'',layer:'',hasArmour:'',firePerformance:'',productRef:'',notes:'Copied scope: '+candidateScopeText(candidate)},notes:'Copied from STD candidate. Confirm value, condition, applicability and source before approval.'});
  requirementLibraryPanel();renderRequirementLibrary();scheduleRequirementLibrarySync();
  alert('STD 후보를 DRAFT 요구사항으로 복사했습니다. 값·조건·출처를 확인한 뒤 APPROVED로 변경하세요.');
 }
 window.exportRequirementLibraryJson=async function(){
  const api=requirementLibraryApi();if(!api||!requirementsLibrary)return;
  const snapshot=await api.exportSnapshot(requirementsLibrary),blob=new Blob([snapshot.json],{type:'application/json'}),link=document.createElement('a');
  link.href=URL.createObjectURL(blob);link.download=snapshot.filename;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),500);
 };
 function bindRequirementLibraryImport(){
  const input=$('requirementLibraryFile');if(!input||input.dataset.bound)return;input.dataset.bound='true';
  input.addEventListener('change',async event=>{
   const file=event.target.files?.[0];if(!file)return;
   try{const api=requirementLibraryApi();requirementsLibrary=await api.normalize(JSON.parse(await file.text()));await syncRequirementLibrary(true);renderRequirementLibrary();alert('요구사항 라이브러리를 불러왔습니다. 현재 Full Spec에는 이 시점의 스냅샷이 저장됩니다.');}catch(error){alert('라이브러리 JSON 불러오기 실패: '+error.message);}finally{input.value='';}
  });
 }
 async function hydrateRequirementLibrary(snapshot){
  const api=requirementLibraryApi();
  if(!api){requirementsLibrary=null;console.warn('FullSpecRequirements module is unavailable.');return null;}
  requirementsLibrary=snapshot?await api.normalize(snapshot):await api.load();
  return requirementsLibrary;
 }
 function captureRevisions(){
 const slots={};document.querySelectorAll('[data-rev]').forEach(td=>{const i=td.dataset.rev;(slots[i]||(slots[i]={}))[td.dataset.k]=td.innerText.trim();});
 return Object.values(slots).filter(r=>Object.values(r).some(Boolean));
}
 function buildProject(){
  candidates=normalizeCandidates(candidates);
    return {id:'default',schemaVersion:6,updatedAt:new Date().toISOString(),form:formData(),manualEdits,candidates,requirementsLibrary:copyJson(requirementsLibrary),revisions:captureRevisions(),workflow,ui:uiState};
}
async function persistProject(notify){
 project=buildProject();await FullSpecDB.saveProject(project);
 if(notify)alert('FULL SPEC 프로젝트를 브라우저에 저장했습니다.');
 return project;
}
window.saveProject=async function(){return persistProject(true);};
window.updateDocumentStatus=function(next){
 const previous=workflow.status;
 workflow.status=['DRAFT','IN_REVIEW','ISSUED'].includes(next)?next:'DRAFT';
 const result=collectPreflight();
 if(workflow.status!=='DRAFT'&&result.errors.length){
  workflow.status=previous;refreshWorkflowUi();renderPreflight(collectPreflight());
  alert(`Document status cannot be changed while ${result.errors.length} preflight error(s) remain.`);return false;
 }
 if(workflow.status==='ISSUED'&&result.warnings.length&&!confirm(`${result.warnings.length} warning(s) remain. Mark this document as issued?`)){
  workflow.status=previous;refreshWorkflowUi();renderPreflight(collectPreflight());return false;
 }
 const now=new Date().toISOString();workflow.changedAt=now;
 if(workflow.status==='IN_REVIEW')workflow.reviewedAt=now;
 if(workflow.status==='ISSUED')workflow.issuedAt=now;
 refreshWorkflowUi();generateDraft();persistProject(false).catch(err=>console.error(err));return true;
};
window.printFullSpec=function(){if(issueGate('printing'))window.print();};
window.exportProjectJson=async function(){
 await saveProject();const blob=new Blob([JSON.stringify({project,items},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='full-spec-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
};
$('projectFile').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());project=data.project||data;manualEdits=project.manualEdits||{};candidates=normalizeCandidates(project.candidates||[]);await hydrateRequirementLibrary(project.requirementsLibrary);if(data.items){await FullSpecDB.clearItems();for(const x of data.items)await FullSpecDB.putItem(x);items=data.items;}applyProject();renderItemList();renderCandidates();renderRequirementLibrary();generateDraft();}catch(err){alert('JSON 불러오기 실패: '+err.message);}
});
 function applyProject(){
  if(!project)return;workflow=normalizeWorkflow(project.workflow);uiState=normalizeUiState(project.ui);refreshWorkflowUi();const f=project.form||{};fieldIds().forEach(id=>{if($(id)&&f[id]!==undefined)$(id).value=f[id];});(f.certs||[]).forEach(c=>{if($('cert-'+c.key))$('cert-'+c.key).value=c.text||'';if($('cert-enabled-'+c.key)&&c.enabled!==undefined)$('cert-enabled-'+c.key).checked=!!c.enabled;});
 }
 window.exportHtml=function(){
 if(!issueGate('HTML export'))return;
 const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('.appbar,.panel,.preview-tools,script').forEach(x=>x.remove());const body=clone.querySelector('body');body.innerHTML=$('preview').innerHTML;body.style.background='#fff';const html='<!doctype html>'+clone.outerHTML,blob=new Blob([html],{type:'text/html;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='FULL_SPEC_'+(formData().specNo||'document').replace(/[\\/:*?"<>|]/g,'-')+'.html';a.click();
};
window.exportPptx=async function(){
 if(!issueGate('PPTX export'))return;
 if(!window.PptxGenJS||!window.html2canvas){alert('PPTX 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');return;}
 const pptx=new PptxGenJS();pptx.defineLayout({name:'A4P',width:8.267,height:11.693});pptx.layout='A4P';pptx.author='LS Cable & System';pptx.subject='Full Technical Specification';
 const pages=[...document.querySelectorAll('.fs-page')];for(let i=0;i<pages.length;i++){const canvas=await html2canvas(pages[i],{scale:1.5,useCORS:true,backgroundColor:'#ffffff'}),slide=pptx.addSlide();slide.addImage({data:canvas.toDataURL('image/png'),x:0,y:0,w:8.267,h:11.693});}
 await pptx.writeFile({fileName:'FULL_SPEC_'+(formData().specNo||'document').replace(/[\\/:*?"<>|]/g,'-')+'.pptx'});
};
  let debounce;document.querySelectorAll('#docTitle,#productName,#specNo,#revNo,#issuedDate,#application,#preparedBy,#reviewedBy,#approvedBy,#language,#scopeText').forEach(el=>el.addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(()=>scheduleDraftRender(0),700);}));
  document.addEventListener('input',e=>{if(/^cert-/.test(e.target.id)){clearTimeout(debounce);debounce=setTimeout(()=>scheduleDraftRender(0),700);}});
 document.querySelectorAll('[data-workflow-target]').forEach(button=>button.addEventListener('click',()=>window.setActiveWorkflowStep(button.dataset.workflowTarget)));
 setWorkflowNavigationEnabled(false);
 (async function init(){
 initCertEditor();if(!$('issuedDate').value)$('issuedDate').value=new Date().toISOString().slice(0,10);
  items=await FullSpecDB.getItems();project=await FullSpecDB.getProject('default');await hydrateRequirementLibrary(project?.requirementsLibrary);if(project){manualEdits=project.manualEdits||{};candidates=normalizeCandidates(project.candidates||[]);applyProject();renderCandidates();}
   bindRequirementLibraryImport();renderRequirementLibrary();refreshWorkflowUi();renderItemList();$('scopeText').value=$('scopeText').value||makeDefaultScope();generateDraft();appReady=true;setWorkflowNavigationEnabled(true);
})();
})();
