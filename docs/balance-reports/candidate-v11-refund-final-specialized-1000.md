# candidate-v11 오프라인 밸런스 리포트

설정 SHA256: 42122499f701899054493e3caf5aa66e3c2b8e94f24b04432ce5f2350f252139

정책별 요청 N=1000, seed 1..1000. 상태: complete. 브라우저/재미/성능 검증 아님.

| 정책 | 실행 N | 100 완주 | 평균 도달 | 최대 도달 | 무효 |
| --- | ---: | ---: | ---: | ---: | ---: |
| infantry | 1000 | 0 | 11.85 | 17 | 0 |
| antiArmor | 1000 | 0 | 21.19 | 35 | 0 |
| armor | 1000 | 0 | 10.07 | 26 | 0 |
| air | 1000 | 666 | 91.41 | 100 | 0 |
| random | 1000 | 0 | 38.28 | 75 | 0 |
| wrong | 1000 | 0 | 3.37 | 6 | 0 |

재현: npm run balance:simulate -- --config data/balance/candidate-v11.json --seeds 1000 --start-seed 1 --policies infantry,antiArmor,armor,air,random,wrong --paired --out docs/balance-reports/candidate-v11-refund-final-specialized-1000.json
