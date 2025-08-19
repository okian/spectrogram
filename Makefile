.PHONY: build-dsp

build-dsp:
	wasm-pack build packages/dsp --target nodejs --no-opt
