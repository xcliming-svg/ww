# WW2 스킬트리 오토 디펜스

JavaScript ES modules, Phaser 4.2.1, Vite 8.3.5, Electron 45.0.0 기반의 오프라인 게임이다. 현재 main의 캠페인은 52주이며 전투 밸런스는 candidate-v13에서 파생된다. 과거 100웨이브/v7 보고서는 역사 자료다.

작업 전 [AGENTS.md](AGENTS.md)와 [현행 아키텍처](docs/ARCHITECTURE.md)를 읽는다. 원 기획서와 최신 사용자 결정은 게임 규칙의 근거이고, 구조/검증 절차는 현행 문서를 따른다.

## 개발과 공식 검증

Node 24 이상과 npm을 사용한다. 직접 의존성 버전과 package-lock.json을 함께 고정한다.

```powershell
npm ci --ignore-scripts
npm run check
```

`check`는 Prettier, ESLint, strict checkJs, 생성 소스 비교, JSON Schema/연구 DAG/locale/자산, dependency-cruiser, Knip, Scene/Worker/IPC 참조, 패키지 정적 검사와 Vite 빌드를 순서대로 수행한다. 게임·브라우저·Worker·Electron을 실행하지 않는다. CI도 같은 명령을 사용한다.

- `npm run format`: 손으로 작성한 JS/MJS/CJS 형식 통일. 생성 데이터/validator, 게임 JSON/CSS, 역사 문서는 제외한다.
- `npm run generate:validators`: 스키마 변경 후 standalone validator 재생성. 출력 diff를 검토한다. `check:generated`는 stale 출력이면 덮어쓰지 않고 실패한다.
- `npm run build`: 정적 번들 생성만 한다.
- `npm run audit:refactor`: 2026-10-28 기준 변경 manifest와 AST/보호 파일을 비교하는 역사적 감사 명령이다. 향후 승인된 기능 변경의 일반 수용 검사에는 포함하지 않는다.

개별 check:* 명령은 실패 원인 진단용이다. 검증을 통과시키기 위해 ignore나 타입 무시를 추가하지 않는다. 상세 책임은 [아키텍처의 검사 표](docs/ARCHITECTURE.md)에 있다.

## 실행·패키징 도구

`dev`, `desktop`, `package:win` 명령은 기존 개발/배포 계약으로 보존한다. 공식 검증에는 포함하지 않으며 이번 표준화 작업에서는 실행하지 않았다. `npm ci --ignore-scripts`는 Electron 바이너리 설치를 보장하지 않는다.

`balance:simulate`, `balance:report`, `balance:compare`와 tools/balance-*도 기존 수치/보고 계약으로 보존한다. 정적 검사나 CI에서는 실행하지 않는다. 별도 사용자 요청이 있을 때만 수치 작업으로 사용한다. 소스/경로/정책/설정 해시가 바뀐 기존 보고서를 현행 결과처럼 재사용하지 않는다.

## 책임과 저장

- domain: 순수 게임 규칙, 거래, 연구, 진형, 캠페인, 고정 tick 전투.
- application: 단일 명령 진입, 저장 예약, Worker와 재생 조정.
- adapters: DOM UI 및 Phaser 표현. infrastructure: 구성/번역/저장/브리지. bootstrap: 객체 연결.
- 저장/체크섬/마이그레이션/IPC, locale 키, asset ID는 외부 계약이다. 구조 정리 과정에서 변경하지 않는다.
- 에셋/음악의 기존 fallback와 Noto Sans KR OFL 원문·해시를 보존한다. 없는 에셋을 가정하지 않는다.

정적 통과는 실제 입력·렌더·장치 저장·오프라인 기동·설치·성능·재미 또는 동작의 완전한 동일성을 보증하지 않는다. 기존 저장 버전 불일치 등 의심 문제와 제거된 실행형 검증 범위는 [사전 분석](docs/REFACTOR_ANALYSIS_2026-10-28.md)에 기록했다.
