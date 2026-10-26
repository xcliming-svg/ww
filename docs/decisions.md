# 결정 대기 기록

2026-10-26 사용자에게 질문 전달. 답변 전 선택을 확정하지 않는다.

| ID | 질문 | 선택 | 관련 파일 / 저장 호환성 / 시뮬 영향 |
| --- | --- | --- | --- |
| D-01 | 패배 후 처음부터/동일 웨이브/체크포인트? | unresolved | campaign, save; 정책 버전 변경; 재측정 |
| D-02 | 미사용 물자 이월? | unresolved | economy, rewards, save; 재측정 |
| D-03 | 적 경로 분기/차단/교전? | unresolved | RoutePolicy, EnemyEngagementPolicy; 재측정 |
| D-04 | HQ 도달 후 지속 공격/단발/퇴장? | unresolved | HQContactPolicy; 재측정 |
| D-05 | 아군/적 표적 우선순위? | unresolved | TargetingPolicy; 재측정 |
| D-06 | 항공기 피격·병과·담당 구역? | unresolved | AttackSystem, aircraft; 재측정 |
| D-07 | 13칸 좌표와 단계 개방 웨이브? | unresolved | layouts/unlocks, save; 재측정 |
| D-08 | 정찰 ? 범위·실제 출현 오차? | unresolved | ReconProjection, WavePlan; 재측정 |
| D-09 | 30초 잔여 적·동시 HQ 파괴 우선순위? | unresolved | termination, rewards; 재측정 |
| D-10 | 소총병 2분대 무료/직접 구매? | unresolved | initial state/save; 재측정 |
| D-11 | 적 진지 고정 여부·적 종류? | unresolved | enemy templates/routes; 재측정 |
| D-12 | OS/최소 해상도/배속? | unresolved | Windows/1280×720/1·2배속은 UI 기술 후보; 저장 설정 검증 |

초기 HQ·병영·소총 연구는 설계 §4.1의 후보를 미리보기 상태에만 사용한다. 실제 캠페인 생성·전투는 규칙/수치 확정 전 차단한다. 무료 소총병을 지급하지 않는다. 준비 거래 로직은 외부 설정을 받되 비용 null을 무료로 해석하지 않는다.

밸런스: 원 HTML 비용/HP/상대 화력은 `prototypeReference`에만 보관할 수 있으며 실제 DPS로 사용 금지. 100웨이브 적/보상/초기 자원/강화 및 criteria 목표는 아직 미측정·미합의. 시뮬레이션 결과 없음.


### 2026-10-26 — 에셋 제작 방향 승인 (표현만 변경)
- 노드: 64px 단순 중성 정사각형 1종 + 24px 기본 아이콘 + 16px 별도 배지; 코드에서 선택/해금/완료색.
- 유닛: 12종 단일 기본 모습, 아군/적군 색상 변경, 공격/피격/사망/이동의 대다수는 JS로 처리. 국가 표식 전면 금지.
- 음악: 실제 음악 AI 생성, 준비 3분 이상(목표 3분 30초) 루프, 웨이브 약 30초 4곡 순환. 결과에 맞춰 재생하되 도메인 승패와 분리.
- 규칙 원본: `docs/ASSET_IMPLEMENTATION_DESIGN.md`, `asset-factory/spec/*.json`, `.agents/skills/ww-asset-factory/SKILL.md`. 기존 원형 HTML/데모 수치를 실제 콘텐츠로 간주하지 않는다.
