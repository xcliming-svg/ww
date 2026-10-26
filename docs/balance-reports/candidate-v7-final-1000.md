# candidate-v7 오프라인 밸런스 리포트

설정 SHA256: 2e6bf163249bc56bd8ca772950a2128f30eea73b68776c17cd187f329f93a287

정책별 요청 N=1000, seed 1..1000. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| infantry | 1000 | 0 | 11.64 | 17 | 0 |
| antiArmor | 1000 | 0 | 13.41 | 21 | 0 |
| armor | 1000 | 0 | 7.40 | 19 | 0 |
| air | 1000 | 1 | 20.91 | 100 | 0 |
| mixed | 1000 | 0 | 30.12 | 82 | 0 |
| recon | 1000 | 24 | 82.20 | 100 | 0 |
| random | 1000 | 0 | 18.51 | 60 | 0 |
| wrong | 1000 | 0 | 3.37 | 6 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v7.json --seeds 1000 --start-seed 1 --policies all --out docs/balance-reports/candidate-v7-final-1000.json
