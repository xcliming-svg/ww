# 표준화 미결 사항 수정 및 main 반영

> 직접 실행: executing-plans. 사용자 요청은 수정·커밋·main 병합·push까지 승인했다. 기존 static-only 정책이 TDD/런타임 검증보다 우선한다.

**Goal:** 정적 원인이 확인되는 저장/비동기/Scene 상태 문제를 고치고 이전 표준화 커밋과 함께 main에 반영한다.
**Architecture:** 기존 저장 계약과 GameCoordinator/Scene 소유권 유지. 새 서비스/상태 저장소/호환 계층 없음.
**Tech Stack:** JS ESM, Phaser 4.2.1, Electron 45.0.0, Node 24, 기존 npm run check.
**Spec:** 사용자 2026-10-28 후속 요청, REFACTOR_RESULT_2026-10-28.md, IMPLEMENTATION_DESIGN.md 7.3, 현행 data/rules.json.

## 영향도와 판단

| 항목 | 근거 / 수정 / 완료 기준 |
| --- | --- |
| 기준 | 깨끗한 7e78ecd에서 fix/refactor-open-items-20261028 생성. origin/main=86f6a79 확인 |
| 저장 버전 | renderer는 rules.schemaVersion(3)을 쓰나 desktop은 2 하드코딩. 같은 rules JSON을 require하고 builder 배포 목록에 포함. 파일명·원자 쓰기·백업·크기·sender 검사는 유지 |
| Worker | onmessage에는 현재 Worker identity guard가 있고 onerror에는 없다. 오류/메시지 역직렬화 실패/전송 예외에 단일 실패 callback 사용, identity guard 후 terminate/null/rollback. dispose도 identity 무효화 |
| Scene | 설치된 Phaser InputPlugin.shutdown이 removeAllListeners와 manager off 수행. 누수 수정 불필요. Scene 객체의 dragging은 자체 값이므로 shutdown에서 null로 초기화 |
| 구형 저장 | compatibility.migrations의 toConfig에 annual52-main-grade-v1이 없고 contentVersion도 다르다. decode는 migrateState 전에 SAVE_MISMATCH 반환. doctrine null 주입만으로 지원되지 않으며 10/38주 이후 필수 선택과 52주 상한도 충돌. 웨이브/교리/자원 매핑은 미결정이므로 변환 규칙을 만들지 않음 |
| 간접 영향 | 게임 수치·연구·전투 계산·저장 schema 변경 없음. Electron 패키지 포함 JSON 1개 추가. 기존 실패 복구 callback의 적용 대상만 정확히 한정 |
| 정적 검증 | 기존 check:references에 저장 버전/Worker guard·dispose/drag 수명 소스 연결 검사, check:package에 desktop JSON require와 builder 포함 관계 검사. 실행 결과 검증으로 표기하지 않음 |
| 제외 | 실제 파일 쓰기/복구·브라우저/Worker/Electron/성능/밸런스 실행, 에셋 제작·라이선스 변경·branch protection 설정 변경 |

## 검토 초점

- 정상 v3 쓰기와 다른 버전 거부, 배포 패키지 내 rules 누락.
- 종료된 Worker 성공/오류 callback과 새 Worker identity, 메시지 역직렬화 실패, postMessage 예외.
- 종료 후 Scene 재진입의 오래된 drag와 기존 Phaser 리스너 정리.
- 기존 저장의 checksum 검증 → 명시 호환 확인 → migrateState 순서 유지.
- main의 동시 변경 유무와 강제 push 없이 원격 반영.

## 작업 목록과 완료 기준

- [x] **1. 조사/계획:** 저장 호출/설계/호환표/Phaser 설치 소스/Worker callback 정적 조사. 이 문서로 영향도와 근거 확정.
- [x] **2. 저장 수정:** desktop/main.cjs, desktop/builder.json, tools/verification/check-package.mjs, check-references.mjs. 신규 정적 검사가 기존 버전 불일치/패키지 누락을 감지함을 확인 → rules 연결 → npm run check 통과 → 별도 commit.
- [x] **3. 수명 수정:** src/application/GameCoordinator.js, src/adapters/phaser/BattlefieldScene.js, check-references.mjs. 오류 callback identity 및 dispose/shutdown 계약 검사 → 최소 변경 → npm run check 통과 → 별도 commit.
- [x] **4. 재검토/문서:** 읽기 전용 최종 리뷰, 필요한 수정, 결과 문서에 해결/비버그/정책 보류/미검증 구분. git diff --check, 명시 파일 commit.
- [x] **5. 통합:** origin/main 갱신 확인 → main에 --no-ff merge → npm run check → 일반 push origin main → 원격 HEAD/작업 트리 확인.

## 진행 기록

- 조사 판단: 과거 보고서의 migration 의심은 현행 Annual52의 지원 경로와 구분해야 한다. 자동 변환을 추가하지 않으며 실패 시 원본을 보존하는 기존 계약을 유지한다. 추후 지원하려면 100→52 진행도·교리 선택·경제 보정 승인부터 필요하다.
- 저장 검증: 수정 전 `check:references`는 Desktop save version/Shared save version source로 FAIL. rules require 추가 직후 `check:package`는 Unpackaged desktop JSON:data/rules.json으로 FAIL. builder 포함 후 전체 `npm run check` PASS(102 modules/199 dependencies, Knip 0, Vite 96 modules). 정상/거부 경로의 실제 Electron 실행은 하지 않았다.
- 수명 검증: 수정 전 `check:references`는 오류 ownership/messageerror/공유 전송 실패 처리/dispose 무효화/drag 초기화 누락 5항목으로 FAIL. 기존 Worker 실패 복구 경로를 공유하고 shutdown/dispose를 수정한 후 전체 `npm run check` PASS(102 modules/199 dependencies, Knip 0, Vite 96 modules). 도메인/게임 데이터/locale/에셋/CSS/Worker 계산 파일 변경 없음. 이벤트 타이밍의 실제 실행 검증은 하지 않았다.
- 독립 리뷰: 7e78ecd..402a2da를 읽기 전용 검토하여 Critical/Important/Minor 0건, 병합 가능 판정. 실제 저장/이벤트 타이밍/입력/성능·밸런스는 정적 범위 밖으로 판단 보류했고 미검증을 유지한다. 구형 저장 변환 정책도 승인 영역으로 남긴다.
- 통합 완료: `4a4a82eb16bdd0ed52b9cd89c45de3ef03eb964e`에 기존 표준화와 후속 수정 이력을 --no-ff 병합했다. main에서 전체 `npm run check` PASS 후 일반 `git push origin main` 성공. `git ls-remote`와 로컬 HEAD 일치, main...origin/main 0/0 및 작업 트리 깨끗함 확인. 이 완료 기록은 동일 작업 브랜치에서 문서 후속 커밋으로 남긴다.
- 원격 검증: GitHub Actions run 40643445706 completed/success. Ubuntu Node 24에서 npm ci --ignore-scripts와 npm run check 성공. 계획 5/5항목 완료; 구형 저장 변환 정책과 금지된 실행 검증은 별도 미결/미검증 범위로 유지한다.
