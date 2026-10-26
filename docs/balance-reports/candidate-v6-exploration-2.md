# candidate-v6 오프라인 밸런스 리포트

설정 SHA256: 361b14a3cf42f02734a3ceea7a72c62d9a8b74f2fc98d91c6e7659256bc0d44a

정책별 요청 N=32, seed 1..32. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| recon | 32 | 0 | 68.19 | 75 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v6.json --seeds 32 --start-seed 1 --policies recon --out docs/balance-reports/candidate-v6-exploration-2.json
