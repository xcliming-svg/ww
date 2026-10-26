# WW2 구현 설계 실행 계획

> 실행: executing-plans에 따라 현재 세션에서 구현. 사용자 AGENTS.md의 정적 검사 제한이 실행형 TDD보다 우선한다.

**목표:** IMPLEMENTATION_DESIGN의 확정 계약을 구현하고 미결정 전투 규칙은 명시적 게이트로 남긴다.
**구조:** JS ES modules/JSDoc 순수 도메인 → application → DOM/Phaser 어댑터. 구성과 번역은 JSON. 전투 판정 없는 준비 화면에서 임의의 캠페인 결과를 만들지 않는다.
**기술:** Phaser 4.2.1, Vite, Electron, ESLint, TypeScript checkJs, Ajv.
**명세:** `docs/IMPLEMENTATION_DESIGN.md`, `docs/ww2_auto_defense_game_design_v2.md`, `docs/ww2_upward_tree.html`.

## 제약과 사전 점검
- 원본 기획서/HTML, 폰트, 다운로드 도구와 다른 세션의 에셋 작업을 수정·커밋하지 않는다.
- 브라우저/플레이/성능/실행형 단위 테스트 금지. 구문·타입·JSON·참조·DAG·locale·의존·패키지 정적 검사만 수행.
- Git 원격은 https://github.com/xcliming-svg/ww. 최초 확인 시 빈 원격/로컬 Git 없음. 사용자의 원격 사용 요청에 따라 초기화, `main` 초기 이름에서 `feat/implementation-design` 생성. 기존 기준 커밋 없음.
- 미정 수치 null은 0원·무한·확정값으로 대체하지 않는다. 실제 거래/전투 시작은 Result 실패로 차단한다. UI는 준비 기능 미리보기임을 표시한다.
- D-01~12 답변을 대기한다. 비용·HP 등은 시뮬레이션 이후 확정할 수 있으므로 별도 미측정 상태를 유지한다.

## 영향도
| 항목 | 기록 |
| --- | --- |
| 요구사항 | 코드가 없는 설계 프로젝트 → 오프라인 앱 기반, 순수 준비 도메인, 한국어 트리/전장. 반례: 임시 예산을 실제 게임으로 표시하지 않음 |
| 기획 근거 | 원 기획 §3~10, 구현 §2~8/11~15. 전투·확장·정찰은 결정 게이트 |
| 수정 범위 | src 전 계층, data, locales, tools 정적 검사, desktop, package 구성, 신규 작업 문서. 원본 자료 보존 |
| 간접 영향 | 연구 DAG/원자적 거래/저장 버전/에셋 슬롯/정찰/100웨이브/시뮬레이터/Windows 패키지 계약 |
| 미결정 | decisions.md D-01~12. 해당 구현 완료와 시뮬 실행 전에 답변 필요. 수치 확정은 이후 실제 도메인 시뮬 필요 |
| 완료 기준 | 아래 작업별 명령 통과 + 코드 리뷰. 브라우저 동작·체감·Electron 실행·패키지 설치는 미검증 |

## 리뷰 초점
1. 손상·미래 버전 저장과 잘못된 연구/비용 입력을 자동 보정하지 않을 것.
2. 중복 명령/취소/저장 경합이 자원 복제나 최신 저장 유실을 만들지 않을 것.
3. HQ/잠금/범위 밖 칸을 막고 이동·교환은 기존 지출액을 보존할 것.
4. 새 노드 알림과 유닛 구매 횟수를 영구 연구 완료와 혼동하지 않을 것.
5. 씬·DOM 구독과 키보드 이벤트를 해제하고 설정 모달의 포커스를 복구할 것.

## 작업과 완료 기준
- [ ] T1 계약/검사: `src/domain/model/contracts.js`, `data/**/*.json`, `data/schemas`, `tools/check-*.mjs`, package/config. `check:syntax`, `typecheck`, `check:schemas`.
- [ ] T2 순수 준비 도메인: `TechGraph`, `TechVisibility`, `EconomyService`, `FormationService`, `Geometry`, `Result`, 상태 검증. `dispatchPreparationCommand(state,command,config)`는 불변 Result 반환. `check:graph`, `typecheck`, `check:deps`.
- [ ] T3 infrastructure: `ConfigLoader`, `Localize`, `SaveRepository`, `SaveMigrations`, `AudioAdapter`, desktop 파일 저장. schemaVersion=1, 미리보기 저장은 campaign 저장과 분리. `typecheck`, `check:package`, `check:assets`.
- [ ] T4 DOM/Phaser: coordinator 구독, 28노드 점진 트리, 상세/설정/도움말, 7:3 전장, 5씬, 키보드/휠/드래그. `lint`, `typecheck`, `check:locales`, `check:deps`.
- [ ] T5 증거/인수인계: `npm run check:all`, 파일 보존 해시 확인, 전체 코드 리뷰, I-01~23 개별 근거. 미결정 항목은 미완료 유지.

## 실행 기록
- 2026-10-26: Git 초기화/브랜치/원격 확인. 원본 3문서·AGENTS·폰트 경로 확인. D-01~12 질문 전송.
- 절차 적용: 사용자 실행 요청에 따라 계획 승인 재질문 없이 독립 작업 진행. 사용자 제한에 따라 TDD 실행 대신 정적 계약 검사를 사용. 에셋 공유 경로는 읽기만 하고 구현용 슬롯 계약은 data/assets에 작성한다.
