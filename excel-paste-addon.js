/*
 * excel-paste-addon.js
 * 추가 기능 전용 모듈
 * - 기존 계산/도면 로직 수정 없이 양식보기/붙여넣기 방식만 추가
 * - 파일 업로드 방식은 제공하지 않음
 */
(function() {
  'use strict';

  if (window.__lsExcelPasteAddonLoaded) return;
  window.__lsExcelPasteAddonLoaded = true;

  const DATA = {
  "templatePath": "templates/cable_upload_form.xlsx",
  "noToFieldId": {
    "1": "cabling_sheath_method",
    "2": "thickness_rule_mode",
    "3": "standard_insu_material",
    "4": "nema_level_main",
    "5": "standard_iec60092_bedding_inner_mode",
    "6": "standard_inner_division",
    "7": "standard_bedding_form",
    "8": "standard_armour_type",
    "9": "standard_en_sheath",
    "10": "v_rating",
    "11": "cable_name",
    "12": "core_type",
    "13": "core_num",
    "14": "cond_material",
    "15": "cond_coating",
    "16": "conductorStandard",
    "17": "cond_class",
    "18": "cond_size",
    "19": "has_ground",
    "20": "ground_insert_type_display",
    "21": "ground_insu_color",
    "22": "num_ground",
    "23": "thick_ground_insu",
    "24": "cabling_od_mode",
    "25": "manual_cabling_od",
    "26": "tape_mica",
    "27": "tape_sep",
    "28": "tape_semi",
    "29": "inner_semi",
    "30": "thick_inner_semi",
    "31": "insu_material",
    "32": "thick_insu",
    "33": "sync_all_colors",
    "34": "outer_semi",
    "35": "thick_outer_semi",
    "36": "tape_insu_above",
    "37": "ind_separator",
    "38": "ind_shield_material",
    "39": "ind_shield_type",
    "40": "thick_lead_shield",
    "41": "ind_dw_size_ref",
    "42": "ind_screen_tape",
    "43": "array_mode",
    "44": "calc_k_factor",
    "45": "filler_material",
    "46": "layer_center",
    "47": "layer_1st",
    "48": "layer_2nd",
    "49": "layer_3rd",
    "50": "layer_4th",
    "51": "layer_5th",
    "52": "binder_tape",
    "53": "ov_shield_material",
    "54": "ov_shield_type",
    "55": "ov_dw_size_ref",
    "56": "bedding_type",
    "57": "bedding_division",
    "58": "bedding_material",
    "59": "thick_bedding",
    "60": "armour_material_new",
    "61": "armour_type_new",
    "62": "thick_armour",
    "63": "sheath_material",
    "64": "thick_sheath",
    "65": "cableTagDisplay",
    "66": "show_labels",
    "67": "show_3d_view",
    "68": "lme_usd_t",
    "69": "scr_usd_t",
    "70": "exchange_rate",
    "71": "markup_rate",
    "72": "calculated_copper_price",
    "73": "insu_base_price",
    "74": "bedding_base_price"
  },
  "labelToFieldId": {
    "시스 방식": "cabling_sheath_method",
    "사양서 선택": "thickness_rule_mode",
    "절연 재질": "insu_material",
    "절연레벨": "nema_level_main",
    "IEC 60092 베딩/이너 구분": "standard_iec60092_bedding_inner_mode",
    "이너커버링 / 이너시스": "standard_inner_division",
    "베딩 방식": "standard_bedding_form",
    "외장 종류": "standard_armour_type",
    "시스 유무": "standard_en_sheath",
    "정격 전압 (Voltage)": "v_rating",
    "품명 (Product Name)": "cable_name",
    "선심 구분 구조": "core_type",
    "수량 (1~101)": "core_num",
    "도체 재질": "cond_material",
    "도체 도금 종류": "cond_coating",
    "도체 표준": "conductorStandard",
    "도체 등급": "cond_class",
    "도체 크기": "cond_size",
    "접지선 적용 유무": "has_ground",
    "접지선 삽입 형태 (자동 제어)": "ground_insert_type_display",
    "접지선 절연 색상 지정": "ground_insu_color",
    "접지선 수량": "num_ground",
    "접지선 절연 두께 (mm)": "thick_ground_insu",
    "연합외경 결정 방식": "cabling_od_mode",
    "임의 지정 연합외경 (mm)": "manual_cabling_od",
    "마이카 테이프": "tape_mica",
    "세퍼레이터": "tape_sep",
    "반도전 테이프": "tape_semi",
    "내도 검은색압출": "inner_semi",
    "내도 두께 (mm)": "thick_inner_semi",
    "★ 절연 두께 (mm)": "thick_insu",
    "모든 선심 동일 색상 적용 (세트별)": "sync_all_colors",
    "외도 검은색압출": "outer_semi",
    "외도 두께 (mm)": "thick_outer_semi",
    "절연위 테이프 선택": "tape_insu_above",
    "세퍼레이터 (Separator)": "ind_separator",
    "차폐 재질 (Material)": "ind_shield_material",
    "차폐 형태 (Type)": "ind_shield_type",
    "★ 납 두께 (mm)": "thick_lead_shield",
    "★ D/W 참조 규격": "ov_dw_size_ref",
    "개별차폐위 테이프 선택": "ind_screen_tape",
    "배열 제어 모드": "array_mode",
    "현재 적용 외경 계수 (K)": "calc_k_factor",
    "개재 재질": "filler_material",
    "중심층": "layer_center",
    "1층(1st)": "layer_1st",
    "2층(2nd)": "layer_2nd",
    "3층(3rd)": "layer_3rd",
    "4층(4th)": "layer_4th",
    "5층(5th)": "layer_5th",
    "바인더 테이프": "binder_tape",
    "공통차폐 재질": "ov_shield_material",
    "공통차폐 형태": "ov_shield_type",
    "배딩 적용 형태": "bedding_type",
    "베딩 구분": "bedding_division",
    "베딩 재질 선택": "bedding_material",
    "★ 베딩 두께 (mm)": "thick_bedding",
    "외장 재질": "armour_material_new",
    "외장 형태": "armour_type_new",
    "★ 아머 두께 (mm)": "thick_armour",
    "시스 재질": "sheath_material",
    "★ 시스 두께 (mm)": "thick_sheath",
    "자동 케이블 Tag 표시": "cableTagDisplay",
    "번호 라벨 표시": "show_labels",
    "3D 보기 표시": "show_3d_view",
    "LME 가격(USD/Ton)": "lme_usd_t",
    "SCRAP 가격(USD/Ton)": "scr_usd_t",
    "환율(KRW/USD)": "exchange_rate",
    "마크업(%)": "markup_rate",
    "동가 자동계산값": "calculated_copper_price",
    "절연 기준단가": "insu_base_price",
    "베딩 기준단가": "bedding_base_price"
  },
  "valueMap": {
    "cabling_sheath_method": {
      "일반 압출 쉬스": "GENERAL_EXTRUDED",
      "GENERAL_EXTRUDED": "GENERAL_EXTRUDED",
      "CCV 쉬스": "CCV_SHEATH",
      "CCV_SHEATH": "CCV_SHEATH"
    },
    "thickness_rule_mode": {
      "수동 지정": "MANUAL",
      "MANUAL": "MANUAL",
      "IEC 60092": "IEC_60092",
      "IEC_60092": "IEC_60092",
      "IEC 60502": "IEC_60502",
      "IEC_60502": "IEC_60502",
      "IEEE 1580": "IEEE_1580",
      "IEEE_1580": "IEEE_1580",
      "AEIC 규격": "AEIC",
      "AEIC": "AEIC",
      "ICEA S-95-658 / NEMA WC 70": "ICEA_S95_NEMA_WC70",
      "ICEA_S95_NEMA_WC70": "ICEA_S95_NEMA_WC70",
      "ICEA S-96-659 / NEMA WC 71": "ICEA_S96_NEMA_WC71",
      "ICEA_S96_NEMA_WC71": "ICEA_S96_NEMA_WC71",
      "ICEA S-93-639 / NEMA WC 74": "ICEA_S93_NEMA_WC74",
      "ICEA_S93_NEMA_WC74": "ICEA_S93_NEMA_WC74",
      "ICEA S-73-532 / NEMA WC 57": "ICEA_S73_NEMA_WC57",
      "ICEA_S73_NEMA_WC57": "ICEA_S73_NEMA_WC57",
      "EN 50264-3-1": "EN_50264_3_1",
      "EN_50264_3_1": "EN_50264_3_1"
    },
    "standard_insu_material": {
      "XLPE": "XLPE",
      "PVC": "PVC",
      "EPR": "EPR",
      "HEPR": "HEPR",
      "PE": "PE",
      "HDPE": "HDPE",
      "MDPE": "MDPE",
      "LDPE": "LDPE",
      "CPE": "CPE",
      "CR": "CR",
      "실리콘": "실리콘",
      "CSP": "CSP",
      "XLEVA": "XLEVA",
      "TPU": "TPU",
      "LSX": "LSX",
      "TPO": "TPO",
      "PP": "PP",
      "나일론": "나일론",
      "SHF1": "SHF1",
      "SHF2": "SHF2",
      "HF90": "HF90",
      "XLPO": "XLPO"
    },
    "nema_level_main": {
      "100%": "100%",
      "133%": "133%"
    },
    "standard_iec60092_bedding_inner_mode": {
      "미적용": "미적용",
      "LAPPED 이너커버링": "LAPPED_INNER_COVERING",
      "LAPPED_INNER_COVERING": "LAPPED_INNER_COVERING",
      "압출형 이너커버링": "EXTRUDED_INNER_COVERING",
      "EXTRUDED_INNER_COVERING": "EXTRUDED_INNER_COVERING",
      "압출형 이너시스": "EXTRUDED_INNER_SHEATH",
      "EXTRUDED_INNER_SHEATH": "EXTRUDED_INNER_SHEATH"
    },
    "standard_inner_division": {
      "이너커버링": "Inner Covering",
      "Inner Covering": "Inner Covering",
      "이너시스": "Inner Sheath",
      "Inner Sheath": "Inner Sheath"
    },
    "standard_bedding_form": {
      "압출형": "압출형",
      "LAPPED / 테이프식": "테이프식",
      "테이프식": "테이프식"
    },
    "standard_armour_type": {
      "비외장": "미적용",
      "미적용": "미적용",
      "SWA/AWA": "SWA/AWA (횡권)",
      "SWA/AWA (횡권)": "SWA/AWA (횡권)",
      "STA": "STA (테이프)",
      "STA (테이프)": "STA (테이프)",
      "편조": "편조 (Braid)",
      "편조 (Braid)": "편조 (Braid)"
    },
    "standard_en_sheath": {
      "시스 미적용": "미적용",
      "미적용": "미적용",
      "시스 있음": "적용",
      "적용": "적용"
    },
    "v_rating": {
      "250V": "250V",
      "300V": "300V",
      "600V": "600V",
      "1000V": "1000V",
      "1500V": "1500V",
      "2000V (2kV)": "2000V",
      "2000V": "2000V",
      "450/750V": "450/750V",
      "0.6/1kV": "0.6/1kV",
      "1.8/3kV": "1.8/3kV",
      "3.6/6kV": "3.6/6kV",
      "5KV": "5KV",
      "6/10KV": "6/10KV",
      "8.0KV (8kV)": "8.0KV",
      "8.0KV": "8.0KV",
      "8.7/15KV": "8.7/15KV",
      "15KV": "15KV",
      "12/20KV": "12/20KV",
      "18/30KV": "18/30KV",
      "25KV (25kV)": "25KV",
      "25KV": "25KV",
      "28KV": "28KV",
      "35KV": "35KV",
      "46KV": "46KV",
      "66KV": "66KV"
    },
    "cable_name": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "core_type": {
      "CORE (단독)": "CORE",
      "CORE": "CORE",
      "PAIR (2가닥 SET)": "PAIR",
      "PAIR": "PAIR",
      "TRIAD (3가닥 SET)": "TRIAD",
      "TRIAD": "TRIAD",
      "QUAD (4가닥 SET)": "QUAD",
      "QUAD": "QUAD"
    },
    "core_num": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "cond_material": {
      "동 (구리)": "copper",
      "copper": "copper",
      "알루미늄": "aluminum",
      "aluminum": "aluminum"
    },
    "cond_coating": {
      "A (연동선)": "A",
      "A": "A",
      "TA (주석도금선)": "TA",
      "TA": "TA"
    },
    "conductorStandard": {
      "IEC 60228 (Metric)": "IEC",
      "IEC": "IEC",
      "ASTM (AWG / kcmil)": "ASTM",
      "ASTM": "ASTM"
    },
    "cond_class": {
      "SOLID (단선)": "SOLID",
      "SOLID": "SOLID",
      "연선": "연선",
      "집합": "집합",
      "집/복합": "집/복합"
    },
    "cond_size": {
      "0.5 SQMM": "0.5 SQMM",
      "0.75 SQMM": "0.75 SQMM",
      "1 SQMM": "1 SQMM",
      "1.5 SQMM": "1.5 SQMM",
      "2.5 SQMM": "2.5 SQMM",
      "4 SQMM": "4 SQMM",
      "6 SQMM": "6 SQMM",
      "10 SQMM": "10 SQMM",
      "16 SQMM": "16 SQMM",
      "25 SQMM": "25 SQMM",
      "35 SQMM": "35 SQMM",
      "50 SQMM": "50 SQMM",
      "70 SQMM": "70 SQMM",
      "95 SQMM": "95 SQMM",
      "120 SQMM": "120 SQMM",
      "150 SQMM": "150 SQMM",
      "185 SQMM": "185 SQMM",
      "240 SQMM": "240 SQMM",
      "300 SQMM": "300 SQMM",
      "400 SQMM": "400 SQMM",
      "500 SQMM": "500 SQMM",
      "630 SQMM": "630 SQMM",
      "800 SQMM": "800 SQMM",
      "1000 SQMM": "1000 SQMM",
      "22 AWG": "22 AWG",
      "20 AWG": "20 AWG",
      "18 AWG": "18 AWG",
      "16 AWG": "16 AWG",
      "14 AWG": "14 AWG",
      "12 AWG": "12 AWG",
      "10 AWG": "10 AWG",
      "8 AWG": "8 AWG",
      "6 AWG": "6 AWG",
      "4 AWG": "4 AWG",
      "2 AWG": "2 AWG",
      "1 AWG": "1 AWG",
      "1/0 AWG": "1/0 AWG",
      "2/0 AWG": "2/0 AWG",
      "3/0 AWG": "3/0 AWG",
      "4/0 AWG": "4/0 AWG",
      "250 kcmil": "250 kcmil",
      "300 kcmil": "300 kcmil",
      "350 kcmil": "350 kcmil",
      "400 kcmil": "400 kcmil",
      "500 kcmil": "500 kcmil"
    },
    "has_ground": {
      "미적용": "미적용",
      "적용": "적용"
    },
    "ground_insert_type_display": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "ground_insu_color": {
      "녹색 (Green)": "GN",
      "GN": "GN",
      "흑색 (Black)": "BK",
      "BK": "BK",
      "미적용": "none",
      "none": "none"
    },
    "num_ground": {
      "1가닥": "1",
      "1": "1",
      "2가닥": "2",
      "2": "2",
      "3가닥": "3",
      "3": "3"
    },
    "thick_ground_insu": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "cabling_od_mode": {
      "자동 계산 (설계표준 기하엔진)": "AUTO",
      "AUTO": "AUTO",
      "사용자 임의 지정 (User-Defined OD)": "MANUAL",
      "MANUAL": "MANUAL"
    },
    "manual_cabling_od": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "tape_mica": {
      "미적용": "미적용",
      "적용 (MICA 녹회색)": "적용",
      "적용": "적용"
    },
    "tape_sep": {
      "미적용": "미적용",
      "PET": "PET",
      "부직포": "부직포",
      "우레탄글라스": "우레탄글라스",
      "고무입면": "고무입면",
      "마이카": "마이카",
      "폴리이미드": "폴리이미드",
      "나일론": "나일론",
      "반도전": "반도전"
    },
    "tape_semi": {
      "미적용": "미적용",
      "TETRON": "TETRON",
      "부직포": "부직포"
    },
    "inner_semi": {
      "미적용": "미적용",
      "적용": "적용"
    },
    "thick_inner_semi": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "insu_material": {
      "XLPE": "XLPE",
      "PVC": "PVC",
      "EPR": "EPR",
      "HEPR": "HEPR",
      "PE": "PE",
      "HDPE": "HDPE",
      "MDPE": "MDPE",
      "LDPE": "LDPE",
      "CPE": "CPE",
      "CR": "CR",
      "실리콘": "실리콘",
      "CSP": "CSP",
      "XLEVA": "XLEVA",
      "TPU": "TPU",
      "LSX": "LSX",
      "TPO": "TPO",
      "PP": "PP",
      "나일론": "나일론",
      "SHF1": "SHF1",
      "SHF2": "SHF2",
      "HF90": "HF90",
      "XLPO": "XLPO"
    },
    "thick_insu": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "sync_all_colors": {
      "TRUE": "TRUE",
      "FALSE": "FALSE"
    },
    "outer_semi": {
      "미적용": "미적용",
      "적용": "적용"
    },
    "thick_outer_semi": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "tape_insu_above": {
      "미적용": "미적용",
      "PET": "PET",
      "부직포": "부직포",
      "우레탄글라스": "우레탄글라스",
      "고무입면": "고무입면",
      "마이카": "마이카",
      "폴리이미드": "폴리이미드",
      "나일론": "나일론",
      "반도전": "반도전"
    },
    "ind_separator": {
      "미적용": "미적용",
      "PET": "PET",
      "부직포": "부직포",
      "우레탄글라스": "우레탄글라스",
      "고무입면": "고무입면",
      "마이카": "마이카",
      "폴리이미드": "폴리이미드",
      "나일론": "나일론",
      "반도전": "반도전"
    },
    "ind_shield_material": {
      "AL/Mylar": "AL/Mylar",
      "CU/Mylar": "CU/Mylar",
      "구리 (동)": "구리 (동)",
      "면사": "면사",
      "납 (Lead)": "납",
      "납": "납"
    },
    "ind_shield_type": {
      "미적용": "미적용",
      "Tape (테이프)": "Tape (테이프)",
      "Tape + D/W": "Tape + D/W (드레인와이어 포함)",
      "Tape + D/W (드레인와이어 포함)": "Tape + D/W (드레인와이어 포함)",
      "Braid (편조)": "Braid (편조)",
      "Serve (횡권)": "Serve (횡권)"
    },
    "thick_lead_shield": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "ind_dw_size_ref": {
      "0.5 SQMM": "0.5 SQMM",
      "0.75 SQMM": "0.75 SQMM",
      "1 SQMM": "1 SQMM",
      "1.5 SQMM": "1.5 SQMM",
      "2.5 SQMM": "2.5 SQMM",
      "4 SQMM": "4 SQMM",
      "6 SQMM": "6 SQMM",
      "22 AWG": "22 AWG",
      "20 AWG": "20 AWG",
      "18 AWG": "18 AWG",
      "16 AWG": "16 AWG",
      "14 AWG": "14 AWG",
      "12 AWG": "12 AWG",
      "10 AWG": "10 AWG"
    },
    "ind_screen_tape": {
      "미적용": "미적용",
      "PET": "PET",
      "부직포": "부직포",
      "우레탄글라스": "우레탄글라스",
      "고무입면": "고무입면",
      "마이카": "마이카",
      "폴리이미드": "폴리이미드",
      "나일론": "나일론",
      "반도전": "반도전"
    },
    "array_mode": {
      "표준 배열표 자동 매핑": "AUTO",
      "AUTO": "AUTO",
      "사용자 정의 수동 입력": "MANUAL",
      "MANUAL": "MANUAL"
    },
    "calc_k_factor": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "filler_material": {
      "PP": "PP",
      "EPDM스티링": "EPDM",
      "EPDM": "EPDM",
      "PVC 개재": "PVC",
      "PVC": "PVC",
      "실리콘": "실리콘",
      "나일론": "나일론"
    },
    "layer_center": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "layer_1st": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "layer_2nd": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "layer_3rd": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "layer_4th": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "layer_5th": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "binder_tape": {
      "미적용": "미적용",
      "PET": "PET",
      "부직포": "부직포",
      "부직포 0.13": "부직포 0.13",
      "우레탄글라스": "우레탄글라스",
      "고무입면": "고무입면",
      "마이카": "마이카",
      "폴리이미드": "폴리이미드",
      "나일론": "나일론",
      "반도전": "반도전"
    },
    "ov_shield_material": {
      "AL/Mylar": "AL/Mylar",
      "CU/Mylar": "CU/Mylar",
      "구리 (동)": "구리 (동)",
      "면사": "면사",
      "납 (Lead)": "납",
      "납": "납"
    },
    "ov_shield_type": {
      "미적용": "미적용",
      "Tape (테이프)": "Tape (테이프)",
      "Tape + D/W": "Tape + D/W (드레인와이어 포함)",
      "Tape + D/W (드레인와이어 포함)": "Tape + D/W (드레인와이어 포함)",
      "Braid (편조)": "Braid (편조)",
      "Serve (횡권)": "Serve (횡권)"
    },
    "ov_dw_size_ref": {
      "0.5 SQMM": "0.5 SQMM",
      "0.75 SQMM": "0.75 SQMM",
      "1 SQMM": "1 SQMM",
      "1.5 SQMM": "1.5 SQMM",
      "2.5 SQMM": "2.5 SQMM",
      "4 SQMM": "4 SQMM",
      "6 SQMM": "6 SQMM",
      "22 AWG": "22 AWG",
      "20 AWG": "20 AWG",
      "18 AWG": "18 AWG",
      "16 AWG": "16 AWG",
      "14 AWG": "14 AWG",
      "12 AWG": "12 AWG",
      "10 AWG": "10 AWG"
    },
    "bedding_type": {
      "미적용": "미적용",
      "압출형": "압출형",
      "LAPPED": "LAPPED"
    },
    "bedding_division": {
      "이너커버링 (Inner Covering)": "Inner Covering",
      "Inner Covering": "Inner Covering",
      "이너시스 (Inner Sheath)": "Inner Sheath",
      "Inner Sheath": "Inner Sheath"
    },
    "bedding_material": {
      "XLPE": "XLPE",
      "PVC": "PVC",
      "EPR": "EPR",
      "HEPR": "HEPR",
      "PE": "PE",
      "HDPE": "HDPE",
      "MDPE": "MDPE",
      "LDPE": "LDPE",
      "CPE": "CPE",
      "CR": "CR",
      "실리콘": "실리콘",
      "CSP": "CSP",
      "XLEVA": "XLEVA",
      "TPU": "TPU",
      "LSX": "LSX",
      "TPO": "TPO",
      "PP": "PP",
      "나일론": "나일론",
      "SHF1": "SHF1",
      "SHF2": "SHF2",
      "HF90": "HF90",
      "XLPO": "XLPO"
    },
    "thick_bedding": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "armour_material_new": {
      "아연도철선 (GI)": "아연도철선",
      "아연도철선": "아연도철선",
      "알루미늄": "알루미늄",
      "구리": "구리",
      "철 (STA)": "철 (STA)",
      "아라미드 얀": "아라미드 얀",
      "폴리에스터 얀": "폴리에스터 얀"
    },
    "armour_type_new": {
      "미적용": "미적용",
      "SWA/AWA (횡권)": "SWA/AWA (횡권)",
      "STA (테이프)": "STA (테이프)",
      "편조 (Braid)": "편조 (Braid)"
    },
    "thick_armour": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "sheath_material": {
      "미적용": "미적용",
      "XLPE": "XLPE",
      "PVC": "PVC",
      "EPR": "EPR",
      "HEPR": "HEPR",
      "PE": "PE",
      "HDPE": "HDPE",
      "MDPE": "MDPE",
      "LDPE": "LDPE",
      "CPE": "CPE",
      "CR": "CR",
      "실리콘": "실리콘",
      "CSP": "CSP",
      "XLEVA": "XLEVA",
      "TPU": "TPU",
      "LSX": "LSX",
      "TPO": "TPO",
      "PP": "PP",
      "나일론": "나일론",
      "SHF1": "SHF1",
      "SHF2": "SHF2",
      "HF90": "HF90",
      "XLPO": "XLPO"
    },
    "thick_sheath": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "cableTagDisplay": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "show_labels": {
      "TRUE": "TRUE",
      "FALSE": "FALSE"
    },
    "show_3d_view": {
      "TRUE": "TRUE",
      "FALSE": "FALSE"
    },
    "lme_usd_t": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "scr_usd_t": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "exchange_rate": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "markup_rate": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "calculated_copper_price": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "insu_base_price": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    },
    "bedding_base_price": {
      "(직접입력)": "(입력값 그대로)",
      "(입력값 그대로)": "(입력값 그대로)"
    }
  }
};

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function norm(v) {
    return String(v == null ? '' : v)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normKey(v) {
    return norm(v).toLowerCase().replace(/[\s_\-()\/\.]/g, '');
  }

  function createButton(id, text, title) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = id;
    btn.textContent = text;
    btn.title = title || text;
    btn.style.cssText = [
      'background:#111827',
      'color:#ffffff',
      'border:none',
      'padding:2px 8px',
      'font-size:11px',
      'font-weight:800',
      'border-radius:4px',
      'cursor:pointer',
      'transition:background 0.2s',
      'white-space:nowrap'
    ].join(';');
    btn.addEventListener('mouseenter', () => btn.style.background = '#000000');
    btn.addEventListener('mouseleave', () => btn.style.background = '#111827');
    return btn;
  }

  function insertButtons() {
    const reset = document.getElementById('reset_btn');
    if (!reset || document.getElementById('btn_excel_template_view')) return;

    const viewBtn = createButton('btn_excel_template_view', '양식보기', '엑셀 입력 양식을 다운로드합니다.');
    const pasteBtn = createButton('btn_excel_paste_submit', '붙여넣기', '엑셀에서 복사한 표를 붙여넣어 좌측 선택값에 반영합니다.');

    viewBtn.addEventListener('click', downloadTemplate);
    pasteBtn.addEventListener('click', openPasteDialog);

    reset.parentNode.insertBefore(viewBtn, reset);
    reset.parentNode.insertBefore(pasteBtn, reset);

    try { if (typeof window.ensureTinyButtonEmojis === 'function') window.ensureTinyButtonEmojis(reset.parentNode); } catch(e) {}
  }

  function downloadTemplate() {
    const a = document.createElement('a');
    a.href = DATA.templatePath;
    a.download = 'cable_upload_form.xlsx';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 0);
  }

  function openPasteDialog() {
    if (document.getElementById('excelPasteOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'excelPasteOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;';

    const panel = document.createElement('div');
    panel.style.cssText = 'width:min(920px,96vw);max-height:88vh;background:#fff;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;border:1px solid #cbd5e1;';

    panel.innerHTML = `
      <div style="background:#111827;color:#fff;padding:12px 16px;font-weight:900;display:flex;align-items:center;justify-content:space-between;">
        <span>엑셀 붙여넣기 제출</span>
        <button type="button" id="excelPasteClose" style="background:#374151;color:#fff;border:none;border-radius:4px;padding:4px 9px;cursor:pointer;font-weight:800;">닫기</button>
      </div>
      <div style="padding:14px 16px;font-size:13px;color:#334155;line-height:1.55;">
        <div style="font-weight:800;margin-bottom:6px;">사용 방법</div>
        <ol style="margin-left:18px;">
          <li>엑셀 <b>입력</b> 시트에서 보이는 표를 복사합니다. 예: <b>No. / 항목 / 입력 방식/설명 / 입력값 / 입력상태</b></li>
          <li>아래 칸에 붙여넣고 <b>반영</b>을 누릅니다.</li>
          <li><b>입력상태가 “입력”인 행만</b> 반영되고, 잠금/제외는 건너뜁니다.</li>
        </ol>
      </div>
      <textarea id="excelPasteText" placeholder="여기에 엑셀 내용을 Ctrl+V로 붙여넣으세요." style="margin:0 16px 12px 16px;min-height:280px;resize:vertical;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font-family:Consolas,monospace;font-size:12px;white-space:pre;"></textarea>
      <div id="excelPasteResult" style="display:none;margin:0 16px 12px 16px;padding:10px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155;font-size:12px;max-height:120px;overflow:auto;"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <button type="button" id="excelPasteCancel" style="background:#64748b;color:#fff;border:none;border-radius:5px;padding:7px 14px;cursor:pointer;font-weight:800;">취소</button>
        <button type="button" id="excelPasteApply" style="background:#2563eb;color:#fff;border:none;border-radius:5px;padding:7px 14px;cursor:pointer;font-weight:900;">반영</button>
      </div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    document.getElementById('excelPasteClose').addEventListener('click', close);
    document.getElementById('excelPasteCancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const textarea = document.getElementById('excelPasteText');
    textarea.focus();

    document.getElementById('excelPasteApply').addEventListener('click', () => {
      const result = applyPastedText(textarea.value);
      showResult(result);
      if (result.applied > 0) {
        setTimeout(close, 900);
      }
    });
  }

  function splitLine(line) {
    if (line.indexOf('\t') >= 0) return line.split('\t').map(norm);
    // 채팅/문서에서 탭이 사라진 경우를 위한 보조 처리
    return line.split(/\s{2,}/).map(norm);
  }

  function indexOfHeader(headers, candidates) {
    const normalized = headers.map(h => norm(h).replace(/\s+/g, ''));
    for (const cand of candidates) {
      const c = cand.replace(/\s+/g, '');
      const idx = normalized.findIndex(h => h === c || h.includes(c));
      if (idx >= 0) return idx;
    }
    return -1;
  }

  function parseRows(text) {
    const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      .split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.length) return [];

    const rawRows = lines.map(splitLine).filter(r => r.length >= 4);
    if (!rawRows.length) return [];

    let headerIdx = rawRows.findIndex(r => r.some(c => norm(c) === 'No.' || norm(c) === 'No') && r.some(c => norm(c).includes('입력값')));
    let headers = headerIdx >= 0 ? rawRows[headerIdx] : [];
    let dataRows = headerIdx >= 0 ? rawRows.slice(headerIdx + 1) : rawRows;

    let colNo, colItem, colField, colValue, colStatus;

    if (headers.length) {
      colNo = indexOfHeader(headers, ['No.', 'No']);
      colItem = indexOfHeader(headers, ['항목']);
      colField = indexOfHeader(headers, ['fieldId', '필드ID']);
      colValue = indexOfHeader(headers, ['입력값']);
      colStatus = indexOfHeader(headers, ['입력상태']);
    }

    if (colValue == null || colValue < 0 || colStatus == null || colStatus < 0 || colNo == null || colNo < 0) {
      const sampleLen = dataRows[0] ? dataRows[0].length : 0;
      if (sampleLen >= 8) {
        colNo = 0; colItem = 2; colField = 3; colValue = 5; colStatus = 6;
      } else {
        colNo = 0; colItem = 1; colField = -1; colValue = 3; colStatus = 4;
      }
    }

    return dataRows.map(r => {
      const no = norm(r[colNo]);
      const item = colItem >= 0 ? norm(r[colItem]) : '';
      const fieldId = colField >= 0 ? norm(r[colField]) : '';
      const value = norm(r[colValue]);
      const status = norm(r[colStatus]);
      return { no, item, fieldId, value, status };
    }).filter(r => r.no || r.fieldId || r.item);
  }

  function resolveFieldId(row) {
    if (row.fieldId && document.getElementById(row.fieldId)) return row.fieldId;
    const noKey = norm(row.no).replace(/[^0-9]/g, '');
    if (noKey && DATA.noToFieldId[noKey]) return DATA.noToFieldId[noKey];
    if (row.item && DATA.labelToFieldId[row.item]) return DATA.labelToFieldId[row.item];

    const target = normKey(row.item);
    if (target) {
      for (const [label, fid] of Object.entries(DATA.labelToFieldId)) {
        if (normKey(label) === target) return fid;
      }
    }
    return '';
  }

  function findOptionByValueOrText(select, value) {
    const raw = norm(value);
    const key = normKey(raw);
    const options = Array.from(select.options || []);
    const numeric = raw.match(/^[^0-9]*([0-9]+(?:\.[0-9]+)?)/);
    const num = numeric ? numeric[1].replace(/\.0$/, '') : '';
    return options.find(o => norm(o.value) === raw)
        || options.find(o => norm(o.textContent) === raw)
        || options.find(o => normKey(o.value) === key)
        || options.find(o => normKey(o.textContent) === key)
        || (num ? options.find(o => norm(o.value).replace(/\.0$/, '') === num) : null)
        || (num ? options.find(o => norm(o.textContent).startsWith(num + ' ') || norm(o.textContent) === num) : null);
  }

  function setElementValue(el, value, fieldId) {
    const raw = norm(value);
    const mapped = DATA.valueMap[fieldId] && DATA.valueMap[fieldId][raw] ? DATA.valueMap[fieldId][raw] : raw;

    if (el.tagName === 'SELECT') {
      let opt = findOptionByValueOrText(el, mapped) || findOptionByValueOrText(el, raw);
      if (!opt) return { ok:false, reason:`선택 목록에 없는 값: ${raw}` };
      el.value = opt.value;
    } else if (el.type === 'checkbox') {
      el.checked = /^(true|1|y|yes|on|적용|예|체크)$/i.test(raw);
    } else {
      el.value = mapped;
    }

    el.dispatchEvent(new Event('input', { bubbles:true }));
    el.dispatchEvent(new Event('change', { bubbles:true }));
    return { ok:true };
  }

  function applyPastedText(text) {
    const rows = parseRows(text);
    const result = { total: rows.length, applied: 0, skipped: 0, errors: [] };

    rows.forEach(row => {
      const status = norm(row.status);
      if (status !== '입력') {
        result.skipped++;
        return;
      }

      const fieldId = resolveFieldId(row);
      if (!fieldId) {
        result.errors.push(`${row.no || '-'} ${row.item || ''}: fieldId 매칭 실패`);
        return;
      }

      const el = document.getElementById(fieldId);
      if (!el) {
        result.errors.push(`${row.no || '-'} ${row.item || fieldId}: 화면 요소 없음(${fieldId})`);
        return;
      }

      const r = setElementValue(el, row.value, fieldId);
      if (r.ok) result.applied++;
      else result.errors.push(`${row.no || '-'} ${row.item || fieldId}: ${r.reason}`);
    });

    try { if (typeof window.calculateAndDraw === 'function') window.calculateAndDraw(); } catch(e) {}
    try { if (typeof window.updateCablePreview === 'function') window.updateCablePreview(); } catch(e) {}

    return result;
  }

  function showResult(result) {
    const box = document.getElementById('excelPasteResult');
    if (!box) return;
    box.style.display = 'block';
    const lines = [
      `처리 행: ${result.total}개`,
      `반영: ${result.applied}개`,
      `건너뜀: ${result.skipped}개`,
      `오류: ${result.errors.length}개`
    ];
    if (result.errors.length) {
      lines.push('', '[오류 목록]', ...result.errors.slice(0, 20));
      if (result.errors.length > 20) lines.push(`외 ${result.errors.length - 20}개`);
    }
    box.textContent = lines.join('\n');
  }

  ready(insertButtons);
})();
