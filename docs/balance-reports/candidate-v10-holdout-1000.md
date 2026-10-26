# candidate-v10 오프라인 밸런스 리포트

설정 SHA256: bce071e432a46f4b1b8078c90f2966c0d2e98e870395a8e4006b218599b3a44f

정책별 요청 N=1000, seed 100000..100999. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| mixed | 1000 | 855 | 97.62 | 100 | 0 |
| recon | 1000 | 863 | 98.77 | 100 | 0 |
| wrong | 1000 | 0 | 3.39 | 6 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v10.json --seeds 1000 --start-seed 100000 --policies mixed,recon,wrong --out docs/balance-reports/candidate-v10-holdout-1000.json
