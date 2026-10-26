# WW2 스킬트리 오토 디펜스

JavaScript ES modules와 Phaser 4.2.1 기반 오프라인 게임 구현 작업본이다. 확정 규칙은 원 기획서와 최신 [사용자 결정 보충](docs/DECISIONS_2026-10-26_USER_ADDENDUM.md)을 함께 읽는다. 기존 문서는 수정하지 않고 구현 현황은 새 문서로 남긴다.

## 개발 환경

- Node 24 이상, npm. 패키지 버전과 lockfile 고정.
- `npm ci`: 의존 설치. Electron 배포 파일 다운로드는 설치 시 필요하며 게임 실행에는 인터넷을 사용하지 않는다.
- `npm run dev`: 개발 서버 명령. **이 작업에서는 브라우저 실행/플레이 QA를 수행하지 않았다.**
- `npm run build`: 로컬 정적 번들.
- `npm run desktop`: 빌드된 dist를 Electron에서 실행하는 명령. 이번 작업에서는 실행하지 않았다.
- `npm run package:win`: Windows 디렉터리 패키지 생성용 설정. 실제 패키지 생성/실행/설치 확인은 별도다.

이번 세션의 의존 설치는 `--ignore-scripts`를 사용했다. 따라서 Electron 바이너리 설치 성공을 의미하지 않는다. 데스크톱 작업을 시작할 때 정상 `npm ci`가 필요하다.

## 검증 명령

```powershell
npm run check:all
npm run build
npm run balance:simulate -- --config data/balance/candidate-v7.json --seeds 1000 --policies all --paired --out docs/balance-reports/candidate-v7-final-1000.json
npm run balance:report -- docs/balance-reports/candidate-v7-final-1000.json --snapshot
```

`check:all`은 ESLint/checkJs/구문/JSON Schema/연구 DAG/locale/폰트·슬롯/의존/패키지 정적 검사다. 브라우저나 게임 런타임 테스트를 실행하지 않는다. `balance:simulate`만 허용된 순수 Node 도메인 계산이다. 실패 후 동일 인자에 `--resume`을 추가하면 설정·코드·정책 해시가 일치할 때만 이어 계산한다. 결과 파일은 요청 N을 다 채워야 `complete`가 되며, 이 상태는 밸런스 합격을 뜻하지 않는다.

스키마 수정 후 `node tools/generate-validators.mjs`로 검증 코드를 재생성한다. `src/infrastructure/schema-validators.js`는 자동 생성물이다. 브라우저에서 Ajv 컴파일/eval을 하지 않는다.

## 책임 경계

- `src/domain`: 거래, 연구, 진형, WavePlan, 고정 tick 전투, 캠페인/재시도. DOM/Phaser와 분리.
- `src/application`: 단일 명령 진입, 저장 예약, Worker 계산, 30초 재생 시간과 일시정지.
- `src/adapters`: DOM 7:3 shell 및 Phaser 표시. 에셋 없는 경우 코드 도형 사용.
- `src/infrastructure`: 구성/번역/버전 저장/체크섬/오프라인 adapter.
- `data/balance/candidate-v7.json`: 현재 **후보** 수치. v1~v6은 실험 기록이며 승인된 최종 밸런스가 아니다.
- `data/assets/slots.json`: 이번 구현의 임시 안정 ID 계약. 다른 프로세스의 `asset-factory/`, 에셋 문서와 산출물은 아직 연결하지 않았다.

## 저장과 데스크톱

Electron은 `app.getPath('userData')/campaign-v1.json`에 저장한다. 임시 파일 쓰기/fsync 후 rename하며 이전 정상 파일은 `.bak`, 손상·호환 불가 원본은 `.corrupt.<timestamp>`로 보존한다. 사용자 선택 없이 백업을 정상 파일로 간주하지 않는다. 저장 실패 시 안내하며 종료 요청을 완료하지 않는다.

개발용 브라우저 대체 저장은 `localStorage`의 `ww.campaign.v1` 키다. 전투 중 저장은 하지 않고 전투 시작 직전 준비 상태를 먼저 저장한다. 패배 결과에는 재시도용 직전 스냅샷이 포함된다. 설정은 별도 `ww.settings.v1` 키다. 저장 v1 이전의 실제 출시 형식은 없으므로 알 수 없는 버전은 임의 마이그레이션 없이 거부한다.

Electron은 로컬 `ww://game/` 프로토콜, context isolation, sandbox, IPC 발신 프레임 검증, 외부 네비게이션/네트워크 차단을 사용한다. 관련 API 기준은 [Electron protocol 문서](https://www.electronjs.org/docs/latest/api/protocol)와 [보안 가이드](https://www.electronjs.org/docs/latest/tutorial/security)다. 실제 Electron 기동은 미검증이다.

## 남은 검증 범위

정적 통과는 실제 입력/렌더/시각 품질/오프라인 기동/장시간 씬 전환/성능/설치/재미의 증거가 아니다. 브라우저 QA는 AGENTS.md에 따라 금지했다. 최종 에셋·음악은 다른 작업에서 연결한다. Noto Sans KR의 OFL 원문과 해시를 보존하며 배포 설정에 포함한다.
