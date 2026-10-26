# candidate-v10 오프라인 밸런스 리포트

설정 SHA256: bce071e432a46f4b1b8078c90f2966c0d2e98e870395a8e4006b218599b3a44f

정책별 요청 N=1000, seed 1..1000. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| infantry | 1000 | 0 | 11.85 | 17 | 0 |
| antiArmor | 1000 | 0 | 21.19 | 35 | 0 |
| armor | 1000 | 0 | 10.07 | 26 | 0 |
| air | 1000 | 176 | 72.36 | 100 | 0 |
| mixed | 1000 | 856 | 96.25 | 100 | 0 |
| recon | 1000 | 867 | 98.61 | 100 | 0 |
| random | 1000 | 0 | 38.76 | 78 | 0 |
| wrong | 1000 | 0 | 3.37 | 6 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v10.json --seeds 1000 --start-seed 1 --policies all --out docs/balance-reports/candidate-v10-final-1000.json
