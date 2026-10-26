# candidate-v11 정량 분석

정책별 독립 seed 1000개. 회계 불일치 0건. 아래는 첫 시도 계산 결과이며 실제 재미/브라우저/실기 검증이 아니다.

| 정책 | N | 100 완주 | 평균 도달 | 편성 엔트로피 | 평균 최종 잔액 |
| --- | ---: | ---: | ---: | ---: | ---: |
| infantry | 1000 | 0 | 11.85 | 0.190 | 3242.7 |
| antiArmor | 1000 | 0 | 21.19 | 1.070 | 9262.4 |
| armor | 1000 | 0 | 10.07 | 2.124 | 222.5 |
| air | 1000 | 666 | 91.41 | 2.264 | 1553.0 |
| random | 1000 | 0 | 38.28 | 2.374 | 11503.7 |
| wrong | 1000 | 0 | 3.37 | 0.000 | 611.6 |
| mixed | 1000 | 851 | 96.26 | 2.130 | 6695.9 |
| recon | 1000 | 880 | 98.78 | 1.282 | 16194.2 |
| respec | 1000 | 779 | 96.76 | 1.803 | 11813.9 |

same-roster-position-swap: N=9833, 승패 차이 50, HQ 차이 104, 평균 HQ 차이 -0.70.

same-position-without-upgrades: N=9833, 승패 차이 531, HQ 차이 698, 평균 HQ 차이 -26.59.

측정 기준: docs/BALANCE_TARGET_2026-10-26.md. 숫자 임계치는 사용자 난이도 선택의 내부 해석이다.

- [x] sample-size
- [x] completion-recon
- [x] completion-mixed
- [x] wrong-formation
- [x] invalid-results
- [x] invalid-paired-results
- [x] accounting
- [x] nonnegative-balance
- [x] position-effect
- [x] upgrade-effect
- [x] refund-policy-exercised

엔트로피는 전략 다양성/체감 재미를 증명하지 않는다.
