# candidate-v12-tech-tree 오프라인 밸런스 리포트

설정 SHA256: e6d3cd34330bbbc69791d581083f664f00cb563d1dad3a280ee39c29237fcf79

정책별 요청 N=2, seed 0..1. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| infantry | 2 | 0 | 0.00 | 0 | 2 |
| antiArmor | 2 | 0 | 0.00 | 0 | 2 |
| armor | 2 | 0 | 0.00 | 0 | 2 |
| air | 2 | 0 | 0.00 | 0 | 2 |
| mixed | 2 | 0 | 0.00 | 0 | 2 |
| recon | 2 | 0 | 0.00 | 0 | 2 |
| random | 2 | 0 | 0.00 | 0 | 2 |
| wrong | 2 | 0 | 0.00 | 0 | 2 |
| respec | 2 | 0 | 0.00 | 0 | 2 |

재현: npm run balance:simulate -- --config data/balance/candidate-v12-tech-tree.json --seeds 2 --start-seed 0 --policies all --out docs/balance-reports/tech-tree-review-before-2.json
