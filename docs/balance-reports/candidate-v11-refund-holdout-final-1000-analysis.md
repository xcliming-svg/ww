# candidate-v11 정량 분석

정책별 독립 seed 1000개. 회계 불일치 0건. 아래는 첫 시도 계산 결과이며 실제 재미/브라우저/실기 검증이 아니다.

| 정책 | N | 100 완주 | 평균 도달 | 편성 엔트로피 | 평균 최종 잔액 |
| --- | ---: | ---: | ---: | ---: | ---: |
| mixed | 1000 | 855 | 97.63 | 2.129 | 6780.7 |
| recon | 1000 | 868 | 98.79 | 1.282 | 16169.1 |
| wrong | 1000 | 0 | 3.39 | 0.000 | 618.2 |
| respec | 1000 | 774 | 96.97 | 1.803 | 11807.0 |

same-roster-position-swap: N=9829, 승패 차이 42, HQ 차이 82, 평균 HQ 차이 -0.36.

same-position-without-upgrades: N=9829, 승패 차이 510, HQ 차이 671, 평균 HQ 차이 -25.64.

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
