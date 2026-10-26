# candidate-v3 오프라인 밸런스 리포트

설정 SHA256: b1e7d47dfbb86db616b7b9bc41418b7d843a3b693b7a53bc228f6820ff580ca5

정책별 요청 N=16, seed 1..16. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| infantry | 16 | 0 | 10.50 | 12 | 0 |
| antiArmor | 16 | 0 | 4.75 | 7 | 0 |
| armor | 16 | 0 | 7.06 | 8 | 0 |
| air | 16 | 0 | 4.88 | 9 | 0 |
| mixed | 16 | 0 | 4.75 | 7 | 0 |
| recon | 16 | 0 | 4.75 | 7 | 0 |
| random | 16 | 0 | 4.63 | 6 | 0 |
| wrong | 16 | 0 | 3.00 | 3 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v3.json --seeds 16 --start-seed 1 --policies all --out docs/balance-reports/candidate-v3-exploration.json
