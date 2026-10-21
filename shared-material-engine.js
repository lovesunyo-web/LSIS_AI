
// shared-material-engine.js
// One calculation path for main material table and spec table.
// The spec table must not calculate thickness/OD/cost independently.
(function(global){

  // --------------------------------------------------------------------
  // LS 연합외경 표준 데이터/판정 단일 원천
  // - 계산용 K값은 이 블록만 사용한다.
  // - cable-calc.js / cable-ui.js / app2.js의 중복 계수표는 제거한다.
  // --------------------------------------------------------------------
  const LS_CORE_LAYOUT = Object.freeze({
    1: { k: 1.00, center: "1", l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 },
    2: { k: 2.00, center: "2", l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 },
    3: { k: 2.15, center: "3", l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 },
    4: { k: 2.41, center: "4", l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 },
    5: { k: 2.70, center: "5", l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 },
    6: { k: 3.00, center: "F", l1: 6, l2: 0, l3: 0, l4: 0, l5: 0 },
    7: { k: 3.00, center: "1", l1: 6, l2: 0, l3: 0, l4: 0, l5: 0 },
    8: { k: 3.31, center: "1+F", l1: 7, l2: 0, l3: 0, l4: 0, l5: 0 },
    9: { k: 3.62, center: "1+F", l1: 8, l2: 0, l3: 0, l4: 0, l5: 0 },
    10: { k: 4.00, center: "2", l1: 8, l2: 0, l3: 0, l4: 0, l5: 0 },
    11: { k: 4.00, center: "2", l1: 9, l2: 0, l3: 0, l4: 0, l5: 0 },
    12: { k: 4.15, center: "3", l1: 9, l2: 0, l3: 0, l4: 0, l5: 0 },
    13: { k: 4.41, center: "4", l1: 9, l2: 0, l3: 0, l4: 0, l5: 0 },
    14: { k: 4.41, center: "4", l1: 10, l2: 0, l3: 0, l4: 0, l5: 0 },
    15: { k: 4.70, center: "5", l1: 10, l2: 0, l3: 0, l4: 0, l5: 0 },
    16: { k: 4.70, center: "5", l1: 11, l2: 0, l3: 0, l4: 0, l5: 0 },
    17: { k: 5.00, center: "1", l1: 5, l2: 11, l3: 0, l4: 0, l5: 0 },
    18: { k: 3.31, center: "1", l1: 6, l2: 11, l3: 0, l4: 0, l5: 0 },
    19: { k: 3.62, center: "1", l1: 6, l2: 12, l3: 0, l4: 0, l5: 0 },
    20: { k: 5.31, center: "1+F", l1: 7, l2: 12, l3: 0, l4: 0, l5: 0 },
    21: { k: 5.31, center: "1+F", l1: 7, l2: 13, l3: 0, l4: 0, l5: 0 },
    22: { k: 5.62, center: "1+F", l1: 8, l2: 13, l3: 0, l4: 0, l5: 0 },
    23: { k: 5.62, center: "1+F", l1: 8, l2: 14, l3: 0, l4: 0, l5: 0 },
    24: { k: 6.00, center: "2+F", l1: 8, l2: 14, l3: 0, l4: 0, l5: 0 },
    25: { k: 6.00, center: "2", l1: 8, l2: 15, l3: 0, l4: 0, l5: 0 },
    26: { k: 6.00, center: "2", l1: 9, l2: 15, l3: 0, l4: 0, l5: 0 },
    27: { k: 6.15, center: "3", l1: 9, l2: 15, l3: 0, l4: 0, l5: 0 },
    28: { k: 3.31, center: "4", l1: 9, l2: 15, l3: 0, l4: 0, l5: 0 },
    29: { k: 3.62, center: "4", l1: 10, l2: 15, l3: 0, l4: 0, l5: 0 },
    30: { k: 6.42, center: "4", l1: 10, l2: 16, l3: 0, l4: 0, l5: 0 },
    31: { k: 6.70, center: "5", l1: 10, l2: 16, l3: 0, l4: 0, l5: 0 },
    32: { k: 6.70, center: "5", l1: 11, l2: 17, l3: 0, l4: 0, l5: 0 },
    33: { k: 6.70, center: "5", l1: 11, l2: 11, l3: 0, l4: 0, l5: 0 },
    34: { k: 7.00, center: "1", l1: 5, l2: 11, l3: 17, l4: 0, l5: 0 },
    35: { k: 7.00, center: "1", l1: 6, l2: 12, l3: 17, l4: 0, l5: 0 },
    36: { k: 7.00, center: "1", l1: 6, l2: 12, l3: 18, l4: 0, l5: 0 },
    37: { k: 7.00, center: "1", l1: 6, l2: 13, l3: 18, l4: 0, l5: 0 },
    38: { k: 3.31, center: "1+F", l1: 6, l2: 13, l3: 18, l4: 0, l5: 0 },
    39: { k: 3.62, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 0, l5: 0 },
    40: { k: 7.31, center: "1+F", l1: 7, l2: 14, l3: 19, l4: 0, l5: 0 },
    41: { k: 7.62, center: "1+F", l1: 7, l2: 14, l3: 19, l4: 0, l5: 0 },
    42: { k: 7.62, center: "1+F", l1: 8, l2: 14, l3: 20, l4: 0, l5: 0 },
    43: { k: 7.62, center: "1+F", l1: 8, l2: 14, l3: 20, l4: 0, l5: 0 },
    44: { k: 8.00, center: "2", l1: 8, l2: 15, l3: 20, l4: 0, l5: 0 },
    45: { k: 8.00, center: "2", l1: 8, l2: 15, l3: 21, l4: 0, l5: 0 },
    46: { k: 8.00, center: "2", l1: 8, l2: 15, l3: 21, l4: 0, l5: 0 },
    47: { k: 8.00, center: "2", l1: 9, l2: 15, l3: 21, l4: 0, l5: 0 },
    48: { k: 3.31, center: "3", l1: 9, l2: 15, l3: 21, l4: 0, l5: 0 },
    49: { k: 3.62, center: "4", l1: 9, l2: 15, l3: 21, l4: 0, l5: 0 },
    50: { k: 8.41, center: "4", l1: 10, l2: 15, l3: 21, l4: 0, l5: 0 },
    51: { k: 8.41, center: "4", l1: 10, l2: 16, l3: 21, l4: 0, l5: 0 },
    52: { k: 8.41, center: "4", l1: 10, l2: 16, l3: 22, l4: 0, l5: 0 },
    53: { k: 8.70, center: "5", l1: 10, l2: 16, l3: 22, l4: 0, l5: 0 },
    54: { k: 8.70, center: "5", l1: 11, l2: 16, l3: 22, l4: 0, l5: 0 },
    55: { k: 8.70, center: "5", l1: 11, l2: 17, l3: 22, l4: 0, l5: 0 },
    56: { k: 8.70, center: "5", l1: 11, l2: 17, l3: 23, l4: 0, l5: 0 },
    57: { k: 9.00, center: "1", l1: 5, l2: 11, l3: 17, l4: 23, l5: 0 },
    58: { k: 3.31, center: "1", l1: 6, l2: 11, l3: 17, l4: 23, l5: 0 },
    59: { k: 3.62, center: "1", l1: 6, l2: 12, l3: 17, l4: 23, l5: 0 },
    60: { k: 9.00, center: "1", l1: 6, l2: 12, l3: 18, l4: 23, l5: 0 },
    61: { k: 9.00, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 0 },
    62: { k: 9.31, center: "1+F", l1: 7, l2: 12, l3: 18, l4: 24, l5: 0 },
    63: { k: 9.31, center: "1+F", l1: 7, l2: 13, l3: 18, l4: 24, l5: 0 },
    64: { k: 9.31, center: "1+F", l1: 7, l2: 14, l3: 18, l4: 24, l5: 0 },
    65: { k: 9.31, center: "1+F", l1: 7, l2: 14, l3: 19, l4: 24, l5: 0 },
    66: { k: 9.62, center: "1+F", l1: 8, l2: 14, l3: 19, l4: 24, l5: 0 },
    67: { k: 9.62, center: "1+F", l1: 8, l2: 14, l3: 20, l4: 24, l5: 0 },
    68: { k: 9.62, center: "1+F", l1: 8, l2: 14, l3: 20, l4: 25, l5: 0 },
    69: { k: 9.62, center: "2", l1: 8, l2: 14, l3: 20, l4: 25, l5: 0 },
    70: { k: 10.00, center: "2", l1: 8, l2: 15, l3: 20, l4: 25, l5: 0 },
    71: { k: 10.00, center: "2", l1: 8, l2: 15, l3: 21, l4: 25, l5: 0 },
    72: { k: 10.00, center: "2", l1: 8, l2: 15, l3: 21, l4: 26, l5: 0 },
    73: { k: 10.00, center: "2", l1: 9, l2: 15, l3: 21, l4: 26, l5: 0 },
    74: { k: 10.15, center: "3", l1: 9, l2: 15, l3: 21, l4: 26, l5: 0 },
    75: { k: 10.15, center: "3", l1: 9, l2: 15, l3: 21, l4: 27, l5: 0 },
    76: { k: 10.42, center: "4", l1: 9, l2: 15, l3: 21, l4: 27, l5: 0 },
    77: { k: 10.42, center: "4", l1: 10, l2: 15, l3: 21, l4: 27, l5: 0 },
    78: { k: 10.42, center: "4", l1: 10, l2: 15, l3: 21, l4: 28, l5: 0 },
    79: { k: 10.42, center: "4", l1: 10, l2: 15, l3: 21, l4: 29, l5: 0 },
    80: { k: 10.42, center: "4", l1: 10, l2: 15, l3: 21, l4: 30, l5: 0 },
    81: { k: 10.70, center: "5", l1: 11, l2: 17, l3: 23, l4: 25, l5: 0 },
    82: { k: 10.70, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 21 },
    83: { k: 10.70, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 22 },
    84: { k: 10.70, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 23 },
    85: { k: 10.70, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 24 },
    86: { k: 11.00, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 25 },
    87: { k: 11.00, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 26 },
    88: { k: 11.00, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 23 },
    89: { k: 11.00, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 24 },
    90: { k: 11.00, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 25 },
    91: { k: 11.00, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 26 },
    92: { k: 11.31, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 27 },
    93: { k: 11.31, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 28 },
    94: { k: 11.31, center: "2", l1: 8, l2: 14, l3: 20, l4: 26, l5: 26 },
    95: { k: 11.31, center: "2", l1: 8, l2: 14, l3: 20, l4: 26, l5: 27 },
    96: { k: 11.31, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 23 },
    97: { k: 11.62, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 24 },
    98: { k: 11.62, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 25 },
    99: { k: 11.62, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 26 },
    100: { k: 11.62, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 27 },
    101: { k: 11.62, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 28 },
  });

  const LS_PAIR_GENERAL_LAYOUT = Object.freeze({
    1: { k: 2.00, center: "1", l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 },
    2: { k: 3.50, center: "2", l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 },
    3: { k: 3.76, center: "3", l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 },
    4: { k: 4.20, center: "4", l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 },
    5: { k: 4.80, center: "5", l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 },
    6: { k: 5.00, center: "F", l1: 6, l2: 0, l3: 0, l4: 0, l5: 0 },
    7: { k: 5.00, center: "1", l1: 6, l2: 0, l3: 0, l4: 0, l5: 0 },
    8: { k: 3.31, center: "1", l1: 7, l2: 0, l3: 0, l4: 0, l5: 0 },
    9: { k: 3.62, center: "1", l1: 8, l2: 0, l3: 0, l4: 0, l5: 0 },
    10: { k: 6.50, center: "2", l1: 8, l2: 0, l3: 0, l4: 0, l5: 0 },
    11: { k: 6.60, center: "2", l1: 9, l2: 0, l3: 0, l4: 0, l5: 0 },
    12: { k: 6.80, center: "3", l1: 9, l2: 0, l3: 0, l4: 0, l5: 0 },
    13: { k: 6.90, center: "3", l1: 10, l2: 0, l3: 0, l4: 0, l5: 0 },
    14: { k: 7.20, center: "3", l1: 10, l2: 0, l3: 0, l4: 0, l5: 0 },
    15: { k: 7.40, center: "4", l1: 11, l2: 0, l3: 0, l4: 0, l5: 0 },
    16: { k: 7.80, center: "5", l1: 11, l2: 0, l3: 0, l4: 0, l5: 0 },
    17: { k: 7.90, center: "5", l1: 12, l2: 0, l3: 0, l4: 0, l5: 0 },
    18: { k: 3.31, center: "0", l1: 6, l2: 12, l3: 0, l4: 0, l5: 0 },
    19: { k: 3.62, center: "1", l1: 6, l2: 12, l3: 0, l4: 0, l5: 0 },
    20: { k: 8.20, center: "1", l1: 6, l2: 13, l3: 0, l4: 0, l5: 0 },
    21: { k: 8.60, center: "1", l1: 7, l2: 13, l3: 0, l4: 0, l5: 0 },
    22: { k: 8.80, center: "1", l1: 7, l2: 14, l3: 0, l4: 0, l5: 0 },
    23: { k: 9.00, center: "1", l1: 8, l2: 14, l3: 0, l4: 0, l5: 0 },
    24: { k: 9.50, center: "2", l1: 8, l2: 14, l3: 0, l4: 0, l5: 0 },
    25: { k: 9.60, center: "2", l1: 8, l2: 15, l3: 0, l4: 0, l5: 0 },
    26: { k: 9.60, center: "3", l1: 9, l2: 14, l3: 0, l4: 0, l5: 0 },
    27: { k: 9.80, center: "3", l1: 9, l2: 15, l3: 0, l4: 0, l5: 0 },
    28: { k: 3.31, center: "3", l1: 9, l2: 16, l3: 0, l4: 0, l5: 0 },
    29: { k: 3.62, center: "3", l1: 10, l2: 16, l3: 0, l4: 0, l5: 0 },
    30: { k: 10.20, center: "4", l1: 10, l2: 16, l3: 0, l4: 0, l5: 0 },
    31: { k: 10.31, center: "5", l1: 10, l2: 16, l3: 0, l4: 0, l5: 0 },
    32: { k: 10.43, center: "5", l1: 11, l2: 17, l3: 0, l4: 0, l5: 0 },
    33: { k: 10.54, center: "5", l1: 11, l2: 11, l3: 0, l4: 0, l5: 0 },
    34: { k: 10.66, center: "1", l1: 5, l2: 11, l3: 17, l4: 0, l5: 0 },
    35: { k: 10.77, center: "1", l1: 6, l2: 12, l3: 17, l4: 0, l5: 0 },
    36: { k: 10.89, center: "1", l1: 6, l2: 12, l3: 18, l4: 0, l5: 0 },
    37: { k: 11.00, center: "1", l1: 6, l2: 12, l3: 18, l4: 0, l5: 0 },
    38: { k: 3.31, center: "1+F", l1: 6, l2: 13, l3: 18, l4: 0, l5: 0 },
    39: { k: 3.62, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 0, l5: 0 },
    40: { k: 11.44, center: "1+F", l1: 7, l2: 14, l3: 19, l4: 0, l5: 0 },
    41: { k: 11.58, center: "1+F", l1: 7, l2: 14, l3: 19, l4: 0, l5: 0 },
    42: { k: 11.73, center: "1+F", l1: 8, l2: 14, l3: 20, l4: 0, l5: 0 },
    43: { k: 11.87, center: "1+F", l1: 8, l2: 14, l3: 20, l4: 0, l5: 0 },
    44: { k: 12.02, center: "2", l1: 8, l2: 15, l3: 20, l4: 0, l5: 0 },
    45: { k: 12.16, center: "2", l1: 8, l2: 15, l3: 21, l4: 0, l5: 0 },
    46: { k: 12.31, center: "2", l1: 8, l2: 15, l3: 21, l4: 0, l5: 0 },
    47: { k: 12.45, center: "2", l1: 9, l2: 15, l3: 21, l4: 0, l5: 0 },
    48: { k: 3.31, center: "2", l1: 9, l2: 15, l3: 21, l4: 0, l5: 0 },
    49: { k: 3.62, center: "4", l1: 9, l2: 15, l3: 21, l4: 0, l5: 0 },
    50: { k: 12.84, center: "4", l1: 10, l2: 15, l3: 21, l4: 0, l5: 0 },
    51: { k: 12.97, center: "4", l1: 10, l2: 16, l3: 21, l4: 0, l5: 0 },
    52: { k: 13.09, center: "4", l1: 10, l2: 16, l3: 22, l4: 0, l5: 0 },
    53: { k: 13.21, center: "5", l1: 10, l2: 16, l3: 22, l4: 0, l5: 0 },
    54: { k: 13.33, center: "5", l1: 11, l2: 16, l3: 22, l4: 0, l5: 0 },
    55: { k: 13.46, center: "5", l1: 11, l2: 17, l3: 22, l4: 0, l5: 0 },
    56: { k: 13.58, center: "5", l1: 11, l2: 17, l3: 23, l4: 0, l5: 0 },
    57: { k: 13.70, center: "1", l1: 5, l2: 11, l3: 17, l4: 23, l5: 0 },
    58: { k: 3.31, center: "1", l1: 6, l2: 11, l3: 17, l4: 23, l5: 0 },
    59: { k: 3.62, center: "1", l1: 6, l2: 12, l3: 17, l4: 23, l5: 0 },
    60: { k: 14.07, center: "1", l1: 6, l2: 12, l3: 18, l4: 23, l5: 0 },
    61: { k: 14.19, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 0 },
    62: { k: 9.31, center: "1+F", l1: 7, l2: 12, l3: 18, l4: 24, l5: 0 },
    63: { k: 9.31, center: "1+F", l1: 7, l2: 13, l3: 18, l4: 24, l5: 0 },
    64: { k: 9.31, center: "1+F", l1: 7, l2: 14, l3: 18, l4: 24, l5: 0 },
    65: { k: 9.31, center: "1+F", l1: 7, l2: 14, l3: 19, l4: 24, l5: 0 },
    66: { k: 9.62, center: "1+F", l1: 8, l2: 14, l3: 19, l4: 24, l5: 0 },
    67: { k: 9.62, center: "1+F", l1: 8, l2: 14, l3: 20, l4: 24, l5: 0 },
    68: { k: 9.62, center: "1+F", l1: 8, l2: 14, l3: 20, l4: 25, l5: 0 },
    69: { k: 9.62, center: "2", l1: 8, l2: 14, l3: 20, l4: 25, l5: 0 },
    70: { k: 10.00, center: "2", l1: 8, l2: 15, l3: 20, l4: 25, l5: 0 },
    71: { k: 10.00, center: "2", l1: 8, l2: 15, l3: 21, l4: 25, l5: 0 },
    72: { k: 10.00, center: "2", l1: 8, l2: 15, l3: 21, l4: 26, l5: 0 },
    73: { k: 10.00, center: "2", l1: 9, l2: 15, l3: 21, l4: 26, l5: 0 },
    74: { k: 10.15, center: "3", l1: 9, l2: 15, l3: 21, l4: 26, l5: 0 },
    75: { k: 10.15, center: "3", l1: 9, l2: 15, l3: 21, l4: 27, l5: 0 },
    76: { k: 10.42, center: "4", l1: 9, l2: 15, l3: 21, l4: 27, l5: 0 },
    77: { k: 10.42, center: "4", l1: 10, l2: 15, l3: 21, l4: 27, l5: 0 },
    78: { k: 10.42, center: "4", l1: 10, l2: 15, l3: 21, l4: 28, l5: 0 },
    79: { k: 10.42, center: "4", l1: 10, l2: 15, l3: 21, l4: 29, l5: 0 },
    80: { k: 10.42, center: "4", l1: 10, l2: 15, l3: 21, l4: 30, l5: 0 },
    81: { k: 10.70, center: "5", l1: 11, l2: 17, l3: 23, l4: 25, l5: 0 },
    82: { k: 10.70, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 21 },
    83: { k: 10.70, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 22 },
    84: { k: 10.70, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 23 },
    85: { k: 10.70, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 24 },
    86: { k: 11.00, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 25 },
    87: { k: 11.00, center: "1", l1: 6, l2: 12, l3: 18, l4: 24, l5: 26 },
    88: { k: 11.00, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 23 },
    89: { k: 11.00, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 24 },
    90: { k: 11.00, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 25 },
    91: { k: 11.00, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 26 },
    92: { k: 11.31, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 27 },
    93: { k: 11.31, center: "1+F", l1: 7, l2: 13, l3: 19, l4: 25, l5: 28 },
    94: { k: 11.31, center: "2", l1: 8, l2: 14, l3: 20, l4: 26, l5: 26 },
    95: { k: 11.31, center: "2", l1: 8, l2: 14, l3: 20, l4: 26, l5: 27 },
    96: { k: 11.31, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 23 },
    97: { k: 11.62, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 24 },
    98: { k: 11.62, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 25 },
    99: { k: 11.62, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 26 },
    100: { k: 11.62, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 27 },
    101: { k: 11.62, center: "2", l1: 8, l2: 15, l3: 21, l4: 27, l5: 28 },
  });

  const LS_PAIR_CCV_FACTORS = Object.freeze({
    1: 2.00,
    2: 3.29,
    3: 3.57,
    4: 3.91,
    5: 4.56,
    6: 4.75,
    7: 4.95,
    8: 5.32,
    9: 5.70,
    10: 5.85,
    11: 6.27,
    12: 6.46,
    13: 6.56,
    14: 6.84,
    15: 7.03,
    16: 7.26,
    17: 7.51,
    18: 7.60,
    19: 7.60,
    20: 7.86,
    21: 8.17,
    22: 8.36,
    23: 8.55,
    24: 9.03,
    25: 9.12,
    26: 9.12,
    27: 9.31,
    28: 9.41,
    29: 9.50,
    30: 9.69,
    31: 9.80,
    32: 9.91,
    33: 10.02,
    34: 10.12,
    35: 10.23,
    36: 10.34,
    37: 10.45,
    38: 10.61,
    39: 10.76,
    40: 10.92,
    41: 11.07,
    42: 11.23,
    43: 11.38,
    44: 11.54,
    45: 11.69,
    46: 11.85,
    47: 12.00,
    48: 12.16,
    49: 12.21,
    50: 12.26,
    51: 12.32,
    52: 12.44,
    53: 12.55,
    54: 12.66,
    55: 12.79,
    56: 12.90,
    57: 13.01,
    58: 13.13,
    59: 13.25,
    60: 13.37,
    61: 13.48,
    62: 13.59,
    63: 13.72,
    64: 13.83,
    65: 13.95,
    66: 14.06,
    67: 14.18,
    68: 14.30,
    69: 14.41,
    70: 14.53,
    71: 14.65,
    72: 14.76,
    73: 14.88,
    74: 14.99,
    75: 15.11,
    76: 15.23,
    77: 15.34,
    78: 15.46,
    79: 15.58,
    80: 15.69,
    81: 15.81,
    82: 15.92,
    83: 16.05,
    84: 16.16,
    85: 16.27,
    86: 16.39,
    87: 16.51,
    88: 16.62,
    89: 16.74,
    90: 16.85,
    91: 16.98,
    92: 17.09,
    93: 17.20,
    94: 17.32,
    95: 17.44,
    96: 17.56,
    97: 17.67,
    98: 17.78,
    99: 17.91,
    100: 18.02,
    101: 18.14,
  });

  const LS_PAIR_INDIVIDUAL_CCV_FACTORS = Object.freeze({
    1: 1.00,
    2: 1.66,
    3: 1.84,
    4: 2.08,
    5: 2.31,
    6: 2.57,
    7: 2.68,
    8: 2.83,
    9: 3.10,
    10: 3.16,
    11: 3.23,
    12: 3.28,
    13: 3.56,
    14: 3.64,
    15: 3.80,
    16: 3.90,
    17: 4.04,
    18: 4.04,
    19: 4.18,
    20: 4.28,
    21: 4.28,
    22: 4.54,
    23: 4.54,
    24: 4.85,
    25: 4.85,
    26: 4.85,
    27: 4.97,
    28: 5.19,
    29: 5.19,
    30: 5.19,
    31: 5.28,
    32: 5.38,
    33: 5.47,
    34: 5.57,
    35: 5.66,
    36: 5.76,
    37: 5.85,
    38: 5.92,
    39: 5.98,
    40: 6.05,
    41: 6.12,
    42: 6.18,
    43: 6.25,
    44: 6.31,
    45: 6.38,
    46: 6.45,
    47: 6.51,
    48: 6.58,
    49: 6.69,
    50: 6.79,
    51: 6.86,
    52: 6.92,
    53: 6.99,
    54: 7.05,
    55: 7.12,
    56: 7.18,
    57: 7.25,
    58: 7.31,
    59: 7.37,
    60: 7.44,
    61: 7.50,
    62: 7.56,
    63: 7.62,
    64: 7.68,
    65: 7.74,
    66: 7.80,
    67: 7.86,
    68: 7.92,
    69: 7.97,
    70: 8.03,
    71: 8.09,
    72: 8.15,
    73: 8.20,
    74: 8.26,
    75: 8.31,
    76: 8.37,
    77: 8.42,
    78: 8.48,
    79: 8.53,
    80: 8.59,
    81: 8.64,
    82: 8.69,
    83: 8.75,
    84: 8.80,
    85: 8.85,
    86: 8.90,
    87: 8.95,
    88: 9.01,
    89: 9.06,
    90: 9.11,
    91: 9.16,
    92: 9.21,
    93: 9.26,
    94: 9.31,
    95: 9.36,
    96: 9.41,
    97: 9.45,
    98: 9.50,
    99: 9.55,
    100: 9.60,
    101: 9.65,
  });

  const LS_TRIAD_QUAD_CCV_FACTORS = Object.freeze({
    1: 1.00,
    2: 1.71,
    3: 1.78,
    4: 2.06,
    5: 2.28,
    6: 2.57,
    7: 2.71,
    8: 2.83,
    9: 3.10,
    10: 3.42,
    11: 3.42,
    12: 3.55,
    13: 3.77,
    14: 3.77,
    15: 4.02,
    16: 4.02,
    17: 4.28,
    18: 4.28,
    19: 4.37,
    20: 4.54,
    21: 4.54,
    22: 4.81,
    23: 4.81,
    24: 5.13,
    25: 5.13,
    26: 5.13,
    27: 5.26,
    28: 5.49,
    29: 5.49,
    30: 5.49,
    31: 5.58,
    32: 5.67,
    33: 5.76,
    34: 5.85,
    35: 5.94,
    36: 6.03,
    37: 6.12,
    38: 6.20,
    39: 6.27,
    40: 6.35,
    41: 6.43,
    42: 6.51,
    43: 6.58,
    44: 6.66,
    45: 6.74,
    46: 6.82,
    47: 6.89,
    48: 6.97,
    49: 7.08,
    50: 7.19,
    51: 7.28,
    52: 7.36,
    53: 7.43,
    54: 7.50,
    55: 7.56,
    56: 7.63,
    57: 7.70,
    58: 7.77,
    59: 7.83,
    60: 7.90,
    61: 7.97,
    62: 8.03,
    63: 8.10,
    64: 8.16,
    65: 8.22,
    66: 8.29,
    67: 8.35,
    68: 8.41,
    69: 8.47,
    70: 8.53,
    71: 8.59,
    72: 8.65,
    73: 8.71,
    74: 8.77,
    75: 8.83,
    76: 8.89,
    77: 8.95,
    78: 9.01,
    79: 9.07,
    80: 9.12,
    81: 9.18,
    82: 9.24,
    83: 9.29,
    84: 9.35,
    85: 9.40,
    86: 9.46,
    87: 9.51,
    88: 9.57,
    89: 9.62,
    90: 9.68,
    91: 9.73,
    92: 9.78,
    93: 9.84,
    94: 9.89,
    95: 9.94,
    96: 9.99,
    97: 10.05,
    98: 10.10,
    99: 10.15,
    100: 10.20,
    101: 10.25,
  });

  function clampLsCount(count){
    const n = Math.round(Number(count) || 1);
    return Math.max(1, Math.min(101, n));
  }
  function cloneLayout(row){
    return {
      k: Number(row && row.k) || 1,
      center: (row && row.center) || '1',
      l1: Number(row && row.l1) || 0,
      l2: Number(row && row.l2) || 0,
      l3: Number(row && row.l3) || 0,
      l4: Number(row && row.l4) || 0,
      l5: Number(row && row.l5) || 0
    };
  }
  function isOff(v){
    const s=String(v ?? '').trim();
    return !s || s==='미적용' || s==='없음' || s==='none' || s==='NONE' || s==='-';
  }
  function getLsCoreLayout(count){
    return cloneLayout(LS_CORE_LAYOUT[clampLsCount(count)]);
  }
  function getLsPairGeneralLayout(count){
    const n = Math.max(1, Math.round(Number(count) || 1));
    if(n > 100) return { k: 1.9 * Math.sqrt(n), center: "", l1:0, l2:0, l3:0, l4:0, l5:0 };
    return cloneLayout(LS_PAIR_GENERAL_LAYOUT[clampLsCount(n)]);
  }
  function getLsFactorFromTable(table, count){
    return Number(table[clampLsCount(count)]) || 1;
  }
  function resolveLsShieldKind(input){
    const c=input || {};
    const ct=String(c.coreType || c.core_type || 'CORE').toUpperCase();
    const n=clampLsCount(c.count || c.coreNum || c.core_num || 1);
    if(!isOff(c.indShieldType || c.ind_shield_type)) return 'INDIVIDUAL';
    if(!isOff(c.ovShieldType || c.ov_shield_type)) return 'COMMON';
    return 'NONE';
  }
  function resolveLsCablingStandard(input){
    const c=input || {};
    const coreType=String(c.coreType || c.core_type || 'CORE').toUpperCase();
    const rawCount=Math.max(1, Math.round(Number(c.count || c.coreNum || c.core_num || 1))); const count=(coreType==='PAIR' && rawCount>100) ? rawCount : clampLsCount(rawCount);
    const sheath=String(c.sheathMethod || c.cabling_sheath_method || 'GENERAL_EXTRUDED').toUpperCase();
    const shield=c.shieldKind || resolveLsShieldKind(c);
    let caseId='CASE_1_CORE';
    let layout=getLsCoreLayout(count);
    let k=layout.k;
    let unitBasis='CORE_OD_AFTER_STEP_6';

    if(coreType==='CORE'){
      caseId='CASE_1_CORE';
      layout=getLsCoreLayout(count);
      k=layout.k;
      unitBasis=(shield==='INDIVIDUAL') ? 'OD_AFTER_INDIVIDUAL_SHIELD' : 'CORE_OD_AFTER_STEP_6';
    } else if(sheath==='CCV_SHEATH'){
      if(coreType==='PAIR' && shield!=='INDIVIDUAL'){
        caseId='CASE_4_PAIR_CCV';
        layout=getLsPairGeneralLayout(count);
        k=getLsFactorFromTable(LS_PAIR_CCV_FACTORS,count);
        layout.k=k;
        unitBasis='CORE_OD_AFTER_STEP_6';
      } else if(coreType==='PAIR' && shield==='INDIVIDUAL'){
        caseId='CASE_5_PAIR_INDIVIDUAL_CCV';
        layout=getLsCoreLayout(count);
        k=getLsFactorFromTable(LS_PAIR_INDIVIDUAL_CCV_FACTORS,count);
        layout.k=k;
        unitBasis='OD_AFTER_INDIVIDUAL_SHIELD';
      } else {
        caseId='CASE_6_TRIAD_QUAD_CCV';
        layout=getLsCoreLayout(count);
        k=getLsFactorFromTable(LS_TRIAD_QUAD_CCV_FACTORS,count);
        layout.k=k;
        unitBasis=(shield==='INDIVIDUAL') ? 'OD_AFTER_INDIVIDUAL_SHIELD' : (coreType==='TRIAD' ? 'TRIAD_SET_OD' : 'QUAD_SET_OD');
      }
    } else {
      if(coreType==='PAIR' && shield!=='INDIVIDUAL'){
        caseId='CASE_2_PAIR_GENERAL';
        layout=getLsPairGeneralLayout(count);
        k=layout.k;
        unitBasis='CORE_OD_AFTER_STEP_6';
      } else {
        caseId='CASE_3_GENERAL_CORE_TABLE_095';
        layout=getLsCoreLayout(count);
        k=(count===1) ? 1.00 : Number((layout.k * 0.95).toFixed(2));
        layout.k=k;
        unitBasis=(shield==='INDIVIDUAL') ? 'OD_AFTER_INDIVIDUAL_SHIELD' : (coreType==='PAIR' ? 'PAIR_SET_OD' : coreType==='TRIAD' ? 'TRIAD_SET_OD' : 'QUAD_SET_OD');
      }
    }
    return { caseId, coreType, count, sheathMethod:sheath, shieldKind:shield, k, layout, unitBasis };
  }
  function getLSAssemblyFactor(type, count, options){
    const coreType=String(type || 'CORE').toUpperCase();
    const c=Object.assign({}, options || {}, { coreType: coreType, count: count });
    return resolveLsCablingStandard(c).k;
  }

  function num(v, d){ v=parseFloat(String(v??'').replace(/,/g,'')); return isFinite(v)?v:d; }
  // Keep physical quantities and costs finite and non-negative at the shared boundary.
  function nonNegative(v, d){ const n=num(v,NaN); return Number.isFinite(n) && n>=0 ? n : d; }
  function positiveInteger(v, d){ return Math.max(1, Math.round(nonNegative(v,d))); }
  function str(v,d){ return (v===undefined||v===null||v==='')?d:String(v); }
  function getEl(id){ return (typeof document!=='undefined') ? document.getElementById(id) : null; }
  function val(id,d){ const el=getEl(id); if(!el) return d; return el.type==='checkbox' ? el.checked : el.value; }
  function density(mat){
    const m=String(mat||'').trim().toUpperCase();
    if(m==='미적용') return 0;
    if(m.includes('XLPE')) return 0.925;
    if(m.includes('PVC')) return 1.40;
    if(m.includes('EPR') || m.includes('HEPR')) return 1.30;
    if(m.includes('PE') || m.includes('XLPO')) return 0.93;
    if(m.includes('LS') || m.includes('실리콘')) return 1.20;
    if(m.includes('PP')) return 0.90;
    if(m.includes('구리') || m.includes('COPPER') || m==='동') return 8.89;
    if(m.includes('알루') || m.includes('ALUMIN')) return 2.70;
    if(m.includes('철') || m.includes('STEEL') || m.includes('STA') || m.includes('SWA')) return 7.85;
    return 1.40;
  }

  // --------------------------------------------------------------------
  // 공정/재질 계산 마스터
  // - 화면, 메인 자재표, 사양서 부표가 동일 데이터를 사용한다.
  // - 사내 확정값이 없는 항목은 기존 프로그램 값과 일반 설계 기본값을 사용한다.
  // --------------------------------------------------------------------
  const TAPE_OVERLAP_RATE = 0.30;
  const TAPE_COVERAGE_FACTOR = 1 / (1 - TAPE_OVERLAP_RATE);
  const TAPE_MATERIALS = Object.freeze({
    'PET':          {name:'PET 테이프', density:1.38, unitPrice:5550, thickness:0.025},
    '부직포 0.13':  {name:'부직포 0.13 테이프', density:0.806, unitPrice:89000, thickness:0.13},
    '부직포':       {name:'부직포 테이프', density:0.35, unitPrice:7900, thickness:0.12},
    '우레탄글라스': {name:'우레탄 글라스 테이프', density:1.75, unitPrice:30000, thickness:0.20},
    '고무입면':     {name:'고무입면 테이프', density:1.25, unitPrice:26000, thickness:0.15},
    '마이카':       {name:'합성마이카 테이프', density:1.50, unitPrice:18500, thickness:0.14},
    '폴리이미드':   {name:'폴리이미드 테이프', density:1.42, unitPrice:100000, thickness:0.10},
    '나일론':       {name:'나일론 테이프', density:1.14, unitPrice:15600, thickness:0.14},
    '반도전':       {name:'반도전 부직포 테이프', density:1.15, unitPrice:14500, thickness:0.11},
    'TETRON':       {name:'TETRON 반도전 테이프', density:1.38, unitPrice:14500, thickness:0.11}
  });
  const SHIELD_MATERIALS = Object.freeze({
    'AL/MYLAR': {name:'AL/Mylar', density:1.80, unitPrice:9900, tapeThickness:0.038, wireDiameter:0.20},
    'CU/MYLAR': {name:'CU/Mylar', density:3.50, unitPrice:34000, tapeThickness:0.05, wireDiameter:0.20},
    '구리':     {name:'구리(동)', density:8.89, unitPrice:null, tapeThickness:0.10, wireDiameter:0.20},
    '면사':     {name:'면사', density:1.54, unitPrice:6300, tapeThickness:0.15, wireDiameter:0.25},
    '납':       {name:'납(Lead)', density:11.34, unitPrice:11000, tapeThickness:1.00, wireDiameter:1.00}
  });
  const ARMOUR_MATERIALS = Object.freeze({
    '아연도철선':   {name:'아연도철선(GSW)', density:7.85, unitPrice:1950},
    '알루미늄':     {name:'알루미늄 외장', density:2.70, unitPrice:3800},
    '구리':         {name:'구리 외장', density:8.89, unitPrice:null},
    '철':           {name:'철 테이프(STA)', density:7.85, unitPrice:1950},
    '아라미드 얀':  {name:'아라미드 얀', density:1.44, unitPrice:13500},
    '폴리에스터 얀':{name:'폴리에스터 얀', density:1.38, unitPrice:4200}
  });

  function normalizeTapeKey(v){
    const s=String(v||'').trim().toUpperCase();
    if(s==='적용' || s.includes('MICA') || s.includes('마이카')) return '마이카';
    if(s.includes('TETRON')) return 'TETRON';
    // '부직포 0.13'이 기존 '부직포'에 먼저 매칭되지 않도록 정확 일치를 우선한다.
    const exact=Object.keys(TAPE_MATERIALS).find(function(k){ return s===k.toUpperCase(); });
    if(exact) return exact;
    return Object.keys(TAPE_MATERIALS).sort(function(a,b){return b.length-a.length;})
      .find(function(k){ return s.includes(k.toUpperCase()); }) || 'PET';
  }
  function normalizeShieldMaterialKey(v){
    const s=String(v||'').trim().toUpperCase().replace(/\s+/g,'');
    if(s.includes('CU/MYLAR')) return 'CU/MYLAR';
    if(s.includes('AL/MYLAR')) return 'AL/MYLAR';
    if(s.includes('납') || s.includes('LEAD')) return '납';
    if(s.includes('면사') || s.includes('COTTON')) return '면사';
    if(s.includes('구리') || s.includes('(동)') || s==='동' || s.includes('COPPER') || s==='CU') return '구리';
    return 'AL/MYLAR';
  }
  function normalizeArmourMaterialKey(v){
    const s=String(v||'').trim();
    if(s.includes('아라미드')) return '아라미드 얀';
    if(s.includes('폴리에스터')) return '폴리에스터 얀';
    if(s.includes('알루')) return '알루미늄';
    if(s.includes('구리')) return '구리';
    if(s.includes('STA') || s==='철' || s.includes('철 (')) return '철';
    return '아연도철선';
  }
  function resolveMethod(v){
    const s=String(v||'').toUpperCase();
    if(s.includes('BRAID') || s.includes('편조')) return 'BRAID';
    if(s.includes('SERVE') || s.includes('횡권') || s.includes('SWA') || s.includes('AWA')) return 'SERVE';
    if(s.includes('LEAD') || s.includes('납')) return 'LEAD';
    return 'TAPE';
  }
  // 반도전 테이프 공정에서 '부직포'를 선택하면 반도전부직포 테이프로 계산한다.
  function getTapeSpec(material, process){
    const normalizedKey=normalizeTapeKey(material);
    const isSemiConductiveTape=String(process||'').includes('반도전 테이프');
    const key=(isSemiConductiveTape && normalizedKey==='부직포') ? '반도전' : normalizedKey;
    return Object.assign({key:key, method:'TAPE', coverageFactor:TAPE_COVERAGE_FACTOR}, TAPE_MATERIALS[key]);
  }
  function getShieldSpec(material, method, overrides){
    const key=normalizeShieldMaterialKey(material);
    const base=SHIELD_MATERIALS[key];
    const m=(key==='납') ? 'LEAD' : resolveMethod(method);
    const o=overrides||{};
    let thick=(m==='TAPE') ? base.tapeThickness : base.wireDiameter;
    if(m==='LEAD') thick=nonNegative(o.thickness, base.tapeThickness);
    else thick=nonNegative(o.thickness, thick);
    const factor=(m==='TAPE') ? TAPE_COVERAGE_FACTOR : (m==='BRAID') ? (0.85*1.12) : (m==='SERVE') ? (0.90*1.08) : 1.00;
    return {key:key, name:base.name, density:base.density, unitPrice:base.unitPrice, thickness:thick, method:m, coverageFactor:factor};
  }
  function getArmourSpec(material, method, thickness){
    const key=normalizeArmourMaterialKey(material);
    const base=ARMOUR_MATERIALS[key];
    const m=resolveMethod(method);
    const factor=(m==='TAPE') ? TAPE_COVERAGE_FACTOR : (m==='BRAID') ? (0.85*1.12) : (0.90*1.05);
    return {key:key, name:base.name, density:base.density, unitPrice:base.unitPrice, thickness:nonNegative(thickness,0), method:m, coverageFactor:factor};
  }
  function resolveLayerSpec(category, material, method, overrides){
    if(category==='shield') return getShieldSpec(material,method,overrides);
    if(category==='armour') return getArmourSpec(material,method,overrides && overrides.thickness);
    return getTapeSpec(material);
  }

  function defaultLoss(row, cfg){
    const proc=String(row&&row.process||'');
    const mat=String(row&&row.material||'');
    const c=cfg||{};
    function lossVal(key, fallback){
      const v=num(c['loss_'+key], NaN);
      return Number.isFinite(v) && v>=0 ? v : fallback;
    }
    if(proc.includes('도체') || proc.includes('D/W') || proc.includes('접지선') || mat.includes('소선') || mat.includes('D/W')) return lossVal('conductor', 5);
    if(proc.includes('절연')) return lossVal('insulation', 25);
    if(proc.includes('베딩') || proc.includes('내도')) return lossVal('bedding', 25);
    if(proc.includes('시스') || proc.includes('외도')) return lossVal('sheath', 25);
    return lossVal('other', 10);
  }
  function normMat(v){ return global.LSConductorUtils ? global.LSConductorUtils.normalizeMaterial(v) : (v||'copper'); }
  function normStd(v){ return global.LSConductorUtils ? global.LSConductorUtils.normalizeStandard(v) : (v||'IEC'); }
  function normClass(std, cls){ return global.LSConductorUtils ? global.LSConductorUtils.normalizeClass(std, cls) : (cls||'연선'); }
  function isOff(v){ const s=String(v??'').trim(); return !s || s==='미적용' || s==='false' || s==='0' || s.toUpperCase()==='OFF'; }
  function isIecOrEnRule(c){
    const rule=String(c.thickness_rule_mode || c.thickness_std || c.thicknessStd || '').toUpperCase();
    return rule.startsWith('IEC_60092') || rule.startsWith('IEC_60502') || rule.startsWith('EN_');
  }
  function roundIecEnThickness(c, value){
    const n=nonNegative(value,0);
    return isIecOrEnRule(c) ? Math.round(n*10)/10 : n;
  }
  function collectConfigFromDom(){
    const cfg={};
    if(typeof document!=='undefined'){
      document.querySelectorAll('input,select,textarea').forEach(function(el){
        if(!el.id) return;
        cfg[el.id] = el.type==='checkbox' ? el.checked : el.value;
      });
    }
    cfg.cable_name = val('cable_name', val('product_name','CABLE ENGINE')) || 'CABLE ENGINE';
    cfg.v_rating = val('v_rating','0.6/1kV');
    cfg.core_type = val('core_type','CORE');
    cfg.core_num = num(val('core_num','3'),3);
    cfg.cond_material = val('cond_material','copper');
    cfg.conductorStandard = val('conductorStandard','IEC');
    cfg.cond_class = val('cond_class','연선'); // 도체 구조
    cfg.iec_conductor_class = val('iec_conductor_class','CLASS_2');
    cfg.astm_conductor_spec = val('astm_conductor_spec','ASTM_B8');
    cfg.astm_conductor_class = val('astm_conductor_class','CLASS_B');
    cfg.cond_size = val('cond_size','0.75');
    cfg.insu_material = val('insu_material','XLPE');
    cfg.thick_insu = num(val('thick_insu','0.8'),0.8);
    cfg.tape_mica = val('tape_mica','미적용');
    cfg.tape_sep = val('tape_sep','미적용');
    cfg.tape_semi = val('tape_semi','미적용');
    cfg.inner_semi = val('inner_semi','미적용');
    cfg.thick_inner_semi = num(val('thick_inner_semi','0.4'),0.4);
    cfg.outer_semi = val('outer_semi','미적용');
    cfg.thick_outer_semi = num(val('thick_outer_semi','0.6'),0.6);
    cfg.tape_insu_above = val('tape_insu_above','미적용');
    cfg.ind_separator = val('ind_separator','미적용');
    cfg.ind_shield_material = val('ind_shield_material','AL/Mylar');
    cfg.ind_shield_type = val('ind_shield_type','미적용');
    cfg.ind_dw_size_ref = val('ind_dw_size_ref','1.5');
    cfg.thick_lead_shield = num(val('thick_lead_shield','1.0'),1.0);
    cfg.ind_screen_tape = val('ind_screen_tape','미적용');
    cfg.filler_material = val('filler_material','PP');
    cfg.binder_tape = val('binder_tape','미적용');
    cfg.ov_shield_material = val('ov_shield_material','AL/Mylar');
    cfg.ov_shield_type = val('ov_shield_type','미적용');
    cfg.ov_dw_size_ref = val('ov_dw_size_ref','1.5');
    cfg.thick_ov_lead_shield = num(val('thick_ov_lead_shield','1.0'),1.0);
    cfg.bedding_type = val('bedding_type','미적용');
    cfg.bedding_material = val('bedding_material','XLPE');
    cfg.thick_bedding = num(val('thick_bedding','0'),0);
    cfg.armour_material = val('armour_material_new', val('armour_material','아연도철선'));
    cfg.armour_type = val('armour_type_new', val('armour_type','미적용'));
    cfg.thick_armour = num(val('thick_armour','0'),0);
    cfg.sheath_material = val('sheath_material','PVC');
    cfg.cond_coating = val('cond_coating','A');
    cfg.has_ground = val('has_ground','미적용');
    cfg.num_ground = num(val('num_ground','1'),1);
    cfg.thick_ground_insu = num(val('thick_ground_insu','0.8'),0.8);
    cfg.thick_sheath = num(val('thick_sheath','0'),0);
    cfg.lme_usd_t = val('lme_usd_t','13500');
    cfg.scr_usd_t = val('scr_usd_t','415');
    cfg.exchange_rate = val('exchange_rate','1500');
    cfg.markup_rate = val('markup_rate','5');
    cfg.insu_base_price = val('insu_base_price','3400');
    cfg.bedding_base_price = val('bedding_base_price','2400');
    cfg.sheath_base_price = val('sheath_base_price','2800');
    cfg.thickness_std = val('thickness_rule_mode', val('thickness_std','MANUAL'));
    cfg.nema_level = val('nema_level_main', val('nema_level','100%'));
    cfg.cabling_sheath_method = val('cabling_sheath_method','GENERAL_EXTRUDED');
    cfg.od_tolerance_percent = val('od_tolerance_percent', '5');
    return cfg;
  }
  function normalizeConfig(input){
    const c=Object.assign({}, input||{});
    c.cond_material = normMat(c.cond_material || 'copper');
    c.conductorStandard = normStd(c.conductorStandard || c.conductor_standard || 'IEC');
    c.cond_class = normClass(c.conductorStandard, c.cond_class || '연선');
    c.core_num = positiveInteger(c.core_num,3);
    c.cond_size = c.cond_size!==undefined ? c.cond_size : '0.75';
    c.thick_insu = roundIecEnThickness(c, nonNegative(c.thick_insu,0.8));
    c.insu_material = str(c.insu_material,'XLPE');
    // Apply-OFF gate: lower selections never affect calculation when parent is off.
    if(isOff(c.tape_mica)) c.tape_mica='미적용';
    if(isOff(c.tape_sep)) c.tape_sep='미적용';
    if(isOff(c.tape_semi)) c.tape_semi='미적용';
    if(isOff(c.inner_semi)){ c.inner_semi='미적용'; c.thick_inner_semi=0; } else c.thick_inner_semi=nonNegative(c.thick_inner_semi,0.4);
    if(isOff(c.outer_semi)){ c.outer_semi='미적용'; c.thick_outer_semi=0; } else c.thick_outer_semi=nonNegative(c.thick_outer_semi,0.6);
    if(isOff(c.tape_insu_above)) c.tape_insu_above='미적용';
    if(isOff(c.ind_shield_type)){ c.ind_shield_type='미적용'; c.ind_separator='미적용'; }
    c.ind_shield_material=str(c.ind_shield_material,'AL/Mylar');
    c.thick_lead_shield=nonNegative(c.thick_lead_shield,1.0);
    if(isOff(c.ind_screen_tape)) c.ind_screen_tape='미적용';
    if(isOff(c.binder_tape)) c.binder_tape='미적용';
    if(isOff(c.ov_shield_type)) c.ov_shield_type='미적용';
    c.ov_shield_material=str(c.ov_shield_material,'AL/Mylar');
    c.thick_ov_lead_shield=nonNegative(c.thick_ov_lead_shield,1.0);
    if(isOff(c.bedding_type)){ c.bedding_type='미적용'; c.bedding_material='미적용'; c.thick_bedding=0; } else { c.bedding_material=str(c.bedding_material,'XLPE'); c.thick_bedding=roundIecEnThickness(c, nonNegative(c.thick_bedding,0)); }
    c.armour_material=str(c.armour_material || c.armour_material_new,'아연도철선');
    if(isOff(c.armour_type)){ c.armour_type='미적용'; c.thick_armour=0; } else c.thick_armour=nonNegative(c.thick_armour,0);
    if(isOff(c.sheath_material)){ c.sheath_material='미적용'; c.thick_sheath=0; } else { c.sheath_material=str(c.sheath_material,'PVC'); c.thick_sheath=roundIecEnThickness(c, nonNegative(c.thick_sheath,0)); }
    c.thick_ground_insu=nonNegative(c.thick_ground_insu,0.8);
    c.num_ground=positiveInteger(c.num_ground,1);
    c.lme_usd_t=nonNegative(c.lme_usd_t,13500); c.scr_usd_t=nonNegative(c.scr_usd_t,415); c.exchange_rate=nonNegative(c.exchange_rate,1500); c.markup_rate=nonNegative(c.markup_rate,5);
    c.insu_base_price=nonNegative(c.insu_base_price,3400); c.bedding_base_price=nonNegative(c.bedding_base_price,2400); c.sheath_base_price=nonNegative(c.sheath_base_price,2800);
    c.calculated_copper_price=nonNegative(c.calculated_copper_price,NaN);
    c.od_tolerance_percent=nonNegative(c.od_tolerance_percent,5);
    return c;
  }
  function lookupConductor(c){
    let item=null;
    if(global.LSConductorUtils) item=global.LSConductorUtils.find(c, c.cond_size);
    if(item) return item;
    try{
      const db = (typeof CONDUCTOR_DATABASE_NEW !== 'undefined') ? CONDUCTOR_DATABASE_NEW : null;
      const list=(db&&db[c.cond_material]&&db[c.cond_material][c.conductorStandard]&&db[c.cond_material][c.conductorStandard][c.cond_class]) || [];
      const target=num(c.cond_size,NaN);
      item=list.find(function(x){return Math.abs(num(x.nominalArea,NaN)-target)<1e-9;});
      if(item) return {size:item.size, sizeText:item.size, nominalArea:num(item.nominalArea,0), class2OD:num(item.class2OD,0), weight:num(item.weight,0)};
    }catch(e){}
    return null;
  }
  function getAssemblyFactor(type, n){
    return getLSAssemblyFactor(type, n);
  }

  // PAIR/TRIAD/QUAD의 세트당 실제 절연 선심 수.
  // 도체~6번 공정은 세트 수가 아닌 실제 선심 수를 기준으로 자재량을 계산한다.
  function getCoresPerSet(coreType){
    const type=String(coreType||'CORE').toUpperCase();
    if(type==='PAIR') return 2;
    if(type==='TRIAD') return 3;
    if(type==='QUAD') return 4;
    return 1;
  }


  function resolveShieldKind(c){
    return resolveLsShieldKind({
      core_type: c.core_type,
      core_num: c.core_num,
      ind_shield_type: c.ind_shield_type,
      ov_shield_type: c.ov_shield_type
    });
  }
  function resolveLsCabling(c, odAfterStep6, odAfterStep7){
    const std = resolveLsCablingStandard({
      core_type: c.core_type,
      core_num: c.core_num,
      cabling_sheath_method: c.cabling_sheath_method,
      ind_shield_type: c.ind_shield_type,
      ov_shield_type: c.ov_shield_type
    });
    let baseOd = odAfterStep6;
    if(std.unitBasis === 'OD_AFTER_INDIVIDUAL_SHIELD') baseOd = odAfterStep7;
    else if(std.unitBasis === 'PAIR_SET_OD') baseOd = odAfterStep6 * 2.000;
    else if(std.unitBasis === 'TRIAD_SET_OD') baseOd = odAfterStep6 * 2.155;
    else if(std.unitBasis === 'QUAD_SET_OD') baseOd = odAfterStep6 * 2.414;
    return Object.assign({}, std, { baseOd: baseOd, od: baseOd * std.k });
  }

  function addCostAndPolicy(rows, cfg){
    let totalCost=0,totalWeight=0;
    rows.forEach(function(r){
      r.loss = nonNegative(defaultLoss(r, cfg), 0);
      if(String(r.process||'').includes('도체') || String(r.process||'').includes('D/W') || String(r.process||'').includes('접지선')) r.lossEditable=true;
      if (r.layupRate === undefined || r.layupRate === null) r.layupRate = 0;
      const weight=nonNegative(r.weight,0);
      const unitPrice=nonNegative(r.unitPrice,0);
      r.cost = Math.round((weight*unitPrice*(1+(r.loss/100)))/1000);
      if(!Number.isFinite(r.cost) || r.cost<0) r.cost=0;
      totalCost += r.cost;
      totalWeight += weight;
    });
    let finalOD=0;
    rows.forEach(function(r){
      const od=num(r.od,NaN);
      if(Number.isFinite(od) && od>0) finalOD=od;
    });
    return {rows:rows,totalCost:totalCost,totalWeight:totalWeight,finalOD:finalOD};
  }
  function calculate(input){
    const c=normalizeConfig(input);
    const item=lookupConductor(c);
    if(!item) throw new Error('도체 DB 조회 실패: material='+c.cond_material+', standard='+c.conductorStandard+', class='+c.cond_class+', size='+c.cond_size);

    const coreNum=positiveInteger(c.core_num,3);
    const coresPerSet=getCoresPerSet(c.core_type);
    const actualCoreNum=coreNum*coresPerSet;
    const lme=num(c.lme_usd_t,13500), scr=num(c.scr_usd_t,415), rate=num(c.exchange_rate,1500), markup=num(c.markup_rate,5);
    const configuredCopperPrice=num(c.calculated_copper_price,NaN);
    const copperPrice=Number.isFinite(configuredCopperPrice) && configuredCopperPrice>0
      ? Math.round(configuredCopperPrice)
      : Math.round(((lme+scr)*rate/1000)*(1+markup/100));

    const rows=[];
    let runningOD=nonNegative(item.class2OD,2.5);
    if(runningOD<=0) runningOD=2.5;
    const condWeight=nonNegative(item.weight,0);
    const conductorName=c.cond_material==='copper'
      ? (String(c.cond_coating||'A').toUpperCase()==='TA' ? '주석도금 구리 소선(TA)' : '구리 소선(A)')
      : '알루미늄 소선';
    const theoreticalSingleWeight=(item.totalWireCount>0 && item.wireDiameter>0 && c.cond_material==='copper')
      ? (Math.PI*Math.pow(item.wireDiameter,2)/4*item.totalWireCount*8.89) : null;
    const materialVerification=theoreticalSingleWeight
      ? {standardWeightKgKm:condWeight, theoreticalWeightKgKm:Number(theoreticalSingleWeight.toFixed(2)),
         differenceKgKm:Number((condWeight-theoreticalSingleWeight).toFixed(2)),
         sourceTable:item.sourceTable||'', strandConfig:item.strandConfig||''} : null;
    rows.push({process:'1. 도체', material:conductorName, thick:'-', od:runningOD.toFixed(2),
      area:(Math.PI*Math.pow(runningOD,2)/4).toFixed(2), density:c.cond_material==='copper'?8.89:2.7,
      weight:(condWeight*actualCoreNum).toFixed(2), unitPrice:c.cond_material==='copper'?copperPrice:3800,
      loss:5, cost:0, isEditable:false, conductorVerification:materialVerification,
      conductorSource:item.sourceTable||'', strandConfig:item.strandConfig||''});

    function pushTape(process, material, multiplier, overrideThickness){
      const spec=getTapeSpec(material, process);
      const thick=nonNegative(overrideThickness,spec.thickness);
      if(thick<=0) return null;
      const meanOD=runningOD+thick;
      const area=Math.PI*meanOD*thick*spec.coverageFactor;
      const w=area*spec.density*multiplier;
      runningOD += thick*2;
      const row={process:process, material:spec.name, method:'TAPE', thick:thick.toFixed(2), od:runningOD.toFixed(2),
        area:area.toFixed(2), density:spec.density, weight:w.toFixed(2), unitPrice:spec.unitPrice,
        loss:10, cost:0, isEditable:true, coverageFactor:spec.coverageFactor, quantityMultiplier:multiplier};
      rows.push(row); return row;
    }
    function pushRing(process, material, thick, dens, price, multiplier, loss){
      thick=nonNegative(thick,0); if(thick<=0) return null;
      dens=nonNegative(dens,0); price=nonNegative(price,0); multiplier=nonNegative(multiplier,0);
      const area=Math.PI*(runningOD+thick)*thick;
      const w=area*dens*multiplier;
      runningOD += thick*2;
      const row={process:process, material:material, method:'EXTRUSION', thick:thick.toFixed(2), od:runningOD.toFixed(2),
        area:area.toFixed(2), density:dens, weight:w.toFixed(2), unitPrice:price,
        loss:num(loss,25), cost:0, isEditable:true, quantityMultiplier:multiplier};
      rows.push(row); return row;
    }
    function pushAppliedLayer(process, spec, multiplier, dynamicPrice){
      const thick=nonNegative(spec.thickness,0); if(thick<=0) return null;
      const coverageFactor=nonNegative(spec.coverageFactor,1);
      const materialDensity=nonNegative(spec.density,0);
      const appliedMultiplier=nonNegative(multiplier,0);
      const fullRingArea=Math.PI*(runningOD+thick)*thick;
      const area=fullRingArea*coverageFactor;
      const w=area*materialDensity*appliedMultiplier;
      runningOD += thick*2;
      const row={process:process, material:spec.name, method:spec.method, thick:thick.toFixed(2), od:runningOD.toFixed(2),
        area:area.toFixed(2), density:materialDensity, weight:w.toFixed(2),
        unitPrice:spec.unitPrice===null?nonNegative(dynamicPrice,0):nonNegative(spec.unitPrice,0), loss:10, cost:0, isEditable:true,
        coverageFactor:coverageFactor, quantityMultiplier:appliedMultiplier};
      rows.push(row); return row;
    }
    function pushDrain(process, sizeRef, multiplier){
      const dw=global.LSConductorUtils ? global.LSConductorUtils.find(c,sizeRef||'1.5') : null;
      const dwWeight=dw ? nonNegative(dw.weight,0) : nonNegative(sizeRef,1.5)*8.89;
      rows.push({process:process, material:'주석도금선(TA D/W)', method:'WIRE', thick:'-', od:'-', area:'-',
        density:8.89, weight:(dwWeight*nonNegative(multiplier,0)).toFixed(2), unitPrice:copperPrice, loss:5, cost:0, isEditable:false});
    }

    if(!isOff(c.tape_mica)) pushTape('2-1. 마이카 테이프','마이카',actualCoreNum);
    if(!isOff(c.tape_sep)) pushTape('2-2. 도체 세퍼레이터',c.tape_sep,actualCoreNum);
    if(!isOff(c.tape_semi)) pushTape('2-3. 반도전 테이프',c.tape_semi,actualCoreNum);

    if(!isOff(c.inner_semi)) pushRing('3. 내도 공정','반도전 콤파운드',c.thick_inner_semi,1.15,4800,actualCoreNum,25);
    pushRing('4. 절연 공정',c.insu_material,c.thick_insu,density(c.insu_material),c.insu_base_price,actualCoreNum,25);
    if(!isOff(c.outer_semi)) pushRing('5. 외도 공정','반도전 콤파운드',c.thick_outer_semi,1.15,4800,actualCoreNum,25);
    if(!isOff(c.tape_insu_above)) pushTape('6. 절연위 테이프',c.tape_insu_above,actualCoreNum);

    const odAfterStep6=runningOD;
    const coreType=String(c.core_type||'CORE').toUpperCase();
    const unitOdBeforeStep7=coreType==='PAIR' ? odAfterStep6*2.000 :
      coreType==='TRIAD' ? odAfterStep6*2.155 :
      coreType==='QUAD' ? odAfterStep6*2.414 : odAfterStep6;

    let odAfterStep7=unitOdBeforeStep7;
    if(!isOff(c.ind_shield_type)){
      runningOD=unitOdBeforeStep7;
      if(!isOff(c.ind_separator)) pushTape('7-0. 개별 차폐 세퍼레이터',c.ind_separator,coreNum);
      const indSpec=getShieldSpec(c.ind_shield_material,c.ind_shield_type,{thickness:normalizeShieldMaterialKey(c.ind_shield_material)==='납'?c.thick_lead_shield:undefined});
      pushAppliedLayer('7-1. 개별 차폐',indSpec,coreNum,copperPrice);
      odAfterStep7=runningOD;
      if(String(c.ind_shield_type).toUpperCase().includes('D/W')) pushDrain('7-2. 개별 D/W',c.ind_dw_size_ref,coreNum);
    }
    if(!isOff(c.ind_screen_tape)){
      if(isOff(c.ind_shield_type)) runningOD=odAfterStep7;
      pushTape('8. 개별차폐위 테이프',c.ind_screen_tape,coreNum);
      odAfterStep7=runningOD;
    }

    const preCablingLayupRate=actualCoreNum>=2?2:0;
    if(preCablingLayupRate>0){
      rows.forEach(function(r){
        r.layupRate=preCablingLayupRate;
        r.weight=(num(r.weight,0)*(1+preCablingLayupRate/100)).toFixed(2);
      });
    }

    const cablingStd=resolveLsCabling(c,odAfterStep6,odAfterStep7);
    const k=nonNegative(cablingStd.k,1);
    let cablingOD=nonNegative(cablingStd.od,0);
    const unitArea=Math.PI*Math.pow(cablingStd.baseOd,2)/4;
    let occupiedArea=unitArea*coreNum;

    // 접지선은 CORE 2~5심 적용 시 자재량과 연합 점유면적에 포함한다.
    const groundApplied=!isOff(c.has_ground) && coreType==='CORE' && coreNum>=2 && coreNum<=5;
    if(groundApplied){
      const groundCount=positiveInteger(c.num_ground,1);
      const phaseArea=nonNegative(item.nominalArea,nonNegative(c.cond_size,0));
      let groundArea=phaseArea<=16 ? phaseArea : (phaseArea<=35?16:phaseArea<=50?25:phaseArea<=95?35:phaseArea<=150?50:70);
      if(typeof global.getGroundConductorSize==='function'){
        try{ groundArea=num(global.getGroundConductorSize(phaseArea,groundCount),groundArea); }catch(e){}
      }
      const groundItem=global.LSConductorUtils ? global.LSConductorUtils.find(c,String(groundArea)) : null;
      const groundCondOD=groundItem ? nonNegative(groundItem.class2OD,Math.sqrt(groundArea/Math.PI)*2) : Math.sqrt(groundArea/Math.PI)*2;
      const groundWeight=groundItem ? nonNegative(groundItem.weight,groundArea*8.89) : groundArea*8.89;
      rows.push({process:'9-0. 접지선 도체', material:'구리 소선(A)', method:'WIRE', thick:'-', od:'-', area:groundArea.toFixed(2),
        density:8.89, weight:(groundWeight*groundCount).toFixed(2), unitPrice:copperPrice, loss:5, cost:0, isEditable:false});
      const gt=nonNegative(c.thick_ground_insu,0.8);
      if(gt>0){
        const ga=Math.PI*(groundCondOD+gt)*gt*groundCount;
        rows.push({process:'9-0-2. 접지선 절연', material:c.insu_material, method:'EXTRUSION', thick:gt.toFixed(2), od:'-',
          area:ga.toFixed(2), density:density(c.insu_material), weight:(ga*density(c.insu_material)).toFixed(2),
          unitPrice:c.insu_base_price, loss:25, cost:0, isEditable:true});
      }
      const groundOD=groundCondOD+2*gt;
      occupiedArea += Math.PI*Math.pow(groundOD,2)/4*groundCount;
      cablingOD=Math.max(cablingOD,Math.sqrt((occupiedArea/0.85)*4/Math.PI));
    }

    const cablingArea=Math.PI*Math.pow(cablingOD,2)/4;
    const fillerArea=Math.max(0,cablingArea-occupiedArea);
    const fillerMap={PP:{name:'PP Filler 개재',density:0.90,price:4000},EPDM:{name:'EPDM Filler 개재',density:1.20,price:13900},
      PVC:{name:'PVC Filler 개재',density:1.40,price:3000},'실리콘':{name:'Silicone Filler 개재',density:1.15,price:6000},
      '나일론':{name:'Nylon Filler 개재',density:1.14,price:4500},NDPA:{name:'NDPA Filler 개재',density:1.14,price:4500}};
    const finfo=fillerMap[c.filler_material]||fillerMap.PP;
    const cablingInputOD=runningOD;
    const cablingInputArea=Math.PI*Math.pow(cablingInputOD,2)/4;
    const cablingFactor=cablingInputOD>0 ? cablingOD/cablingInputOD : 1;
    const cablingOccupancyMultiplier=cablingInputArea>0 ? occupiedArea/cablingInputArea : coreNum;
    rows.push({process:'9. 연합 공정', material:finfo.name+' ['+cablingStd.caseId+', K='+(Number(k)||0).toFixed(2)+']',
      method:'CABLING', thick:'-', od:cablingOD.toFixed(2), area:fillerArea.toFixed(2), density:finfo.density,
      weight:(fillerArea*finfo.density).toFixed(2), unitPrice:finfo.price, loss:10, cost:0, isEditable:true,
      cablingFactor:nonNegative(cablingFactor,1), cablingOccupancyMultiplier:nonNegative(cablingOccupancyMultiplier,coreNum)});
    runningOD=cablingOD;

    if(!isOff(c.binder_tape)) pushTape('9-2. 연합 바인더 테이프',c.binder_tape,1);
    if(!isOff(c.ov_shield_type)){
      const ovSpec=getShieldSpec(c.ov_shield_material,c.ov_shield_type,{thickness:normalizeShieldMaterialKey(c.ov_shield_material)==='납'?c.thick_ov_lead_shield:undefined});
      pushAppliedLayer('10-1. 공동 차폐',ovSpec,1,copperPrice);
      if(String(c.ov_shield_type).toUpperCase().includes('D/W')) pushDrain('10-2. 공동 D/W',c.ov_dw_size_ref,1);
    }
    if(!isOff(c.bedding_type)){
      if(String(c.bedding_type).toUpperCase().includes('LAPPED')) pushTape('11. 베딩 공정',c.bedding_material,1,c.thick_bedding);
      else pushRing('11. 베딩 공정',c.bedding_material,c.thick_bedding,density(c.bedding_material),c.bedding_base_price,1,25);
    }
    if(!isOff(c.armour_type)){
      const armourSpec=getArmourSpec(c.armour_material,c.armour_type,c.thick_armour);
      pushAppliedLayer('12. 외장 공정',armourSpec,1,copperPrice);
    }
    if(!isOff(c.sheath_material)) pushRing('13. 시스 공정',c.sheath_material,c.thick_sheath,density(c.sheath_material),c.sheath_base_price,1,25);

    const result=addCostAndPolicy(rows,c);
    result.config=c;
    result.conductor=item;
    return result;
  }

  function isMvVoltage(v){
    const s=String(v||'').toUpperCase();
    if(['0.6/1KV','600/1000V','1000V'].includes(s)) return false;
    if(['1.8/3KV','2000V','3.6/6KV','5KV','6/10KV','8.0KV','8.7/15KV','15KV','12/20KV','18/30KV','25KV','35KV','66KV'].includes(s)) return true;
    if(s.includes('KV')){
      const nums=s.match(/\d+(?:\.\d+)?/g)||[];
      return nums.some(function(n){ return Number(n)>=1.8; });
    }
    const n=Number(s.replace(/[^0-9.]/g,''));
    return Number.isFinite(n) && n>=1800;
  }

  function iec60502LvInsulation(area, material){
    const a=num(area,0);
    const mat=String(material||'XLPE').toUpperCase();
    function xlpeEprHeprBase(){
      if(a<=16) return 0.7; if(a<=35) return 0.9; if(a<=70) return 1.1; if(a<=120) return 1.1;
      if(a<=150) return 1.4; if(a<=185) return 1.6; if(a<=240) return 1.7; if(a<=300) return 1.8;
      if(a<=400) return 2.0; if(a<=630) return 2.2; if(a<=800) return 2.4; return 2.6;
    }
    if(mat.includes('PVC')){
      if(a<=6) return 0.8; if(a<=16) return 1.0; if(a<=35) return 1.2; if(a<=70) return 1.4; if(a<=120) return 1.6;
      if(a<=150) return 1.8; if(a<=185) return 2.0; if(a<=240) return 2.2; if(a<=300) return 2.4;
      if(a<=400) return 2.6; if(a<=630) return 2.8; if(a<=800) return 3.0; return 3.2;
    }
    if(mat.includes('HEPR')){
      if(a<=2.5) return 0.5; if(a<=6) return 0.6; return xlpeEprHeprBase();
    }
    // 첨부 IEC 60502 표 기준: XLPE와 EPR은 같은 열, HEPR은 별도 열이다.
    return xlpeEprHeprBase();
  }

  function ieee1580Insulation(area, type, voltage){
    const a=num(area,0);
    const t=String(type||'TYPE_E').toUpperCase();
    const v=String(voltage||'1000V').toUpperCase();
    const isHigh = v.includes('2000') || v.includes('1001');
    const is300 = v.includes('300');
    const groupS = t.includes('TYPE_S') || t.includes('TYPE_LSS') || t==='S' || t==='LSS';
    const groupLSE = t.includes('TYPE_LSE') || t.includes('TYPE_LSX') || t==='LSE' || t==='LSX';
    const groupT = t.includes('TYPE_T') || t==='T' || t.includes('PVC');
    const groupP = t.includes('TYPE_P') || t==='P';
    if(isHigh){
      if(groupS){
        if(a<=7) return 1.52; if(a<=34) return 1.78; if(a<=85) return 2.29; if(a<=107) return 2.67; return 2.67;
      }
      if(groupT || groupP){
        if(a<=7) return 1.14; if(a<=34) return 1.40; if(a<=85) return 1.65; if(a<=107) return 2.29; return 2.29;
      }
      if(a<=7) return 1.14; if(a<=34) return 1.40; return 1.65;
    }
    // 301~1000 V: 사용자가 요청한 대로 1000V로 인식
    if(groupS){
      if(a<=0.68) return 0.88; if(a<=7) return 1.14; if(a<=34) return 1.52; if(a<=107) return 2.03;
      if(a<=254) return 2.41; if(a<=508) return 2.79; return 3.56;
    }
    if(groupT){
      if(a<=0.68) return 0.63; if(a<=1.31) return 0.76; if(a<=7) return 1.14; if(a<=34) return 1.52; if(a<=107) return 2.03;
      if(a<=254) return 2.41; if(a<=508) return 2.79; return 3.56;
    }
    if(groupLSE){
      if(a<=0.68) return 0.63; if(a<=7) return 0.76; if(a<=34) return 1.14; if(a<=107) return 1.40;
      if(a<=254) return 1.65; if(a<=508) return 2.03; return 2.41;
    }
    // Type E/X/P
    if(a<=0.68) return 0.51; if(a<=7) return 0.76; if(a<=34) return 1.14; if(a<=107) return 1.40;
    if(a<=254) return 1.65; if(a<=508) return 2.03; return 2.41;
  }

  function autoInsulationThickness(std, area, material, voltage, level){
    const isMV=isMvVoltage(voltage);
    const lvCtrl=['150/250V','250V','300V'].includes(String(voltage||''));
    const mat=String(material||'XLPE');
    let value=num(arguments[5],0.8), success=true;
    if(std==='MANUAL') return null;
    if(std==='IEC_60092-353'){
      if(isMV){ success=false; value=0; }
      else if(['XLPE','HEPR','XLPO','LSX'].includes(mat)){
        if(area<=16) value=0.7; else if(area<=35) value=0.9; else if(area<=120) value=1.1; else if(area<=185) value=1.2; else value=1.4;
      }else if(['EPR','LSE'].includes(mat)){
        if(area<=16) value=1.0; else if(area<=35) value=1.2; else if(area<=120) value=1.4; else value=1.6;
      }else value=1.0;
    }else if(std==='IEC_60092-354'){
      if(!isMV){ success=false; value=0; }
      else if(String(voltage).includes('3.6/6')) value=2.5;
      else if(String(voltage).includes('6/10')) value=3.4;
      else if(String(voltage).includes('8.7/15')||String(voltage).includes('15KV')) value=4.5;
      else if(String(voltage).includes('12/20')) value=5.5;
      else if(String(voltage).includes('18/30')||String(voltage).includes('35KV')) value=8.0;
      else { success=false; value=0; }
    }else if(std==='IEC_60092-376'){
      if(!lvCtrl || area>2.5){ success=false; value=0; }
      else value=area<=0.75 ? 0.5 : 0.6;
    }else if(std==='IEC_60502-1'){
      if(isMV){ success=false; value=0; }
      else value=iec60502LvInsulation(area, mat);
    }else if(std==='IEC_60502-2'){

      if(!isMV){ success=false; value=0; }
      else if(String(voltage).includes('3.6/6')) value=2.5;
      else if(String(voltage).includes('6/10')) value=3.4;
      else if(String(voltage).includes('8.7/15')) value=4.5;
      else if(String(voltage).includes('12/20')) value=5.5;
      else if(String(voltage).includes('18/30')) value=8.0;
      else { success=false; value=0; }
    }else if(std==='IEEE_1580'){
      value=ieee1580Insulation(area, mat, voltage);
    }else if(std==='NEMA_ICEA'){

      let mils=0, is133=(level==='133%');
      if(!isMV){
        if(area<=6) mils=is133?45:30; else if(area<=35) mils=is133?60:45; else if(area<=107) mils=is133?80:55; else if(area<=253) mils=is133?95:65; else mils=is133?110:80;
      }else{
        if(String(voltage).includes('5KV')||String(voltage).includes('3.6/6')) mils=is133?115:90;
        else if(String(voltage).includes('8.0KV')||String(voltage).includes('6/10')) mils=is133?140:115;
        else if(String(voltage).includes('15KV')||String(voltage).includes('8.7/15')) mils=is133?220:175;
        else if(String(voltage).includes('25KV')||String(voltage).includes('12/20')) mils=is133?320:260;
        else if(String(voltage).includes('35KV')||String(voltage).includes('18/30')) mils=is133?420:345;
        else mils=90;
      }
      value=parseFloat((mils*0.0254).toFixed(2));
    }else return null;
    return success ? value : 0;
  }
  function autoBeddingThickness(std, beddingType, beddingDivision, diameter){
    if(isOff(beddingType)) return 0;
    if(String(std||'').startsWith('IEC_60092') && beddingType==='LAPPED') return diameter<=40 ? 0.4 : 0.6;
    if(String(std||'').includes('IEC')){
      if(String(std||'').startsWith('IEC_60092')){
        if(beddingDivision==='Inner Sheath'){
          return Math.max(1.0, 0.04*diameter + 0.8);
        }
        if(diameter<=25) return 1.0; if(diameter<=35) return 1.2; if(diameter<=45) return 1.4; if(diameter<=60) return 1.6; if(diameter<=80) return 1.8; return 2.0;
      }
      if(beddingDivision==='Inner Sheath'){
        if(diameter<=25) return 1.0; if(diameter<=35) return 1.2; if(diameter<=45) return 1.4; if(diameter<=60) return 1.6; return 1.8;
      }
      if(diameter<=25) return 0.8; if(diameter<=45) return 1.0; return 1.2;
    }
    if(std==='IEEE_1580'){ if(diameter<=10.79) return 1.14; if(diameter<=17.78) return 1.52; if(diameter<=38.10) return 2.03; if(diameter<=63.50) return 2.79; return 3.56; }
    if(std==='NEMA_ICEA'){ if(diameter<=11.43) return 0.76; if(diameter<=25.40) return 1.14; if(diameter<=63.50) return 1.65; return 2.03; }
    return null;
  }
  function autoArmourThickness(std, armourType, diameter){
    if(isOff(armourType)) return 0;
    if(typeof global.getArmourThicknessByStandard==='function'){
      try{
        const r=global.getArmourThicknessByStandard(std, armourType, diameter);
        if(typeof r==='number') return num(r,0);
        if(r && (r.armorVal!==undefined || r.armorThick!==undefined)) return num(r.armorVal, num(r.armorThick,0));
      }catch(e){}
    }
    const type=String(armourType||'');
    if(type.includes('편조')||type.includes('Braid')){ if(String(std||'').startsWith('IEC_60092')){ if(diameter<=10) return 0.2; if(diameter<=30) return 0.3; return 0.4; } if(diameter<=10) return 0.3; if(diameter<=30) return 0.4; return 0.5; }
    if(type.includes('횡권')||type.includes('SWA')||type.includes('AWA')){
      if(String(std||'').startsWith('IEC_60502')){ if(diameter<=10) return 0.8; if(diameter<=15) return 1.25; if(diameter<=25) return 1.6; if(diameter<=35) return 2.0; if(diameter<=60) return 2.5; return 3.15; }
      if(diameter<=15) return 0.8; if(diameter<=25) return 1.25; if(diameter<=35) return 1.6; if(diameter<=45) return 2.0; if(diameter<=60) return 2.5; return 3.15;
    }
    if(type.includes('테이프')||type.includes('STA')){
      if(String(std||'').startsWith('IEC_60502')) return diameter<=30 ? 0.2 : 0.5;
      return 0.5;
    }
    return 1.0;
  }
  function autoSheathThickness(std, c, diameterUnderSheath){
    if(isOff(c.sheath_material)) return 0;
    if(String(std||'').includes('IEC')){
      if(!isOff(c.bedding_type) && c.bedding_division==='Inner Sheath' && isOff(c.armour_type)) return Math.max(1.0, 0.025*diameterUnderSheath+0.9);
      if(!isOff(c.bedding_type) && c.bedding_division==='Inner Sheath' && !isOff(c.armour_type)) return Math.max(0.8, 0.025*diameterUnderSheath+0.6);
      return Math.max(1.0, 0.04*diameterUnderSheath+0.8);
    }
    if(std==='IEEE_1580'){ if(diameterUnderSheath<=10.16) return 1.14; if(diameterUnderSheath<=25.40) return 1.52; if(diameterUnderSheath<=38.10) return 2.03; if(diameterUnderSheath<=50.80) return 2.39; return 2.77; }
    if(std==='NEMA_ICEA'){ const inch=diameterUnderSheath/25.4; if(inch<=0.425) return 1.14; if(inch<=0.700) return 1.52; if(inch<=1.500) return 2.03; if(inch<=2.500) return 2.79; return 3.56; }
    return null;
  }
  function applySpecRowAutoThickness(cfg, item, overrides){
    const raw=cfg.thickness_std || cfg.thickness_rule_mode || 'MANUAL';
    const std=(typeof global.normalizeThicknessRuleForCalc==='function') ? global.normalizeThicknessRuleForCalc(raw, cfg.v_rating) : raw;
    cfg.thickness_std=std;
    if(std==='MANUAL') return cfg;
    const manual=overrides || {};
    const hasManual=function(key){ return Object.prototype.hasOwnProperty.call(manual, key) && manual[key] !== undefined && manual[key] !== null && manual[key] !== ''; };
    const area=num(item && (item.nominalArea ?? item.size ?? item.sizeText), num(cfg.cond_size,0));
    const insu=autoInsulationThickness(std, area, cfg.standard_insu_material || cfg.ieee_type || cfg.insu_material, cfg.v_rating, cfg.nema_level);
    if(insu!==null && !hasManual('thick_insu')) cfg.thick_insu=insu;
    function lastValidOdBefore(rows, excluded){
      let od=0;
      (rows||[]).forEach(function(r){
        const proc=String(r.process||'');
        if(excluded.some(function(x){ return proc.includes(x); })) return;
        const v=num(r.od,NaN);
        if(Number.isFinite(v) && v>0) od=v;
      });
      return od;
    }
    const prelim=calculate(cfg);
    // 베딩 자동 두께는 연합뿐 아니라 바인더/공동차폐까지 완료된 실제 베딩 직하 외경을 사용한다.
    const dUnderBedding=lastValidOdBefore(prelim.rows,['베딩 공정','외장 공정','시스 공정']);
    const bed=autoBeddingThickness(std, cfg.bedding_type, cfg.bedding_division, dUnderBedding);
    if(bed!==null && !hasManual('thick_bedding')) cfg.thick_bedding=bed;

    const afterBedding=calculate(cfg);
    const dUnderArmour=lastValidOdBefore(afterBedding.rows,['외장 공정','시스 공정']);
    if(!hasManual('thick_armour')) cfg.thick_armour=autoArmourThickness(std, cfg.armour_type, dUnderArmour);

    const afterArmour=calculate(cfg);
    const dUnderSheath=lastValidOdBefore(afterArmour.rows,['시스 공정']);
    const sheath=autoSheathThickness(std, cfg, dUnderSheath);
    if(sheath!==null && !hasManual('thick_sheath')) cfg.thick_sheath=sheath;
    return cfg;
  }

  function calculateSpecRow(baseCfg, cores, item, overrides){
    const cfg=Object.assign({}, baseCfg||{});
    cfg.core_num=cores;
    if(item){
      cfg.cond_size = item.nominalArea ?? item.sizeText ?? item.size;
    }
    if(overrides) Object.assign(cfg, overrides);
    applySpecRowAutoThickness(cfg, item, overrides);
    const result=calculate(cfg);
    const rows=result.rows;
    function find(proc){ return rows.find(function(r){ return String(r.process).includes(proc); }); }
    const cond=find('도체')||{};
    const insu=find('절연 공정')||{};
    const cab=find('연합 공정')||{};
    const bed=find('베딩')||null;
    const arm=find('외장')||null;
    const sh=find('시스')||null;
    const condItem=result.conductor || item || {};
    const assemblyOD = num(cab.od, num(insu.od,0));
    const beddingOD = bed ? num(bed.od, assemblyOD) : assemblyOD;
    return {
      cores: result.config.core_num,
      sizeText: item?.sizeText || item?.size || condItem.size || String(cfg.cond_size),
      nominalArea: num(condItem.nominalArea, num(cfg.cond_size,0)),
      dbWeight: num(condItem.weight,0),
      condOD: num(cond.od, num(condItem.class2OD,0)).toFixed(1),
      insuThick: num(insu.thick,0),
      insulationInnerOD: Math.max(0, num(insu.od,0)-2*num(insu.thick,0)).toFixed(3),
      insulatedCoreOD: num(insu.od,0).toFixed(3),
      assemblyLayout: resolveLsCablingStandard(Object.assign({},cfg,{count:cores,coreNum:cores,core_num:cores})).layout,
      assemblyCase: resolveLsCablingStandard(Object.assign({},cfg,{count:cores,coreNum:cores,core_num:cores})).caseId,
      insuSuccess: true,
      assemblyOD: assemblyOD.toFixed(1),
      beddingThick: bed ? num(bed.thick,0) : 0,
      beddingSuccess: true,
      beddingOD: beddingOD.toFixed(1),
      armorVal: arm ? num(arm.thick,0) : 0,
      armorSuccess: true,
      sheathThick: sh ? num(sh.thick,0) : 0,
      sheathSuccess: true,
      overallOD: num(result.finalOD,0).toFixed(1),
      tolerance: (nonNegative(result.finalOD,0)*(nonNegative(result.config.od_tolerance_percent,5)/100)).toFixed(1),
      weight: Math.round(result.totalWeight),
      totalCostKm: result.totalCost,
      std: cfg.thickness_std || cfg.thickness_rule_mode || 'MANUAL',
      __rows: rows
    };
  }
  global.LSSharedMaterialEngine = { collectConfigFromDom:collectConfigFromDom, normalizeConfig:normalizeConfig, calculate:calculate, calculateSpecRow:calculateSpecRow, defaultLoss:defaultLoss, resolveLsCabling:resolveLsCabling, resolveLsCablingStandard:resolveLsCablingStandard, getLSAssemblyFactor:getLSAssemblyFactor, getLayerSpec:resolveLayerSpec, getTapeSpec:getTapeSpec, getShieldSpec:getShieldSpec, getArmourSpec:getArmourSpec, materialMaster:Object.freeze({tape:TAPE_MATERIALS,shield:SHIELD_MATERIALS,armour:ARMOUR_MATERIALS}) };
  global.LSCablingStandard = Object.freeze({
    coreLayout: LS_CORE_LAYOUT,
    pairGeneralLayout: LS_PAIR_GENERAL_LAYOUT,
    pairCcvFactors: LS_PAIR_CCV_FACTORS,
    pairIndividualCcvFactors: LS_PAIR_INDIVIDUAL_CCV_FACTORS,
    triadQuadCcvFactors: LS_TRIAD_QUAD_CCV_FACTORS,
    resolve: resolveLsCablingStandard,
    factor: getLSAssemblyFactor
  });
  global.resolveLsCablingStandard = resolveLsCablingStandard;
  global.getLSAssemblyFactor = getLSAssemblyFactor;
})(window);
