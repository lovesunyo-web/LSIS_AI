# TECH DATA / SPEC SHEET 적용 안내

1. `START_LOCAL_SERVER.bat`를 실행합니다.
2. 브라우저에서 `http://localhost:8000/index.html`로 접속합니다.
   - `index.html` 또는 `tech-data.html`을 탐색기에서 직접 열지 마십시오.
   - `file:///` 방식은 브라우저 보안 정책으로 탭 간 데이터 저장소/도면 전달이 제한됩니다.
3. 메인화면에서 사양서부표를 열고, `부표 일괄 작성` 후 `부표 확정`을 누릅니다.
4. `TECH DATA`에서 조건을 선택하고 `Generate / Update`를 누릅니다.
5. `SPEC SHEET`에서 문서 정보를 입력하고 `Save` 또는 `Print / PDF`를 사용합니다.

변경 사항
- 부표 확정 시 전체 행이 `cable_spec_rows`로 저장됩니다.
- TECH DATA는 확정 부표의 모든 행을 1:1로 표시합니다.
- TECH DATA는 빈 데이터 방어 처리로 `forEach` 오류가 발생하지 않습니다.
- A4 세로형 Spec Sheet 및 반복 헤더 / Revision History / Dimension Table / Technical Data를 제공합니다.
