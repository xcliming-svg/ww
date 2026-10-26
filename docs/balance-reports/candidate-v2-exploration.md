# candidate-v2 오프라인 밸런스 리포트

설정 SHA256: f6846730a64738eb871e1578f6480301a03885c2da84b70b43b529287b7eb0ba

정책별 요청 N=16, seed 1..16. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| infantry | 16 | 0 | 7.31 | 12 | 0 |
| antiArmor | 16 | 0 | 3.75 | 4 | 0 |
| armor | 16 | 0 | 4.06 | 5 | 0 |
| air | 16 | 0 | 4.06 | 5 | 0 |
| mixed | 16 | 0 | 5.75 | 10 | 0 |
| recon | 16 | 0 | 5.75 | 10 | 0 |
| random | 16 | 0 | 3.94 | 5 | 0 |
| wrong | 16 | 0 | 3.00 | 3 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v2.json --seeds 16 --start-seed 1 --policies all --out docs/balance-reports/candidate-v2-exploration.json
