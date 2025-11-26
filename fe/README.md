# VPS FE

## PR 올리기 전 로컬 테스트 방법 
- ci.yaml 에서 동일한 방법으로 검증하므로 로컬에서 다 통과한 이후 push해야 스크립트 통과가 가능합니다.
```sh
npm i # (node_module 없을 경우) 
npm run dev
npm run lint
npm run build
```
