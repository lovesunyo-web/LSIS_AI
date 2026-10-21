(function(global){
  'use strict';

  const IEC_CLASS12_SIZES = [0.5,0.75,1,1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300,400,500,630,800,1000,1200,1400,1600,1800,2000,2500];
  // IEC 60228 Tables 1 and 2 are kept separately because the valid size ranges differ.
  const IEC_CU_PLAIN_CLASS1 = [36.0,24.5,18.1,12.1,7.41,4.61,3.08,1.83,1.15,0.727,0.524,0.387,0.268,0.193,0.153,0.124,0.101,0.0775,0.0620,0.0465,null,null,null,null,null,null,null,null,null,null];
  const IEC_CU_PLAIN_CLASS2 = [36.0,24.5,18.1,12.1,7.41,4.61,3.08,1.83,1.15,0.727,0.524,0.387,0.268,0.193,0.153,0.124,0.0991,0.0754,0.0601,0.0470,0.0366,0.0283,0.0221,0.0176,0.0151,0.0129,0.0113,0.0101,0.0090,0.0072];
  const IEC_CU_COATED_CLASS1 = [36.7,24.8,18.2,12.2,7.56,4.70,3.11,1.84,1.16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];
  const IEC_CU_COATED_CLASS2 = [36.7,24.8,18.2,12.2,7.56,4.70,3.11,1.84,1.16,0.734,0.529,0.391,0.270,0.195,0.154,0.126,0.100,0.0762,0.0607,0.0475,0.0369,0.0286,0.0224,0.0177,0.0151,0.0129,0.0113,0.0101,0.0090,0.0072];
  const IEC_AL_CLASS1 = [null,null,null,null,null,null,null,3.08,1.91,1.20,0.868,0.641,0.443,0.320,0.253,0.206,0.164,0.125,0.100,0.0778,0.0605,0.0469,0.0367,0.0291,0.0247,null,null,null,null,null];
  const IEC_AL_CLASS2 = [null,null,null,null,null,null,null,3.08,1.91,1.20,0.868,0.641,0.443,0.320,0.253,0.206,0.164,0.125,0.100,0.0778,0.0605,0.0469,0.0367,0.0291,0.0247,0.0212,0.0186,0.0165,0.0149,0.0127];

  const IEC_FLEX_SIZES = [0.5,0.75,1,1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300,400,500,630];
  const IEC_FLEX_PLAIN = [39.0,26.0,19.5,13.3,7.98,4.95,3.30,1.91,1.21,0.780,0.554,0.386,0.272,0.206,0.161,0.129,0.106,0.0801,0.0641,0.0486,0.0384,0.0287];
  const IEC_FLEX_COATED = [40.1,26.7,20.0,13.7,8.21,5.09,3.39,1.95,1.24,0.795,0.565,0.393,0.277,0.210,0.164,0.132,0.108,0.0817,0.0654,0.0495,0.0391,0.0292];

  const WC57 = {
    '22 AWG': {SOLID_PLAIN:16.5,SOLID_TINNED:17.2,STRANDED_PLAIN:16.7,STRANDED_B_TINNED:17.9,STRANDED_C_TINNED:18.1},
    '20 AWG': {SOLID_PLAIN:10.3,SOLID_TINNED:10.7,STRANDED_PLAIN:10.5,STRANDED_B_TINNED:11.1,STRANDED_C_TINNED:11.3},
    '19 AWG': {SOLID_PLAIN:8.20,SOLID_TINNED:8.52,STRANDED_PLAIN:8.33,STRANDED_B_TINNED:8.83,STRANDED_C_TINNED:8.96},
    '18 AWG': {SOLID_PLAIN:6.51,SOLID_TINNED:6.76,STRANDED_PLAIN:6.67,STRANDED_B_TINNED:7.07,STRANDED_C_TINNED:7.14},
    '17 AWG': {SOLID_PLAIN:5.15,SOLID_TINNED:5.35,STRANDED_PLAIN:5.21,STRANDED_B_TINNED:5.52,STRANDED_C_TINNED:5.64},
    '16 AWG': {SOLID_PLAIN:4.10,SOLID_TINNED:4.26,STRANDED_PLAIN:4.18,STRANDED_B_TINNED:4.43,STRANDED_C_TINNED:4.44},
    '14 AWG': {SOLID_PLAIN:2.57,SOLID_TINNED:2.67,STRANDED_PLAIN:2.63,STRANDED_B_TINNED:2.73,STRANDED_C_TINNED:2.79},
    '13 AWG': {SOLID_PLAIN:2.04,SOLID_TINNED:2.12,STRANDED_PLAIN:2.08,STRANDED_B_TINNED:2.16,STRANDED_C_TINNED:2.21},
    '12 AWG': {SOLID_PLAIN:1.62,SOLID_TINNED:1.68,STRANDED_PLAIN:1.66,STRANDED_B_TINNED:1.72,STRANDED_C_TINNED:1.75},
    '11 AWG': {SOLID_PLAIN:1.29,SOLID_TINNED:1.34,STRANDED_PLAIN:1.31,STRANDED_B_TINNED:1.36,STRANDED_C_TINNED:1.36},
    '10 AWG': {SOLID_PLAIN:1.02,SOLID_TINNED:1.06,STRANDED_PLAIN:1.04,STRANDED_B_TINNED:1.08,STRANDED_C_TINNED:1.08},
    '9 AWG': {SOLID_PLAIN:0.808,SOLID_TINNED:0.831,STRANDED_PLAIN:0.825,STRANDED_B_TINNED:0.856,STRANDED_C_TINNED:0.856}
  };

  const IEEE_B = {
    '22 AWG':[48.6,54.4],'20 AWG':[30.6,33.8],'18 AWG':[19.2,21.2],'16 AWG':[13.4,14.6],
    '14 AWG':[8.62,8.96],'12 AWG':[5.43,5.64],'10 AWG':[3.41,3.55],'8 AWG':[2.14,2.23],
    '6 AWG':[1.35,1.40],'4 AWG':[0.848,0.882],'2 AWG':[0.534,0.555],'1 AWG':[0.423,0.440],
    '1/0 AWG':[0.335,0.349],'2/0 AWG':[0.266,0.277],'3/0 AWG':[0.211,0.219],'4/0 AWG':[0.167,0.172],
    '250 KCMIL':[0.142,0.147],'300 KCMIL':[0.118,0.123],'350 KCMIL':[0.101,0.105],
    '400 KCMIL':[0.0885,0.0911],'500 KCMIL':[0.0780,0.0729],'600 KCMIL':[0.0590,0.0613],
    '750 KCMIL':[0.0472,0.0486],'1000 KCMIL':[0.0354,0.0364],'1250 KCMIL':[0.0283,0.0291],
    '1500 KCMIL':[0.0236,0.0243],'2000 KCMIL':[0.0177,0.0182]
  };

  const IEEE_FLEX_25 = {
    '22 AWG':[56.4,60.6],'20 AWG':[35.5,38.1],'18 AWG':[19.4,20.8],'16 AWG':[14.0,14.9],
    '14 AWG':[8.76,9.30],'12 AWG':[5.51,5.85],'10 AWG':[3.44,3.61],'8 AWG':[2.16,2.27],
    '6 AWG':[1.39,1.46],'4 AWG':[0.88,0.94],'2 AWG':[0.60,0.63],'1 AWG':[0.44,0.46],
    '1/0 AWG':[0.35,0.37],'2/0 AWG':[0.28,0.29],'3/0 AWG':[0.22,0.23],'4/0 AWG':[0.17,0.183],
    '262 KCMIL':[0.14,0.151],'313 KCMIL':[0.12,0.126],'373 KCMIL':[0.10,0.105],
    '444 KCMIL':[0.08,0.088],'535 KCMIL':[0.07,0.073],'646 KCMIL':[0.06,0.061],
    '777 KCMIL':[0.05,0.051],'1111 KCMIL':[0.03,0.036]
  };


  // ANSI/NEMA WC 70-2009 / ICEA S-95-658, Table 2-4 and Table 2-6.
  // Values are original table values in ohms/1000 ft at 25 °C.
  // Table 2-2 (values are Ω/1000 ft at 25 °C): 22/20 AWG가 기존 WC70
  // Class B DB에 누락되어 있어 Solid / Class B / Class C 값을 추가한다.
  const WC70_SOLID = {
    '22 AWG':[16.5,17.2],
    '20 AWG':[10.3,10.7]
  };
  const WC70_C = {
    '22 AWG':[16.7,18.1],
    '20 AWG':[10.5,11.3]
  };
  const WC70_B = {
    '22 AWG':[16.7,17.9],
    '20 AWG':[10.5,11.1],
    '18 AWG':[6.67,7.07],'16 AWG':[4.18,4.43],'15 AWG':[3.30,3.43],'14 AWG':[2.63,2.73],
    '13 AWG':[2.08,2.16],'12 AWG':[1.66,1.72],'11 AWG':[1.31,1.36],'10 AWG':[1.04,1.08],
    '9 AWG':[0.825,0.856],'8 AWG':[0.652,0.678],'7 AWG':[0.519,0.538],'6 AWG':[0.411,0.427],
    '5 AWG':[0.325,0.338],'4 AWG':[0.258,0.269],'3 AWG':[0.205,0.213],'2 AWG':[0.162,0.169],
    '1 AWG':[0.129,0.134],'1/0 AWG':[0.102,0.106],'2/0 AWG':[0.0810,0.0842],
    '3/0 AWG':[0.0642,0.0667],'4/0 AWG':[0.0510,0.0524],'250 KCMIL':[0.0431,0.0448],
    '300 KCMIL':[0.0360,0.0374],'350 KCMIL':[0.0308,0.0320],'400 KCMIL':[0.0269,0.0277],
    '450 KCMIL':[0.0240,0.0246],'500 KCMIL':[0.0216,0.0222],'550 KCMIL':[0.0196,0.0204],
    '600 KCMIL':[0.0180,0.0187],'650 KCMIL':[0.0166,0.0171],'700 KCMIL':[0.0154,0.0159],
    '750 KCMIL':[0.0144,0.0148],'800 KCMIL':[0.0135,0.0139],'900 KCMIL':[0.0120,0.0123],
    '1000 KCMIL':[0.0108,0.0111]
  };
  const WC70_K = {
    '18 AWG':[6.66,7.15],'16 AWG':[4.18,4.49],'14 AWG':[2.62,2.82],'12 AWG':[1.65,1.77],
    '10 AWG':[1.04,1.12],'9 AWG':[0.840,0.902],'8 AWG':[0.666,0.715],'7 AWG':[0.528,0.567],
    '6 AWG':[0.419,0.450],'5 AWG':[0.332,0.357],'4 AWG':[0.263,0.283],'3 AWG':[0.211,0.227],
    '2 AWG':[0.167,0.180],'1 AWG':[0.133,0.142],'1/0 AWG':[0.105,0.113],
    '2/0 AWG':[0.0842,0.0904],'3/0 AWG':[0.0668,0.0717],'4/0 AWG':[0.0530,0.0569],
    '250 KCMIL':[0.0448,0.0481],'300 KCMIL':[0.0374,0.0401],'350 KCMIL':[0.0323,0.0347],
    '400 KCMIL':[0.0283,0.0304],'450 KCMIL':[0.0251,0.0270],'500 KCMIL':[0.0226,0.0243],
    '550 KCMIL':[0.0206,0.0221],'600 KCMIL':[0.0189,0.0203],'650 KCMIL':[0.0174,0.0187],
    '700 KCMIL':[0.0162,0.0174],'750 KCMIL':[0.0151,0.0162],'800 KCMIL':[0.0141,0.0152],
    '900 KCMIL':[0.0126,0.0135],'1000 KCMIL':[0.0113,0.0122]
  };

  const WC70_IR = {
    'SYNTHETIC_RUBBER':{k:1220,tempC:15.6},'SILICONE':{k:1220,tempC:15.6},
    'CSPE':{k:610,tempC:15.6},'XLPE':{k:3050,tempC:15.6},
    'EPR_LOW':{k:3050,tempC:15.6},'EPR_HIGH':{k:6100,tempC:15.6},
    'PVC':{k:610,tempC:15.6},'PVC_NYLON':{k:914,tempC:15.6},
    'PE':{k:15240,tempC:15.6},'TPE':{k:12192,tempC:15.6}
  };
  const IEEE_IR = {
    'EPR_LOW':{k:3050,tempC:15.6},'EPR_HIGH':{k:6100,tempC:15.6},
    'XLPE_LOW':{k:3050,tempC:15.6},'XLPE_HIGH':{k:6100,tempC:15.6},
    'SILICONE':{k:1220,tempC:15.6},'PVC':{k:610,tempC:15.6},
    'PVC_NYLON':{k:610,tempC:15.6},'LSE':{k:3050,tempC:15.6},
    'LSX':{k:3050,tempC:15.6},'LSS':{k:1220,tempC:15.6},'XLPO':{k:3050,tempC:15.6}
  };

  function n(v){ const x=Number(v); return Number.isFinite(x)?x:null; }
  function standard(cfg,kind){
    const explicit=String((kind==='IR' ? cfg.tech_ir_standard : cfg.tech_dc_standard) || '').toUpperCase();
    if(explicit && explicit!=='AUTO'){
      if(explicit==='IEC_PROJECT') return 'IEC_60228';
      return explicit;
    }
    const s=String(cfg.thickness_std||cfg.thickness_rule_mode||'').toUpperCase();
    const conductorSystem=String(cfg.conductorStandard||'').toUpperCase();
    if(s.includes('IEEE_1580')) return 'IEEE_1580';
    if(s.includes('WC70')) return 'NEMA_WC70';
    if(s.includes('WC57')) return 'NEMA_WC57';
    // ASTM 치수계 도체의 TECH DATA 기본 저항표는 NEMA WC 70/ICEA로 매핑한다.
    if(conductorSystem==='IEEE_1580') return 'IEEE_1580';
    if(conductorSystem==='ASTM') return 'NEMA_WC70';
    if(s.includes('IEC') || conductorSystem==='IEC') return 'IEC_60228';
    return 'UNREGISTERED';
  }
  function coating(cfg){
    const explicit=String(cfg.tech_dc_coating||'AUTO').toUpperCase();
    if(explicit!=='AUTO') return explicit;
    return String(cfg.cond_coating||'A').toUpperCase()==='TA'?'TINNED':'PLAIN';
  }
  function conductorClass(cfg,std){
    const explicit=String(cfg.tech_dc_class||'AUTO').toUpperCase();
    if(explicit!=='AUTO') return explicit;
    const c=String(cfg.cond_class||'연선').toUpperCase();
    if(std==='IEC_60228'){
      // IEC Class는 Tech Data에서 직접 선택한다.
      // 과거 저장값(AUTO)만 구조 기준으로 호환 처리한다.
      if(c.includes('SOLID')||c.includes('단선')) return 'CLASS_1';
      if(c.includes('집합')||c.includes('복합')) return 'CLASS_5';
      return 'CLASS_2';
    }
    if(std==='ASTM') return String(cfg.astm_conductor_class||cfg.astm_conductor_spec||'').toUpperCase();
    if(std==='IEEE_1580') return (c.includes('집합')||c.includes('복합'))?'FLEXIBLE':'CLASS_B';
    if(std==='NEMA_WC57'||std==='NEMA_WC70'){
      if(c.includes('SOLID')||c.includes('단선')) return 'SOLID';
      if(c.includes('집합')||c.includes('복합')) return 'CLASS_K';
      return 'CLASS_B';
    }
    return c;
  }
  function cleanSize(v){
    let s=String(v||'').trim().toUpperCase().replace(/\s+/g,' ');
    s=s.replace(/\(D\)/g,'').replace(/\(\d+\)/g,'').trim();
    s=s.replace('KCMIL','KCMIL').replace(/\s*SQMM/g,'');
    return s;
  }
  function iecLookup(area, material, coat, cls){
    const sizes=(cls==='CLASS_5'||cls==='CLASS_6')?IEC_FLEX_SIZES:IEC_CLASS12_SIZES;
    const idx=sizes.findIndex(x=>Math.abs(x-area)<1e-9);
    if(idx<0) return null;
    if(cls==='CLASS_5'||cls==='CLASS_6'){
      if(material!=='CU') return null;
      // IEC Table 3: Class 5 up to 630 mm² / Table 4: Class 6 up to 300 mm².
      if(cls==='CLASS_6' && area>300) return null;
      return coat==='TINNED'?IEC_FLEX_COATED[idx]:IEC_FLEX_PLAIN[idx];
    }
    if(material==='AL') return cls==='CLASS_1'?IEC_AL_CLASS1[idx]:IEC_AL_CLASS2[idx];
    if(coat==='PLAIN') return cls==='CLASS_1'?IEC_CU_PLAIN_CLASS1[idx]:IEC_CU_PLAIN_CLASS2[idx];
    return cls==='CLASS_1'?IEC_CU_COATED_CLASS1[idx]:IEC_CU_COATED_CLASS2[idx];
  }
  function assemblyCategory(cfg,row){
    const explicit=String(cfg.tech_dc_assembly||'AUTO').toUpperCase();
    if(explicit!=='AUTO') return explicit;
    const type=String(cfg.core_type||'CORE').toUpperCase();
    const count=Math.max(1,Math.round(Number(row.cores||cfg.core_num||1)));
    const layout=row.assemblyLayout||{};
    const l2plus=['l2','l3','l4','l5'].some(k=>Number(layout[k]||0)>0);
    if(type==='CORE'){
      if(count===1) return 'SINGLE';
      return l2plus?'MULTICORE_MULTI_LAYER':'MULTICORE_ONE_LAYER';
    }
    return (count>1 && l2plus)?'MULTI_LAYER_PAIRED_UNIT':'PAIRED_UNIT';
  }
  function assemblyFactor(cfg,row,std){
    if(std==='IEC_60228') return {factor:1,category:'IEC_NO_FINISHED_FACTOR'};
    const category=assemblyCategory(cfg,row);
    const map={SINGLE:1,MULTICORE_ONE_LAYER:1.02,MULTICORE_MULTI_LAYER:1.03,PAIRED_UNIT:1.04,MULTI_LAYER_PAIRED_UNIT:1.05};
    let factor=map[category]||1;
    if(std==='NEMA_WC70') factor*=1.02;
    return {factor,category};
  }
  function r25to20(v,material){
    const alpha=material==='AL'?0.00403:0.00393;
    return v/(1+alpha*5);
  }
  function dcResistance(cfg,row){
    const std=standard(cfg,'DC'), coat=coating(cfg), cls=conductorClass(cfg,std);
    const material=/ALUMIN|알루/i.test(String(cfg.cond_material||''))?'AL':'CU';
    let base=null,tempC=20,source='';
    if(std==='IEC_60228'){
      base=iecLookup(Number(row.nominalArea),material,coat,cls); source='IEC 60228';
    }else if(std==='NEMA_WC70' && material==='CU'){
      const size=cleanSize(row.sizeText);
      const table=cls==='CLASS_K' ? WC70_K : (cls==='SOLID' ? WC70_SOLID : (cls==='CLASS_C' ? WC70_C : WC70_B));
      const rec=table[size];
      if(rec){
        base=rec[coat==='TINNED'?1:0]*3.280839895;
        tempC=25;
        source=cls==='CLASS_K' ? 'NEMA WC 70 Table 2-6'
          : ((size==='22 AWG'||size==='20 AWG') ? 'NEMA WC 70 Table 2-2' : 'NEMA WC 70 Table 2-4');
      }
    }else if(std==='NEMA_WC57' && material==='CU'){
      const rec=WC57[cleanSize(row.sizeText)];
      const key=cls==='SOLID'?('SOLID_'+coat):(coat==='PLAIN'?'STRANDED_PLAIN':(cls==='CLASS_C'?'STRANDED_C_TINNED':'STRANDED_B_TINNED'));
      if(rec && rec[key]!=null){ base=rec[key]*3.280839895; tempC=25; source='NEMA WC 57'; }
    }else if(std==='IEEE_1580' && material==='CU'){
      const rec=(cls==='FLEXIBLE'?IEEE_FLEX_25:IEEE_B)[cleanSize(row.sizeText)];
      if(rec){ base=rec[coat==='TINNED'?1:0]; tempC=cls==='FLEXIBLE'?25:20; source=cls==='FLEXIBLE'?'IEEE 1580 Table 11':'IEEE 1580 Table 10'; }
    }
    if(base==null) {
      const reason=std==='ASTM'
        ? `ASTM 도체저항 DB 미등록 (${String(cfg.astm_conductor_spec||'규격 미선택')} / ${String(cfg.astm_conductor_class||'Class 미선택')})`
        : '표준 DB 미등록';
      return {value:null,tempC:20,source:'MANUAL',reason};
    }
    const af=assemblyFactor(cfg,row,std);
    return {value:base*af.factor,tempC,source,base,assemblyFactor:af.factor,assemblyCategory:af.category};
  }
  function highVoltage(v){
    const s=String(v||'').toUpperCase();
    const nums=s.match(/\d+(?:\.\d+)?/g)||[];
    if(s.includes('KV')) return Math.max(...nums.map(Number))>2;
    return Math.max(...nums.map(Number),0)>2000;
  }
  function irKey(cfg,std){
    const raw=String(cfg.standard_insu_material||cfg.insu_material||'').toUpperCase();
    const high=highVoltage(cfg.v_rating);
    if(std==='IEEE_1580'){
      if(raw.includes('TYPE_E')||raw==='EPR') return high?'EPR_HIGH':'EPR_LOW';
      if(raw.includes('TYPE_X')||raw==='XLPE') return high?'XLPE_HIGH':'XLPE_LOW';
      if(raw.includes('TYPE_LSE')||raw==='LSE') return 'LSE';
      if(raw.includes('TYPE_LSX')||raw==='LSX') return 'LSX';
      if(raw.includes('TYPE_LSS')||raw==='LSS') return 'LSS';
      if(raw.includes('TYPE_S')||raw.includes('SILIC')||raw.includes('실리콘')) return 'SILICONE';
      if(raw.includes('T/N')||raw.includes('NYLON')) return 'PVC_NYLON';
      if(raw.includes('TYPE_T')||raw==='PVC') return 'PVC';
      if(raw.includes('TYPE_P')||raw.includes('XLPO')) return 'XLPO';
    }
    if(std==='NEMA_WC70'){
      if(raw.includes('XLPE')) return 'XLPE';
      if(raw.includes('EPR')) return high?'EPR_HIGH':'EPR_LOW';
      if(raw.includes('PVC')&&raw.includes('NYLON')) return 'PVC_NYLON';
      if(raw.includes('PVC')) return 'PVC';
      if(raw==='PE') return 'PE';
      if(raw.includes('TPE')) return 'TPE';
      if(raw.includes('SILIC')||raw.includes('실리콘')) return 'SILICONE';
      if(raw.includes('CSPE')) return 'CSPE';
    }
    return null;
  }
  function insulationResistance(cfg,row){
    const std=standard(cfg,'IR');
    let rec=null,source='';
    const explicitK=Number(cfg.tech_ir_group);
    if(Number.isFinite(explicitK) && explicitK>0){
      rec={k:explicitK,tempC:std==='IEC_60228'?20:15.6}; source='TECH DATA K GROUP';
    }
    if(!rec && std==='IEEE_1580'){ rec=IEEE_IR[irKey(cfg,std)]; source='IEEE 1580'; }
    else if(!rec && std==='NEMA_WC70'){ rec=WC70_IR[irKey(cfg,std)]; source='NEMA WC 70'; }
    else if(!rec && std==='IEC_60228'){
      rec={k:3670,tempC:20}; source='PROJECT_IEC_FIXED';
    }
    const d=n(row.insulationInnerOD)||n(row.condOD);
    const D=n(row.insulatedCoreOD)||(d!=null?d+2*(n(row.insuThick)||0):null);
    if(!rec || !d || !D || D<=d) return {value:null,tempC:rec?rec.tempC:null,source:'MANUAL',reason:'K 또는 절연 내·외경 DB 미등록'};
    return {value:rec.k*Math.log10(D/d),tempC:rec.tempC,k:rec.k,source,d,D,M:1};
  }
  function irReferenceTemp(cfg){
    const dummy={condOD:1,insuThick:1};
    const r=insulationResistance(cfg,dummy);
    return r.tempC;
  }

  global.LSTechDataStandards={
    standard, coating, conductorClass, assemblyCategory, assemblyFactor,
    dcResistance, insulationResistance, irReferenceTemp
  };
})(window);
