# Git 전달 범위 — 2026-10-26

사용자가 구현 결과의 커밋·푸시·main 반영을 요청했다. 기존 문서는 수정하지 않고 이 기록을 추가한다. 현재 공유 작업 폴더는 다른 세션의 에셋 작업도 진행 중이므로 원본 HEAD/index를 바꾸지 않는 별도 Git worktree에서 전달한다.

| 항목 | 기록 |
| --- | --- |
| 요구사항 | 검증한 기본 구현을 GitHub에 커밋·푸시하고 main에 반영 |
| 근거 | 사용자 명시 요청. 에셋 제작/연결 보류 및 브라우저/실기 QA 금지 유지 |
| 수정 범위 | 새 전달 기록, 측정 해시를 보존하는 `.gitattributes` 예외. 게임 규칙/코드/수치 변경 없음 |
| 간접 영향 | clone 시 줄바꿈 변환으로 원시 측정 해시가 달라지지 않도록 측정 대상 소스/후보 데이터와 원 기획서·HTML의 바이트 보존 |
| 미결정 | 없음. 원격은 비어 있으며 최초 main 생성이 필요함 |
| 완료 기준 | 격리된 전달 파일의 전체 정적 검사/번들, 커밋 트리의 측정 해시 일치, 일반 push, 원격 main과 전달 커밋 일치 |

## 전달 파일

- `src`, 게임 `data`, `locales`, `desktop`, package/lockfile 및 빌드·검사 설정.
- `tools`의 게임 정적 검사·밸런스·검증기·라이선스 고지 도구 및 기존 폰트 다운로드 도구.
- 원 기획서/HTML, 현행 `AGENTS.md`/`IMPLEMENTATION_DESIGN.md`를 기준 문서로 포함. 에셋 규약을 설명하는 기존 문구는 그대로 두며 해당 구현·산출물을 함께 완료했다는 뜻이 아니다.
- 사용자 결정, 계획, 검토, [현재 구현 상태](IMPLEMENTATION_STATUS_2026-10-26.md), 밸런스 보고서와 소스 스냅샷.
- Noto Sans KR 폰트·OFL 및 런타임 의존 라이선스 고지.

`.agents/`, `asset-factory/`, `docs/ASSET_*`, `tools/asset_factory.py`, 에셋 제작 의존 파일과 생성 산출물은 전달 목록에서 제외한다. 원본 작업 파일은 이동·삭제하지 않는다. `node_modules`, `dist`, 설치/배포 결과도 커밋하지 않는다.

## 브랜치와 검증

- 원격 `https://github.com/xcliming-svg/ww`, 원격 조회 당시 커밋/브랜치 없음, 기본 브랜치 이름 main.
- 전달 브랜치 `feat/publish-implementation`, 작업 위치 `C:/GPT-Workspace/ww-publish-20261026`.
- 공유 원본 `C:/GPT-Workspace/ww`의 `feat/ww-master-art-direction`과 별도 에셋 worktree는 유지한다. 최초 main에는 전달 브랜치의 첫 커밋을 그대로 반영하므로 선행 main과 병합 충돌은 없다.
- 전달 worktree에서 `npm.cmd run check:all`, `npm.cmd run build`, `git diff --cached --check`를 확인한다. 기존 최종 밸런스 보고서는 측정 대상 파일의 SHA256과 일치하는지 확인하며 게임 수치 변경이 없어 장시간 재측정은 하지 않는다.
- 커밋/원격 반영 결과는 실제 Git 반환값과 최종 응답에 기록한다. 이 문서 자체는 아직 실행하지 않은 push의 성공을 주장하지 않는다.

실제 화면/입력/Electron 실행/설치/성능은 검증하지 않는다. 기존 빌드의 큰 청크 경고와 최종 에셋 연결은 별도 잔여 범위다.
