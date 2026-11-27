# Mây Mây — lệnh chuẩn cho từng môi trường. Dev và prod là hai stack Docker độc lập.
DEV_INFRA = docker compose -f docker-compose.dev.yml
DEV = docker compose
PROD = docker compose -f docker-compose.prod.yml --env-file studynest_be/.env.production

.PHONY: dev-migrate dev-up dev-down dev-reset dev-logs prod-config prod-up prod-down prod-ps

dev-up:      ## Bật DB/Redis/Piston/Mailpit cho dev (project maymay-dev)
	$(DEV_INFRA) up -d --wait
dev-migrate: ## Nâng schema dev + test lên Alembic head (db.sql chỉ là snapshot cũ)
	cd studynest_be && APP_ENV=development .venv/bin/alembic upgrade head && APP_ENV=test .venv/bin/alembic upgrade head
dev-down:    ## Tắt stack dev, giữ dữ liệu
	$(DEV) down
dev-reset:   ## XÓA dữ liệu dev (chỉ volume maymay-dev_*, không đụng prod)
	$(DEV) down -v
dev-logs:
	$(DEV) logs -f --tail=100

prod-config: ## Kiểm tra compose production (không chạy gì)
	$(PROD) config -q && echo "prod compose OK"
prod-up:     ## Build + chạy production, có xác nhận
	@read -p "Triển khai PRODUCTION trên máy này? gõ 'prod' để tiếp tục: " a; [ "$$a" = "prod" ]
	$(PROD) up -d --build
prod-down:
	@read -p "Dừng PRODUCTION? gõ 'prod' để tiếp tục: " a; [ "$$a" = "prod" ]
	$(PROD) down
prod-ps:
	$(PROD) ps
