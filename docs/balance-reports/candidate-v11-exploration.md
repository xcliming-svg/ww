# candidate-v11 오프라인 밸런스 리포트

설정 SHA256: 42122499f701899054493e3caf5aa66e3c2b8e94f24b04432ce5f2350f252139

정책별 요청 N=64, seed 1..64. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| mixed | 64 | 57 | 96.41 | 100 | 0 |
| recon | 64 | 58 | 98.69 | 100 | 0 |
| wrong | 64 | 0 | 3.39 | 5 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v11.json --seeds 64 --start-seed 1 --policies mixed,recon,wrong --out docs/balance-reports/candidate-v11-exploration.json
