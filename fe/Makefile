.phony: install run lint build test ci


ci: lint build

install:
	npm install
run:
	npm run dev
lint: 
	npm run lint
build:
	npm run build
test:
	npm run test

docker-build:
	docker build -t opencsp-fe:latest . 

docker-run:
	docker run --rm -v $(shell pwd)/.env:/app/.env -p 3000:3000 opencsp-fe:latest

docker-clean:
	docker rmi opencsp-fe:latest
	docker system prune -f

