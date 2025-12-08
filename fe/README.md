# VPS FE

## 설명
VPS 서비스의 프론트엔드 프로젝트로 Next.js, TypeScript를 사용하고, 스타일은 tailwind, 상태관리는 zustand 사용함


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


## 다국어 지원 관련 이슈 
### 전체 구조 요약
1) 원본 메시지는 JSON으로 작성 (수정할 때는 오직 이것만 수정)
2) 빌드 타임에 JSON을 읽고 → TypeScript 타입으로 자동 변환 → /types/messages.d.ts 자동 생성
3) 앱에서는 항상 이 자동 생성된 타입을 기반으로 타입 안전 제공 → JSON이 런타임에 들어오면 자동 타입화됨

### 개요
- 사용자 브라우저의 언어를 감지하여 해당 언어셋에 맞는 UI를 자동으로 선택(없을 경우 영어)하여 UX 향상
### 문제1
- 문제는 next-intl(v4.5.8)가 아직 next.js 16 이상 버전에서 잘 동작하지 않는 듯
    - middleware -> proxy 변경 이슈, config 파일 인지 방식(i18n/request, nextintl.config.ts) 등이 영향있어보임
### 해결1
- json 기반의 파일에서 UI를 가져올 수 있는 MessagesProvider 를 만들어서 일원화된 관리와 기능을 제공
### 문제2
- 페이지의 형태에 따라 타입의 형상이 변경되면 타입의 형상도 바뀌는데, 타입스크립트에선 타입을 항상 알 고 있어야함 (특히, 빌드 시)
    - 타입스크립트에서 해당 타입을 추론
    - 타입을 다 정의해두고 사용
- messagesprovider에서는 타입에 상관없이 props을 전달받아야하는데, unknown, any 등을 사용 시 빌드가 안됨