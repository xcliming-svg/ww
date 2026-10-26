# candidate-v1 오프라인 밸런스 리포트

설정 SHA256: 1572e693e2c507f5444eeb43b233f889848c51509b70c36985a306ba3b1efb66

정책별 요청 N=8, seed 1..8. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| mixed | 8 | 0 | 5.00 | 6 | 0 |
| air | 8 | 0 | 4.00 | 4 | 0 |
| armor | 8 | 0 | 3.75 | 4 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v1.json --seeds 8 --start-seed 1 --policies mixed,air,armor --out docs/balance-reports/candidate-v1-exploration-3.json
