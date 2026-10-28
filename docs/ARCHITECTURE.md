# 현행 아키텍처와 개발 계약

2026-10-28 표준화 기준. 과거 구현 설계/밸런스 보고서는 역사적 근거이며 현재 코드 경로와 검사 명령은 이 문서와 AGENTS.md를 따른다. 게임 규칙은 최신 명시적 사용자 결정이 우선한다.

## 구조

| 디렉터리 | 책임 | 허용 의존 |
| --- | --- | --- |
| src/domain | 상태, 명령, 경제, 연구, 캠페인, wave 계획, 고정 tick 전투, 순수 balance 결합 | domain, 데이터 타입 |
| src/infrastructure | 구성 로드/구조 검증, 저장·마이그레이션·체크섬, 번역, desktop adapter | domain, infrastructure, data/locales, Ajv 생성 helper |
| src/application | 단일 준비 명령 진입, 저장 예약, Worker와 재생 조정, 설정 | domain, infrastructure, application, data/locales |
| src/adapters/ui | DOM shell, 기술트리, dialog, 공통 element | application/domain/infrastructure/ui/data/locales |
| src/adapters/phaser | Scene, 도형, 효과, UnitGroupMath 투영 | application/domain/infrastructure/phaser/assets/data/locales, Phaser |
| src/adapters/assets | stable asset ID 해석 | assets/data |
| src/bootstrap | 객체 생성과 연결 | 모든 런타임 계층 |
| desktop | Electron 보안/저장/종료 IPC | Electron/Node, data/locales |
| tools/verification | 소스/데이터/파일을 읽는 정적 검사 | 검사 도구, ValidateTechGraph만 실행형 공유 |
| tools/balance-* | 과거 밸런스 계산·보고 CLI | 별도 수치 작업의 도메인 소비자. 공식 검사에서 실행 금지 |

순환/미해결 의존/계층 역참조는 `.dependency-cruiser.cjs`가 오류로 처리한다.
domain의 JSDoc import 경계도 `check:references`가 검사한다.
ESLint는 domain/application/browser/Node의 globals를 분리한다.
기존 application의 Worker/localStorage/timer 조정은 유지하며 DOM/Phaser는 금지한다.

GameShell은 UI 생명주기와 modal/timer/동작 피드백 소유자다. TechTreeView/Modal/elements를 재사용한다.
GameCoordinator는 state/Worker/저장/재생 조정 소유자다. 별도 event bus/state store/DI 컨테이너는 없다.
공통 시스템을 추가하기 전에 이 두 소유자와 도메인 API의 기존 책임부터 확인한다.

## 현행 불변 계약

- Phaser 4.2.1, Vite 8.3.5, JavaScript ESM + strict checkJs. Electron 45.0.0의 main/preload만 CommonJS.
- 실제 캠페인은 Annual52Content 52주/1,664 spawn, candidate-v13 파생 ImplementationBalanceConfig이다. v1~v12 및 active.json은 보고/저장/구성 registry에서 참조하므로 임의 삭제하지 않는다.
- domain의 전투는 한 논리 엔티티/HP 풀을 사용한다. UnitGroupMath/FxLayer는 표현만 담당한다. damageByUnit은 기존 보고 소비자가 사용하는 공개 결과 필드다.
- Scene 등록: Boot, Preload, Title, Battlefield, Outcome. 시작/종료/구독/해제/Worker 메시지/프레임 callback 순서는 기능 계약이다.
- 저장 schema v1/v2/v3 및 SaveMigrations를 유지한다. ValidateAnnual52Save는 현행 필수 doctrine 조건과 JSON schema를 함께 검사한다. 저장 버전을 리팩토링 목적으로 변경하지 않는다.
- UI 치수/문자열/asset slot/locale/CSS/전투 수치/반올림/정렬/난수/타이밍은 별도 승인 없이 변경하지 않는다.

## 동적 참조와 미사용 분석의 진입점

| 연결 | 근거와 검사 |
| --- | --- |
| index.html → bootstrap/main | Vite entry, Knip Vite plugin |
| new Worker(new URL(...)) → combat-worker | Knip 명시 entry, check:references URL/module 검사 |
| desktop main → preload | package main, Knip 명시 preload entry, 정적 파일 확인 |
| Scene 문자열 | source AST의 super key, 등록 constructor, scene.start target 비교 |
| IPC 문자열 | main handle/send와 preload invoke/on/removeListener 채널 대응 |
| import.meta.glob JSON | registry/JSON schema/locale 검사. 후보 JSON을 미사용 파일로 자동 삭제하지 않음 |
| asset 경로/ID | slots + licenses + 실제 파일/hash/OFL 검사 |
| CLI | npm scripts 자동 인식. npm에 없는 probes/extract/merge/import-annual52/generate-notices는 명시 entry |

Knip entry에 `src/**/*.js`처럼 전체 소스를 넣어 미사용 경고를 숨기지 않는다.
entryExports도 검사하며 현재 ignoreDependencies/ignoreExports 목록은 없다.

## 검사 체계

`npm ci --ignore-scripts` 후 **`npm run check`**.

| 단계 | 책임 |
| --- | --- |
| check:format | Prettier: 손으로 작성하는 JS/MJS/CJS만 형식 검사 |
| lint | 구문·변수·실수·환경 globals·금지 플랫폼 사용. 경고도 실패 |
| typecheck | 전체 src/tools/desktop/config의 strict checkJs. 실행 코드 생성 없음 |
| check:generated | Ajv 생성 결과와 checked-in 파일 바이트 비교. 생성 함수를 호출하지 않음 |
| check:schemas | 실제 JSON의 schema, 리터럴 wave/doctrine/override 구조·수치 범위 검사 |
| check:graph | 연구 DAG/시설/연결/개방/성장 데이터 |
| check:locales | 표시 키/동적 접두어/placeholder/인코딩/누락/미사용 |
| check:assets | ID/경로/해시/대체 슬롯/라이선스/폰트 헤더 |
| check:deps | dependency-cruiser: 모듈 방향/해결/순환 |
| check:unused | Knip: 미사용 파일/export/의존성/진입 설정 |
| check:references | Scene/Worker/IPC/JSDoc 경계/억제 주석/doctrine schema 참조 |
| check:package | CSP/오프라인/버전 고정/배포 라이선스/생성 JS 구문·interop |
| build | Vite 정적 번들. 게임/Worker/Electron 기동 없음 |

원본 문서/역사 데이터/라이선스/게임 CSS는 코드 formatter의 대상이 아니다.
두 생성 JS(Annual52Content/schema-validators)는 formatter에서 제외하고 리터럴/생성/구문 검사로 관리한다.
generated validator의 타입 검사 제외는 생성기의 출력이며 수기 코드에는 허용하지 않는다.

`generate:validators`는 스키마 변경 후 명시적으로 실행하고 diff를 검토한다.
`check:generated`는 stale 파일을 고치지 않고 실패한다.
`audit:refactor`는 2026-10-28의 허용 이동/삭제 manifest를 기준으로 한 역사적 AST/보호 파일 비교다.
향후 승인된 기능 변경을 막는 일반 검사에 포함하지 않는다. 새로운 기능 작업에서는 별도의 해당 변경 계약을 기록한다.

CI는 `.github/workflows/static-check.yml`에서 같은 명령을 실행한다.
[checkout](https://github.com/actions/checkout)과 [setup-node](https://github.com/actions/setup-node)의 공식 사용 형식에 따라 Node 24와 read-only contents 권한을 사용한다.
로컬 검사 통과는 원격 CI 실행 성공을 의미하지 않으며, 저장소 branch protection 설정 변경은 이 작업에 포함하지 않는다.

## 코드 작성과 변경 검토

Prettier가 2칸/LF/singleQuote/semicolon/100-column 기준을 소유한다. ESLint에 스타일 규칙을 중복 정의하지 않는다.
일반 모듈과 클래스는 PascalCase, 함수·변수는 camelCase, tools는 kebab-case이다.
진입점 main/combat-worker/contracts/elements와 생성 파일의 이름은 보존한다.
새로운 runtime wrapper/barrel/추상 base class는 실제 여러 소비자와 책임 분리 근거 없이는 추가하지 않는다.

승인된 요청 → 관련 구현/동적 참조 조사 → 영향도/체크리스트 → 작은 변경 → 전체 check →
상수/상태/이벤트/외부 계약 diff → 미사용/구형 사본 확인 → 선택 파일 커밋 순서를 따른다.
문제를 ignore/suppression 또는 자동 fix로 숨기지 않는다. 발생한 동작 버그는 승인 전까지 별도로 남긴다.

## 검증의 한계

동작 테스트 runner/파일은 원래 없었다. 기존 check.mjs의 generated-validator fixture 및 grade 함수 실행은 제거했다.
생성 함수의 실제 CJS interop/Unicode 경계 반환, 모든 seed의 계산 결과, 이벤트 타이밍,
입력/렌더/저장 매체/재미/성능/패키지 기동은 정적으로 입증되지 않는다.
기존 의심 버그와 제거 검증 범위는 [사전 분석](REFACTOR_ANALYSIS_2026-10-28.md)에 기록한다.
