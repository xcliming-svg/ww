# 구현 완료 근거와 후속 범위 — 2026-10-26

이 문서는 기존 기획서·계획·보고서를 고치지 않고 현재 구현 상태를 추가 기록한다. 원본 구현 설계의 I-01~I-23 중 **에셋 연결을 제외한 기본 코드·정적 검증·도메인 밸런스 범위는 23/23** 근거를 확보했다. 이는 실제 화면, 입력, Electron 실행, 설치, 성능, 재미 또는 출시 준비가 모두 검증되었다는 뜻이 아니다. 사용자가 다른 세션에서 제작 중인 에셋의 연결은 계속 보류한다.

## 현재 기준과 문서 읽는 순서

1. 최신 사용자 결정: [사용자 규칙 보충](DECISIONS_2026-10-26_USER_ADDENDUM.md), [난이도 목표](BALANCE_TARGET_2026-10-26.md), [환불 결정](REFUND_DECISION_2026-10-26.md).
2. 기존 `IMPLEMENTATION_DESIGN.md`, 원 기획서, 기술트리 HTML은 기본 구현 근거다. 기존 문서의 미결정·미구현 표기, 30초 시간초과 승리, 연구·강화 환불 불가 문구는 위 결정과 이 상태 기록으로 대체해서 읽는다.
3. 활성 수치는 `data/balance/active.json`의 **candidate-v11**이다. `configVersion=candidate-v11-refund1`, `contentVersion=defense-100-v1`, 저장 `schemaVersion=2`, 시뮬 정책 `policies-v3-refund`를 사용한다.
4. 기존 README와 과거 보고서의 candidate-v7/v10 등은 당시 기록이다. 최종 결과는 이 문서에 연결한 `candidate-v11-refund-final-*`, `candidate-v11-refund-holdout-final-*`로 확인한다.

## 변경 영향도

| 항목 | 기록 |
| --- | --- |
| 요구사항 | 100웨이브 방어·연구·진형·재시도 구현, 보통 난이도 보정, 영구 투자에 자원이 묶여 진행할 수 없는 상황 해소 |
| 기획 근거 | 구현 설계 I-01~23, 사용자 D-01~12 답변, 적절한 혼합·대응 편성의 안정적 진행, 시간 수입이 없으면 100% 환불이라는 조건 |
| 수정 범위 | `src/domain` 순수 판정/경제/연구, `src/application` 계산·재생 조율, `src/adapters` UI/Phaser, `src/infrastructure` 설정/저장, `data`, `locales`, `desktop`, 정적 검사·밸런스 도구, 신규 보충 문서 |
| 간접 영향 | 연구 DAG와 생산시설 의존, 투자 원장, 배치 취소, 저장 v2와 이전 v1 호환, 재시도 checkpoint, 100웨이브 보상/개방, locale/슬롯, Windows 오프라인 패키지 계약 |
| 미결정 | 현재 기본 구현을 막는 게임 규칙 질문 없음. 실제 에셋 연결 및 출시 운영 사항은 별도 범위 |
| 완료 기준 | 아래 23개 항목의 파일 근거, 전체 정적 검사, 정적 번들, 본 시드 9,000 + 별도 시드 4,000 캠페인 및 병과 역할 36,000전 측정 |

## I-01~I-23 대조

체크는 명세가 허용한 **구현·정적 검사·순수 도메인 측정**에 대한 것이다. UI/저장/데스크톱의 실제 실행 성공을 체크한 것이 아니다. 예외·실패 경로의 소스 검토와 한계는 [구현 정적 검토 기록](IMPLEMENTATION_REVIEW_2026-10-26.md)에 정리했다.

- [x] **I-01 Git 기반:** 최초 `main` 이름의 빈 저장소에서 `feat/implementation-design` 작업 브랜치 생성, 지정된 origin 확인. 기준 커밋 없음. 이후 공유 HEAD 변경은 아래 Git 기록 참조.
- [x] **I-02 결정·영향도:** 원 기획서/HTML 보존, D-01~12 답변 및 환불·난이도 결정 추가 문서, 초기 계획과 마무리 계획의 영향도 표 작성. 과거 문서를 현재 상태로 덮어쓰지 않음.
- [x] **I-03 기반:** `package.json`, `vite.config.js`, `src/bootstrap/main.js`, `desktop/main.cjs`/`preload.cjs`. JS ESM/JSDoc, Phaser 4.2.1, Vite, Electron 경계. 구문/타입/패키지 정적 검사와 번들 통과.
- [x] **I-04 구성 계약:** `data/schemas`, `ConfigLoader`, 생성된 `schema-validators`, `Localize`, `AssetRegistry`. 구조·참조·누락 키/슬롯 검사 및 명시적 대체 표시 구현. schema/locale/asset 검사 통과.
- [x] **I-05 폰트:** 사용자가 준비한 `public/assets/fonts/NotoSansKR-variable.ttf`와 OFL 사용, 로컬 로딩 완료 후 씬 진입. 라이선스 경로/해시 검사 통과, 원본 해시 유지.
- [x] **I-06 연구:** `data/tech/nodes.json`, `TechGraph`, `EconomyService`. 4건물+12연구+12유닛=28노드 DAG, 연구-유닛 연결, 유닛 종류별 공격/생존 강화와 상한. graph/schema/typecheck 통과.
- [x] **I-07 트리·튜토리얼:** `TechVisibility`, `TechTreeView`, `GameShell`, `data/ui/tutorial.json`. 점진 노출, 완료/새 노드 상태, 상세 수치/다음 목표, 시작 물자로 소총병 2개 구매 안내, 병과 필터. locale/typecheck 및 소스 검토 완료.
- [x] **I-08 경제:** `EconomyService`, `InvestmentLedger`, `RefundService`. 준비 중 구매·이동·교환·취소 및 영구 투자 100% 연쇄 환불, 미리보기 토큰, 중복/오래된 명령 거부, 전투 중 변경 금지. 정적 검사 및 환불 정책 2,000캠페인 회계 일치.
- [x] **I-09 진형:** `FormationService`, `Geometry`, `data/formation`. 3/5/9/13/25칸, HQ 보호, 13칸 모양 확정 반영. 개방 웨이브 1/4/8/18/32. 방사형 사격과 위치 교환 영향 측정.
- [x] **I-10 정찰·적:** `WavePlanner`, `data/waves/content.json`, `StepSimulation`. 네 방향 경로, 방향만 공개하는 정찰, 병과/수량/시각 비공개, 접근·차단 아군 공격·HQ 지속 공격. 참조/스키마 검사와 캠페인 측정.
- [x] **I-11 전투:** `StepSimulation`, `combat-worker`, `GameCoordinator`. 고정 tick으로 적 전멸/HQ 파괴까지 판정 후 약 30초 재생. 시간초과 승리 없음, HQ 사망 우선, 최근접 표적, 논리 항공 위치/병과 상성. 무효 결과 0건.
- [x] **I-12 캠페인:** `Campaign`, `startWave`. 1~100, 성공 보상과 잔액 이월, 부대 제거/위치 초기화/HQ 회복, 연구 유지, 실패 보상 없음, 전투 직전 전체 상태로 같은 웨이브 재시도. 상태 전이 소스 검토 및 100웨이브 측정.
- [x] **I-13 재현·복구:** `DeterministicRng`, 고정 스냅샷/worker, 재생 1/2배속과 일시정지의 판정 분리, 계산 실패 checkpoint 복구, 계산/로드/종료 중 명령 잠금. 소스 검토와 동일 조건 위치/강화 비교 실행.
- [x] **I-14 화면 골격:** Boot/Preload/Title/Battlefield/Outcome, 7:3 shell, 키보드/마우스, 설정/도움말, 모달 포커스/이벤트 수명 관리. lint/typecheck/build 통과. 실제 화면·입력 미검증.
- [x] **I-15 기본 표현:** `PixelUnitRenderer`, `FxLayer`, `BattlefieldScene`, `AssetRegistry`, `AudioAdapter`. 임시 병과 실루엣/레이블·지형·발사/피격·정찰, 127개 교체 슬롯, 무음 fallback. 별도 세션의 최종 아트/오디오는 이 체크에 포함하지 않음.
- [x] **I-16 언어·접근성:** `locales/ko-KR.json`, manifest, UI locale 키, 상태 텍스트/접근성 표기, 설정/도움말. 누락/플레이스홀더/인코딩 손상 검사 통과. 실제 화면 폭·포커스 QA 미실시.
- [x] **I-17 저장:** `SaveRepository`, `SaveMigrations`, v1/v2 schema, 호환표, desktop 파일 브리지. 체크섬·직렬 쓰기·임시 파일/fsync/rename·백업·손상 대응·버전 거부와 투자 원장 복원 구현. 정적 검토 완료, 실제 디스크 장애 주입 없음.
- [x] **I-18 콘텐츠:** 100개 웨이브 구성, 동일 아군/적 템플릿 12종, 순차 기술 수준과 배치/연구의 결과 차이. 본/별도 시드의 위치·강화 비교와 36종 조합 병과 측정 완료.
- [x] **I-19 측정 도구:** `balance-sim`, `balance-policy`, `balance-report`, `balance-compare`, `balance-probes`, `balance-merge`/`extract`. 게임과 순수 도메인 공유, 다중 정책·seed, 소스/설정 해시와 재현 스냅샷. 최종 13,000캠페인 기록.
- [x] **I-20 보정:** 후보 v1~v11 반복 측정 후 v11 활성화. 아래 본/별도 시드 모두 내부 난이도 기준 통과, 회계/무효/음수 잔액 검사, 구간별 생존·경제·다양성·상성·후반·위치/강화 비교 기록. 인간 플레이 재미는 판정하지 않음.
- [x] **I-21 정적 검사:** `npm.cmd run check:all` exit 0. ESLint, checkJs, JS 구문, schema, DAG, locale, asset, 의존 순환, package 모두 통과.
- [x] **I-22 데스크톱 계약:** `desktop/builder.json`, 로컬 `ww://game` 프로토콜, IPC 발신 검증, 네트워크/새 창 차단, Windows 패키지 설정, 폰트/에셋/npm 고지와 저장 경로 기록. package 정적 검사 통과. 패키지 생성/설치/기동은 실행하지 않음.
- [x] **I-23 최종 대조:** 이 문서와 검토 기록으로 사용자 답변·코드·설정·측정 결과·한계를 연결. 기존 문서는 보존하고 현재 설정/저장 버전을 명시. 원 기획서/HTML/폰트 해시 재확인 완료.

## 환불과 저장의 최종 동작

- 시간에 따른 물자 수입은 없다. 준비 중 연구·구매 건물·강화는 **실제 지출액 100%**를 반환한다. 반복 구매/환불 자체에 수수료나 새 보상은 없다.
- 중간 노드를 제거하면 실제 선행 연구/생산시설 의존을 잃는 후속 연구·강화가 함께 제거되고 관련 배치도 구매비를 돌려준다. 형제 분기나 단순한 그림상 연결은 제거 근거가 아니다.
- 기본 사령부·병영·소총 연구는 무료 기반이므로 제거/현금화할 수 없다. 강화만 환불하면 연구와 부대 배치는 유지한다. 이미 전투를 치르고 소멸한 부대의 과거 구매비는 돌려주지 않는다.
- 제거 항목·배치·총액 미리보기 후 한 번의 상태 교체로 처리한다. 상태가 바뀐 오래된 미리보기는 거부한다. 패배 재시도는 환불 원장을 포함한 전투 직전 상태 전체를 복원한다.
- v1 저장은 원래 스키마와 체크섬을 먼저 검사한다. 동일 구성 또는 `data/save/compatibility.json`의 명시적 가격 호환만 허용한다. candidate-v10/v11의 v1 저장은 비용표 일치를 확인하여 candidate-v11-refund1/v2로 옮긴다. 알 수 없는 가격 버전은 추정하지 않고 거부한다.
- payload 버전은 2지만 기존 저장을 찾도록 파일은 `app.getPath('userData')/campaign-v1.json`, 브라우저 대체 키는 `ww.campaign.v1`을 유지한다. 설정 키는 `ww.settings.v1`이다.

## 최종 밸런스 근거

정책별 재시도 없는 첫 시도 캠페인이다. 본 시드는 0~999, 별도 시드는 100000~100999이다. 정책은 공개 정찰의 방향만 사용하며 비공개 적 병과/수량을 읽어 대응하지 않는다. 아래 수치는 인간의 실제 클리어율이 아니다.

| 정책 | 본 시드 완주 / 1,000 | 별도 시드 완주 / 1,000 |
| --- | ---: | ---: |
| 방향 대응 혼합 `recon` | 880 (88.0%) | 868 (86.8%) |
| 혼합 `mixed` | 851 (85.1%) | 855 (85.5%) |
| 10웨이브마다 환불·재편성 `respec` | 779 (77.9%) | 774 (77.4%) |
| 항공 중심 `air` | 666 (66.6%) | 미측정 |
| 보병 중심 `infantry` | 0 | 미측정 |
| 대전차포 중심 `antiArmor` | 0 | 미측정 |
| 장갑 중심 `armor` | 0 | 미측정 |
| 무작위 `random` | 0 | 미측정 |
| 잘못된 방향/부족한 편성 `wrong` | 0 | 0 |

본 시드 9,000 + 별도 시드 4,000 = **13,000캠페인**에서 무효 결과·회계 불일치·음수 잔액 0건. 환불 회계는 `총지출-환불=순지출`, `수입-순지출=잔액`을 대조했다. 본 시드 환불 정책에서 반환한 누적 물자는 36,316,014이며 돈 복제/수수료 차감 없이 회계가 맞았다. 승리 보상/초기 자원은 각 진형을 소총병으로 채울 최소 비용 이상이라는 정적 조건도 확인했다. 이는 기본 편성의 자금 확보 근거이며 모든 편성의 승리를 보장하지 않는다.

| 같은 조건의 비교 | 본 시드 비교 수 / 승패 차이 / HQ 차이 | 별도 시드 비교 수 / 승패 차이 / HQ 차이 |
| --- | ---: | ---: |
| 병력 유지, 위치 교환 | 9,833 / 50 / 104 | 9,829 / 42 / 82 |
| 위치 유지, 강화 제거 | 9,833 / 531 / 698 | 9,829 / 510 / 671 |

위치는 실제 결과에 영향을 주었지만 승패가 바뀐 비율은 작다. 높은 체감 전략성의 증거로 과장하지 않는다. 구간별 생존·잔액, 편성 엔트로피, Wilson 95% 구간은 분석 JSON에 포함했다. 엔트로피는 다양한 전략이 모두 유효하다는 증명이 아니다. 보병/장갑 단일 중심 정책은 후반을 완주하지 못했고, 방향 대응·혼합과 항공 중심 정책의 차이가 관측되었다.

12병과 × 적 보병/전차/폭격기 × 1,000시드 = **36,000전**의 통제된 역할 측정도 완료했다. 무효 0건. 후보 v11의 공격기 사거리 4.8 조정 후 전차 상대 1,000/1,000 승리가 관측되었다. 같은 4칸을 사용하지만 병과마다 구매비가 다르므로 이 결과는 동일 비용 효율을 뜻하지 않는다. 피해 기여량에는 동시 공격의 초과 피해가 일부 포함될 수 있어 정확한 승패·HQ 값을 우선한다.

내부 수치 기준은 `data/simulation/criteria.json`에 있다. 방향 대응 80% 이상, 혼합 60% 이상, 실패 정책 5% 이하와 회계·무효 0 등의 기준은 사용자 선택인 “보통 난이도”를 측정하기 위한 개발 기준이며 사용자가 직접 지정한 확률이 아니다. 본/별도 시드 분석 모두 `calibrationPassed=true`다.

최종 산출물:

- [본 시드 분석](balance-reports/candidate-v11-refund-final-1000-analysis.md), [상세 지표 JSON](balance-reports/candidate-v11-refund-final-1000-analysis.json), [원시 결과](balance-reports/candidate-v11-refund-final-1000.json), [소스 스냅샷](balance-reports/candidate-v11-refund-final-1000-source.json).
- [별도 시드 분석](balance-reports/candidate-v11-refund-holdout-final-1000-analysis.md), [상세 지표 JSON](balance-reports/candidate-v11-refund-holdout-final-1000-analysis.json), [원시 결과](balance-reports/candidate-v11-refund-holdout-final-1000.json), [소스 스냅샷](balance-reports/candidate-v11-refund-holdout-final-1000-source.json).
- [병과 역할 측정](balance-reports/candidate-v11-refund1-roles-1000.md), [원시 결과](balance-reports/candidate-v11-refund1-roles-1000.json).

최종 측정과 현재 소스 일치를 확인한 SHA256:

| 대상 | 해시 |
| --- | --- |
| 후보 설정 | `42122499f701899054493e3caf5aa66e3c2b8e94f24b04432ce5f2350f252139` |
| 순수 도메인 | `f4454553acba2f2cf16fb221a544735ca30aca0f878668d3d0f23dd96e034db8` |
| 정책 코드/설정 | `47608daf4394dad521610e0a12c0bca88dd26219845fa47f4893c9f91dd7b7a2` |
| 100웨이브 콘텐츠 | `27d569c7c6ed8b4c3732e4144e18864c07d13ceaffe27f8fcf0c340e7f832c96` |

## 실제 실행한 검증

| 명령/작업 | 결과 |
| --- | --- |
| `npm.cmd run check:all` | exit 0, lint/checkJs/구문/schema/graph/locale/asset/deps/package 모두 통과 |
| `npm.cmd run build` | exit 0, 80 modules, JS 약 2,824.76 kB(gzip 451.27 kB). 500 kB 초과 청크 경고 유지. 정적 번들 생성이며 실행/성능 검사가 아님 |
| `balance:simulate --seeds 1000 --policies infantry,antiArmor,armor,air,random,wrong --paired` | 6개 정책 완료, `candidate-v11-refund-final-specialized-1000.json` |
| `balance:simulate --seeds 1000 --policies mixed,recon --paired` | 2개 정책 완료, `candidate-v11-refund-final-mixed-1000.json` |
| `balance:simulate --seeds 1000 --policies respec --paired` | 환불 정책 완료, `candidate-v11-refund-final-respec-1000.json` |
| `balance:simulate --seeds 1000 --start-seed 100000 --policies mixed,recon,wrong,respec --paired` | mixed/recon/wrong 각 1,000개 완료 후 별도 respec 작업과 중복 방지를 위해 의도적으로 종료. 부분 원본 보존, 완결된 3정책만 extract |
| `balance:simulate --seeds 1000 --start-seed 100000 --policies respec --paired` | 별도 환불 정책 1,000개 완료, `candidate-v11-refund-holdout-respec-1000.json` |
| `node tools/balance-merge.mjs …`, `node tools/balance-extract.mjs …` | 설정/소스 해시 일치, 중복 정책/seed 및 빠진 표본 검사 후 본 9,000/별도 4,000 통합. 입력 보고서 보존 |
| `npm.cmd run balance:report -- docs/balance-reports/candidate-v11-refund-final-1000.json --snapshot` | 전체 기준 통과, 현재 소스 해시 일치 및 스냅샷 생성 |
| `npm.cmd run balance:report -- docs/balance-reports/candidate-v11-refund-holdout-final-1000.json --snapshot` | 전체 기준 통과, 현재 소스 해시 일치 및 스냅샷 생성 |
| `node tools/balance-probes.mjs candidate-v11` | 36조합 × 1,000전 완료, 무효 0 |

재측정할 때 `--out`에 **새 파일명**을 지정해 기존 증거를 보존한다. merge/extract는 기존 출력 덮어쓰기를 거부한다. 본/별도 보고서의 `inputs`가 각 분할 산출물을 가리킨다. 부분 실행 원본을 완료한 것으로 계산하지 않았으며 통합 결과는 정책별 1,000개 고유 seed를 확인했다.

## Git·보존·라이선스

- 원격: `https://github.com/xcliming-svg/ww`. 최초 기준 이름 `main`, 원 작업 브랜치 `feat/implementation-design`, 기준 커밋 없음.
- 공유 저장소의 현재 HEAD는 다른 세션이 변경한 **`feat/ww-master-art-direction`**이다. 이 작업에서 브랜치를 되돌리거나 다른 세션 파일을 스테이징하지 않았다. **아직 커밋·push 없음.** 파일은 초기 untracked 상태이며 이 보고서는 Git 전달 완료를 주장하지 않는다.
- 구현 파일 묶음: `src/`, `data/`의 게임 구성/스키마, `locales/`, `desktop/`, package/lockfile 및 빌드·검사 구성, `tools/check*.mjs`·밸런스/검증기/고지 생성 도구, `public/licenses/THIRD_PARTY_NOTICES.txt`, 신규 결정·상태·측정 문서. `.agents/`, `asset-factory/`, 에셋 제작 문서와 도구는 별도 세션 소유다.
- 원 기획서 SHA256 `88C71187513DCAF49E9E93825C630F8C7C9E1FED2FE81BB3903B47C00FE32A9E`, HTML `F789D9615A2AC103A8F2E6192976D6207792D8FACD03EF12FCB4161D7CA55499` 유지.
- Noto Sans KR SHA256 `194018E6B2B293A7964F037B25C0249CE1418BC9AB3C971060A03AA57861E252`, OFL `1C05C68C34F9708415AADA51F17E1B0092D2CEA709BF4A94CD38114F9E73D7D9` 유지. 원본 OFL와 npm 런타임 의존성 7종 고지를 패키지 자원에 포함하도록 설정했다.
- 공유 `AGENTS.md`/`IMPLEMENTATION_DESIGN.md`에는 다른 세션의 에셋 규약 추가가 있다. 이 작업에서 해당 원문을 수정하지 않았으며 파일 전체가 최초 상태 그대로라는 주장은 하지 않는다.

## 남은 범위와 다음 세션

- [ ] 사용자 요청 후 다른 세션의 최종 아트/음악/효과음과 UI 표현 규격 연결. 현재 임시 표현·슬롯·무음만 구현되어 있다.
- [ ] 실제 화면·입력·포커스·씬 전환·오디오·브라우저 Worker·저장 장애 복구의 런타임 확인. 현재 AGENTS 규칙상 실행하지 않는다.
- [ ] Electron 바이너리 설치, Windows 패키지 생성/실행/설치·오프라인 기동 검증. 현재 설정과 파일 계약의 정적 검토까지만 수행했다.
- [ ] 실제 성능·메모리·로드타임·체감 재미 및 최종 OS 지원 판단. 500 kB 청크 경고도 남아 있다.
- [ ] 공유 작업 정리 후 선택적인 Git 커밋/원격 전달, 서명·스토어 게시 등 출시 절차.

다음 세션 시작 시 이 상태와 현재 Git/코드 변경 여부를 확인하여 진행률을 먼저 알린다. **기본 구현·정적 증거 23/23과 위 미완료 출시 범위를 구분한다.** 사용자 요청 전에는 에셋 연결이나 금지된 실행 검증을 임의로 시작하지 않는다.
