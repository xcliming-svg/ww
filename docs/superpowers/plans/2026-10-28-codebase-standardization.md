# 코드베이스 표준화 구현 계획

> 수행 방식: 이 세션에서 단계별 직접 실행. 사용자가 지정한 static-only 정책을 적용하며 TDD/동작 테스트는 실행하지 않는다. 분석 보고서의 범위 안에서 승인된 요청을 계속 수행한다.

**Goal:** main의 게임 기능·데이터·화면·외부 계약을 보존하며 하나의 구조와 정적 검증 절차를 적용한다.
**Architecture:** 기존 domain/application/infrastructure/adapters/bootstrap 유지. 도메인 타입 역의존 및 렌더 투영의 계층 이탈 제거. 신규 공통 프레임워크 없음.
**Tech Stack:** JS ESM, Phaser 4.2.1, Vite 8.3.5, checkJs, ESLint, Prettier, dependency-cruiser, Knip.
**Spec:** [사전 분석/영향도/제거 근거](../../REFACTOR_ANALYSIS_2026-10-28.md), 2026-10-28 사용자 요청.

## 공통 제한

- 브랜치 `feat/codebase-standardization-20261028`, 기준 `86f6a79`; main 병합/push는 이번 작업에 포함하지 않는다.
- 게임/브라우저/단위/통합/E2E/성능/밸런스 실행 금지. 정적 도구와 번들 빌드만 허용.
- 수치/계산/상태/이벤트/Scene 순서/타이밍/저장/IPC/locale/asset/CSS 보존.
- 의심 버그는 기록, 수정하지 않음. 삭제는 정적 참조 증거가 있는 항목만.
- 각 단계는 관련 정적 검사 통과 후 별도 commit. 기준 실패를 무시 규칙으로 숨기지 않음.

## 검토 초점

- Worker URL, Vite glob, Electron preload, Scene 키 같은 문자열 진입점 누락.
- generated validator의 CommonJS interop 및 스키마 optional doctrines와 기존 필수 guard의 차이.
- import 이동 후 타입 경계와 report source hash 경로.
- 포맷 과정의 연산 순서·문자열·정규식·template literal 변경.
- 기존 callback 등록/해제 및 state mutation 순서의 무단 개선.

## S1. 정적 검증 통합

- [x] tools/check.mjs의 책임을 tools/verification 아래 schemas/graph/locales/assets/package (Phaser references? S2)로 분리. 데이터 수집/AST 유틸은 실제 공유되는 기능만 둔다.
- [x] 게임 함수/생성 validator fixture 실행 제거. 제거한 검증 범위는 분석 문서에 기록. 리터럴/스키마/생성 소스 계약으로 대체.
- [x] generate-validators에 --check 추가: 기존 생성 코드 그대로 산출하여 바이트 비교, check 중 덮어쓰기 금지.
- [x] 기존 타입 오류 4건을 타입 선언만으로 해소.
- [x] npm run check에 lint/typecheck/콘텐츠/생성물/정적 빌드 순서를 연결. 구형 check-all/check 제거.
- 완료 기준: 통합 검사 exit 0, 게임 모듈 실행 참조 없음, 데이터/게임 실행 본문 보존.
- Commit: `refactor: unify static verification without game execution`.

## S2. 책임 경계와 미사용 코드

- [x] ResolveCombatBalance, validateTechGraph, UnitGroupMath 이동 및 모든 import/타입/소스 해시 경로 전환. 이전 파일/경로 삭제.
- [x] 참조 없는 AudioAdapter, BalanceConfig, startWave alias, drawUnit, radialAngle 제거 및 미사용 export 축소.
- [x] ValidateAnnual52Save의 불필요한 stripDoctrine 우회 제거. 기존 guard/스키마 수용 조건 정적 비교.
- [x] dependency-cruiser/Knip을 고정 버전 도입하고 entry/허용 의존 방향을 설정. UI/Phaser/Worker/CLI 동적 참조 누락 방지.
- [x] 변경 전후 AST/불변 콘텐츠 비교 도구와 명시적 이동/삭제 manifest 작성. 공개 계약/Scene/이벤트/설정 비교.
- 완료 기준: 전체 check 및 preservation 비교 PASS, 구형 파일 없음, 미해결 의존/순환/미사용 항목 없음.
- Commit: `refactor: enforce module boundaries and remove unused implementations`.

## S3. 형식·AI 표준·CI

- [x] Prettier 고정 버전/설정, 전체 작성 JS/MJS/CJS 포맷. 생성물/게임 데이터/CSS/역사 문서 제외 근거 기록.
- [x] ESLint 환경별 globals와 domain/application 플랫폼 금지, noInlineConfig 및 suppression 검사 적용.
- [x] AGENTS.md의 절차를 static-only로 갱신, 아키텍처/네이밍/재사용/중복/기능 보존/검증 한계 영구 명시.
- [x] README/현행 아키텍처 문서/CI 작성. CI는 npm ci --ignore-scripts 후 npm run check, 게임 실행 없음.
- 완료 기준: 전체 check 및 preservation 비교 PASS. check에 검사 누락 없이 CI 동일 명령 연결.
- Commit: `chore: standardize formatting and enforce AI development rules`.

## S4. 전체 재검토와 완료 증거

- [ ] 전체 파일/동적 진입/중복/구형 경로/임시 코드 재감사. 새 불필요한 추상화 없음 확인.
- [ ] 별도 읽기 전용 검토 및 필요한 정적 수정. 의심 기능 버그는 보류 유지.
- [ ] npm run check, preservation 비교, git diff --check, Git 이력/작업 트리 확인.
- [ ] 최종 보고서에 변경 파일/커밋/검사 명령·결과/삭제 검증 범위/강제 규칙/미결 사항 기록.
- 완료 기준: 모든 범위에 실제 정적 근거가 있고, 동작 동일성/출시 준비 완료라고 과장하지 않음.
- Commit: `docs: record standardization evidence and remaining risks`.

## 진행 기록

- 계획 확정 전: 전체 tracked inventory/실행 코드 참조 및 기획·데이터·저장·배포 계약 조사 완료. 기준 lint/build PASS, checkJs 4건 FAIL 기록. 코드 수정 없음.

- S1 완료: `npm run check` exit 0 (lint/checkJs/generated/schema/graph/locale/assets/deps/package/build). 기존 타입 오류 4건은 선언만 수정. generated validator 바이트 변경 없음. runtime entry/worker/CSS 산출물 이름과 크기 동일. `git diff --check` PASS.
- S2 완료: Knip 사전 결과 3개 파일/2개 미사용 함수와 내부 전용 export 3개 확인 후 정리. dependency-cruiser 101 modules/195 dependencies 위반 0, Knip 0, Scene/Worker/IPC/타입/스키마 참조 PASS, 전체 `npm run check` PASS. `npm run audit:refactor`는 소스 53개, 이동 함수 1개, 보호 파일 54개 대조 PASS. CSS/Worker 번들 이름 유지. 현재 저장 guard 본문은 유지하고 stripDoctrine만 제거.
- S2 결정: resolver가 domain 순회에 포함되므로 시뮬 report의 별도 resolver 해시/스냅샷 추가를 제거했다. 중복 포함을 피하며 엔진 변경 감지 계약은 유지한다. 기존 보고서는 재생성/재실행하지 않는다. Prettier 설치는 lockfile 정리와 함께 했고 포맷 적용/검사 강제는 S3에서 수행한다.
- S3 완료: 전체 `npm run check` exit 0, `audit:refactor` PASS (AST 지문 S2와 동일), `git diff --check` PASS. Prettier/환경별 ESLint/네이밍/억제 방지/lockfile 및 생성 interop 정적 검사를 연결했다. AGENTS/README/ARCHITECTURE 및 CI는 동일한 static-only 절차를 설명한다. 원격 CI는 아직 실행하지 않음.
- S3 결정: TechTreeView의 인라인 JSDoc 단언에서 Prettier가 첫/둘째 포맷을 다르게 생성했다. 타입 설명을 기존 stats 선언에 옮겨 해결했고 실행 표현식 AST는 동일함을 확인했다. formatter ignore/규칙 완화는 하지 않았다.
