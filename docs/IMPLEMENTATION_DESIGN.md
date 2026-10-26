# WW2 스킬트리 오토 디펜스 — AI 개발용 구현설계서

- **문서:** IMPLEMENTATION_DESIGN.md
- **버전 / 기준일:** 1.0 / 2026-10-26
- **상태:** 구현 착수 명세. 확정 규칙과 미결정 규칙을 구분하며, 수치 밸런스 결과는 **아직 산출되지 않음**.
- **프로젝트 루트:** `C:\GPT-Workspace\ww`
- **반드시 함께 적용:** 루트 `AGENTS.md`
- **원본:** `docs/ww2_auto_defense_game_design_v2.md` (확정 규칙), `docs/ww2_upward_tree.html` (기술트리 시안·미검증 샘플값)
- **작업 시작 명령:** "이 문서와 AGENTS.md를 읽고, 현재 저장소를 확인해 요구사항별 브랜치를 생성하고, 영향도 및 체크리스트를 작성한 뒤 독립적으로 확정된 구현 항목부터 진행하라. 미확정 핵심 규칙은 질문하며 임의 확정하지 말라. 브라우저/QA/성능 테스트 금지, 정적 검증과 Node 오프라인 밸런스 시뮬레이션만 허용."

## 1. 목적·범위·계약

### 1.1 게임 핵심
- **형태:** 2차 세계대전 테마, 2D 픽셀형 **탑다운**, 기술트리 성장 + 사령부 중심 진형 배치 + 자동 디펜스.
- **플랫폼:** Windows 데스크톱을 기본 개발·패키징 대상으로 하는 Steam 배포 지향 **싱글플레이 / 오프라인**. 지원 OS 최종 범위는 출시 전 확정해야 한다. Steam SDK, Steam Cloud, 도전과제, 친구, 상점, 멀티플레이, 네트워크 서버 **연동 없음**.
- **입력:** 키보드와 마우스만 지원. 게임패드·터치 조작 설계/개발 불필요.
- **언어:** 현재 `ko-KR`만 제공하되 국제화/i18n 구조는 처음부터 확장 가능하게. 사용자 표시 문자열에 하드코딩 금지.
- **오디오:** 현재 BGM/SFX 없음. 소리 없이 동작해야 한다. 추후 삽입을 위한 asset slot, 볼륨 설정, 오디오 adapter를 제공하되 없는 파일을 로드하지 않는다.
- **에셋:** 현재 완성된 유닛/지형 아트 없음. **자체 생성 단색 픽셀형 아이콘/도형/색상·레이블**로 실제 전투 중 병과를 구분하고, 교체 가능한 아트 슬롯을 남긴다.
- **조작 철학:** 전투 중 수동 이동·조준 없음. 플레이어의 전략은 정찰 확인 → 군수물자 투자 → 유닛 구매·위치 배치 → 자동 전투 결과에 반영된다.
- **고정 종료:** 100웨이브 방어 성공 시 승리; 이후 무한 모드 없음. 사령부 HP 0 즉시 패배.
- **전투시간:** 웨이브당 게임 내 시간 최대 30초. 적 전원 처치 시 선제 종료 가능. 배속은 설정 가능한 순수 시간 배율로 구현, 배속 UI의 제공 종류는 아직 기획 미정.
- **웨이브 유지:** 연구/강화/확장 유지, 모든 유닛 제거, 위치 초기화, 구매비 비반환, 사령부 HP 최대 회복, 성공 시 군수물자 보상.
- **전장 건물:** 사령부 1개만. 병영·공장·비행장은 기술트리만의 가상 시설, 전장 배치 객체가 아니다.

### 1.2 규칙 우선순위
1. 사용자 신규 확정 요구
2. `ww2_auto_defense_game_design_v2.md`의 **확정 영역**
3. 이 문서에서 확정 규칙을 보존하여 정의한 **기술 계약**
4. `ww2_upward_tree.html`의 트리 구조/노드 명칭/역할 참고
5. 일반적인 UI·기술 기본값

**명시적 금지:** HTML의 `missions`(마을/다리/비행장 작전), `budget`, `STATS`, `cost`, `upgrades`, 시작 소총병 2분대 등 데모 행위를 100웨이브의 확정 규칙으로 가져오지 않는다. HTML은 전투 엔진이 아닌 UI 시안이다.

### 1.3 완성 판정의 구분
- **명세 완성:** 구현 가능한 계약/파일 책임/의존성/정적 검증/결정 필요 질문/체크리스트가 기술됨.
- **코드 완성:** 각 체크리스트 항목의 실제 파일·기능·정적 검증이 모두 확인됨.
- **밸런스 완성:** 실제 도메인 전투 시뮬레이터로 100웨이브, 다수 seed·빌드에 대해 반복 검증함.
- **재미 검증:** 기계적 지표만으로 인간의 재미를 입증할 수 없다. **브라우저/플레이 QA 금지 조건 때문에 체감 재미는 검증되지 않았다고 명시**한다. 지표를 재미의 대리 척도로 관리한다.

## 2. 게임 상태기계 및 진행 흐름

### 2.1 전체 화면 흐름
```text
Boot → Preload → Title
                 ├─ New Game → Preparation[wave=1]
                 ├─ Continue → Load & Migrate → Preparation(허용된 저장 지점)
                 ├─ Settings/Help/Credits
                 └─ Quit (데스크톱)
Preparation ─(Start Wave + validation)→ Combat
Combat ─(HQ HP <= 0)→ Defeat
Combat ─(all planned enemies cleared OR virtualTime = 30s)→ VictoryResolution
VictoryResolution ─(wave = 100)→ CampaignClear
VictoryResolution ─(wave < 100)→ NextWaveSetup → Preparation
Defeat ─(user-selected retry policy: 미결정)→ Retry/Title
CampaignClear → Result Summary → Title
```
전투 판정 우선순위와 타임아웃 잔여 적 정책은 §11 결정 게이트에 의존한다. 이를 확정하기 전 **Combat 출구의 논리 충돌을 코드로 임의 정의하지 말 것**.

### 2.2 웨이브 준비 단계
1. `wave`, 확장 단계, 저장된 연구·강화/자원 상태 복원. 사령부 HP 최대, 전장 유닛/배치 초기화.
2. 미리 생성되어 잠긴 `WavePlan`에 기반해 네 방향 정찰 카드 표시. 미확인 병과는 `?`와 아이콘 실루엣으로 표기하며 카드가 준비 중 사라지지 않는다.
3. 건물/연구 구매, 유닛별 공격·생존 등 전체 강화(구체 강화 항목·상한은 검증 전 임시 데이터), 해금 유닛 구매·배치 실행.
4. 한 칸 1유닛, 모든 병과 1×1. 위치 이동·서로 교환 무료. 준비 중 취소=**실제 해당 배치에 지출한 구매비 100% 환불**; 연구·강화 환불 불가.
5. `Start` 직전에 배치, 자원, 잠금, 참조, 시간·승리 조건의 정적 상태 유효성 검사. 결함/입력 오류 시 전투 진입 거부, 사용자가 이해할 문구 표시.
6. 전투 진입 시 **변경 명령 모두 금지**, 유닛 집합/배치/연구/정찰·적 구성은 전투 스냅샷 고정.

### 2.3 전투 처리·웨이브 종료
- 게임 시뮬레이션은 render FPS와 무관한 고정 step과 seeded PRNG 사용. 동일 seed+같은 입력/설정이면 동일 전투 판정을 얻는다.
- 시간=0부터 적 스폰 스케줄 처리 → 이동/위치 → 탐지·표적 선택 → 쿨다운/발사 → 피격/사망 → HQ 피격 → 종료 판정 순서는 **단일 tick 명세**로 고정. 세부 타깃/본부 도달 규칙은 미정이며 `TargetingPolicy` / `HQContactPolicy`로 격리.
- 탄환·폭발·피격 표현은 판정 이벤트를 소비하는 별도 renderer. 애니메이션이 판정/난수 생성/타이머를 건드리지 않는다.
- 타이머 경과는 virtual time이며 배속을 바꿔도 난수 결과/승패 동일. 일시정지는 virtual time과 공격 쿨다운 모두 정지.
- 웨이브 성공 한 번만 보상 지급(`resolutionId` 중복 보호). 패배 시 보상 없음. 승리/실패 양쪽 전장 개체는 정리하고 모든 배치를 폐기.
- 100웨이브 클리어 트리거는 단 한 번. 101웨이브 생성 금지.

## 3. 화면/씬/입력/UI

### 3.1 화면 구조
- **메인 게임 화면 가로 7:3**: 좌측 약 70% 기술트리, 우측 약 30% 탑다운 전장. 고정 너비 사이드바가 아니라 비율 기반, 최소 너비 미충족 시 패널 내 독립 스크롤.
- 상단 통합 HUD: 웨이브 `현재/100`, 물자, 사령부 HP, 전투 시간, 상태, 저장 상태, 설정.
- **좌측 트리:** 사령부에서 위로 확장되는 계층 시각화. 휠 줌(커서 기준), 드래그 이동, 가운데 찾기, 선택한 노드의 설명/요구 조건/비용/강화가 나오는 접이식 상세 패널. 전체 28노드를 최초 화면에 한꺼번에 그리지 않음.
- **우측 전장:** 중앙 사령부 격자, 진입 도로/경로, 북·남·동·서 정찰 카드와 병과 심벌, 유닛 상태, 발사 이펙트, 전투 시작 버튼 및 진행/배속 컨트롤. 준비 중 정찰 카드 항상 유지.
- 상세 모달/설정/튜토리얼/결과 화면은 익숙한 PC 게임 레이아웃: 상단 제목, 정보 본문, 우하단 확인, 좌하단 뒤로, `Esc` 취소. 중요한 비용 행동에는 버튼 안에 비용과 결과 명시.
- UI는 해상도 스케일만 키우지 않고 텍스트 가독성/최소 클릭 영역/포커스/색상 대비/툴팁을 유지. 초소형 창은 지원 최소 해상도 내에서 스크롤과 안내를 사용.
- 메시지를 색으로만 전달 금지: ✓/!/?/잠금 아이콘 + 텍스트/aria-label 동시 표기.

### 3.2 '한 단계씩 배우는' 트리 노출
- **현재 이용 가능한 프런티어를 중심으로 표시**: 현재 경로/완료한 직계 조상(축약됨) + 완료한 노드의 **직접 자식 1단계**까지만 표현. 아직 접근할 수 없는 심층 후손은 숨기되 가지 개수 힌트/말단 점선을 보여줄 수 있다.
- 건물→직접 연구, 연구→해금 유닛 및 직접 상위 연구/건물을 표기한다. `hq` → 병영/공장/비행장 연결은 **소속 표시선**이지 별도의 건물→건물 선행 조건이 아니다.
- 노드 상태 `hidden|locked|available|affordable|done|maxed`를 명확히 분리. 완료 직후 ✓ 또는 체크박스형 마커, **새로 열려 상호작용할 수 있는 노드는 ! 뱃지**, 자원 부족은 숫자/문구로 안내. 완료/구매 가능 표시를 취소 전까지 유지하되 새로운 단계 표시 !는 확인 시 해제.
- 트리 연구를 완료하면 짧은 해금 알림→신규 자식으로 화면 포커스→(원하면) 해당 신규 유닛의 첫 구매/배치 가이드. 튜토리얼 팝업은 막다른 모달이 아닌 뒤로 가기와 다시보기 제공.
- 각 트리 단계에 '다음 목표'와 해당 이유(예: 대전차병은 장갑 대응)를 한 문장으로 보여준다. 사용자가 선택한 조상/분기는 기억·재방문 가능.
- 정찰을 보고 해당 병과 상대에 유리한 **이미 해금한** 유닛 목록을 필터로 볼 수 있지만 최적 정답/자동 구매를 강제하지 않는다.
- `완료 이벤트`는 연구/건물 획득, 강화 상한, 튜토리얼 단계 종료, 신규 분기 오픈이며 소비된 구매 유닛은 영구완료로 표시하지 않는다.

### 3.3 Phaser 씬 설계와 DOM 결합
| 책임 | 씬/모듈 | 구현 기준 |
| --- | --- | --- |
| 환경·서비스 생성 | `BootScene` | 구성/DI, 디스플레이 설정, 저장소 로드 |
| 로딩 | `PreloadScene` | 폰트/실제 에셋 매니페스트 로드; 누락된 슬롯은 fallback |
| 타이틀 | `TitleScene` | 새 게임/이어하기/옵션/종료 |
| 전장 | `BattlefieldScene` | **오른쪽 30% 렌더 타깃**으로 준비/전투와 픽셀 월드 구성 |
| 시각 FX | `FxLayer` (scene 내부 계층) | 발사·명중·폭발·떠오르는 수치 |
| 종료 | `OutcomeScene` | 해당 웨이브 결과/패배/100웨이브 최종 결과 |
| 기술트리·HUD | `GameShell` (HTML/CSS DOM) | 좌측 트리, 우측 정찰 오버레이, 상태/버튼/설정/튜토리얼 |
| 씬 연결 | `GameCoordinator` | Phaser 이벤트를 명령/상태에 매핑; UI에 read-only view model 전달 |

- DOM 접근성/한국어 텍스트는 DOM 위주, 세계 좌표 기반 전장과 픽셀 아트는 Phaser. 씬과 DOM은 도메인 명령/이벤트로만 통신.
- 카메라는 지상 평면 정사영(top-down), 타일 격자 기준 정렬, 최근접 이웃(nearest-neighbor) 텍스처 확대와 정수 좌표 스냅. 논리 픽셀 기반, 안티앨리어싱/부드러운 필터 임의 적용 방지.
- 외부 HUD는 반응형 CSS 변수와 게임 데이터로 스케일 설정. Phaser 내부 좌표는 월드 단위를 별도로 유지.
- 물리 엔진 의존도 최소화: 사거리·부채꼴·충돌·그리드 판정은 순수 함수. Physics 엔진을 도메인 판정의 유일 근거로 사용하지 않는다.

### 3.4 키보드/마우스 기본 매핑 (일반 UI 기본값, 설정 가능)
| 입력 | 기능 |
| --- | --- |
| 왼쪽 클릭 | 노드 선택 / 유닛 선택·배치 / 확인 |
| 오른쪽 클릭 / Esc | 현재 배치 도구 취소 / 모달 닫기; 전투 중 Esc=일시정지 |
| 드래그 | 트리 이동, 배치된 유닛 이동, 같은 격자 상호교환 |
| 휠 / +/- | 트리 확대·축소 |
| Tab / Shift+Tab, Enter/Space | UI 포커스 이동 및 버튼 작동 |
| F1 또는 ? | 도움말/현재 튜토리얼 재열기 |
| Space | 준비에서 '전투 시작'을 직접 확인(실수 방지), 전투 중 일시정지/재개 |
키 바인딩은 `data/ui/input.json`에서 로드하고 변경 가능성을 고려한다. 실제 배속 키 및 시작 단축키 즉시 실행 여부는 사용자 피드백과 함께 변경 가능. 화면 힌트는 항상 표시.

## 4. 기술트리 데이터 명세

### 4.1 기획서 및 시안에서 확인한 노드 28개
- 건물 4개: `hq`(뿌리), `barracks`(초기 보유), `factory`, `airfield`.
- 연구 12개, 유닛 12개. **각 연구는 정확히 해당 유닛 1종**을 해금한다.
- 표의 `앞 노드`는 해금 선행조건이다. 건물로부터 시작하는 연구는 `building→research`, 깊은 연구는 `research→research`. 각각의 유닛은 `research→unit`. 자식 유닛은 결코 건물/연구의 선행이 되지 않는다.

| 연구 ID(게임 표시명) | 앞 노드 | 해금 유닛 ID(이름) | 생산시설 | 병과 방향성 |
| --- | --- | --- | --- | --- |
| `rifleR` 소총 훈련(초기 완료) | barracks | `rifle` 소총병 | barracks | 저비용 기본 보병 |
| `mgR` 기관총 | barracks | `mg` 기관총팀 | barracks | 대보병 |
| `mortarR` 박격포 | barracks | `mortar` 박격포팀 | barracks | 진지/포격 |
| `gunR` 야포 | mortarR | `gun` 야포 | barracks | 장거리·진지 공격 |
| `atR` 대전차 무기 | barracks | `at` 대전차병 | barracks | 대장갑 |
| `carR` 장갑차 | factory | `car` 장갑차 | factory | 기동·대보병 |
| `tankR` 중형전차 | carR | `tank` 중형전차 | factory | 범용 장갑 |
| `heavyR` 중전차 | tankR | `heavy` 중전차 | factory | 고체력·화력, 고비용 |
| `destroyerR` 구축전차 | tankR | `destroyer` 구축전차 | factory | 대전차 특화 |
| `fighterR` 전투기 | airfield | `fighter` 전투기 | airfield | 대공 |
| `attackerR` 공격기 | airfield | `attacker` 공격기 | airfield | 대지·대장갑 |
| `bomberR` 폭격기 | attackerR | `bomber` 폭격기 | airfield | 광역·진지 |

- 시작 `built=[hq,barracks]`, `research=[rifleR]`는 시안과 원 기획서 흐름에 부합하므로 **초기 상태 후보**. 무료 초기 소총병 2개는 기획서상 확정 규칙이 아니라서 §11 질문 전 지급하지 않는다.
- 건물 `factory`/`airfield`는 처음부터 건설 가능, 단 관련 연구는 건설 완료가 필요하다. 루트로부터의 표시선은 잠금 선행이 아니다.
- 연구 규칙 검증: 중복 ID·순환·없는 선행·불법 간선·연구→유닛 1:1 불일치·시설 불일치·연구 없는 유닛·상위 유닛 성능 보상 부재 모두 정적 오류.
- 실전 연구 비용·생산비·공격력·장갑·사거리·공격각·쿨다운·탄속·적 상성·강화 상한은 전부 **`data/balance` 조정값**. HTML 비용/HP/상대 화력은 별도 `prototypeReference` 데이터에만 기록하고 시뮬레이션 초기 후보로 사용할 수 있으나 게임 확정값으로 표시하지 않는다.
- 성장 근거: 박격포→야포(진지 공격 및 사거리 향상), 장갑차→중형전차(대장갑·생존 향상), 중형→중전차(체력·화력), 중형→구축전차(대장갑 특화), 공격기→폭격기(대진지·광역 특화). 상위 유닛에 **낮은 비용 대비 효율 등 명확한 트레이드오프**가 가능하며 의미 없는 연구 없음.
- 업그레이드는 `UnitUpgradeState[unitId]` 전체 종류에 적용. 여러 개의 동일 유닛이 한 번에 강화된다. 강화는 유한/환불 불가/웨이브 지속. 초기 HTML의 power·survive 2단계는 데모 수치이므로 데이터 계층에 후보로 두고 시뮬레이션 후 확정.

### 4.2 정적 데이터 계약(예시)
```text
TechNode { id, kind: "hq"|"building"|"research"|"unit", parentIds[], unlocksUnitId?,
           producerId?, startsUnlocked?, labelKey, descriptionKey, assetId, roleTags[] }
UnitTemplate { id, category, costKey, baseStatKey, targetClassModifiersKey, upgradeProfileId,
               attackPatternId, assetId, projectileAssetId }
BuildState { purchasedBuildingIds[], researchedIds[], unitUpgrades: { [unitId]: levels } }
```
`costKey` 등은 데이터 파일 내 경로/ID를 참조. 설명 문자열과 포맷 단위는 `locales/ko-KR.json`에만 둔다.

## 5. 진형·탑다운 전장·길찾기

### 5.1 진형
- 5×5 **고정 좌표계**: `row=0..4, col=0..4`, 사령부 중앙 `(2,2)` 고정. 화면 확대/축소와 무관하게 좌표계 동일.
- 사용 가능 총 칸 `3→5→9→13→25`, HQ 포함(유닛 가능 칸 `2→4→8→12→24`).
- 3칸은 HQ+북/남 1칸, 5칸은 HQ+상하좌우, 9칸은 중앙 3×3, 25칸은 5×5.
- **13칸 정확한 좌표 및 각 단계 개방 웨이브 미확정**. `data/formation/layouts.json`와 `data/formation/unlocks.json`을 별도 스키마로 만들고 미확정 항목 확정 전 단계 완성 처리 금지.
- 각 칸의 슬롯 상태 `disabled|empty|occupied`. 본부 슬롯은 유닛 점유 금지. 같은 슬롯 이중 배치 금지.
- 진형 확장은 웨이브 조건으로 **자동**, 구매/연구 비용을 요구하지 않는다.

### 5.2 방향·사격
- 아군은 해당 슬롯에 고정. 아군 공격 기준 벡터는 **HQ 중심→슬롯 중심** 바깥쪽 방사형. 상대 좌표로 각도 계산 (`atan2`); 슬롯이 HQ면 유닛 불가.
- 원본 예시 `[0,0]` 북서, `[0,1]` 북서~북, `[0,2]` 북. 좌표계가 바뀌어 방향이 뒤집히지 않도록 월드 좌표 정의 문서화.
- 거리 `<= range`, 각차 `<= attackArc/2`, 병과 공격가능 여부, 선택된 targeting policy를 모두 통과한 적만 타격.
- 아군은 총탄·포탄을 가로막지 않는다. 충돌/차폐는 적·방어 지형 규칙(미확정)에 따라 별도.
- 항공기는 **슬롯은 고정되지만** 연출 스프라이트가 담당 구역 내에서 비행. 실제 공격 판정의 논리적 위치/피격·상대 가능 병과는 §11 결정 후 확정. visual orbit는 렌더 전용.

### 5.3 적·정찰·경로
- 적 범주는 원형 HTML의 보병/전차/진지/항공을 **초기 콘텐츠 범주 후보**로 사용. 진지처럼 비이동형 범주를 경로 공격으로 어떻게 처리할지 규칙 미정이므로 구현 시 타입을 강제 통일하지 않는다.
- 적은 정해진 스폰 도로/경로에서 중앙으로 진입. 경로는 3→5→9→13→25 진형 확장에 맞춰 다양화되며 초반은 북/남 중심.
- 정찰 정보는 `WavePlan`의 **실제 계획과 연동**. N/S/E/W 방향마다 빨간 사각 카드 여러 개 가능, 병과 확인 아이콘 또는 `?`, 주된 접근 방향이지 직선 진입 강제 아님.
- 경로 분기/차단/교전·표적·본부 도착 효과·사라지는 적/부대 규칙은 §11 질문 필요. 이를 `RoutePolicy`, `EnemyEngagementPolicy`, `HQContactPolicy`별 순수 전략 객체로 주입할 것.

## 6. 경제·진행·영구 상태

- 유일 자원 `supplies`(군수물자), 정수·음수 불가·최대 안전 정수 경계 검증. 거래는 단일 `EconomyService.execute(command)`가 유효성 검사 후 한 번만 커밋.
- 연구 건설·연구·종류별 강화 지출은 영구 비용/환불 불가. 유닛 배치는 구매비 지출; 같은 준비에서 취소하면 해당 구매 스냅샷 비용만 전액 환불. 배치 교환 비용 0.
- 웨이브 종료 시 유닛과 구매비는 소멸; **미사용 잔액 이월 여부는 미확정**. `EconomyCarryoverPolicy`로 분리 후 결정 시 세이브 마이그레이션 필요성도 검토.
- 웨이브 성공 지급 `reward[w]`은 데이터 참조, 1회만 지급. 웨이브 준비 재진입으로 중복 지급 불가능하도록 `rewardTransactionId` 사용.
- 지휘부 HP는 매 웨이브 최대치, 영구 기술·강화 및 확장 단계는 유지.
- 게임 오버 체크포인트/재시도/런 초기화 정책 **미확정**; 단, 패배를 승리로 변조하는 복구는 금지.
- **중간 저장 위치:** 준비 단계와 결과 확정 후 같은 원자적 저장 스냅샷을 사용. 전투 중 임의 저장 정책은 기획 미정이며 우선 저장 금지(허용되는 기술적 기본안)로 두고 출시 정책에서 확인.
- 설계상 경제의 기본 목표는 다음 웨이브에 유닛 재편성과 일부 성장 투자가 실질적으로 가능하도록 보상곡선을 시뮬레이션에서 조정하는 것. 무한 성장 금지.

## 7. 전투 도메인/서비스 API 및 파일 책임

### 7.1 권장 폴더
```text
ww/
├─ AGENTS.md
├─ docs/
│  ├─ IMPLEMENTATION_DESIGN.md
│  ├─ ww2_auto_defense_game_design_v2.md  [원본 보존]
│  ├─ ww2_upward_tree.html               [참조 전용]
│  ├─ decisions.md                       [결정 기록; 개발 시작 후]
│  └─ balance-reports/                   [오프라인 결과, 자동 생성]
├─ src/
│  ├─ bootstrap/         main.js, container.js
│  ├─ domain/
│  │  ├─ model/          GameState.js, WaveState.js, CombatState.js
│  │  ├─ commands/       purchase.js, place.js, move.js, swap.js, cancel.js, startWave.js
│  │  ├─ systems/        StepSimulation.js, MoveSystem.js, AttackSystem.js, DamageSystem.js
│  │  ├─ policies/       TargetingPolicy.js, HQContactPolicy.js, PathPolicy.js
│  │  ├─ tech/           TechGraph.js, TechVisibility.js, UpgradeService.js
│  │  ├─ economy/        EconomyService.js, RewardsService.js
│  │  ├─ waves/          WavePlanner.js, ReconProjection.js, FormationService.js
│  │  └─ util/           DeterministicRng.js, Geometry.js, Result.js
│  ├─ application/       GameCoordinator.js, GameSelectors.js, TutorialDirector.js
│  ├─ adapters/
│  │  ├─ phaser/         BootScene.js, PreloadScene.js, TitleScene.js,
│  │  │                  BattlefieldScene.js, OutcomeScene.js, PixelUnitRenderer.js, FxLayer.js
│  │  ├─ ui/             GameShell.js, TechTreeView.js, ReconCards.js,
│  │  │                  FormationGrid.js, HUD.js, Modal.js, TutorialOverlay.js
│  │  └─ assets/         AssetRegistry.js, PlaceholderFactory.js
│  └─ infrastructure/    SaveRepository.js, SaveMigrations.js, Localize.js,
│                         ConfigLoader.js, AudioAdapter.js, DesktopBridge.js
├─ data/
│  ├─ tech/nodes.json, tech/layout-hints.json
│  ├─ units/templates.json, units/upgrade-profiles.json
│  ├─ enemies/templates.json, enemies/attack-patterns.json
│  ├─ formation/layouts.json, formation/unlocks.json
│  ├─ waves/archetypes.json, waves/wave-plan.json, waves/recon-rules.json
│  ├─ balance/unit-stats.json, balance/enemy-stats.json, balance/economy.json,
│  │          balance/combat.json, balance/upgrade-costs.json, balance/candidates/
│  ├─ simulation/criteria.json, simulation/policy-profiles.json, simulation/seeds.json
│  └─ ui/layout.json, ui/input.json, ui/tutorial.json, ui/theme.json
├─ locales/ ko-KR.json, manifest.json
├─ public/assets/
│  ├─ manifest.json, fallback/    [생성 가능 아이콘/픽셀 도형]
│  ├─ units/ enemies/ terrain/ buildings/ effects/ ui/ portraits/
│  ├─ fonts/                       [Noto Sans KR + OFL.txt]
│  └─ audio/bgm/ audio/sfx/        [파일 없이 슬롯만]
├─ tools/       balance-sim.mjs, validate-data.mjs, download-fonts.ps1
├─ desktop/     main.cjs, preload.cjs, package config (실제 선택된 Electron 포장)
├─ package.json, package-lock.json, eslint.config.js, jsconfig.json
└─ README.md
```
`docs/ww2_auto_defense_game_design_v2.md`와 HTML 시안은 변경 요청이 없으면 보존하고 새로운 시스템 데이터를 별도 파일에 넣는다.

### 7.2 순수 도메인 인터페이스
```js
// 개념적 계약: 실제 구현은 JSDoc typedef와 JSON Schema를 정의한다.
createCampaign({ rules, seed }) -> CampaignState
planWave({ campaign, waveIndex, content, seed }) -> WavePlan
getRecon({ wavePlan, reconPolicy }) -> ReconCard[]
getVisibleTech({ graph, buildState, selectedId }) -> VisibleTree
dispatchPreparationCommand(state, { type, payload, commandId }) -> Result<CampaignState>
lockWave(state) -> Result<CombatSnapshot>
stepCombat(snapshot, fixedDelta, rng) -> { snapshot, domainEvents[] }
resolveCombat(snapshot, terminationPolicy) -> WaveOutcome
advanceCampaign(campaign, outcome, rewardPolicy) -> Result<CampaignState>
serializeCampaign(versionedState) / loadCampaign(raw) -> ValidatedCampaignState
```
모든 `Result`에는 `ok, data | errorCode, messageKey, params`. UI는 `messageKey`만 번역한다. 엔진은 소스 도메인 객체에 Phaser 타입을 주입하지 않는다.

### 7.3 저장·재현 가능성
- `SaveEnvelope`: `schemaVersion, campaignId, createdAt, updatedAt, wave, phase, seed, rngState, configVersion, contentVersion, researchIds, buildingIds, upgradeLevels, supplies, formationStage, hqStats, clearedWaveCount, pendingOutcome?, checksum`.
- 저장은 Electron 데스크톱 `app.getPath('userData')` 아래 JSON, 원자적 임시 파일 → rename, 선택적 이전 파일 백업. 브라우저 개발 대체 `localStorage` adapter는 API만 동일하고 실제 배포는 로컬 파일 우선.
- 손상/알 수 없는 버전/존재하지 않는 연구 ID/불가능한 자원·웨이브·강화 상한을 읽으면 유효 상태로 몰래 고치지 말고, 백업 선택 또는 읽기 실패 안내.
- 저장 버전 마이그레이션은 순차 함수, 실패 시 원본 보존. 텍스트/폰트/그래픽은 저장 파일에 참조 ID만 기록.
- 입력 이벤트 `commandId` 중복 처리, 한 번만 보상, save debounce의 종료 시 flush, 게임 종료 시 쓰기 실패 안내.
- seed, 콘텐츠 버전, 정책 버전, 빌드 정책 ID와 전투 로그를 시뮬 리포트에 기록해 결과 추적.

## 8. 에셋·폰트·다국어 설계

### 8.1 아트 슬롯(없는 경우에도 manifest에 선언)
| 그룹 | 필수 키(또는 키 패턴) | 지금 렌더 | 최종 대체 요구 |
| --- | --- | --- | --- |
| 본부 | `building.hq.idle/damaged/destroyed` | 크로스/사령부 마커 | 픽셀 탑다운 사령부·피격 상태 |
| 아군 12종 | `unit.<unitId>.idle/attack/hit/death` | 병과별 픽셀 도형·아이콘 | 12종 고유 스프라이트/애니메이션 |
| 적군 | `enemy.<enemyId>.idle/attack/hit/death` | 실루엣/표식/방향 표시 | 적 템플릿 확장 가능 |
| 지형 | `terrain.ground/road/junction/spawn` | 타일/도트 라인 | 지형 타일셋/스폰 표시 |
| 탄도 | `fx.bullet/shell/tracer/explosion/impact` | 선·원·픽셀 폭발 | 발사/피격 FX |
| 정찰 | `ui.recon.north/south/east/west/unknown` | 붉은 박스+심벌/? | 정찰 아이콘 |
| UI | `ui.check/new/locked/info/warning/upgrade/currency` | 텍스트/벡터 아이콘 | 최종 픽셀 UI 아트 |
| 트리 | `tech.building/research/unit/link` | DOM 도형 + ✓/! | 최종 트리 스타일 |
| 음성 | `audio.bgm.*`, `audio.sfx.*` | **완전 무음** | 추후 optional, 자동재생 전제 금지 |
| 글꼴 | `font.ui.koKR` | Noto Sans KR | 동일 키로 대체 가능 |

- `public/assets/manifest.json`: `assetId, category, relativePath|null, fallbackKind, designSize, pivot, animationFrames, fpsKey, paletteKey, attributionId, status="placeholder"|"ready"`.
- 키/최소 표준 크기, 피벗, 방향, z-depth 순서는 에셋이 도착해도 도메인/씬을 고칠 필요가 없게 약속. 그래픽 원본은 아틀라스 구조를 확장할 수 있게 ID 안정화.
- 픽셀 유닛의 아군/적 식별을 **색상+실루엣+기호**로 중복 표시한다. 사령부·보병·전차·포병·항공기가 추상 도형이더라도 병과 인지가 되도록 아이콘과 한글 툴팁 필수.
- 현재 그래픽과 폰트 외 타사 에셋을 임의로 내려받지 않는다. 폰트/타사 에셋의 라이선스·저작자·다운로드 URL·파일 해시를 `assets/licenses.json`에 추적.

### 8.2 무료 사용 가능한 한글 UI 폰트
- **Noto Sans KR**, Google Fonts 배포, **SIL Open Font License 1.1**. 상업 게임에 포함 가능하지만 '아무 저작권 없음(public domain)'은 아님. 폰트 배포 시 저작권 고지와 OFL 원문 동봉, 수정/이름 제한 준수.
- 다운로드 원본(가변 TTF): `https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf`
- 라이선스 원본: `https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/OFL.txt`
- 저장 목표: `public/assets/fonts/NotoSansKR-variable.ttf`, `public/assets/fonts/OFL.txt`. **온라인 폰트 CDN 의존 금지**.
- 다운로드 스크립트: `tools/download-fonts.ps1` (파일을 프로젝트에 내려받고 각 파일 SHA256 기록). 다운로드·해시 확인과 폰트 포함 여부가 검증되기 전 [완료] 처리 금지.
- CSS 예: `@font-face{font-family:'GameUI';src:url('/assets/fonts/NotoSansKR-variable.ttf') format('truetype');font-weight:100 900;font-display:swap}`. 텍스트는 이 폰트, 2D 월드 아트는 픽셀 스케일 필터 사용.
- 한글에 없는 글리프는 정해진 fallback font로 처리. 번역 추가 시 `locales/<lang>.json` + 폰트 매니페스트에서 locale별 글꼴을 매핑하고 폰트 라이선스를 검사한다.

### 8.3 i18n 계약
- `locales/manifest.json`의 `defaultLocale="ko-KR"`, `supportedLocales=["ko-KR"]`, `fallbackLocale="ko-KR"`.
- `t(key, params)`를 모든 UI 뷰와 오류·툴팁·튜토리얼·접근성 라벨에 사용. 표시 문구는 `locales/ko-KR.json`만 수정해 변경되도록 한다. 복수형/숫자/날짜는 `Intl` 인터페이스 사용.
- 병과·기술·적 이름/설명도 ID로 locale을 조회한다. 새 locale을 추가할 때 기존 로직 수정 불필요.
- 텍스트 길이 증가를 고려한 자동 줄바꿈, 버튼 크기, 패널 overflow. 번역 키 누락/사용하지 않은 키/플레이스홀더 치환 누락은 정적 검사 오류.

## 9. 100웨이브 콘텐츠·성장·난이도 설계

### 9.1 웨이브 기획
- `wave-plan.json`에는 **정확히 1..100** 범위의 웨이브 또는 waveIndex를 매개로 한 결정적 생성 규칙을 제공한다. 웨이브마다 `formationStageKey, threatBudgetKey, spawnScheduleId, routeSetId, reconPatternId, rewardKey, difficultyTags, seedPolicy` 포함.
- 진행 단계: 도입(북/남 소총병·기본 배치) → 사방 방어/장갑의 도입 → 대전차·진지 선택 요구 → 항공 위협과 대공 대응 → 여러 방향/복합 편성 → 후반부 다중 상성·예산 트레이드오프. **구간의 정확한 웨이브 경계는 시뮬레이션·§11의 진형 확장 결정 후 데이터로 확정**한다.
- 적 능력치 상승만으로 100까지 밀지 않는다. 동일한 적 총합 위협이라도 좌우 분산, 시간상 돌격 순서, 적 밀도, 공중/지상 혼합, 진입 방향, 정찰 불확실성으로 전략 선택을 변주한다.
- 초반 전술 튜토리얼은 반복 압박 없이 연구·배치·방향을 학습시키고, 후반에는 연구 완주 후에도 적 정찰→재구매/배치가 의미 있게 달라지는 목표.
- 불공정한 정보 감추기/완벽한 정답 1개만 허용/무료 재시도 자원 복제/기하급수적으로 수치만 올라가는 곡선 지양.

### 9.2 기술 성장이 끝난 뒤에도 빌드가 달라지는 구조
- 해금·강화는 유한하지만 출격 유닛은 매 웨이브 재구매하여 **한정 자원으로 병과 조합·방향·칸 배분** 선택을 계속한다.
- 연구의 명확한 보상, 같은 1×1칸 전차의 비용 대비 역할, 항공의 방위 커버리지, 정찰 방향과 시너지, 단일 적 집중 대 광역 대응의 의사결정을 유지.
- 연구 재투자가 더 이상 없는 후반에도 매 웨이브 조합의 유효 후보가 여러 가지인지 시뮬레이션 지표로 검사.
- 모든 유닛이 해금되어도 부적합한 배치가 패배하는 반례를 의도적으로 만들되, 전략적 대응으로 개선 가능한 사례를 같이 요구한다.

## 10. 오프라인 N회 밸런스 시뮬레이션: 수치 도출 규약

### 10.1 정직한 전제
- 원 HTML의 HP·cost·상대 화력은 시뮬레이션 결과가 아니다. 이 문서를 작성한 시점에는 **적 이동·피격·보상·실제 전투 엔진이 없으므로 신뢰 가능한 수치 시뮬레이션 결과도 없다**.
- 미결정 핵심 전투 정책이 결정되기 전 승률·DPS·경제 최적값·재미 점수를 임의 보고하지 않는다. 확정 후 도메인 모델을 개발하고 **실제 동일 도메인 엔진**으로 수치 도출.
- 브라우저/Phaser/QA·성능 테스트 없이 Node CLI 헤드리스 계산만 허용한다.

### 10.2 입력·표본·전략
- `tools/balance-sim.mjs`는 `src/domain` 시스템을 공유한다. 별도 간이 화력식으로 결과를 위조하지 않는다.
- 입력: 후보 밸런스 JSON, 난수 seed 목록, 정찰/적/경로·경제 정책 ID, 1..100 웨이브, 기술/강화/구매/배치 결정자(`BuildPolicy`).
- 기본 표본 설계: **각 정책·후보당 최소 N=1,000개의 독립 seed 캠페인(각 최대 100웨이브)**. 필요한 정밀도가 부족하면 N을 2,000·5,000 등으로 올린다. 원하지 않은 대량 루프 방지용 CLI 상한/리포트 중단·재개 지원. 초기 1,000은 통계 실험 설정이지 게임 능력치가 아니다.
- 비교 빌드 정책 최소 6종: 소총·기관총 보병 집중, 대전차 집중, 전차 범용, 공중 집중, 혼합 균형형, 정찰 반응형. 추가로 무작위 합법적 배치와 **의도적으로 잘못된 진형**을 넣어 전략 유효성을 검증한다.
- 모든 정책은 **같은 seed·WavePlan**으로 짝 비교. 진형 위치만 회전/교환한 실험, 동일 유닛 편성에 다른 배치, 동일 배치에 다른 연구 투자 실험을 별도 수집한다.
- 캘리브레이션 과정: 원형 데모 수치(참고 초기값) → 후보 생성 → N회 전체 캠페인 반복 → 통계·반례 분석 → 숫자 설정 조정 → 같은 seed로 재실험 → 보류 seed로 재검증 → 확정 보고.
- 숫자 조정에 플레이 중 렌더 프레임/랜덤 UI 이벤트가 개입하면 안 된다. 배속 1x/2x도 simulation 결과를 바꾸지 않아야 한다.

### 10.3 측정 지표
| 범주 | 필수 지표 | 목적 |
| --- | --- | --- |
| 클리어 | seed별 최종 도달 웨이브, 100웨이브 완주율, 첫 패배 웨이브, 사령부 잔여 HP | 보편적 생존·난이도 파악 |
| 경제 | 물자 수입/지출/잔액, 다음 웨이브 합법 편성 가능 여부, 연구 투자 기회, 잔액 정체/폭증 | 소프트락·전략 자유도 |
| 빌드 선택 | 구간별 사용 유닛 분포·유닛 시너지·편성 엔트로피, 승리하는 서로 다른 배치 정책 수 | 단일 지배 빌드 방지 |
| 상성 | 적 편성·방향별 피해 효율, 대전차·대공 카운터 효과, 상위 유닛 연구 후 개선폭 | 기술 보상 및 역할 |
| 기하 | 같은 비용·병력 다른 위치에서 승률/본부 피해 차이 | 위치 전략이 의미 있는지 |
| 학습 | 초기 3/5/9칸 구간에서 선택지 증가와 정찰 대응 성공률 | 점진적 학습 |
| 후반 유지 | 10웨이브 단위 유효 전략의 다양성, 위협 패턴 변주, 연구 완주 후 전략 변경의 실익 | 100까지 반복감 완화 |
| 안정성 | 무적 무한 루프, 음수 재화, 틱 상한 초과, 100 뒤 스폰, 2회 보상 등 비정상 카운트 | 모델 오류 탐지 |

### 10.4 수치 확정의 판단 기준
- 통계적 불확실성: 각 후보/정책의 100웨이브 완주율에 신뢰구간(Wilson 등) 기록. 리포트에 N·seed·콘텐츠 버전 필수.
- **통과해야 할 구조적 성질(선호 목표이지 측정 결과 아님):**
  1. 합법적인 의도적 대응 빌드로 각 웨이브와 100웨이브 전체 클리어가 최소 한 경로 이상 가능하다.
  2. 진형 배치/주요 병과/적 진입 방향을 바꾸면 의미 있는 결과 차이를 실제 표본으로 관찰한다.
  3. 전술적으로 틀린 편성이 모든 상황에서 최대 연구로 이기지 않아야 하며, 반대로 상위 연구의 장점이 대응 대상에서 계량된다.
  4. 매 10웨이브 구간에 경제 파산·막다른 빌드 강제가 없는지 확인하고, 후반 여러 카운터 빌드가 선택 가능해야 한다.
  5. 데이터 오류/완주 불가능 웨이브/출현 전부 소진 전에 선제 종료/중복 보상이 0건이어야 한다.
- 정확한 허용 승률 구간, 유효 전략 다양성 임계치, 개별 유닛 전투 수치는 **사전에 `data/simulation/criteria.json`에 목표값을 넣고**, 시뮬 결과로 달성 여부 판정. 사용자 합의 없는 임계치를 '확정 기획'으로 포장하지 않는다.
- 재미를 100웨이브까지 유지한다는 것은 시뮬레이션만으로 증명할 수 없으므로 최종 보고는 "전략 다양성/의사결정 지표 통과"라고 표현한다. 사용자 지시에 따라 실제 플레이 QA는 수행하지 않는다.

### 10.5 CLI와 리포트 규격
```bash
npm run balance:simulate -- --waves 1-100 --seeds 1000 --policies all --config data/balance/candidates/baseline.json
npm run balance:compare -- --before baseline --after candidate-A
npm run balance:report
```
출력 `docs/balance-reports/<candidate>-<timestamp>.json` + `.md`: 설정 해시, 정책 버전, N, seed 집합, 100웨이브 결과, decile 요약, 실패 seed와 원인, 문제 웨이브, 개선 전/후 변화, 미달 지표, 조정한 데이터 키, 재현 명령. 사용자에게 결과를 숫자로 보여주되 **실행한 경우만** 실측값 표기.

## 11. 규칙 확정이 필요한 질문(추측 금지 게이트)

원 기획서 부록 A와 HTML 시안 간 규칙 공백. 구현 시작 시 아래를 구체적으로 질문한다. **일반적인 UI 기본값은 질문 없이 진행 가능하나, 여기서 게임 결과를 바꾸는 답변을 만들지 않는다.**

| ID | 질문 | 영향을 받는 구성요소/진행 게이트 |
| --- | --- | --- |
| D-01 | 패배 후 처음부터 재시작 / 같은 웨이브 재시도 / 체크포인트 보존 중 어떤 정책인가? | 게임 오버, 저장, 밸런스 |
| D-02 | 사용하지 않은 군수물자는 다음 웨이브로 **이월**하는가? | 경제, 보상, 캠페인 시뮬레이션 |
| D-03 | 적 경로 분기/합류·유닛 차단/교전·대상 우선순위는 무엇인가? | 경로, 적 AI, 진형 가치 |
| D-04 | 적이 HQ에 도착하면 지속 공격/즉시 단발 피해/도달 후 퇴장 중 무엇인가? | HQ 피해, 시간 판정 |
| D-05 | 아군 표적은 최근접/본부에 가장 근접/위협도/혼합 중 무엇을 택하는가? 적의 표적 선정도 어떻게 하는가? | 공격 AI, 상성 |
| D-06 | 항공기는 공격 중 피격 가능한가, 어떤 병과와 교전 가능하며 슬롯 공격 구역을 벗어날 수 있는가? | 항공 판정, 대공 |
| D-07 | **13칸 정확한 좌표**는 무엇인가? 3/5/9/13/25칸의 개방 웨이브는 각각 언제인가? | 진형, 도로, 학습 곡선 |
| D-08 | 정찰 `?`가 숨기는 범위(병과/수량/방향/등장 시각)와 정찰과 실제 출현의 허용 오차는? | 정찰 공정성, WavePlan |
| D-09 | 전투 30초 종료에 남은 적은 즉시 제거/퇴각/기타 처리 중 무엇인가? 30초에 HQ도 파괴되는 동시 이벤트 우선순위는? | 전투 종료, 보상 |
| D-10 | 시안의 **초기 소총병 2분대**는 실제 게임 시작 시 무상 제공되는가, 준비 단계 구매부터 하는가? | 시작 자원/배치, 온보딩 |
| D-11 | 전장에 등장하는 **진지**는 고정 적인가, 이동 적인가, 적 병과를 어떤 종류까지 구현할 것인가? | 적 콘텐츠, 경로와 HP |
| D-12 | 패키징 지원 OS와 창 최소 해상도, 배속 배수/설정 제공 방식의 최종 선택은 무엇인가? | 출시·UX, 기술적 기본값은 먼저 구현 가능 |

- 답변은 `docs/decisions.md`에 `ID / 질문 / 선택 / 변경일 / 관련 파일 / 저장 호환성 / 시뮬레이션 재실행 필요`로 기록.
- 답변 전에도 가능: 프로젝트 부트스트랩, 파일/데이터 계약, DAG·다국어/에셋 슬롯, 설정 UI, 트리의 점진 노출, 전장 placeholder 표시, 구조적 정적 검사.
- **답변 없이 완료할 수 없음**: D-03~09의 전투 최종 판정, 전체 캠페인 밸런스 수치 확정, 최종 100웨이브 시뮬 판정. 임시 정책을 쓰면 `unresolved` 마커와 완료하지 않은 체크 항목을 남길 것.

## 12. 정적 품질 검사 및 오류 대응

### 12.1 검사 명령
```bash
npm run lint
npm run typecheck         # checkJs JSDoc / noEmit
npm run check:syntax      # node --check *.js / *.mjs (대상 파일 전체)
npm run check:schemas     # JSON Schema, 범위·ID·참조 무결성
npm run check:graph       # DAG, 1연구-1유닛, 상위 성능 정의, 무한 성장 방지
npm run check:locales     # ko-KR 모든 UI 오류·튜토리얼 키 대응
npm run check:assets      # manifest 슬롯, 폰트 라이선스, 경로·대체 규칙
npm run check:deps        # 순환 의존 및 domain -> Phaser/DOM import 금지
npm run check:package     # 오프라인 의존·금지 Steam API·배포 파일 정적 점검
npm run check:all
```
브라우저를 열거나 렌더 성능/플레이를 측정하지 않는다. 밸런스 시뮬은 §10 별도 명령이고 허용되는 유일한 코드 실행형 검증 예외.

### 12.2 에러/경계 처리 수용조건
- 입력: 배열 아닌 저장, 깨진 JSON, 누락 config/locale, null/undefined 유닛, 연구 선행 위조, 순환 DAG, 저예산 음수 거래, 비용 실수, 중복 취소·이동·교환.
- 전장: HQ 겹침, 빈 칸 클릭, 잠금 칸, 유닛 25개 초과, 확장 시 기존 위치 유지 정책, 0마리 스폰, 아직 예약된 스폰, 길 없는 적, 0/무한 사거리, 비정상 공격각.
- 시간: pause/배속 복원, tick=0·지나치게 큰 delta, 지연 중 두 번 종료, HQ HP 0과 타임아웃 동시 발생, 클리어 후 Next 중복.
- 저장: 서로 다른 스키마 버전, 쓰기 권한 오류, 디스크 용량 부족, 부분 쓰기, 비정상 종료, 중복 load, checksum 실패.
- UI: 선택 노드 삭제/해금 실패, 온보딩 재개, 프런티어 변화 시 선택 해제, locale 키 누락, 0 비용 표시, !를 인지 못하는 접근성 사용자, 화면 크기 변동 시 전장 가림, 자산 누락 시 폴백.
- 시뮬: 순수 고정 tick에 시간 경계, seed 재현성, 리포트 seed·버전 기록 누락, 결과 중복 집계, 인위적으로 모든 빌드를 패배시키는 시나리오 탐지.
- 예상 사용자 오류는 충돌 없이 `Result.errorCode`와 `t(key)`를 통한 피드백; 시스템 불변식 위반은 명시 로그/검증 실패. 에러 무시/은폐 금지.

## 13. 빌드/데스크톱/Steam 출시 계약
- Phaser.js + **JavaScript ES modules**, Vite 로컬 정적 번들, Electron 최소 브리지로 윈도우 데스크톱 패키지. Phaser 공식 문서에서는 v4.2.1이 2026-10 현재 최신 안정 다운로드로 안내하므로 **버전 고정(예: `phaser@4.2.1`)**, 설치 시 lockfile 커밋. Phaser 3 예제 API를 4에 검증 없이 섞지 않는다. https://phaser.io/download / https://docs.phaser.io/
- Electron은 `contextIsolation: true`, `nodeIntegration:false`, 로컬 IPC 화이트리스트, 외부 브라우저 네비게이션/원격 코드 차단. 원격 CDN·로그인 서버·웹 서비스 없이 에셋/번역/설정을 로컬 패키지에 포함.
- 개발 빌드/배포 패키지는 동일 게임 콘텐츠를 사용하며, 네이티브 차이는 `DesktopBridge`와 `SaveRepository`로 격리. OS 기본 저장 경로 및 로컬 세이브 백업 문서화.
- Steam 업로드/게임 ID/상점 페이지/서명/지원 OS/아이콘/스크린샷/법적 고지/배포 아트/실제 스토어 출시 행위는 **이 설계 범위의 사후 운영 절차**, 직접 Steamworks SDK 연결 없음.
- 기능 완료와 Steam 상점 게시 완료는 별도이며, 사용자 승인 없이 실제 Steam 배포하지 않는다.
- **아직 실행하지 않은** 빌드·패키징 성공/오프라인 기동 성공을 단정하지 않는다. 사용자 금지에 따라 브라우저/플레이 성능 확인은 제외하고 정적 내용 검증만 기록한다.

## 14. 구현 체크리스트 (AI는 각 단계 종료 시 체크)

### 14.1 준비·합의·기반
- [ ] I-01 Git 저장소/기준 브랜치 확인 후 새 요구사항 브랜치 생성. 브랜치 불가 시 차단 사유 보고.
- [ ] I-02 원본 기획서·HTML을 보존하고 결정표/영향도·파일 간 계약과 질문을 기록.
- [ ] I-03 Phaser 4/JS/Vite/Electron 골격, 씬 진입, 로컬 패키지 기본 경로, npm 정적 검사 명령 설정.
- [ ] I-04 데이터 스키마/ConfigLoader/locale/asset manifest/안전한 fallback 시스템 구현.
- [ ] I-05 Noto Sans KR 글꼴 파일+OFL 로컬 포함 및 라이선스·해시 정적 검증.

### 14.2 코어 데이터/로직
- [ ] I-06 28노드 트리 DAG, 1연구-1유닛, 기술·건물 상태와 종류별 강화 서비스.
- [ ] I-07 트리의 조상+자식 1단계 점진 노출, ✓/! 완료 알림, 단계별 튜토리얼 및 기술 상세 UI.
- [ ] I-08 준비 경제 트랜잭션(구매/배치/이동/교환/취소/100% 환불)과 전투 진입 잠금.
- [ ] I-09 3/5/9/13/25칸 레이아웃(13칸·개방 시점 질문 완료), HQ 보호와 방사형 방향 사격.
- [ ] I-10 WavePlan/정찰 카드/북남동서 진입 경로·분기·적 AI(관련 질문 완료).
- [ ] I-11 30초 순수 도메인 자동전투, 공격·피격·항공기, 종료/동시성(관련 질문 완료).
- [ ] I-12 웨이브 1~100, 보상·영구 연구·임시 부대 소멸·사령부 회복·패배·클리어·재도전(관련 질문 완료).
- [ ] I-13 시드 기반 재현성, 전투 중 변경 금지, 배속 변경 결과 독립성, 오류 복구.

### 14.3 시각/저장/콘텐츠
- [ ] I-14 Phaser Boot/Preload/Title/Battlefield/Outcome + 7:3 게임 shell/키보드·마우스 입력/설정.
- [ ] I-15 픽셀 아이콘 임시 유닛·지형·탄·폭발·정찰 UI 및 최종 에셋 슬롯/무음 오디오.
- [ ] I-16 ko-KR 전 문자열 지역화, locale 추가 가능 구조, UI 접근성/아이콘 상태, 설정/도움말.
- [ ] I-17 버전 저장/불러오기/마이그레이션/손상 보호·로컬 오프라인 데이터.
- [ ] I-18 연구·배치에 따라 진형과 전투 결과가 달라지는 콘텐츠, 100웨이브 적·정찰 패턴 설계.

### 14.4 시뮬·출시 준비·검증
- [ ] I-19 순수 도메인 공유 헤드리스 시뮬, 다중 정책/seed/N회 리포트 구축.
- [ ] I-20 100웨이브 전 구간과 빌드 다양성·진형 영향·자원 파산·상성·후반 전략 지표 반복 측정 및 설정 보정. 미달 항목은 수정-재측정.
- [ ] I-21 JS/JSON/locale/asset/의존 순환/시나리오 데이터 **정적 검사 전체 통과**(브라우저/QA/성능 검사는 실행 금지).
- [ ] I-22 스팀 배포 지향 독립 Windows 오프라인 패키지 설정/라이선스/저장 경로 문서 및 정적 패키지 검토(실제 배포는 별도).
- [ ] I-23 문서-코드-데이터 동기화, 질문 답변 반영, 예외·모서리·오류 검토 완료 및 **모든 체크리스트 [x] 근거 기록**.

**완료율:** `verified [x] count / total 23`. 하나라도 `[ ]`면 100%라고 보고하지 않는다. 이 문서는 "구현 계획과 계약의 준비"이며, **위 23항목은 아직 게임 코드가 없으므로 모두 미완료**다.

## 15. 단독 전달 시 AI가 바로 수행할 첫 번째 작업
1. 이 문서를 처음부터 끝까지 읽고 `AGENTS.md`, 두 원본 문서를 확인한다.
2. 파일 시스템/권한/Git 저장소 현황을 제시한다. **새 브랜치가 없으면 생성하고** 불가 시 해당 한계를 보고한다.
3. §11의 핵심 미결정 질문을 구체적으로 사용자에게 알린다. 대답 전 구현 가능한 I-03, I-04, I-06, I-07, I-14의 독립 범위를 계획에 기록한다.
4. I-01~I-23 체크리스트를 작업 노트로 복사하고 의존성·완료 기준·명령을 하나씩 작성한다.
5. 구현 전 영향도를 기록한 뒤 **기반/계약/정적 검증부터 개발을 시작**한다. 미결정 게임 판정에 의존하는 임시 코드는 확정으로 포장하지 않는다.
6. 매 변경마다 `정적 점검 → 오류 수정 → 다시 정적 점검`; 수치 변경마다 `Node 시뮬 N회 → 리포트 → 값 수정 → 재실행`.
7. 요청 범위를 넘어 브라우저 실행·플레이 QA·성능 검사를 하지 않으며, 실행하지 않은 검증을 합격이라고 쓰지 않는다.
8. 모든 질문·자산·통계 근거·체크 항목이 충족됐을 때만 100% 완료 선언. 미완료이면 해당 항목과 차단 원인을 투명하게 보고.

---

### 검증 범위 기록(문서 작성 시점)
- 확인된 파일: `ww/docs/ww2_auto_defense_game_design_v2.md`, `ww/docs/ww2_upward_tree.html`; `ww/src/`는 비어 있음.
- 원형 HTML의 기술트리는 4개 건물(사령부 포함), 12개 연구, 12개 유닛으로 총 28개 노드를 포함.
- 브라우저, 게임 실행, 오프라인 전투 시뮬레이션, 성능 검사는 **실행되지 않음**.
- 현재 프로젝트는 Git 메타데이터가 보이지 않고 파일 연결 도구로 Git 브랜치 명령을 실행할 수 없음. I-01은 별도 Git 환경 확보 전까지 미완료.
- 폰트는 다운로드용 스크립트와 라이선스·보관 경로를 명세했으며 실제 폰트 배치/검증 여부는 I-05로 관리.



## 16. 승인된 에셋 제작 규약 — 2026-10-26 (기존 에셋 장의 표현 기준 갱신)
이 절은 §3, §8, §14의 **아트/오디오 제작 가정에 한해서 최신 사용자 승인 내용을 우선 적용**한다. 실제 도메인 전투 규칙은 원래 확정된 기획·결정문을 따르고, 현재 게임 코드의 181×76 기술트리 DOM 노드 등은 **추후 구현 연동**이 필요하다.

- 세부 실제 제작 규격, 배치 프롬프트, Python 후처리 스펙: `docs/ASSET_IMPLEMENTATION_DESIGN.md`, `asset-factory/spec/*.json`, `docs/ASSET_PIPELINE_USAGE.md`, `.agents/skills/ww-asset-factory/SKILL.md`.
- **기술트리**: 장식 없는 중립 정사각형 본체 64×64 1종, AI 생성 아이콘 24×24 28종, 상태 배지 16×16 독립 에셋. 건물/연구/유닛 및 잠금/완료/선택 상태색은 JS/CSS로 표시. 1단계씩만 공개. 별·국기·십자·휘장 등 국적 표식 일절 금지.
- **유닛**: 기존 일반적 `idle/attack/hit/death` 애니메이션 슬롯은 단일 `battle.unit.<id>.base` 시각소스를 재사용해 호환 처리. 12종만 AI 생성하며 아군/적군 동일 실루엣+팀 tint. 공격=muzzle FX+발사체/선택적 1px 넉백, 피격=빨간 윤곽선, 이동=픽셀 위치 변화, 사망=alpha fade. 연출은 전투 판정/seed 결정성에 영향 없음.
- **음악**: 실제 AI 음악 모델로 별도 제작. 준비 BGM은 **최소 180초, 목표 210초의 자연 루프**. 전투 BGM은 **약 30초 길이 4곡**을 웨이브마다 순환 선택. BGM 길이는 전투 계산/승패 시간 규칙과 별개. 타이틀/승리/패배 및 UI/전투 효과음 포함. BGM은 생성되기 전까지 무음 fallback으로 작동.
- **전체 파일 목록**은 현재 `asset-factory/spec/sheets.json`의 30개 이미지 팩(결과 파일 301개: AI 249 + Python 52), `audio.json`의 63곡/효과음(음악 8 + SFX 55). 기존 127개 슬롯은 `crosswalk.json`이 호환 매핑하며 기존 슬롯/스키마를 조용히 삭제하지 않는다.
- **명령:** `py -3 tools/asset_factory.py validate` → `export` → 새 세션의 실제 이미지/음악 AI 생성 도구로 `generation-jobs.json` 처리 → `build-all --strict` → `audit-audio --require-all`. Python 자체는 음악·이미지 생성 모델이 아니다.
- **검증 금지 유지:** 브라우저 실행, 게임 플레이 QA, FPS/성능 검사 실행하지 않음. 문서/이미지 크기/팔레트/오디오 WAV 메타데이터의 정적 검증을 분리.
