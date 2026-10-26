# candidate-v10 정량 분석

정책별 독립 seed 1000개. 회계 불일치 0건. 아래는 첫 시도 계산 결과이며 실제 재미/브라우저/실기 검증이 아니다.

| 정책 | N | 100 완주 | 평균 도달 | 편성 엔트로피 | 평균 최종 잔액 |
| --- | ---: | ---: | ---: | ---: | ---: |
| infantry | 1000 | 0 | 11.85 | 0.190 | 3242.7 |
| antiArmor | 1000 | 0 | 21.19 | 1.070 | 9262.4 |
| armor | 1000 | 0 | 10.07 | 2.124 | 222.5 |
| air | 1000 | 176 | 72.36 | 2.257 | 416.3 |
| mixed | 1000 | 856 | 96.25 | 2.130 | 6706.4 |
| recon | 1000 | 867 | 98.61 | 1.282 | 16138.3 |
| random | 1000 | 0 | 38.76 | 2.373 | 11816.3 |
| wrong | 1000 | 0 | 3.37 | 0.000 | 611.6 |

same-roster-position-swap: N=9812, 승패 차이 52, HQ 차이 102, 평균 HQ 차이 -0.38.

same-position-without-upgrades: N=9812, 승패 차이 492, HQ 차이 653, 평균 HQ 차이 -24.93.

측정 기준: docs/BALANCE_TARGET_2026-10-26.md. 숫자 임계치는 사용자 난이도 선택의 내부 해석이다.

- [x] sample-size
- [x] completion-recon
- [x] completion-mixed
- [x] wrong-formation
- [x] invalid-results
- [x] accounting
- [x] nonnegative-balance
- [x] position-effect
- [x] upgrade-effect

엔트로피는 전략 다양성/체감 재미를 증명하지 않는다.
