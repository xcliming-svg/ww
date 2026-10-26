# candidate-v4 오프라인 밸런스 리포트

설정 SHA256: e91f1f8c2740394e9bc3659c80f83ec6cf47668581d58962dc60ba7fc3eeb47a

정책별 요청 N=16, seed 1..16. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| infantry | 16 | 0 | 11.13 | 12 | 0 |
| antiArmor | 16 | 0 | 11.38 | 19 | 0 |
| armor | 16 | 0 | 7.06 | 8 | 0 |
| air | 16 | 0 | 18.19 | 19 | 0 |
| mixed | 16 | 0 | 11.56 | 19 | 0 |
| recon | 16 | 0 | 17.25 | 34 | 0 |
| random | 16 | 0 | 10.00 | 13 | 0 |
| wrong | 16 | 0 | 3.31 | 4 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v4.json --seeds 16 --start-seed 1 --policies all --out docs/balance-reports/candidate-v4-exploration.json
