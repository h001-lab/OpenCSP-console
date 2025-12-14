plugins {
    java
    id("org.springframework.boot") version "3.5.8"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "io.hlab"
version = "0.0.1-SNAPSHOT"
description = "vps service backend"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

extra["springAiVersion"] = "1.1.0"

dependencies {
    // Web: MVC(서블릿/Tomcat) + 리액티브(WebFlux)
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-webflux")

    // Persistence: JPA(Hibernate) 및 데이터/트랜잭션 지원
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")

    // Security & Validation
    // implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Spring AI
    implementation("org.springframework.ai:spring-ai-starter-model-openai") // OpenAI -> Gemini API 사용 가능 
    // implementation("org.springframework.ai:spring-ai-starter-model-vertex-ai-gemini") // Google Vertex AI Gemini -> GCP 필요

    // Vector store
    // implementation("org.springframework.ai:spring-ai-starter-vector-store-pgvector")
    // implementation("org.springframework.ai:spring-ai-advisors-vector-store")

    // Lombok: 컴파일 시 어노테이션 처리(런타임 불필요)
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // JDBC 드라이버(런타임에 필요한 DB 선택)
    runtimeOnly("org.mariadb.jdbc:mariadb-java-client")
    runtimeOnly("org.postgresql:postgresql")

    // Testing: Spring Boot 테스트 유틸, Reactor, Security 테스트 도움도구
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("io.projectreactor:reactor-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("com.h2database:h2")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    // SpringDoc이 HATEOAS를 공식적으로 연동하도록 돕는 모듈을 추가 (핵심!)
    // implementation("org.springdoc:springdoc-openapi-starter-hateoas")
	// Swagger-UI
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.6")
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.ai:spring-ai-bom:${property("springAiVersion")}")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
