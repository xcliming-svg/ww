# 기술트리 리뷰 4건 수정 계획과 검증 기록

> 실행: 현재 세션에서 직접 구현하고 마지막에 독립 코드 리뷰. AGENTS.md의 정적 검사 제한이 일반 TDD 절차에 우선한다.

**목표:** 2026-10-27 리뷰의 시뮬레이터 시작 실패, ESC 정지 해제, 정찰 카드 잘림, 진행 효과 재시작을 수정한다.
**기준:** `feat/tech-tree-battle-ui-clean-20261027` / `6edc545`.
**작업 브랜치:** `fix/tech-tree-review-20261027`.
**명세:** `docs/TECH_TREE_BATTLE_UI_IMPLEMENTATION_SPEC_2026-10-27.md` §3, §5.1, §6.1.
**구조:** 순수 도메인 명령은 유지하고 자동 편성 정책과 표현 계층의 상태 관리를 수정한다. 저장 스키마와 게임 수치를 변경하지 않는다.
**기술:** JavaScript ESM, Phaser 표현 계층, DOM/CSS, Node 오프라인 시뮬레이터.

## 영향도

| 항목 | 내용 |
| --- | --- |
| 요구사항 | 자동 정책의 유료 초기 진행 누락 / 메뉴 정지를 계산 결과가 덮어씀 / 좌우 카드가 스크롤 영역 밖 / 자동저장 렌더가 애니메이션을 재시작 |
| 기획 근거 | 명세 §3.2 메뉴·정찰, §3.3 원자적 거래와 연출, §5.1 초기 160→20, §6.1 정책의 새 시작 절차 |
| 수정 범위 | `tools/balance-policy.mjs`, `tools/balance-sim.mjs`, `data/simulation/policy-profiles.json`, `GameCoordinator.js`, `GameShell.js`, `styles.css`, 필요 UI 구성·스키마, 이 기록 |
| 간접 영향 | respec 뒤 기본 병력 재구매, 시뮬 실패 원인 보고, Worker 완료/실패, 자동저장과 정보창 재개방, 작은 전장 패널 |
| 보존 계약 | v11/active·v12 비용/능력치/보상/해금 웨이브, 저장 v3, locale·에셋·라이선스, main |
| 미결정 | 새 게임 규칙 없음. HQ 환불·구제 자금·추가 강화 효과의 기존 승인 대기는 유지 |
| 완료 기준 | 아래 4개 수정의 코드 경로 검토, 정적 검사/빌드 통과, 소수 seed·모든 정책의 오프라인 측정에서 시작 오류 제거 |

## 검증 원칙

- 브라우저·Phaser 플레이·스크린샷·성능 검사는 실행하지 않는다.
- UI의 실행형 단위/모의 DOM 테스트도 이번 AGENTS.md 정적 검사 범위 밖이므로 실행하지 않는다. 정적 검토와 타입·구문·빌드로 확인하고 실기 보장과 구분한다.
- 시뮬레이터는 기존 CLI로 2 seed × 9정책만 전후 측정한다. 이는 100웨이브 승률 인증이나 밸런스 최적화가 아니다.
- 원본 `ww/`의 새 브랜치에서 순차 수정한다. 기존 리뷰와 동일한 깨끗한 커밋에서 시작했으며 별도 작업 트리·원격 변경은 필요 없다.
- 검토 초점: 계산 대기 중 메뉴 열기, 수동 pause 후 메뉴 닫기, 자동저장 지연·실패 중 진행률, 연출 중 정보창 재개방, respec의 시작 기술 환불.

## 작업 목록

- [x] **1. 자동 편성:** 모든 정책이 도메인 명령으로 HQ→병영→소총 연구→초기 2명을 구매한다. 첫 웨이브 필수 지출 후 잔액 20을 보존하고, respec 이후에도 기본 병력 경로를 복구한다. 리포트에 실패 단계·웨이브·코드를 남긴다. `node --check tools/balance-policy.mjs`, `node --check tools/balance-sim.mjs`, 소규모 전후 측정 통과(아래 결과).
- [x] **2. 메뉴 정지:** 사용자 `paused`와 메뉴 `menuPaused`를 분리하고 `update()`에서 둘 다 확인한다. Worker 완료는 메뉴 상태를 변경하지 않으며 닫기는 사용자 상태를 변경하지 않는다. 계산 전 저장 대기·실패 경로도 포함. 타입 검사 및 정적 경로 검토 통과, 실기 미실행.
- [x] **3. 정찰 배치:** CSS grid로 전장·동서남북 카드가 각각 영역을 점유하도록 하여 패널 밖 transform을 없앴다. 미표시 방향은 빈 영역이며 기존 간격을 상속한다. 빌드 및 CSS 정적 검토 통과, 실기 미실행.
- [x] **4. 진행 연출:** `progress.start`에 시작 시각을 기록하고 `styleProgress()`에서 경과 시간을 음수 CSS delay로 반영한다. 정보창 재생성·재개방 시 같은 진행 시각을 사용한다. 기존 종료 타이머/자원 애니메이션/원자적 거래 유지. 타입 검사 및 정적 경로 검토 통과, 실기 미실행.
- [x] **5. 최종 검증·기록:** `npm.cmd run check:all`, `npm.cmd run build`, `git diff --check` 통과. 독립 정적 코드 리뷰에서 수정 범위의 추가 P1/P2/P3 없음. 기존 기준선 파일 불변 확인 및 실제 결과 기록 완료.

## 실행 기록

- 수정 전 정적 기준선: 같은 `6edc545`에서 직전 리뷰의 `node tools/check-all.mjs`, Vite 빌드, `git diff --check` 통과. 이번 수정 뒤 다시 실행한다.
- 수정 전 `node tools/balance-sim.mjs --config data/balance/candidate-v12-tech-tree.json --seeds 2 --start-seed 0 --policies all --out docs/balance-reports/tech-tree-review-before-2.json`: 종료 0이지만 18건 모두 전투 진입 전 invalid. CLI 종료 코드와 게임 결과를 구분한다.
- 수정 후 같은 명령에서 `--out docs/balance-reports/tech-tree-review-after-2.json`: 18건 모두 전투 진입, invalid 0, 초기 2명/잔액 20이 18/18, 회계 불일치 0. respec 환불 총액 1,524로 환불 이후 편성도 실행됨.
- 표본의 100웨이브 완주는 0/18. 정책별 마지막 성공 웨이브는 3~37이며 전부 정상 패배 종료. 이 표본은 시작 경로 수정의 근거이며 완주율·최종 밸런스 승인 근거가 아니다. 수치 최적화는 수행하지 않았다.
- `node --check tools/balance-policy.mjs`, `node --check tools/balance-sim.mjs`, `npm.cmd run typecheck`: 통과.
- `npm.cmd run check:all`: precompiled validator 재생성, ESLint, tsc 및 syntax/schemas/graph/locales/assets/deps/package 모두 통과. 생성 검증기는 Git 차이 없음.
- `npm.cmd run build`: 통과, 82 modules. 기존 단일 번들의 500kB 초과 경고 유지. 패키징·실행·성능 증거는 아님.
- 기준 커밋 대비 `data/balance`, `data/tech/nodes.json`, `data/rules.json`, `data/schemas`, `src/domain` 변경 없음. 신규 바이너리 에셋/라이선스 변경 없음.
- 독립 정적 리뷰: 수정 범위에서 추가 P1/P2/P3 없음. 메뉴/Worker/저장 대기·실패, 수동 pause 보존, 중첩 도움말/설정, 진행 시각 복원, 정찰 grid, respec 재구매를 검토했다. 실기 UI의 증거를 대신하지 않는다.
- `git diff --check`: 통과. 수정 검증 종료 시점에는 커밋·푸시·main 병합을 수행하지 않았다.
- 후속 사용자 요청(2026-10-27): 커밋·main 병합·푸시 승인. 전달용 `fix/tech-tree-main-delivery-20261027`에서 범위별 staging 후 커밋하며, 최신 원격 main 확인과 정적 검사를 거쳐 일반 푸시한다. Git 전달 결과는 최종 응답에 기록한다.

## 변경 파일

- `tools/balance-policy.mjs`, `tools/balance-sim.mjs`, `data/simulation/policy-profiles.json`
- `src/application/GameCoordinator.js`, `src/adapters/ui/GameShell.js`, `src/adapters/ui/styles.css`
- `docs/TECH_TREE_IMPLEMENTATION_CHECKLIST_20261027.md`, 이 계획/검증 기록
- `docs/balance-reports/tech-tree-review-before-2.json`, `tech-tree-review-before-2.md`, `tech-tree-review-after-2.json`, `tech-tree-review-after-2.md`
