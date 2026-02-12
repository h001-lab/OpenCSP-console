# OpenConsole FE

## 설명
프론트엔드 프로젝트로 Next.js, TypeScript를 사용하고, 스타일은 tailwind, 상태관리는 zustand 사용함

## PR 올리기 전 로컬 테스트 방법 
- ci.yaml 에서 동일한 방법으로 검증하므로 로컬에서 다 통과한 이후 push해야 스크립트 통과가 가능합니다.
```sh
npm i # (node_module 없을 경우) 
npm run dev
npm run lint
npm run build
```
- make 명령어 사용해서 진행도 가능
```sh
make ci # lint + build
```

## npm 패키지 버전 꼬인 경우
```sh
rm -rf node_modules
rm package-lock.json #  (yarn.lock / pnpm-lock.yaml)
npm cache clean --force
npm install
```

## npm 버전 업데이트
```sh
npx npm-check-updates -u
npm install
```

## 다국어 지원 관련 이슈 
### 전체 구조 요약
1) 원본 메시지는 JSON으로 작성
  - public/messages/ko.json
  - public/messages/en.json
2) 각 페이지의 타입은 Page.tsx 에 정의
