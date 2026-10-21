# FULL SPEC Builder 추가 개발본

## 실행 흐름

1. 기존 로직으로 메인화면 → 사양서부표 → TECH DATA → SPEC SHEET를 완료합니다.
2. SPEC SHEET 상단의 `FULL SPEC에 추가`를 눌러 현재 품목을 IndexedDB에 저장합니다.
3. 다른 품목도 동일하게 반복합니다.
4. 메인화면의 `FULL SPEC 작성` 버튼을 눌러 통합 문서를 작성합니다.
5. 적용 STD PDF를 업로드하고 추출 후보를 원문과 대조하여 승인합니다.
6. 자동 생성된 Scope, Cable Type, Construction & Materials, Test Items, Material Properties를 수정합니다.
7. HTML/PDF/PPTX 또는 프로젝트 JSON으로 내보냅니다.

## 반영 사항

- 기존 계산·도면·부표·TECH DATA 로직은 변경하지 않았습니다.
- Cable Type 표에는 선심수와 도체 사이즈를 제외합니다.
- MV 구조는 Conductor Shield 및 Insulation Shield를 생성하며, Insulation Shield를 Non-metallic Screen과 Metallic Screen으로 구분합니다.
- 표지는 LS 로고, 인증 로고/표준명, 문서정보, 중앙 제목, 10행 Revision History, 경고 푸터로 구성합니다.
- Revision History는 아래에서부터 Rev.0, Rev.1 순으로 올라가도록 입력할 수 있습니다.
- 원본 STD는 GitHub에 업로드되지 않습니다. 브라우저 메모리에서 분석하며 승인 결과만 프로젝트에 저장됩니다.

## 주의사항

- STD 자동 추출은 후보 검색 기능입니다. 승인 전 반드시 원문 페이지와 조항을 확인해야 합니다.
- 스캔 PDF는 텍스트가 없으면 OCR이 필요합니다.
- PPTX는 현재 A4 HTML 페이지를 슬라이드 이미지로 내보내는 방식입니다.
- CDN의 PDF.js, html2canvas, PptxGenJS를 사용하므로 STD 분석 및 PPTX 출력 시 인터넷 연결이 필요합니다.


## 2026-07-22 통합 양식 업데이트

- 표지 인증 로고는 헤더 위에 작게 배치되며 편집 화면에서 표시 여부를 선택할 수 있습니다.
- 첫 번째 수집 SPEC SHEET의 케이블 단면도를 표지 비주얼로 사용합니다.
- Revision History 제목은 삭제되고 개정/승인 표 하나로 통합됩니다.
- Construction & Materials는 품명별 표가 아니라 전체 품명을 통합한 3.1, 3.2 형식의 서술식 조항으로 생성됩니다.
- 일부 품명에만 적용되는 조항은 `(for xxx)` 또는 제품군 이름으로 표시됩니다.
- Aramid Yarn Reinforcement와 Armour, Inner Covering과 Inner Sheath를 별도 구조로 관리합니다.

## 2026-09 Requirement Library 및 Full Spec 목차

- STD / Company / Project 출처와 재질 프로필, 시험·물성 Requirement를 별도 라이브러리로 관리합니다.
- 출처 문서와 Requirement 행이 모두 APPROVED인 경우에만 Full Spec의 5장 시험표와 6장 물성표에 확정값으로 반영됩니다. DRAFT 행은 출력 근거로 사용하지 않습니다.
- 각 Requirement에는 출처, 판본, 조항·표·원문 페이지, 적용 재질·층·전압·케이블군·아머·내화 조건, 시험방법, 값·단위·조건, 증빙 기록을 남길 수 있습니다.
- 라이브러리는 브라우저 저장소에 재사용용으로 저장되며, 동시에 현재 Full Spec 프로젝트 JSON에 스냅샷으로 저장됩니다. 이후 공용 라이브러리를 수정해도 저장된 프로젝트의 기준값은 바뀌지 않습니다.
- 기존 STD 분석 후보의 요구사항 라이브러리 초안으로 복사 버튼을 누르면 DRAFT 행으로 복사됩니다. 원문과 대조한 뒤 출처와 행을 모두 승인해야 합니다.
- 라이브러리 자체도 JSON으로 저장·불러오기 할 수 있습니다.

### 새 문서 순서

1. 표지 및 문서관리
2. 적용 범위 및 설계·설치 조건
3. 적용 표준
4. 제품 통합표: 전압 / 품명 / 구조·재질 Description / Product Data Package 참조
5. 시험방법 및 Requirement
6. 절연·베딩·시스 물성표
7. Identification
8. Cable Marking
9. Packaging
10. 제품별 Product Data Package

제품별 패키지는 2D/3D 단면도 → 층별 구조·재질 설명 → 치수·구조·중량표 → TECH DATA 순서이며, 제품 통합표의 10.1, 10.2 참조를 통해 해당 패키지로 연결됩니다.
