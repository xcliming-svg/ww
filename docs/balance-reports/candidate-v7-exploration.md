# candidate-v7 오프라인 밸런스 리포트

설정 SHA256: 2e6bf163249bc56bd8ca772950a2128f30eea73b68776c17cd187f329f93a287

정책별 요청 N=32, seed 1..32. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| recon | 32 | 1 | 83.41 | 100 | 0 |
| mixed | 32 | 0 | 29.09 | 61 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v7.json --seeds 32 --start-seed 1 --policies recon,mixed --out docs/balance-reports/candidate-v7-exploration.json
