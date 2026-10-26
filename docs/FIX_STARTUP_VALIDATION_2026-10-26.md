# 설정 로딩 오류 수정 — 2026-10-26

사용자가 개발 서버에서 “게임 설정을 읽을 수 없습니다.”와 `TypeError: func4 is not a function`을 보고했다. `schema-validators.js → ConfigLoader → bootstrap/main.js` 경로에서 실패했다. 기존 문서는 수정하지 않고 이 보충 기록을 추가한다.

브랜치: `fix/startup-config-loading`, 기준: `main`의 `3aa5deb6`.

## 영향도

| 항목 | 기록 |
| --- | --- |
| 요구사항 | 올바른 설정에서 초기화가 중단되는 오류 수정. 잘못된 설정을 무조건 허용하는 우회는 하지 않음 |
| 근거 | 사용자 콘솔 스택, 구현 설계 I-04/I-17/I-21, AGENTS의 JSON Schema 정적 검사 허용 |
| 수정 범위 | `tools/generate-validators.mjs`, 생성된 `src/infrastructure/schema-validators.js`, `tools/check.mjs`, `ConfigLoader.js`, `src/bootstrap/main.js`, `locales/ko-KR.json`, 이 추가 기록 |
| 간접 영향 | 설정과 저장 v1/v2가 같은 문자열 길이 보조 함수를 사용하므로 함께 검사. 게임 판정·비용·웨이브·저장 스키마/버전·에셋 슬롯은 그대로 유지 |
| 미결정 | 없음. 브라우저/게임 실행 검증은 기존 금지 규칙 유지 |
| 완료 기준 | 수정 전 동일 오류 재현, 생성된 검증 코드의 설정/저장 Schema 검사 통과, 전체 정적 검사·번들 통과, 개발 서버가 수정 소스 제공 |

## 원인과 수정

Ajv의 `ajv/dist/runtime/ucs2length.js`는 CommonJS에서 `exports.default`로 함수를 내보낸다. 생성기가 이를 ESM 기본 import 값 자체가 함수라고 가정했다. 실제로 객체가 전달되면서 `func4(data1)`에서 TypeError가 발생했다. 사용자 콘솔 오류와 동일한 오류를 실제 JSON 구성에 생성 검증 함수를 적용하는 정적 검사에서 확인했다.

생성기를 수정하여 import 값이 함수이면 그대로 사용하고, 객체이면 그 `default` 함수를 사용한다. 자동 생성 파일은 직접 고치지 않고 생성기로 다시 만들었다. 브라우저에서 스키마를 재컴파일하거나 CSP의 eval 제한을 해제하지 않는다. 구성 데이터 오류가 있으면 계속 거부한다.

기존 `check:schemas`는 원본 스키마를 새로 컴파일해 검사했지만, 앱에 포함되는 생성 결과를 직접 검사하지 않아 이번 결함을 놓쳤다. 이를 보완해 원본 스키마와 생성 검증기를 다음 12개 Schema 사례로 대조한다.

- 설정: 실제 등록 데이터, 필수 파일 누락, 유니코드 코드 포인트 길이 상한, 상한 초과.
- 저장 v1/v2 각각: 정상 구조, 잘못된 체크섬 형식, 유니코드 길이 상한, 상한 초과.

이 검사는 JSON 입력과 JSON Schema의 일치 확인이다. Phaser/DOM/게임 명령/저장 장치/브라우저를 실행하지 않는다. 체크섬 사례는 문자열 형식을 확인하며 실제 저장 체크섬 계산이나 쓰기 성공을 의미하지 않는다.

설정이 통과한 이후의 화면/게임 초기화 실패는 별도 한국어 문구로 표시하도록 분리했다. 설정 검증 실패의 상세 오류는 Error cause에 유지한다.

참고: [Ajv standalone validation 가이드](https://ajv.js.org/standalone.html). 실제 export 형태는 설치된 `node_modules/ajv/dist/runtime/ucs2length.js`에서 확인했다.

## 검증 결과

- [x] 원인 확인: 수정 전 생성 검증기에 실제 설정을 입력하면 사용자와 같은 `func4 is not a function` 발생.
- [x] 재발 검사: 생성기를 수정하기 전 `npm.cmd run check:schemas`에서 새 Schema 검사 12개 모두 동일 보조 함수 오류로 실패.
- [x] 생성기 수정: `node tools/generate-validators.mjs` 성공. 수정 후 `npm.cmd run check:schemas` 통과.
- [x] 전체 정적 검사: `npm.cmd run check:all` 최종 exit 0. ESLint/checkJs/구문/Schema/DAG/locale/asset/deps/package 통과.
- [x] 정적 번들: `npm.cmd run build` exit 0, 80 modules. 기존 500 kB 초과 청크 경고는 유지.
- [x] 개발 서버 소스: `http://127.0.0.1:5173/src/infrastructure/schema-validators.js`의 소스 텍스트만 HTTP로 읽어 200 응답과 수정한 import 처리 포함 확인. 소스는 실행하지 않음.
- [x] 범위 점검: `git diff --check` 통과. 순수 도메인·밸런스·웨이브·스키마 정의·의존 버전 변경 없음. 수치 변경이 없어 장시간 밸런스 재측정은 하지 않음.

실제 새로고침 후 화면 표시·조작·전투·저장 동작은 에이전트가 검증하지 않았다. 이번 통과는 위 정적 검증 범위에 한정한다. 기존 구현 완료 기록은 실제 실행 검증을 대신하지 않는다.
