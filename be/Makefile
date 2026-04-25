.PHONY: build test deploy clean

build:
	./gradlew build -x test

test:
	./gradlew test

run:
	./gradlew bootJar
	java -jar $(shell ls build/libs/*.jar | grep -v plain)

run-docker:
	docker build -t opencsp-be .
	docker run --rm --env-file .env -p 8080:8080 opencsp-be

clean:
	./gradlew clean

docker-build:
	docker build -t opencsp-be:latest . 

docker-run:
	docker run --rm -v $(shell pwd)/.env:/app/.env -p 8080:8080 opencsp-be:latest

docker-clean:
	docker rmi opencsp-be:latest
	docker system prune -f

