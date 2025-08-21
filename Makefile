# Spectrogram Visualization System - Makefile
# Provides convenient commands for development, building, testing, and deployment

.PHONY: help setup install build clean dev test lint format typecheck wasm playground docs deploy

# Default target
help: ## Show this help message
	@echo "Spectrogram Visualization System - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "For more information, see README.md"

# Setup and Installation
setup: ## Complete project setup (install deps, build WASM, etc.)
	@echo "🚀 Setting up Spectrogram project..."
	@echo "📦 Installing dependencies..."
	$(MAKE) install
	@echo "🔧 Adding Rust WASM target..."
	rustup target add wasm32-unknown-unknown
	@echo "🏗️ Building WASM packages..."
	$(MAKE) wasm
	@echo "✅ Setup complete! Run 'make dev' to start development."

install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	npx -y pnpm@9.0.0 install
	@echo "✅ Dependencies installed."

# Building
build: ## Build all packages
	@echo "🏗️ Building all packages..."
	npx -y pnpm@9.0.0 build
	@echo "✅ All packages built."

wasm: ## Build WASM packages only
	@echo "🔧 Building WASM packages..."
	npx -y pnpm@9.0.0 build:wasm
	@echo "✅ WASM packages built."

viewer: ## Build viewer package only
	@echo "📦 Building viewer package..."
	npx -y pnpm@9.0.0 --filter @spectro/viewer build
	@echo "✅ Viewer package built."

# Development
dev: ## Start playground development server
	@echo "🎮 Starting playground development server..."
	npx -y pnpm@9.0.0 dev:playground

dev-playground: ## Clean, build (including WASM), then start playground server
	$(MAKE) clean
	$(MAKE) wasm
	$(MAKE) build
	$(MAKE) dev

dev-shell: ## Start shell app development server (if implemented)
	@echo "🖥️ Starting shell development server..."
	npx -y pnpm@9.0.0 dev:shell

# Testing
test: ## Run all tests
	@echo "🧪 Running all tests..."
	npx -y pnpm@9.0.0 test

test-unit: ## Run unit tests only
	@echo "🧪 Running unit tests..."
	npx -y pnpm@9.0.0 test:unit

test-e2e: ## Run end-to-end tests
	@echo "🧪 Running end-to-end tests..."
	npx -y pnpm@9.0.0 test:e2e

test-visual: ## Run visual regression tests
	@echo "🧪 Running visual regression tests..."
	npx -y pnpm@9.0.0 test:visual

# Code Quality
lint: ## Run ESLint
	@echo "🔍 Running ESLint..."
	npx -y pnpm@9.0.0 lint

format: ## Run Prettier formatting
	@echo "✨ Running Prettier..."
	npx -y pnpm@9.0.0 format

typecheck: ## Run TypeScript type checking
	@echo "🔍 Running TypeScript type checking..."
	npx -y pnpm@9.0.0 typecheck

check: ## Run all code quality checks
	@echo "🔍 Running all code quality checks..."
	$(MAKE) lint
	$(MAKE) typecheck
	@echo "✅ All checks passed."

# Cleaning
clean: ## Clean all build artifacts
	@echo "🧹 Cleaning build artifacts..."
	rm -rf web/packages/*/dist
	rm -rf web/packages/*/node_modules/.cache
	rm -rf web/apps/*/dist
	rm -rf web/apps/*/node_modules/.cache
	rm -rf web/crates/*/target
	rm -rf web/crates/*/pkg
	rm -rf node_modules/.vite
	@echo "✅ Clean complete."

clean-wasm: ## Clean WASM build artifacts
	@echo "🧹 Cleaning WASM artifacts..."
	rm -rf web/crates/*/target
	rm -rf web/crates/*/pkg
	@echo "✅ WASM artifacts cleaned."

# Documentation
docs: ## Generate documentation
	@echo "📚 Generating documentation..."
	@echo "Documentation is in README.md and inline code comments."

# Performance
benchmark: ## Run performance benchmarks
	@echo "⚡ Running performance benchmarks..."
	@echo "Open http://localhost:5176 and check browser Performance tab"
	@echo "Monitor FPS, memory usage, and WASM performance"

profile: ## Profile the application
	@echo "📊 Profiling application..."
	@echo "1. Start the playground: make dev"
	@echo "2. Open browser DevTools Performance tab"
	@echo "3. Record while interacting with spectrogram"
	@echo "4. Analyze frame times and bottlenecks"

# Deployment
deploy: ## Build for production deployment
	@echo "🚀 Building for production..."
	$(MAKE) build
	@echo "✅ Production build complete."

deploy-playground: ## Build playground for deployment
	@echo "🚀 Building playground for deployment..."
	cd web/apps/playground && npx -y pnpm@9.0.0 build
	@echo "✅ Playground built for deployment."

# Docker
docker-build: ## Build Docker image
	@echo "🐳 Building Docker image..."
	docker build -t spectrogram .
	@echo "✅ Docker image built."

docker-run: ## Run Docker container
	@echo "🐳 Running Docker container..."
	docker run -p 3000:3000 spectrogram

# Development Workflow
watch: ## Watch for changes and rebuild automatically
	@echo "👀 Watching for changes..."
	@echo "This will automatically rebuild when files change"
	pnpm build --watch

watch-wasm: ## Watch WASM files and rebuild
	@echo "👀 Watching WASM files..."
	@echo "This will automatically rebuild WASM when Rust files change"
	cd web/crates/dsp_core && cargo watch -x 'build --target wasm32-unknown-unknown'

# Debugging
debug: ## Start with debugging enabled
	@echo "🐛 Starting with debugging enabled..."
	@echo "1. Open browser DevTools"
	@echo "2. Check Console for WASM test results"
	@echo "3. Monitor Performance tab for bottlenecks"
	$(MAKE) dev

debug-wasm: ## Debug WASM specifically
	@echo "🐛 Debugging WASM..."
	@echo "1. Check browser console for WASM loading errors"
	@echo "2. Verify WASM test section shows '✅ WASM working!'"
	@echo "3. Monitor Network tab for WASM file loading"
	$(MAKE) dev

# Utility
status: ## Show project status
	@echo "📊 Project Status:"
	@echo "Node.js version: $(shell node --version)"
	@echo "pnpm version: $(shell pnpm --version)"
	@echo "Rust version: $(shell rustc --version)"
	@echo "WASM target: $(shell rustup target list | grep wasm32-unknown-unknown | grep installed || echo 'Not installed')"
	@echo ""
	@echo "Package status:"
	@ls -la web/packages/*/dist 2>/dev/null || echo "No built packages found"
	@echo ""
	@echo "WASM status:"
	@ls -la web/crates/*/pkg 2>/dev/null || echo "No WASM packages found"

ports: ## Show which ports are in use
	@echo "🔌 Checking ports..."
	@echo "Port 5175: $(shell lsof -ti:5175 2>/dev/null || echo 'Available')"
	@echo "Port 5176: $(shell lsof -ti:5176 2>/dev/null || echo 'Available')"
	@echo "Port 3000: $(shell lsof -ti:3000 2>/dev/null || echo 'Available')"

# Quick commands
quick: ## Quick development setup (install + build + dev)
	@echo "⚡ Quick development setup..."
	$(MAKE) install
	$(MAKE) wasm
	$(MAKE) dev

restart: ## Restart development server
	@echo "🔄 Restarting development server..."
	pkill -f "vite.*playground" || true
	$(MAKE) dev

# Environment-specific
dev-local: ## Start with local network access
	@echo "🌐 Starting with local network access..."
	cd web/apps/playground && npx -y pnpm@9.0.0 dev --host

dev-https: ## Start with HTTPS (for testing secure features)
	@echo "🔒 Starting with HTTPS..."
	cd web/apps/playground && npx -y pnpm@9.0.0 dev --https

# Helpers
.PHONY: ensure-pnpm ensure-rust ensure-wasm-target

ensure-pnpm: ## Ensure pnpm is available via npx
	@echo "✅ pnpm will be used via npx"

ensure-rust: ## Ensure Rust is installed
	@command -v rustc >/dev/null 2>&1 || { echo "❌ Rust is required but not installed. Install with: https://rustup.rs"; exit 1; }

ensure-wasm-target: ## Ensure WASM target is installed
	@rustup target list | grep wasm32-unknown-unknown | grep installed >/dev/null 2>&1 || { echo "❌ WASM target not installed. Run: rustup target add wasm32-unknown-unknown"; exit 1; }

# Default target
.DEFAULT_GOAL := help
