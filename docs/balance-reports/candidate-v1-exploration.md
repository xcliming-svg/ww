# candidate-v1 오프라인 밸런스 리포트

설정 SHA256: 1572e693e2c507f5444eeb43b233f889848c51509b70c36985a306ba3b1efb66

정책별 요청 N=16, seed 1..16. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| infantry | 16 | 0 | 0.56 | 1 | 0 |
| antiArmor | 16 | 0 | 0.56 | 1 | 0 |
| armor | 16 | 0 | 0.56 | 1 | 0 |
| air | 16 | 0 | 1.44 | 4 | 0 |
| mixed | 16 | 0 | 0.56 | 1 | 0 |
| recon | 16 | 0 | 0.56 | 1 | 0 |
| random | 16 | 0 | 0.75 | 4 | 0 |
| wrong | 16 | 0 | 1.19 | 3 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v1.json --seeds 16 --start-seed 1 --policies all --out docs/balance-reports/candidate-v1-exploration.json
