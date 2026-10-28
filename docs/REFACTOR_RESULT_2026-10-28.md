# 코드베이스 표준화 결과와 정적 증거

> 이 문서는 최초 표준화 완료 시점의 기록이다. 이후 승인된 버그 수정과 미결 사항 재분류는 [후속 수정 보고서](REFACTOR_FOLLOWUP_2026-10-28.md)를 따른다.

기준 브랜치: `main` (`86f6a79`). 작업 브랜치: `feat/codebase-standardization-20261028`.
실행 환경: Windows PowerShell, Node 24.13.1, npm 11.10.0.
원격 push/main 병합은 수행하지 않았으며, 작업 브랜치와 기존 Git 이력을 보존한다.
확정 계획 18/18항목 완료. 이 수치는 요청한 리팩토링과 정적 검증 범위의 완료율이며 동작 동일성 또는 출시 준비의 보장이 아니다.

## 요구사항과 결과

| 항목 | 상태 / 근거 |
| --- | --- |
| 전체 분석·영향도·선행 계획 | 완료: REFACTOR_ANALYSIS_2026-10-28.md 및 단계별 계획 |
| 단일 아키텍처 | 완료: 기존 계층 유지, 순수 balance 결합을 domain으로, 렌더 투영을 Phaser adapter로 이동. 데이터 그래프 검사를 infrastructure에 분리 |
| 기능/수치/UI/계약 보존 | 정적 대조: 소스 53개, 이동 함수 1개, 보호 파일 54개. 실행형 동일성 증명 아님 |
| 미사용/중복 정리 | 참조 없는 파일 3개, 함수 2개, export 3개 제거. 구형 check 파일 2개 제거. 이동된 경로에 호환 사본 없음 |
| 정적 검증 통합 | `npm run check`: format/lint/checkJs/generated/schema/graph/locale/assets/deps/unused/references/package/build |
| 형식·AI 규칙 | AGENTS.md/ARCHITECTURE.md/Prettier/ESLint/의존·미사용·소스 참조 검사 |
| 자동 적용 | push/PR CI에 동일 npm run check 구성. 원격 실행 결과는 아직 없음 |
| 전체 검토 | 독립 읽기 전용 리뷰 완료. Critical/Minor 0건, Important 검사 도구 누락 2건 보완. 새 게임 동작 회귀 발견 없음(정적 범위) |

## 중요한 구조 변경

- `ResolveCombatBalance`의 함수 본문은 유지하고 domain/model로 이동했다. domain 타입이 infrastructure로 역참조하지 않는다.
- `UnitGroupMath`는 유일한 소비자인 Phaser renderer/FX와 같은 adapter에 둔다.
- `validateTechGraph`는 게임 판단과 분리된 데이터 구조 검사이며 구성 로더와 검사 도구가 동일 함수를 사용한다.
- `AudioAdapter`, 미사용 `BalanceConfig`, `lockWave` re-export, `drawUnit`, `radialAngle`을 제거했다. 실제 무음 설정/도형 fallback/캠페인 startWave는 그대로다.
- `createCombat`, `stepCombat`, `validCell`은 내부 함수로 유지한다.
- 저장 v3의 기존 doctrine 필수 guard를 유지하고 이미 스키마가 지원하는 doctrine을 제거/복사하던 stripDoctrine만 제거했다. 스키마 enum/추가 키/필수 필드의 일치를 검사한다.
- 시뮬레이터/보고 도구의 결과 형태와 CLI는 보존한다. resolver가 domain 순회에 포함되므로 별도 중복 해시·스냅샷 추가만 제거했다. 소스 경로/포맷 변화로 기존 해시는 달라지며 기존 보고서를 현행 증거로 재사용하지 않는다.
- GameShell/GameCoordinator는 기존 UI/조정 생명주기 소유권을 유지한다. 파일을 줄이기 위한 전달 클래스, 새 state store, event bus, DI 컨테이너를 만들지 않았다.

## 독립 리뷰와 보완

- AST 감사가 prefix/postfix의 숫자형 `operator` 속성을 누락한다는 지적을 반영했다. 연산자와 BigInt 리터럴도 지문에 포함한다. 리뷰어의 별도 소스 대조에서도 기존/현재 단항 연산자 10,819개에 차이는 없었다. 게임 회귀 수정이 아니라 감사 도구의 누락 보완이다.
- 실제 BrowserWindow의 `webPreferences.preload` 경로와 ConfigLoader/bootstrap의 3개 `import.meta.glob` 패턴·`eager`·`import` 옵션, registry/locale의 포함 관계를 AST로 검사하도록 보완했다. 고정된 파일의 존재만 확인하던 검사를 실제 연결 검사로 바꿨다.
- 보완 후 `check:references`, strict checkJs, 강화된 `audit:refactor`가 PASS했다. 최종 전체 검사 결과는 아래 기록한다.
- 기존 desktop/migration 문제는 기능 보존 지시 때문에 수정하지 않았다. 실제 저장 장치, CJS helper 실행 결과, listener 수명/이벤트 타이밍, UI 및 원격 CI는 미검증으로 남긴다. 이를 정적 PASS로 바꾸지 않는다.

## 검증 기록

| 명령 | 실제 결과 |
| --- | --- |
| 기준 `npm run lint` | PASS |
| 기준 `npm run typecheck` | 기존 오류 4건 FAIL. 타입 선언만 수정 후 PASS |
| 기준 `npm run build` | PASS, 95 modules. 큰 chunk 경고 존재 |
| S1 전체 `npm run check` | PASS |
| S2 전체 `npm run check` | PASS, 의존 101 modules/195 dependencies 위반 0, Knip 문제 0 |
| S3 전체 `npm run check` | PASS, 형식/환경 규칙/네이밍/억제 금지 포함 |
| 최종 리뷰 보완 후 전체 `npm run check` | PASS, 101 modules/195 dependencies 위반 0, Knip 문제 0, Vite 96 modules 빌드 성공 |
| `npm run audit:refactor` | PASS: 53 소스 + 1 이동 함수 + 54 보호 파일. 최종 리뷰에서 감사 도구 자체도 검토 |
| `git diff --check` | PASS |
| 게임/브라우저/Worker/Electron/단위/통합/E2E/성능/밸런스 | NOT_RUN |
| GitHub Actions 원격 실행 / 실제 패키지 생성·설치 | NOT_RUN |

S2/S3 정적 빌드의 Worker `combat-worker-DnvApHLN.js`와 CSS `index-DtIJNp4-.css`는 기준 빌드와 동일하다.
main 번들은 이동/사용하지 않는 코드/stripDoctrine 제거로 달라졌다. `build`가 출력하는 큰 chunk 경고는 기존 문제로 남겼다.
보호 범위는 data/locales/public 전체와 index.html, styles.css, desktop/builder.json이다.
강화된 AST 감사 지문: `97ff0b77cef0f81a012dafc60819af42b40ab3b0de3acda35425b73341051bfb`.

## 제거된 실행형 검증 범위

원래 test/spec/테스트 runner 의존성은 없었다. 기존 check.mjs의 16개 generated-validator valid/invalid/Unicode fixture 쌍과 grade 함수 52회 결과 확인, 구성 모듈 import에 따른 게임 함수 실행을 제거했다.
대신 schema/실제 데이터/생성 소스 바이트/interop 구문/AST 참조를 검사한다.
생성 함수 호출 예외, Unicode 경계 실행 결과, 모든 wave/seed 계산 결과는 정적으로 검증했다고 표시하지 않는다.
소스/구조 비교 역시 실제 이벤트 타이밍·입력·렌더·장치 저장·성능·재미의 검증이 아니다.

## 앞으로 강제되는 규칙

1. 작업 브랜치 → 관련 구현/동적 참조 조사 → 영향도/계획 → 공통 구현 재사용 → 작은 변경 → 전체 check → 미사용/구형 사본 확인 → 선택 파일 커밋.
2. domain은 플랫폼/IO/비결정 난수·시각에 의존하지 않고, application은 DOM/Phaser를 참조하지 않는다. 계층 방향과 순환은 자동 검사한다.
3. Prettier가 형식을, ESLint가 구문·변수·환경·실수를, checkJs가 타입을, Knip이 미사용 항목을 담당한다. 중복 구문 실행 도구는 없다.
4. Scene/Worker/preload/glob/IPC와 데이터/locale/asset 문자열 연결을 검사한다. 동적 entry를 근거 없이 전부 등록해 미사용 경고를 숨기지 않는다.
5. 수기 코드의 타입/ESLint/Prettier 억제 주석을 허용하지 않는다. 생성 Ajv 파일은 별도 소스/구문/interop 검사를 받는다.
6. 기능 추가/개선/버그 수정은 별도 승인 범위다. 리팩토링은 상태/계산/이벤트 순서/외부 계약 변경을 허가하지 않는다.

## 미결 사항과 한계

- 기존 desktop save:write는 schemaVersion 2만 허용하고 현재 게임은 3을 쓴다. 이번에는 고치지 않았다.
- 기존 v1/v2 migration은 doctrines를 채우지 않으며 현재 상태 검사는 이를 요구한다. 별도 저장 호환성 수정이 필요할 수 있다.
- 실제 Scene 재진입 시 input listener 수명, Worker 오류 경합, 저장 장치/종료 복구, 렌더/오프라인 기동은 미검증이다.
- fallback asset 슬롯과 기존 라이선스 파일을 보존했다. 최종 아트/음악 제작 또는 라이선스 추가는 이번 범위가 아니다.
- CI workflow를 추가했지만 서버 측 branch protection 설정이나 원격 CI 실행 성공을 주장하지 않는다.
- 정적 검증만으로 기존 동작의 완전한 동일성이나 출시 준비를 보장할 수 없다.

## 커밋

- `7d91beb`: 정적 검사 통합/타입 선언 정리.
- `d460f09`: 책임 경계/미사용 코드 정리/계약 비교.
- `e64b54d`: 형식/AI 표준/자동 규칙/CI.
- `c4eccf1`: 최종 리뷰에서 발견한 단항 연산자 및 preload/glob 검사 누락 보완.
- 이 보고서와 완료 계획은 `docs: record standardization evidence and remaining risks` 커밋으로 기록한다. 전체 이력은 `git log --oneline 86f6a79..HEAD`로 확인한다.

## 검증한 변경 파일

최종 Git diff 기준 88개 경로(추가 23/수정 58/삭제 7; 이동은 이전·새 경로로 각각 집계)다. 대다수 실행 코드 수정은 Prettier 형식 변경이며 AST 비교 근거를 함께 확인한다. 삭제 파일은 참조 제거와 대체 경로를 확인한 대상이다.

| Git | Path |
| --- | --- |
| A | [.dependency-cruiser.cjs](../.dependency-cruiser.cjs) |
| A | [.editorconfig](../.editorconfig) |
| A | [.github/workflows/static-check.yml](../.github/workflows/static-check.yml) |
| A | [.prettierignore](../.prettierignore) |
| A | [.prettierrc.json](../.prettierrc.json) |
| M | [AGENTS.md](../AGENTS.md) |
| M | [desktop/main.cjs](../desktop/main.cjs) |
| M | [desktop/preload.cjs](../desktop/preload.cjs) |
| A | [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) |
| A | [docs/REFACTOR_ANALYSIS_2026-10-28.md](../docs/REFACTOR_ANALYSIS_2026-10-28.md) |
| A | [docs/REFACTOR_RESULT_2026-10-28.md](../docs/REFACTOR_RESULT_2026-10-28.md) |
| A | [docs/refactoring/2026-10-28-contract.json](../docs/refactoring/2026-10-28-contract.json) |
| A | [docs/superpowers/plans/2026-10-28-codebase-standardization.md](../docs/superpowers/plans/2026-10-28-codebase-standardization.md) |
| M | [eslint.config.js](../eslint.config.js) |
| M | [jsconfig.json](../jsconfig.json) |
| A | [knip.json](../knip.json) |
| M | [package-lock.json](../package-lock.json) |
| M | [package.json](../package.json) |
| M | [README.md](../README.md) |
| M | [src/adapters/assets/AssetRegistry.js](../src/adapters/assets/AssetRegistry.js) |
| M | [src/adapters/phaser/BattlefieldScene.js](../src/adapters/phaser/BattlefieldScene.js) |
| M | [src/adapters/phaser/BootScene.js](../src/adapters/phaser/BootScene.js) |
| M | [src/adapters/phaser/FxLayer.js](../src/adapters/phaser/FxLayer.js) |
| M | [src/adapters/phaser/OutcomeScene.js](../src/adapters/phaser/OutcomeScene.js) |
| M | [src/adapters/phaser/PixelUnitRenderer.js](../src/adapters/phaser/PixelUnitRenderer.js) |
| M | [src/adapters/phaser/PreloadScene.js](../src/adapters/phaser/PreloadScene.js) |
| M | [src/adapters/phaser/TitleScene.js](../src/adapters/phaser/TitleScene.js) |
| A | [src/adapters/phaser/UnitGroupMath.js](../src/adapters/phaser/UnitGroupMath.js) |
| M | [src/adapters/ui/elements.js](../src/adapters/ui/elements.js) |
| M | [src/adapters/ui/GameShell.js](../src/adapters/ui/GameShell.js) |
| M | [src/adapters/ui/Modal.js](../src/adapters/ui/Modal.js) |
| M | [src/adapters/ui/TechTreeView.js](../src/adapters/ui/TechTreeView.js) |
| M | [src/application/combat-worker.js](../src/application/combat-worker.js) |
| M | [src/application/GameCoordinator.js](../src/application/GameCoordinator.js) |
| M | [src/bootstrap/main.js](../src/bootstrap/main.js) |
| D | `src/domain/commands/startWave.js` |
| M | [src/domain/economy/EconomyService.js](../src/domain/economy/EconomyService.js) |
| M | [src/domain/economy/InvestmentLedger.js](../src/domain/economy/InvestmentLedger.js) |
| M | [src/domain/economy/RefundService.js](../src/domain/economy/RefundService.js) |
| M | [src/domain/model/Campaign.js](../src/domain/model/Campaign.js) |
| M | [src/domain/model/ContentConfig.js](../src/domain/model/ContentConfig.js) |
| M | [src/domain/model/contracts.js](../src/domain/model/contracts.js) |
| M | [src/domain/model/Doctrine.js](../src/domain/model/Doctrine.js) |
| M | [src/domain/model/GameState.js](../src/domain/model/GameState.js) |
| A | [src/domain/model/ResolveCombatBalance.js](../src/domain/model/ResolveCombatBalance.js) |
| M | [src/domain/systems/DamageResolver.js](../src/domain/systems/DamageResolver.js) |
| M | [src/domain/systems/StepSimulation.js](../src/domain/systems/StepSimulation.js) |
| M | [src/domain/tech/TechGraph.js](../src/domain/tech/TechGraph.js) |
| M | [src/domain/tech/TechVisibility.js](../src/domain/tech/TechVisibility.js) |
| M | [src/domain/util/DeterministicRng.js](../src/domain/util/DeterministicRng.js) |
| M | [src/domain/util/Geometry.js](../src/domain/util/Geometry.js) |
| M | [src/domain/util/Result.js](../src/domain/util/Result.js) |
| M | [src/domain/waves/FormationService.js](../src/domain/waves/FormationService.js) |
| M | [src/domain/waves/WavePlanner.js](../src/domain/waves/WavePlanner.js) |
| D | `src/infrastructure/AudioAdapter.js` |
| D | `src/infrastructure/BalanceConfig.js` |
| M | [src/infrastructure/ConfigLoader.js](../src/infrastructure/ConfigLoader.js) |
| M | [src/infrastructure/DesktopBridge.js](../src/infrastructure/DesktopBridge.js) |
| M | [src/infrastructure/ImplementationBalanceConfig.js](../src/infrastructure/ImplementationBalanceConfig.js) |
| M | [src/infrastructure/Localize.js](../src/infrastructure/Localize.js) |
| D | `src/infrastructure/ResolveCombatBalance.js` |
| M | [src/infrastructure/SaveMigrations.js](../src/infrastructure/SaveMigrations.js) |
| M | [src/infrastructure/SaveRepository.js](../src/infrastructure/SaveRepository.js) |
| M | [src/infrastructure/ValidateAnnual52Save.js](../src/infrastructure/ValidateAnnual52Save.js) |
| A | [src/infrastructure/ValidateTechGraph.js](../src/infrastructure/ValidateTechGraph.js) |
| D | `src/presentation/UnitGroupMath.js` |
| M | [tools/balance-compare.mjs](../tools/balance-compare.mjs) |
| M | [tools/balance-extract.mjs](../tools/balance-extract.mjs) |
| M | [tools/balance-merge.mjs](../tools/balance-merge.mjs) |
| M | [tools/balance-policy.mjs](../tools/balance-policy.mjs) |
| M | [tools/balance-probes.mjs](../tools/balance-probes.mjs) |
| M | [tools/balance-report.mjs](../tools/balance-report.mjs) |
| M | [tools/balance-sim.mjs](../tools/balance-sim.mjs) |
| D | `tools/check-all.mjs` |
| D | `tools/check.mjs` |
| M | [tools/generate-notices.mjs](../tools/generate-notices.mjs) |
| M | [tools/generate-validators.mjs](../tools/generate-validators.mjs) |
| M | [tools/import-annual52.mjs](../tools/import-annual52.mjs) |
| A | [tools/verification/check-assets.mjs](../tools/verification/check-assets.mjs) |
| A | [tools/verification/check-graph.mjs](../tools/verification/check-graph.mjs) |
| A | [tools/verification/check-locales.mjs](../tools/verification/check-locales.mjs) |
| A | [tools/verification/check-package.mjs](../tools/verification/check-package.mjs) |
| A | [tools/verification/check-references.mjs](../tools/verification/check-references.mjs) |
| A | [tools/verification/check-schemas.mjs](../tools/verification/check-schemas.mjs) |
| A | [tools/verification/compare-refactor.mjs](../tools/verification/compare-refactor.mjs) |
| A | [tools/verification/context.mjs](../tools/verification/context.mjs) |
| A | [tools/verification/source.mjs](../tools/verification/source.mjs) |
| M | [vite.config.js](../vite.config.js) |
