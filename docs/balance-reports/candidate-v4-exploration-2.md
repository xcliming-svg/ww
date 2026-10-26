# candidate-v4 오프라인 밸런스 리포트

설정 SHA256: e91f1f8c2740394e9bc3659c80f83ec6cf47668581d58962dc60ba7fc3eeb47a

정책별 요청 N=16, seed 1..16. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| recon | 16 | 0 | 31.63 | 34 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v4.json --seeds 16 --start-seed 1 --policies recon --out docs/balance-reports/candidate-v4-exploration-2.json
