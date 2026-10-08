.PHONY: help install dev build check-types test clean db-up db-down db-logs db-generate db-push db-migrate db-seed db-studio

# Default target
.DEFAULT_GOAL := help

help: ## Hiển thị danh sách các lệnh hỗ trợ
	@echo ""
	@echo "Su-Ky (Sử Ký) — Monorepo Commands:"
	@echo ""
	@echo "  Môi trường & Cài đặt:"
	@echo "    make install       - Cài đặt toàn bộ dependencies bằng Bun v1.4"
	@echo "    make dev           - Khởi động môi trường dev (API :3005 + Web :5173)"
	@echo "    make build         - Build production toàn bộ monorepo bằng Turborepo"
	@echo "    make check-types   - Kiểm tra kiểu dữ liệu TypeScript toàn bộ workspace"
	@echo "    make test          - Chạy toàn bộ automated test suite với Bun test"
	@echo "    make clean         - Dọn dẹp cache Turborepo, thư mục dist và node_modules"
	@echo ""
	@echo "  Cơ sở dữ liệu (PostgreSQL 17 & Prisma):"
	@echo "    make db-up         - Khởi động PostgreSQL 17 container qua Docker Compose"
	@echo "    make db-down       - Dừng PostgreSQL container"
	@echo "    make db-logs       - Xem log của PostgreSQL container"
	@echo "    make db-generate   - Sinh mã Prisma Client trong packages/db"
	@echo "    make db-push       - Đồng bộ schema Prisma trực tiếp vào PostgreSQL"
	@echo "    make db-migrate    - Chạy migration Prisma (dev mode)"
	@echo "    make db-seed       - Nạp dữ liệu mẫu ban đầu vào database (triều đại, podcast)"
	@echo "    make db-studio     - Mở giao diện trực quan Prisma Studio trên trình duyệt"
	@echo ""

# Development & Build
install: ## Cài đặt dependencies
	bun install

dev: ## Chạy song song cả api và web
	bun run dev

build: ## Build production
	bun run build

check-types: ## Type-check toàn bộ workspace
	bun run check-types

test: ## Chạy tests
	bun test

clean: ## Dọn dẹp node_modules và build cache
	bun run clean

# Database commands
db-up: ## Bật PostgreSQL Docker
	docker compose up -d

db-down: ## Tắt PostgreSQL Docker
	docker compose down

db-logs: ## Xem log PostgreSQL
	docker compose logs -f postgres

db-generate: ## Sinh Prisma Client
	bun run db:generate

db-push: ## Push Prisma schema vào database
	bun run db:push

db-migrate: ## Chạy Prisma migrations
	bun run db:migrate

db-seed: ## Nạp dữ liệu mẫu (seed)
	bun run db:seed

db-studio: ## Mở Prisma Studio
	cd packages/db && bun run prisma studio
