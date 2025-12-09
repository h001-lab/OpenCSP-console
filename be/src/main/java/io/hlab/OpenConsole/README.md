https://start.spring.io/#!type=gradle-project&language=java&platformVersion=3.5.8&packaging=jar&configurationFileFormat=properties&jvmVersion=21&groupId=io.hlab&artifactId=OpenConsole&name=OpenConsole&description=vps%20service%20backend&packageName=io.hlab.OpenConsole&dependencies=web,webflux,lombok,data-jpa,security,validation,mysql,postgresql,spring-ai-vectordb-pgvector,spring-ai-openai

# OpenConsole (VPS 서비스 백엔드)

간단한 설명
- Spring Boot 기반 백엔드 템플릿 프로젝트입니다.
- 생성 옵션: Spring Boot 3.5.8, Java 21, Gradle, 패키징: jar
- 주요 의존성: web, webflux, lombok, data-jpa, security, validation, mysql/postgresql, spring-ai (pgvector, openai)

주요 파일
- 빌드: be/OpenConsole/build.gradle.kts
- 애플리케이션 설정: be/OpenConsole/src/main/resources/application.properties
- 진입점: be/OpenConsole/src/main/java/io/hlab/OpenConsole/OpenConsoleApplication.java
- Gradle wrapper:
  - Unix: be/OpenConsole/gradlew
  - Windows: be/OpenConsole/gradlew.bat
- CI: .github/workflows/ci.yaml

요구 사항
- JDK 21
- Gradle wrapper 사용 권장 (프로젝트 루트의 gradlew / gradlew.bat)

빠른 시작
1. 빌드
   - Unix / macOS:
     ./gradlew clean build
   - Windows (PowerShell):
     .\gradlew.bat clean build

2. 실행
   - 개발 모드:
     ./gradlew bootRun
   - 빌드된 JAR 실행:
     java -jar build/libs/OpenConsole-0.0.1-SNAPSHOT.jar

구성 (환경 변수 / application.properties)
- application.properties의 플레이스홀더를 실제 값으로 교체:
  - spring.datasource.url=jdbc:postgresql://{HOST}:{PORT}/{DB}
  - spring.datasource.username=your_username
  - spring.datasource.password=your_password
  - spring.ai.* (OpenAI / Vector DB) 관련 키 및 설정을 환경 변수로 관리 권장

테스트
- 단위/통합 테스트:
  ./gradlew test

CI
- 기본 CI는 .github/workflows/ci.yaml에 정의되어 있습니다. PR 전에 빌드와 테스트가 통과해야 합니다.

기여
- 로컬에서 빌드 및 테스트 통과 후 PR 제출
- 커밋 메시지와 PR 설명에 변경 의도 및 테스트 방법 명시

참고
- 프로젝트 생성 URL:
  https://start.spring.io/#!type=gradle-project&language=java&platformVersion=3.5.8&packaging=jar&configurationFileFormat=properties&jvmVersion=21&groupId=io.hlab&artifactId=OpenConsole&name=OpenConsole&description=vps%20service%20backend&packageName=io.hlab.OpenConsole&dependencies=web,webflux,lombok,data-jpa,security,validation,mysql,postgresql,spring-ai-vectordb-pgvector,spring-ai-openai