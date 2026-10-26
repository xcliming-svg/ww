# candidate-v5 오프라인 밸런스 리포트

설정 SHA256: 3f7f02c5d5e2e8a42430d210d5fb1f58f3695a04063e51fe404670b4934c249c

정책별 요청 N=32, seed 1..32. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| infantry | 32 | 0 | 11.44 | 14 | 0 |
| antiArmor | 32 | 0 | 12.44 | 19 | 0 |
| armor | 32 | 0 | 7.25 | 10 | 0 |
| air | 32 | 0 | 16.88 | 22 | 2 |
| mixed | 32 | 0 | 18.78 | 34 | 0 |
| recon | 32 | 0 | 41.50 | 77 | 0 |
| random | 32 | 0 | 13.59 | 21 | 0 |
| wrong | 32 | 0 | 3.34 | 5 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v5.json --seeds 32 --start-seed 1 --policies all --out docs/balance-reports/candidate-v5-exploration.json
