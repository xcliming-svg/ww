# candidate-v11 정량 분석

정책별 독립 seed 8개. 회계 불일치 0건. 아래는 첫 시도 계산 결과이며 실제 재미/브라우저/실기 검증이 아니다.

| 정책 | N | 100 완주 | 평균 도달 | 편성 엔트로피 | 평균 최종 잔액 |
| --- | ---: | ---: | ---: | ---: | ---: |
| recon | 8 | 8 | 100.00 | 1.282 | 16648.0 |
| respec | 8 | 8 | 100.00 | 1.796 | 12535.0 |

same-roster-position-swap: N=0, 승패 차이 0, HQ 차이 0, 평균 HQ 차이 0.00.

same-position-without-upgrades: N=0, 승패 차이 0, HQ 차이 0, 평균 HQ 차이 0.00.

측정 기준: docs/BALANCE_TARGET_2026-10-26.md. 숫자 임계치는 사용자 난이도 선택의 내부 해석이다.

- [ ] sample-size
- [x] completion-recon
- [ ] completion-mixed
- [ ] wrong-formation
- [x] invalid-results
- [x] accounting
- [x] nonnegative-balance
- [ ] position-effect
- [ ] upgrade-effect

엔트로피는 전략 다양성/체감 재미를 증명하지 않는다.
