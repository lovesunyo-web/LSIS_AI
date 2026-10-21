(function(){
const $=id=>document.getElementById(id);
function read(key, fallback){try{const v=sessionStorage.getItem(key)||localStorage.getItem(key);return JSON.parse(v||JSON.stringify(fallback));}catch(e){return fallback;}}
function save(key,value){try{sessionStorage.setItem(key,JSON.stringify(value));}catch(e){}}
function rows(){const all=read('cable_spec_rows',[]);const selected=read('cable_spec_selected_rows',[]);return Array.isArray(selected)&&selected.length?all.filter((_,i)=>selected.includes(i)):[];}
function mainCfg(){return read('cable_design_main_config',{});}
function cfg(){
 const c=conditions(), base=mainCfg();
 return Object.assign({},base,{
   tech_dc_standard:c.dcStandard,tech_dc_class:c.dcClass,tech_dc_coating:c.dcCoating,tech_dc_assembly:'AUTO',
   tech_ir_standard:c.irStandard,tech_ir_group:c.irGroup
 });
}
function conductorMeta(){
 const c=mainCfg();
 if(!window.LSConductorUtils) return {};
 return window.LSConductorUtils.find(c,c.cond_size)||{};
}
function conductorInfo(){
 const c=mainCfg(),m=conductorMeta();
 return {standard:c.conductorStandard||'',coating:c.cond_coating||'',structure:c.cond_class||'',classType:m.classOrType||'',strandConfig:m.strandConfig||'',od:m.class2OD||'',weight:m.weight||'',source:m.sourceTable||''};
}
const f=(n,d=2)=>Number(n||0).toFixed(d);
// 절연저항은 1의 자리가 0이 아니면 항상 10 단위로 올림한다. (1111 → 1120, 1588 → 1590)
function roundInsulationResistance(value){
 const n=Number(value);
 if(!Number.isFinite(n)) return null;
 return n%10===0?n:Math.ceil(n/10)*10;
}
function rowId(r,i){return [r.cores||'',r.sizeText||r.nominalArea||'',i].join('|');}
function coreLabel(r){return r.cores ?? r.coreCount ?? '';}
function specCoreUnit(){
 const type=String(mainCfg().core_type||'CORE').toUpperCase();
 return type==='PAIR'?'Pairs':type==='TRIAD'?'Triads':type==='QUAD'?'Quads':'Cores';
}
function specSizeUnit(){
 const standard=String(mainCfg().conductorStandard||mainCfg().conductor_standard||'').toUpperCase();
 return standard==='ASTM'||standard==='IEEE_1580'?'AWG/kcmil':'SQMM';
}
function specSizeLabel(r){
 const value=String(r.sizeText||r.size||r.nominalArea||'').trim();
 // 단위는 헤더에만 표시하고, 데이터 셀에는 도체 사이즈 값만 표시한다.
 return value.replace(/\s*(?:SQMM|AWG|KCMIL|MCM)\b/gi,'').trim();
}
function conditions(){return {
 dcStandard:$('dcStandard')?.value||'AUTO',dcClass:$('dcClass')?.value||'CLASS_2',dcCoating:$('dcCoating')?.value||'AUTO',
 irStandard:$('irStandard')?.value||'AUTO',irGroup:$('irGroup')?.value||'AUTO',
 condTemp:$('condTemp').value,install:$('install').value,ambient:$('ambient').value,frequency:$('frequency').value,earth:$('earth').value,grouping:$('grouping').value,spacing:$('spacing').value};}
function conditionKey(){return JSON.stringify(conditions());}
const dcClassSets={
 IEC_60228:[['CLASS_1','IEC Class 1'],['CLASS_2','IEC Class 2'],['CLASS_5','IEC Class 5'],['CLASS_6','IEC Class 6']],
 NEMA_WC70:[['SOLID','Solid'],['CLASS_B','Class B'],['CLASS_C','Class C'],['CLASS_K','Class K']],
 NEMA_WC57:[['SOLID','Solid'],['CLASS_B','Class B'],['CLASS_C','Class C'],['CLASS_K','Class K']],
 IEEE_1580:[['FLEXIBLE','Type P 집/복합'],['CLASS_B','Type P 압축']]
};
function defaultDcClass(standard){
 if(standard==='IEC_60228') return 'CLASS_2';
 if(standard==='IEEE_1580') return 'FLEXIBLE';
 const structure=String(mainCfg().cond_class||'');
 return /집|복합|CLASS[_ ]?K/i.test(structure)?'CLASS_K':'CLASS_B';
}
function inheritedIrStandard(){
 const base=mainCfg();
 const spec=String(base.thickness_rule_mode||base.thickness_std||'').toUpperCase();
 const conductor=String(base.conductorStandard||base.conductor_standard||'').toUpperCase();
 if(spec.includes('IEEE_1580')) return 'IEEE_1580';
 if(/ICEA|NEMA|AEIC|WC\d+/.test(spec)) return 'NEMA_WC70';
 if(/IEC|EN_/.test(spec)) return 'IEC_PROJECT';
 if(conductor==='IEEE_1580') return 'IEEE_1580';
 if(conductor==='ASTM') return 'NEMA_WC70';
 return 'IEC_PROJECT';
}
function effectiveDcStandard(){
 const explicit=$('dcStandard')?.value||'AUTO', engine=window.LSTechDataStandards;
 if(explicit!=='AUTO') return explicit;
 return engine?engine.standard(Object.assign({},mainCfg(),{tech_dc_standard:'AUTO'}),'DC'):'IEC_60228';
}
function updateDcClassOptions(preferred){
 const el=$('dcClass'); if(!el)return;
 const standard=effectiveDcStandard();
 const options=dcClassSets[standard]||dcClassSets.NEMA_WC70;
 const wanted=preferred||el.value||defaultDcClass(standard);
 el.innerHTML=options.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
 el.value=options.some(([value])=>value===wanted)?wanted:defaultDcClass(standard);
}
function standardCalc(r){
 const engine=window.LSTechDataStandards;
 if(!engine) return {dc:{value:null,tempC:20,source:'MANUAL'},ir:{value:null,tempC:null,source:'MANUAL'}};
 return {dc:engine.dcResistance(cfg(),r),ir:engine.insulationResistance(cfg(),r)};
}
function tech(r){
 const area=Number(r.nominalArea)||parseFloat(String(r.sizeText||'').replace(/[^\d.]/g,''))||1;
 const copper=!/aluminum|aluminium|알루미늄|\bal\b/i.test(String(cfg().cond_material||'copper'));
 const std=standardCalc(r), rRef=std.dc.value;
 const refTemp=Number(std.dc.tempC)||20, ct=+$('condTemp').value, ambient=+$('ambient').value;
 const hot=rRef==null?null:rRef*(1+(copper?.00393:.00403)*(ct-refTemp));
 const install=$('install').value, installFactor={'In air':1,'On cable tray':.96,'In conduit':.82,'Buried':.72}[install]||1;
 const grouping=+$('grouping').value||1, spacing=+$('spacing').value||1;
 const ambientFactor=Math.max(.45,1-(ambient-30)*.007);
 // 허용전류는 선택한 도체 온도에서의 허용 온도상승에 비례하도록 보정한다.
 // 기준은 90°C 도체 / 30°C 주위온도이며, 실제 열평형의 I²R 관계에 따라 √ΔT를 적용한다.
 const thermalHeadroom=Math.max(0.1, ct-ambient);
 const referenceHeadroom=Math.max(0.1, 90-30);
 const conductorTempFactor=Math.sqrt(thermalHeadroom/referenceHeadroom);
 const amp=Math.max(1,(copper?8.7:6.7)*Math.pow(area,.63)*installFactor*ambientFactor*grouping*spacing*conductorTempFactor);
 const insu=String(cfg().standard_insu_material||cfg().insu_material||'').toUpperCase();
 const thermoplastic=/PVC|PE(?!R)|THERMOPLASTIC/.test(insu);
 const shortK=copper?(thermoplastic?115:143):(thermoplastic?76:94);
 const shortCircuit=shortK*area/1000;
 const od=Number(r.overallOD)||Math.sqrt(area)*2+4, cores=Number(r.cores)||1;
 const L=.18+.035*Math.log(od+1)+.012*Math.max(cores-1,0), C=Math.max(.03,.22/(Math.log(od+2)));
 const x=2*Math.PI*(+$('frequency').value)*(L/1000);
 const z=(hot==null)?null:Math.sqrt(hot*hot+x*x), z0=z==null?null:z*($('earth').value==='Grounded shield'?1.15:1.7);
 return {
   r20:rRef==null?'':f(rRef,4),rhot:hot==null?'':f(hot,4),
   ir:std.ir.value==null?'':f(roundInsulationResistance(std.ir.value),0),amp:f(amp,0),shortCircuit:f(shortCircuit,2),L:f(L,3),C:f(C,3),X:f(x,3),
   Z:z==null?'':f(z,3),Z0:z0==null?'':f(z0,3),
   __dc:std.dc,__ir:std.ir
 };
}
const columns=[
 {key:'cores',label:'No. of Cores',header:'No. of<br>Cores',value:(d,r)=>coreLabel(r),fixed:true},
 {key:'size',label:'Conductor Size',header:'Conductor<br>Size',unit:'',value:(d,r)=>specSizeLabel(r),fixed:true},
 {key:'r20',label:'DC Resistance Max. at standard temperature [Ω/km]',header:'DC Resistance<br>Max.',unit:'[Ω/km]',dynamicDcTemp:true},
 {key:'rhot',label:'DC Resistance Max. at selected conductor temperature (Ω/km)',header:'DC Resistance<br>Max.',unit:'(Ω/km)',dynamicCondTemp:true},
 {key:'ir',label:'Insulation Resistance Min.',header:'Insulation Resistance<br>Min.',unit:'[MΩ·km]',dynamicTemp:true},
 {key:'amp',label:'Allowable Current (A)',header:'Allowable<br>Current',unit:'(A)'},
 {key:'shortCircuit',label:'Short circuit current (1s) (kA)',header:'Short circuit current<br>(1 s)',unit:'(kA)'},
 {key:'L',label:'Inductance L (mH/km)',header:'Inductance L',unit:'(mH/km)'},
 {key:'C',label:'Capacitance C (μF/km)',header:'Capacitance C',unit:'(μF/km)'},
 {key:'X',label:'Reactance X (Ω/km)',header:'Reactance X',unit:'(Ω/km)'},
 {key:'Z',label:'Impedance Z (Ω/km)',header:'Impedance Z',unit:'(Ω/km)'},
 {key:'Z0',label:'Zero-sequence Impedance Z0 (Ω/km)',header:'Zero-sequence<br>Impedance Z0',unit:'(Ω/km)'}
];
function columnDisplay(c){
 if(c.key==='cores') return {header:`No. of<br>${specCoreUnit()}`,label:`No. of ${specCoreUnit()}`};
 if(c.key==='size') return {header:'Conductor<br>Size',label:`Conductor Size (${specSizeUnit()})`};
 if(c.dynamicDcTemp){
   const list=rows(), std=list.length?standardCalc(list[0]).dc:null;
   const temp=std&&std.tempC!=null?`${std.tempC}°C`:'기준온도';
   return {header:`${c.header} (${temp})`,label:`${c.label} (${temp}) ${c.unit||''}`.trim()};
 }
 if(c.dynamicTemp){
   const t=window.LSTechDataStandards&&window.LSTechDataStandards.irReferenceTemp(cfg());
   const temp=t==null?'기준온도 수동입력':`${t}°C`;
   return {header:`${c.header} (${temp})`,label:`${c.label} (${temp}) ${c.unit||''}`.trim()};
 }
 if(c.dynamicCondTemp){
   const temp=$('condTemp')?`${$('condTemp').value}°C`:'';
   return {header:`${c.header} (${temp})`,label:`${c.label} (${temp}) ${c.unit||''}`.trim()};
 }
 return {header:c.header||c.label,label:c.label};
}
function techHeader(c){
 const d=columnDisplay(c);
 const unit = c.key==='size' ? `(${specSizeUnit()})` : (c.unit||'');
 return `<span class="tech-head-text">${d.header}${unit?`<span class="tech-head-unit">${unit}</span>`:''}</span>`;
}
function selectedColumns(){
 const defaults=columns.map(c=>c.key), stored=read('cable_tech_selected_columns',defaults);
 if(!stored.includes('X')&&!read('cable_tech_reactance_column_added',false)){stored.push('X');save('cable_tech_reactance_column_added',true);}
 if(!stored.includes('shortCircuit')&&!read('cable_tech_short_circuit_column_added',false)){stored.push('shortCircuit');save('cable_tech_short_circuit_column_added',true);}
 const selected=new Set([...columns.filter(c=>c.fixed).map(c=>c.key),...stored]);
 save('cable_tech_selected_columns',[...selected]);
 return columns.filter(c=>selected.has(c.key));
}
function persistSelectedColumns(){
 const fixed=columns.filter(c=>c.fixed).map(c=>c.key);
 save('cable_tech_selected_columns',[...fixed,...document.querySelectorAll('.tech-col-check:checked')].map(x=>x.dataset?x.dataset.key:x).filter(Boolean));
}
function selectedTechRows(length){
 const stored=read('cable_tech_selected_rows',null);
 return Array.isArray(stored)?stored.filter(i=>Number.isInteger(i)&&i>=0&&i<length):Array.from({length},(_,i)=>i);
}
function persistSelectedTechRows(){
 save('cable_tech_selected_rows',[...document.querySelectorAll('.tech-row-check:checked')].map(x=>Number(x.dataset.rowIndex)));
}
function syncTechRowMaster(){
 const checks=[...document.querySelectorAll('.tech-row-check')], master=document.querySelector('.tech-row-select-all');
 if(master){master.checked=!!checks.length&&checks.every(x=>x.checked);master.indeterminate=checks.some(x=>x.checked)&&!master.checked;}
}
function table(data,list){
 const selected=selectedColumns(), selectedRows=selectedTechRows(data.length);
 return `<table><thead><tr><th class="tech-row-selector"><input class="tech-row-select-all" type="checkbox" title="Select all rows" ${data.length&&selectedRows.length===data.length?'checked':''}></th>${columns.map(c=>c.fixed?`<th><div class="tech-head">${techHeader(c)}</div></th>`:`<th><label class="tech-head"><input class="tech-col-check" type="checkbox" data-key="${c.key}" ${selected.some(s=>s.key===c.key)?'checked':''}> ${techHeader(c)}</label></th>`).join('')}</tr></thead><tbody>${data.map((d,i)=>`<tr><td class="tech-row-selector"><input class="tech-row-check" data-row-index="${i}" type="checkbox" ${selectedRows.includes(i)?'checked':''}></td>${columns.map(c=>c.fixed?`<td>${c.value(d,list[i])}</td>`:`<td><input class="num" data-tech-id="${d.id}" data-tech-key="${c.key}" value="${d[c.key]||''}"></td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function manualEdits(){const data=read('cable_tech_manual_edits',{});return data&&typeof data==='object'?data:{};}
function bindTableEvents(){
 document.querySelectorAll('.tech-col-check').forEach(e=>e.addEventListener('change',persistSelectedColumns));
 document.querySelectorAll('.tech-row-check').forEach(e=>e.addEventListener('change',()=>{persistSelectedTechRows();syncTechRowMaster();}));
 const master=document.querySelector('.tech-row-select-all');
 if(master)master.addEventListener('change',e=>{document.querySelectorAll('.tech-row-check').forEach(x=>x.checked=e.target.checked);persistSelectedTechRows();syncTechRowMaster();});
 syncTechRowMaster();
 document.querySelectorAll('[data-tech-id][data-tech-key]').forEach(e=>e.addEventListener('input',()=>{const edit=manualEdits(), id=e.dataset.techId;edit[id]=edit[id]||{};edit[id][e.dataset.techKey]=e.value;save('cable_tech_manual_edits',edit);}));
}
window.generate=function(){
const list=rows(),box=$('tableArea');if(!list.length){box.innerHTML='<div class="empty">No confirmed specification table rows are selected. Confirm selected rows in the specification table first.</div>';return;}
 const edits=manualEdits();
 const data=list.map((r,i)=>{const id=rowId(r,i),base=Object.assign({id:id},tech(r));return edits[id]?Object.assign(base,edits[id]):base;});
 save('cable_tech_rows',data);save('cable_tech_row_ids',list.map((r,i)=>rowId(r,i)));save('cable_tech_conditions',conditions());
 box.innerHTML=table(data,list);bindTableEvents();
};

function copyColumns(){
 const checked=new Set([...columns.filter(c=>c.fixed).map(c=>c.key),...document.querySelectorAll('.tech-col-check:checked')].map(el=>el.dataset?el.dataset.key:el));
 return columns.filter(col=>checked.has(col.key));
}
function techCopyData(){
 const selected=copyColumns();
 const tableEl=document.querySelector('#tableArea table');
 const allBodyRows=tableEl?[...tableEl.querySelectorAll('tbody tr')]:[];
 if(!allBodyRows.length){alert('복사할 Technical Data가 없습니다.');return null;}
 if(!selected.length){alert('복사할 열 항목을 체크해 주세요.');return null;}

 // 첫 번째 셀은 행 선택용 체크박스입니다. 체크된 행만 복사하고,
 // 실제 데이터 열은 선택용 셀 다음(index + 1)부터 읽습니다.
 const bodyRows=allBodyRows.filter(tr=>{
   const rowCheck=tr.querySelector('.tech-row-check');
   return rowCheck&&rowCheck.checked;
 });
 if(!bodyRows.length){alert('복사할 표 항목(행)을 체크해 주세요.');return null;}

 const indexes=selected.map(col=>columns.findIndex(item=>item.key===col.key));
 return {
   selected,
   values:bodyRows.map(tr=>indexes.map((index)=>{
     const cell=tr.cells[index+1];
     const input=cell&&cell.querySelector('input');
     return String(input?input.value:(cell?cell.textContent:'')).trim();
   }))
 };
}
function escapeHtml(value){
 return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function writeTextFallback(text){
 const area=document.createElement('textarea');
 area.value=text; document.body.appendChild(area); area.select();
 document.execCommand('copy'); area.remove();
}
window.copySelectedTechAsImage=async function(){
 const data=techCopyData(); if(!data)return;
 const title=(cfg().cable_name||cfg().product_name||'Technical Data').trim();

 // A4 가로(96 dpi 기준 1122 px) 폭으로 고정한다. 본문은 12 px = 9 pt이므로
 // A4 폭에 100% 크기로 출력/삽입할 때 글자 크기가 축소되지 않는다.
 const A4_LANDSCAPE_WIDTH=1122, bodyFontPx=12, headerFontPx=12;
 const pagePad=10, titleH=38, rowH=28, cellPad=5, headerLineH=14, headerVerticalPad=10;
 const count=data.selected.length;
 const width=A4_LANDSCAPE_WIDTH;
 const usableWidth=width-pagePad*2;
 const widths=data.selected.map((_,index)=>{
   const left=Math.floor(usableWidth*index/count);
   const right=Math.floor(usableWidth*(index+1)/count);
   return right-left;
 });

 // 선택복사 이미지의 첫 행은 항목명을 생략하지 않고 단어 단위로 줄바꿈한다.
 // 하이픈(-)은 단어 경계로 취급하되, 앞줄에 남겨 "Zero-" / "Impedance"처럼 표시한다.
 // 가장 많은 줄 수를 기준으로 헤더 높이도 자동 확장하여 긴 항목명이 잘리지 않게 한다.
 const canvas=document.createElement('canvas');
 let ctx=canvas.getContext('2d');
 ctx.font=`700 ${headerFontPx}px Arial`;
 const wrapHeaderText=(text,maxWidth)=>{
   const explicitLines=String(text||'').replace(/<br\s*\/?\s*>/gi,'\n').split('\n');
   const lines=[];

   const wrapLineByWords=(value)=>{
     const words=value.trim().split(/\s+/).filter(Boolean);
     let line='';

     const appendHyphenWord=(word)=>{
       const parts=word.match(/[^-]+-?|-/g)||[word];
       parts.forEach(part=>{
         const candidate=line?line+part:part;
         if(line&&ctx.measureText(candidate).width>maxWidth){
           lines.push(line);
           line=part;
         }else{
           line=candidate;
         }
       });
     };

     words.forEach(word=>{
       const candidate=line?`${line} ${word}`:word;
       if(ctx.measureText(candidate).width<=maxWidth){
         line=candidate;
         return;
       }

       if(line){
         lines.push(line);
         line='';
       }

       // 공백 단위로 넣을 수 없을 때만 하이픈 뒤에서 나눈다.
       // 예: Zero-Impedance → Zero- / Impedance
       if(word.includes('-')&&ctx.measureText(word).width>maxWidth){
         appendHyphenWord(word);
       }else{
         line=word;
       }
     });
     if(line) lines.push(line);
   };

   explicitLines.forEach(part=>{
     const value=part.trim();
     if(value) wrapLineByWords(value);
   });
   return lines.length?lines:[''];
 };
 const headerLayouts=data.selected.map((col,index)=>{
   const display=columnDisplay(col);
   const unit=col.key==='size'?`(${specSizeUnit()})`:(col.unit||'');
   const lines=wrapHeaderText(display.header,widths[index]-cellPad*2);
   if(unit) lines.push(unit);
   return {lines};
 });
 const headerH=Math.max(60,...headerLayouts.map(layout=>layout.lines.length*headerLineH+headerVerticalPad*2));
 const height=titleH+headerH+data.values.length*rowH+pagePad*2;
 canvas.width=width; canvas.height=height;
 ctx=canvas.getContext('2d'); ctx.textBaseline='middle';

 const drawCenteredLines=(lines,x,y,w,lineH)=>{
   const offset=(lines.length-1)*lineH/2;
   lines.forEach((line,i)=>ctx.fillText(line,x+w/2,y+i*lineH-offset));
 };

 let y=pagePad;
 ctx.fillStyle='#dbeafe';ctx.fillRect(pagePad,y,usableWidth,titleH);
 ctx.strokeStyle='#93c5fd';ctx.strokeRect(pagePad,y,usableWidth,titleH);
 ctx.fillStyle='#0f172a';ctx.font='700 15px Arial';ctx.textAlign='left';
 ctx.fillText(title,pagePad+10,y+titleH/2);
 y+=titleH;

 let x=pagePad;
 data.selected.forEach((col,index)=>{
   const colW=widths[index], headerLines=headerLayouts[index].lines;
   ctx.fillStyle='#dceaf7';ctx.fillRect(x,y,colW,headerH);
   ctx.strokeStyle='#9db8d0';ctx.strokeRect(x,y,colW,headerH);
   ctx.fillStyle='#111827';ctx.font=`700 ${headerFontPx}px Arial`;ctx.textAlign='center';
   drawCenteredLines(headerLines,x,y+headerH/2,colW,headerLineH);
   x+=colW;
 });
 y+=headerH;

 data.values.forEach((row,rowIndex)=>{
   x=pagePad;
   ctx.fillStyle=rowIndex%2?'#ffffff':'#f5f8fb';ctx.fillRect(pagePad,y,usableWidth,rowH);
   row.forEach((value,index)=>{
     const colW=widths[index];
     ctx.strokeStyle='#cbd5df';ctx.strokeRect(x,y,colW,rowH);
     ctx.fillStyle='#172b4d';ctx.font=`700 ${bodyFontPx}px Arial`;
     ctx.textAlign=(data.selected[index].key==='cores'||data.selected[index].key==='size')?'center':'right';
     const maxWidth=colW-cellPad*2;
     let text=String(value??'');
     while(text.length>1&&ctx.measureText(text).width>maxWidth)text=text.slice(0,-1);
     if(text!==String(value??''))text+='…';
     ctx.fillText(text,ctx.textAlign==='right'?x+colW-cellPad:x+colW/2,y+rowH/2);
     x+=colW;
   });
   y+=rowH;
 });
 try{
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!blob)throw new Error('이미지 생성 실패');
   await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
   alert('체크 항목 이미지 복사 완료 (A4 가로 기준 본문 9pt)');
 }catch(error){
   console.warn(error);
   const popup=window.open();
   if(popup)popup.document.write('<img alt="Technical Data" style="width:297mm;height:auto" src="'+canvas.toDataURL('image/png')+'">');
   else alert('브라우저 보안 설정으로 이미지 클립보드 복사가 제한되었습니다. Chrome/Edge에서 http:// 또는 https://로 실행해 주세요.');
 }
};
window.copyTechTableToExcel=function(){
 const data=techCopyData(); if(!data)return;
 const cellStyle='style="width:150px;min-width:150px;font-size:12pt;text-align:center;"';
 const html='<table style="table-layout:fixed;border-collapse:collapse;"><thead><tr>'+data.selected.map(col=>'<th '+cellStyle+'>'+escapeHtml(columnDisplay(col).label)+'</th>').join('')+'</tr></thead><tbody>'+
   data.values.map(row=>'<tr>'+row.map(value=>'<td '+cellStyle+'>'+escapeHtml(value)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 const text=[data.selected.map(col=>columnDisplay(col).label).join('\t'),...data.values.map(row=>row.join('\t'))].join('\n');
 if(navigator.clipboard&&window.ClipboardItem){
   navigator.clipboard.write([new ClipboardItem({
     'text/html':new Blob([html],{type:'text/html'}),
     'text/plain':new Blob([text],{type:'text/plain'})
   })]).then(()=>alert('엑셀복사 완료')).catch(()=>{writeTextFallback(text);alert('엑셀복사 완료');});
 }else{writeTextFallback(text);alert('엑셀복사 완료');}
};

window.openSpecSheet=function(){window.open('spec-sheet.html?instance='+Date.now(),'_blank');};
window.goMain=function(){if(window.opener&&!window.opener.closed)window.opener.focus();else window.location.href='index.html';};
document.addEventListener('DOMContentLoaded',()=>{
 const saved=read('cable_tech_conditions',{});
 Object.keys(saved).filter(k=>k!=='dcClass'&&k!=='irStandard').forEach(k=>{const el=$(k);if(el)el.value=saved[k];});
 const irStandard=$('irStandard');
 if(irStandard) irStandard.value=inheritedIrStandard();
 updateDcClassOptions(($('dcStandard')?.value||'AUTO')==='AUTO'?'AUTO':(saved.dcClass||'AUTO'));
 document.querySelectorAll('.condition-groups select').forEach(el=>el.addEventListener('change',()=>{
   if(el.id==='dcStandard')updateDcClassOptions('AUTO');
   window.generate();
 }));
 window.generate();
});
})();