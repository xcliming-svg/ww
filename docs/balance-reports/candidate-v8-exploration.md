# candidate-v8 오프라인 밸런스 리포트

설정 SHA256: c21aa07579cd4fd16bc900058137df7743d360a4d4dead2fed33878d8cd3643e

정책별 요청 N=32, seed 1..32. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| mixed | 32 | 13 | 92.34 | 100 | 0 |
| recon | 32 | 11 | 91.56 | 100 | 0 |
| wrong | 32 | 0 | 3.34 | 5 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v8.json --seeds 32 --start-seed 1 --policies mixed,recon,wrong --out docs/balance-reports/candidate-v8-exploration.json
