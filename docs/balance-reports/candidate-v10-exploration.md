# candidate-v10 오프라인 밸런스 리포트

설정 SHA256: bce071e432a46f4b1b8078c90f2966c0d2e98e870395a8e4006b218599b3a44f

정책별 요청 N=64, seed 1..64. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| mixed | 64 | 57 | 96.41 | 100 | 0 |
| recon | 64 | 58 | 98.69 | 100 | 0 |
| wrong | 64 | 0 | 3.39 | 5 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v10.json --seeds 64 --start-seed 1 --policies mixed,recon,wrong --out docs/balance-reports/candidate-v10-exploration.json
