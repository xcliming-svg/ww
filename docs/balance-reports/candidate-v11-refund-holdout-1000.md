# candidate-v11 오프라인 밸런스 리포트

설정 SHA256: 42122499f701899054493e3caf5aa66e3c2b8e94f24b04432ce5f2350f252139

정책별 요청 N=1000, seed 100000..100999. 상태: partial. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| mixed | 1000 | 855 | 97.63 | 100 | 0 |
| recon | 1000 | 868 | 98.79 | 100 | 0 |
| wrong | 1000 | 0 | 3.39 | 6 | 0 |
| respec | 0 | 0 | 0.00 | 0 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v11.json --seeds 1000 --start-seed 100000 --policies mixed,recon,wrong,respec --paired --out docs/balance-reports/candidate-v11-refund-holdout-1000.json
