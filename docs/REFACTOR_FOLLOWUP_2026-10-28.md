# 표준화 미결 사항 후속 수정

사용자 요청: 수정 가능한 미결 사항/버그를 수정하고 커밋, main 병합, push.
기준 `7e78ecd`, 작업 브랜치 `fix/refactor-open-items-20261028`.
기존 표준화 5개 커밋도 main 반영 범위에 포함한다.

## 확인 결과

| 항목 | 판단 / 처리 |
| --- | --- |
| Electron 저장 버전 | 확인된 버그 수정. renderer의 rules.schemaVersion=3과 desktop의 하드코딩 2가 불일치했다. desktop도 동일 rules JSON을 사용하고 패키지에 포함한다 |
| Worker 오류 경합 | 현재 Worker인지 검사하지 않던 오류 callback 수정. 성공/오류 모두 identity guard를 먼저 거치며 dispose 시 identity를 무효화한다 |
| Worker 전달 실패 | messageerror와 postMessage 예외가 기존 전투 실패 복구 경로를 사용하도록 연결. 활성 Worker만 종료/복구한다 |
| Scene의 drag 상태 | shutdown에서 dragging=null. 이전 Scene 활성 기간의 pointerdown 상태가 재진입 후 pointerup에 쓰이지 않도록 초기화 |
| Scene 리스너 누수 의심 | 설치된 Phaser 4.2.1의 InputPlugin.shutdown이 removeAllListeners 및 InputManager 구독 해제를 수행한다. 동일 정리를 중복 구현하지 않음. 실제 반복 전환 실행 검증은 미실시 |
| v1/v2 doctrine 누락 의심 | 현행 Annual52 호환 문제와 구분. compatibility 표에는 annual52-main-grade-v1 대상이 없고 과거 contentVersion도 다르므로 decode의 SAVE_MISMATCH에서 먼저 거부된다. doctrine 주입만으로 해결되는 현행 버그가 아님 |
| 큰 Vite chunk | 기존 성능 경고. 실행 기반 성능 측정 없이 분할 구조/로딩 순서를 바꾸지 않음 |
| 아트·음악·라이선스 | 기존 자산/대체 슬롯 유지. 이번 버그 수정 대상 아님 |

## 변경 계약

- 저장 v3 schema, 파일명 campaign-v1.json, 체크섬, sender 검증, 크기 제한, 원자 쓰기, 백업 경로 유지.
- domain/전투 계산/게임 데이터/locale/에셋/CSS/Worker 계산 소스 변경 없음.
- 기존 현재 Worker의 정상 결과 처리는 유지. 종료/교체된 Worker의 callback은 상태를 바꾸지 않는다.
- 입력 이벤트 등록은 기존 Phaser 소유권을 유지하며 별도 event bus나 수명 래퍼를 만들지 않는다.
- 구형 저장에 임의 교리를 선택하거나 진행도/자원/웨이브를 재작성하지 않는다. 100웨이브→52주 지원은 교리·진행도·경제 매핑 정책이 정해져야 한다. 기존 실패 및 원본 보존 처리를 유지한다.

## 정적 검증과 재발 방지

- `check:references`: renderer/desktop/schema의 저장 버전 원천 연결, Worker 세 callback의 선행 identity guard, 공유 실패 callback과 전송 catch 연결, dispose 무효화, shutdown drag 초기화를 AST로 확인한다.
- `check:package`: 실제 desktop JSON require 경로가 콘텐츠 registry와 builder 배포 파일 목록에 포함되는지 검사한다.
- 저장 수정 전 `check:references`는 버전/원천 불일치로 FAIL했다. rules require 추가 후 `check:package`는 배포 목록 누락으로 FAIL했으며 수정 후 모두 PASS했다.
- 수명 수정 전 `check:references`는 오류 guard/messageerror/공유 실패 경로/dispose/drag 계약의 누락을 감지했다. 수정 후 PASS했다.
- 저장 수정과 수명 수정 각각 전체 `npm run check` PASS: Prettier, ESLint, strict checkJs, 생성 소스, schema/graph/locale/assets, dependency-cruiser(102 modules/199 dependencies, 위반 0), Knip(문제 0), 정적 참조/패키지, Vite(96 modules).
- `git diff --check` PASS. 기존 generated validator 파일은 변경하지 않았다.
- 과거 `audit:refactor`는 승인된 버그 수정을 금지하는 일반 검사가 아니다. 이번에는 7e78ecd 이후의 명시된 변경 diff를 검토하며 원래 표준화 동일성 결과를 이번 수정의 동작 증거로 재사용하지 않는다.

## 미검증 및 정책 미결

실제 Electron 파일 쓰기·백업/복구, Worker 오류 발생 타이밍, Scene 반복 진입/입력, CJS helper 실행, 브라우저/오프라인 기동, 패키지 생성/설치, 성능/밸런스는 NOT_RUN이다. 정적 검사 통과는 해당 동작의 실행 검증이 아니다.
구형 100웨이브 저장의 Annual52 변환 정책은 미결이다. 현재는 명시적으로 호환되지 않는 저장을 거부한다.
서버의 branch protection 설정은 변경하지 않는다.

## 변경 파일과 커밋

- `desktop/main.cjs`, `desktop/builder.json`: 저장 버전/패키지 연결.
- `src/application/GameCoordinator.js`, `src/adapters/phaser/BattlefieldScene.js`: Worker 실패/종료와 drag 정리.
- `tools/verification/check-references.mjs`, `tools/verification/check-package.mjs`: 정적 계약 검사.
- 이 결과 문서, 기존 결과 문서의 후속 링크, `docs/superpowers/plans/2026-10-28-refactor-open-items.md`: 계획·증거·미결 사항.
- `d807274`: fix: align desktop save version with campaign rules.
- `402a2da`: fix: guard worker failures and clear scene drag state.

## 독립 리뷰

7e78ecd..402a2da를 별도 읽기 전용 리뷰로 검토했다. Critical/Important/Minor 모두 0건이며 병합 가능 판정이다. 저장 계약·실패 callback·dispose·Scene shutdown·구형 저장 비호환 처리와 신규 검사 도구를 검토했다. 리뷰가 실행하지 않은 저장/이벤트/입력/성능 범위는 미검증으로 유지한다.

## main 통합 증거

- 코드 병합 커밋: `4a4a82eb16bdd0ed52b9cd89c45de3ef03eb964e`. 기존 표준화 5개 커밋과 이번 수정/결과 문서를 이력을 보존하는 --no-ff merge로 반영했다.
- main에서 전체 `npm run check` 재실행 PASS. 위와 같은 102 modules/199 dependencies, Knip 0, Vite 96 modules 결과다.
- 일반 `git push origin main` 성공(86f6a79→4a4a82e), `git ls-remote origin refs/heads/main`이 로컬 SHA와 일치했다. ahead/behind 0/0, 작업 트리 깨끗함을 확인했다.
- 위 증거를 남기는 후속 커밋은 문서만 변경한다. 실제 게임/브라우저/런타임 검증을 추가로 수행하지 않는다.
- 원격 [Static verification](https://github.com/xcliming-svg/ww/actions/runs/40643445706)도 completed/success를 확인했다. Ubuntu Node 24에서 `npm ci --ignore-scripts` 및 `npm run check` 단계가 모두 성공했다. 해당 증거는 코드 병합 커밋 4a4a82e 기준이다.
