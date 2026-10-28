# 코드베이스 표준화 사전 분석

기준: `main` `86f6a79`, 작업 브랜치 `feat/codebase-standardization-20261028`.
작업 시작 시 tracked/untracked 변경 없음. 분석 대상은 tracked 226개 파일이며,
실행 코드 47개 src 파일, 13개 도구, Electron 2개 파일 및 구성/데이터/locale/문서 참조를 조사했다.
게임·브라우저·시뮬레이터는 실행하지 않았다. 이번 요청의 기능 보존/정적 검증 정책이 과거 문서의 절차보다 우선한다.

## 1. 현재 구조와 발견 사항

실제 설치/lockfile: Node >=24, Phaser 4.2.1, Vite 8.3.5, Electron 45.0.0,
electron-builder 26.18.0, ESLint 10.13.0, TypeScript 5.9.3, Ajv 8.20.0.
JavaScript ES modules를 유지하며 Electron만 CommonJS이다.

| 범위 | 현행 역할 / 문제 / 결정 |
| --- | --- |
| domain/model, economy, tech, waves, systems, util | 순수 계산과 명령/결과. 검증된 거래·전투·캠페인 계산 유지 |
| application/GameCoordinator | 준비 명령, 저장 예약, Worker, 재생 상태의 단일 진입. 기존 타이밍/이벤트 순서 유지 |
| adapters/phaser | Boot, Preload, Title, Battlefield, Outcome 및 도형/효과. 물리 엔진 설정 없음. 렌더 전용 |
| adapters/ui | DOM shell, 트리, modal, element 공통 구현. 게임 규칙은 도메인 호출. GameShell의 UI 생명주기 결합은 무리하게 분해하지 않음 |
| infrastructure | 설정/저장/번역/브리지. 순수 ResolveCombatBalance까지 포함되어 도메인 JSDoc이 인프라에 역의존 |
| presentation/UnitGroupMath | Phaser 두 파일만 소비하는 렌더 투영. 독립 계층 대신 adapters/phaser로 이동 |
| tools/check.mjs | 구문, 데이터, locale, 자산, 의존, 배포 및 실행형 fixture가 한 파일에 혼재 |
| tools/check-all.mjs | 구문 검사를 ESLint/checkJs와 중복 실행. 빌드는 별도. CI 없음 |
| ESLint | Node/browser globals를 모든 파일에 제공하여 경계를 검사하지 못함. disable 주석 방지 없음 |
| checkJs | strict 사용. 기준 실행에서 타입 오류 4건: ContentConfig의 v7 타입에 defenseDivisors 없음, WavePlanner 콜백 및 ResolveCombatBalance 콜백 2개의 implicit any |
| 형식 | 여러 문장을 한 줄에 압축, 들쭉날쭉한 따옴표/들여쓰기. formatter 없음 |
| 데이터 | 45개 data 파일, 3개 locale. 후보 v1~v13, 저장 v1/v2/v3, registry와 Vite glob 사용. 과거 후보도 계약·이력에 연결되어 삭제 불가 |
| 생성물 | Annual52Content는 52주/1,664 spawn 리터럴, schema-validators는 Ajv 생성물. 수동 포맷/리팩토링 대상에서 제외 |
| 외부 계약 | Worker 메시지, 저장 JSON/IPC, locale 키, asset ID, simulation report/hash/CLI 유지 |

Scene 등록 순서: Boot → Preload → Title → Battlefield → Outcome.
전환: Boot→Preload, Preload→Title(fonts.ready 이후), Title→Battlefield,
Battlefield→Title 또는 Outcome, Outcome→Title 또는 Battlefield.
Battlefield.update는 `app.update(delta)` 후 `draw()`이다.
subscribe/on/once 및 shutdown 해제 순서, HMR dispose 순서, Worker terminate/message 순서를 변경하지 않는다.
프레임 tick·전투 순서·난수·정렬·반올림·타이머·CSS·UI 텍스트는 보존 대상이다.

## 2. 유지 / 재구성 / 제거

| 대상 | 조치와 정적 근거 |
| --- | --- |
| 전투/경제/연구/캠페인/Scene/입력/저장 처리 | 본문 보존. AST 비교로 포맷과 import 이동을 구별 |
| ResolveCombatBalance | domain/model로 이동, 같은 함수 본문 유지. 기존 v7 계약과 선택적 확장 필드를 JSDoc으로 명시 |
| validateTechGraph | TechGraph에서 infrastructure/ValidateTechGraph로 이동. 데이터 구조 검사만 공용화하고 gameplay 함수와 분리 |
| UnitGroupMath | adapters/phaser로 이동, 기존 경로/사본 삭제 |
| AudioAdapter.js | import/생성/문자열 실행 참조 없는 무음 placeholder 클래스. 실제 설정 UI와 Phaser noAudio는 그대로 유지 |
| BalanceConfig.js | 소비자 없는 과거 후보 선택기. 실제 ImplementationBalanceConfig만 유지 |
| domain/commands/startWave.js | 소비자 없는 lockWave re-export. 실제 Campaign.startWave 유지 |
| PixelUnitRenderer.drawUnit / Geometry.radialAngle | 정의 외 코드 참조 없음, 문자열 dispatch 없음. Knip 결과와 대조 후 제거 |
| createCombat/stepCombat, validCell 등 내부 전용 export | 본문은 유지하고 외부 사용 없는 export만 제거. 공개 외부 계약이 아닌 저장소 내부 모듈임을 확인 |
| ValidateAnnual52Save의 stripDoctrine | 현행 스키마에 doctrines가 이미 존재함. 기존 명시적 doctrine guard는 유지하고 불필요한 필드 제거/복사 우회만 제거. schema enum/필드 계약을 정적으로 대조 |
| tools/check.mjs/check-all.mjs | 책임별 검사로 교체 후 삭제. 구형 check:all 별칭을 남기지 않음 |

의도적으로 보존: 저장 v1/v2 마이그레이션은 실제 지원 계약이다. `damageByUnit`은 보고 도구가 소비하는 결과 필드이며 새 호환 계층이 아니다. simulation 도구는 게임 계산의 소비자이자 과거 보고서 재현 도구로 보존하되 공식 검증에 연결하지 않는다. 역사 문서·보고서·후보 JSON·라이선스·에셋은 삭제하지 않는다. Vite glob/Worker URL/Electron preload/Scene 문자열/asset 슬롯/locale 템플릿은 정적 진입 목록과 참조 검사에 포함한다.

## 3. 단일 목표 아키텍처

새 프레임워크/DI 컨테이너/event bus/추상 base class를 도입하지 않는다.

| 계층 | 허용 의존 |
| --- | --- |
| domain | domain 및 데이터 타입. DOM/Phaser/Node IO/비결정 시간·난수 금지 |
| infrastructure | domain, infrastructure, data/locales, schema runtime helpers |
| application | domain, infrastructure, application, data/locales. DOM 조작/Phaser 금지. 기존 Worker·설정 storage·timer 조정 유지 |
| adapters/ui | application, domain, infrastructure, ui, data/locales. Phaser adapter 직접 참조 금지 |
| adapters/phaser | application, domain, infrastructure, phaser/assets, data/locales, Phaser |
| adapters/assets | asset 데이터. application/UI/Phaser scene 참조 금지 |
| bootstrap | 구성 루트. 모든 런타임 계층 연결 |
| desktop | Electron/Node, data/locales. renderer src import 금지 |
| tools | 검증/생성 도구. game src는 데이터 validator만 실행 허용. balance 도구는 별도 비검증 CLI |

의존 순환, 상위 계층 역참조, 미해결 import를 dependency-cruiser로 검사한다.
JSDoc 타입 경계도 소스 참조 검사로 확인한다. Phaser 전용 검사는 Scene 등록/전환 키,
Worker 파일, IPC 채널 및 플랫폼 참조를 소스 AST/리터럴로 읽는다. 게임 모듈을 로드하지 않는다.

## 4. 도구 책임 및 선택

| 도구 | 결정 / 유일한 책임 |
| --- | --- |
| ESLint | 유지/강화: 구문·미사용 지역 변수/import·실수·플랫폼 globals·inline 은폐 금지 |
| Prettier | 도입: 작성 코드 형식만. ESLint 스타일 규칙 추가 안 함. 생성물·원본 데이터/역사 문서는 제외 |
| TypeScript checkJs | 유지: JS/JSDoc 계약과 strict 타입. runtime 코드로 오류를 덮지 않음 |
| dependency-cruiser | 도입: 모듈 방향/순환/해결. 기존 수제 deps 그래프 제거 |
| Knip | 도입: 진입점 기반 미사용 파일/export/패키지. 동적 참조는 명시 진입점 및 근거 기록 |
| 프로젝트 검사 | 유지/분할: JSON Schema, 데이터 DAG/참조, locale, 자산 해시, CSP/배포, Phaser/IPC 소스 참조 |
| Vite build | 정적 번들 생성만. 브라우저/Electron/Worker를 실행하지 않음 |

공식 명령은 `npm run check` 하나이며 CI도 같은 명령을 사용한다.
개별 check:*는 원인 진단용이고 전체 통과를 대신하지 않는다.
도구 문서: [ESLint](https://eslint.org/docs/latest/use/configure/configuration-files),
[Prettier](https://prettier.io/docs/options), [checkJs](https://www.typescriptlang.org/tsconfig/checkJs.html),
[dependency-cruiser](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md),
[Knip](https://knip.dev/reference/configuration).

## 5. 기존 검증 조사와 사라지는 범위

test/spec 파일, 테스트 프레임워크/runner 의존성, test npm script, E2E 구성은 없다.
`check.mjs`에는 생성 validator의 valid/invalid/Unicode fixture 실행 및
`gradeForEnemyWave` 52회 실행, ImplementationBalanceConfig import에 따른 게임 구성 함수 실행이 있었다.
이는 실행 결과 비교이므로 제거한다. Ajv로 실제 JSON 데이터의 schema를 검사하는 것은 정적 콘텐츠 검사로 유지한다.
Graph validator는 데이터 구조만 검사하므로 동일 함수를 도구/구성 로더가 재사용한다.

대체: 생성기 --check 출력 바이트 비교, 생성 JS 구문/외부 import/interop 형태 검사,
원본 JSON Schema와 enum/데이터 참조 검사, AST 리터럴 읽기와 변경 전후 본문 비교.
대체하지 못하는 범위: 실제 생성 함수 호출의 예외 여부, Unicode 경계 판정 실행 결과,
모든 wave에 대한 grade 함수 반환값, 실제 게임 초기화. 이 범위를 PASS라고 보고하지 않는다.
밸런스 측정/보고 CLI는 보존하지만 check/CI에서는 절대 실행하지 않는다.

## 6. 영향도 및 위험

| 항목 | 기록 |
| --- | --- |
| 요구사항 | 기능을 바꾸지 않고 구조/형식/검증/AI 작업 절차 통일. 반례: bug fix를 섞거나 formatter가 값/문자열을 바꾸는 경우 |
| 기획 근거 | 2026-10-28 사용자 요청 최우선. 원 기획서/IMPLEMENTATION_DESIGN/HTML/최신 구현 비교. 현재 52주 규칙 유지 |
| 수정 범위 | src import/책임 위치/타입/미사용 정의, tools 검증, npm/lockfile, ESLint/formatter/의존 구성, README/AGENTS/CI/이번 작업 문서 |
| 간접 영향 | 생성 validator, worker 번들, save/IPC, report hash 참조. 데이터/locale/CSS/asset/저장 버전/CLI 결과 구조 그대로 |
| 미결정 | 게임 규칙 결정 없음. 의심 버그는 아래 보류 목록. 동작 동일성은 정적으로 완전 보장 불가 |
| 완료 기준 | 전체 check exit 0, AST/불변 파일 비교, 미사용 참조 정리, 구형 경로 없음, 단계별 commit, clean status |

소스 이동/포맷으로 과거 시뮬레이션의 source hash가 달라질 수 있다.
해시 검증/재개 거부 정책은 보존하며 과거 보고서를 현행 결과로 다시 표시하지 않는다.
원본에 이미 있는 하드코딩 게임 값은 이번 변경에서 다른 값/설정으로 옮겨 재해석하지 않는다.

## 7. 발견한 기존 문제 — 수정 보류

- `desktop/main.cjs`의 save:write는 schemaVersion 2만 허용하지만 현행 data/rules.json은 3이다. 저장 동작 버그 후보로 기록만 한다.
- `SaveMigrations`의 과거 상태 변환은 doctrines를 채우지 않지만 현재 validateState는 doctrines를 요구한다. 기존 저장 호환성 문제 후보이며 수정하지 않는다.
- Phaser 입력 listener 장기 재진입 수명과 Worker 오류 뒤 stale 이벤트 여부는 실행 없이 보장할 수 없다. 등록/해제 코드를 임의 개선하지 않는다.
- 기존 문서에는 100웨이브/v7 정책이 남아 있으나 현행 main은 52웨이브/v13 파생 구성이다. 역사 자료는 보존하고 새 아키텍처 문서/README에 현행 기준을 명시한다.
- save schema의 doctrines는 optional이고 별도 validator는 필수로 요구한다. 이 수용 집합을 유지한다.
- Vite 기준 빌드의 큰 chunk 경고가 있다. 분할/로드 순서를 바꾸는 최적화는 하지 않는다.

## 8. 기준 정적 실행 기록

- `npm run lint`: PASS.
- `npm run typecheck`: FAIL, 위 기존 타입 오류 4건. 후속 타입 선언 정리 범위로 등록.
- `npm run build`: PASS, Vite 95 modules; 큰 chunk 경고 보존.
- 기존 `check:all`/`check:schemas`: 내부 실행형 검사가 있으므로 실행하지 않음.
- 게임/브라우저/Electron/시뮬레이션: NOT_RUN.
