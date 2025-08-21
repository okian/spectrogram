# Spectrogram Visualization System

A high-performance, real-time spectrogram visualization system built with React, TypeScript, Rust (WebAssembly), and WebGL. This project demonstrates modern web technologies for scientific visualization with GPU acceleration and WASM-powered signal processing.

## 🚀 Features

### Core Capabilities
- **Real-time spectrogram rendering** with WebGL acceleration
- **WASM-powered FFT/STFT processing** using Rust for optimal performance
- **Multiple visualization modes**: 2D heatmap, 2D waterfall, 3D waterfall (planned)
- **Scientific color palettes**: 8 perceptually uniform colormaps (viridis, magma, inferno, plasma, cividis, coolwarm, twilight, turbo)
- **Interactive controls**: Dynamic parameter adjustment with real-time updates
- **GPU ring buffer**: Efficient data management for streaming spectrograms
- **Export capabilities**: PNG export for documentation

### Technical Features
- **Rust/WASM integration**: High-performance signal processing
- **WebGL rendering**: Hardware-accelerated visualization
- **Type-safe APIs**: Full TypeScript support with comprehensive type definitions
- **Modular architecture**: Micro-frontend ready with proper package boundaries
- **Real-time performance**: 60 FPS rendering with efficient memory management
- **Cross-platform**: Works on modern browsers with WebGL support

## 🏗️ Architecture

### Project Structure
```
spectrogram/
├── web/
│   ├── apps/
│   │   └── playground/          # Interactive demo application
│   ├── packages/
│   │   ├── viewer/             # Main spectrogram component
│   │   └── wasm-bindings/      # TypeScript wrappers for WASM
│   └── crates/
│       └── dsp_core/           # Rust signal processing library
├── design/                     # Design assets and specifications
├── docs/                       # Additional documentation
└── README.md                   # This file
```

### Core Components

#### 1. Rust WASM Core (`web/crates/dsp_core/`)
- **FFT/STFT processing** using the `kofft` crate
- **Window functions**: Hann, Hamming, Blackman
- **Real-time pipeline**: Window → FFT → Magnitude → dB
- **WASM bindings** for JavaScript integration

#### 2. TypeScript Viewer (`web/packages/viewer/`)
- **Public API**: Complete type-safe interfaces
- **GPU Ring Buffer**: Efficient data management with WebGL textures
- **2D Heatmap Renderer**: WebGL-accelerated rendering with fragment shaders
- **Color Palettes**: Scientific colormaps with perceptual uniformity
- **Legend Component**: Interactive color scale with dB annotations

#### 3. Interactive Playground (`web/apps/playground/`)
- **Real-time visualization** with live controls
- **Parameter adjustment**: width, height, palette, dB range, grid, legend
- **Performance monitoring**: FPS, dropped frames, row/bin counts
- **WASM testing**: Verification of Rust/WASM integration

## 🛠️ Setup & Installation

### Prerequisites
- **Node.js** (v18 or higher)
- **Rust** (latest stable)
- **pnpm** (v9 or higher)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spectrogram
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Add Rust WASM target**
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

4. **Build WASM packages**
   ```bash
   pnpm build:wasm
   ```
   The generated `pkg/` directory is intentionally untracked.
   Run this whenever the Rust sources change or before publishing so
   WebAssembly artifacts are available.

5. **Start the playground**
   ```bash
   pnpm dev:playground
   ```

6. **Open your browser**
   Navigate to `http://localhost:5176`

### Alternative: Using Makefile

```bash
# Install all dependencies and build everything
make setup

# Start the playground
make dev

# Clean, rebuild (including WASM), and start the playground
make dev-playground

# Build all packages
make build

# Clean build artifacts
make clean
```

## 🎮 Usage

### Interactive Playground

The playground provides a comprehensive demonstration of the spectrogram system:

#### Navigation
- **Spectrogram Demo**: Main visualization with real-time controls
- **Color Palettes**: Visual showcase of all available colormaps

#### Controls
- **Layout**: Width, height, background color
- **Visualization**: Color palette, dB range, grid, legend
- **Actions**: Clear data, export PNG
- **Performance**: Real-time FPS and statistics

#### Features
- **Real-time rendering**: Live updates as you adjust parameters
- **WASM testing**: Automatic verification of Rust/WASM integration
- **Export capabilities**: Download spectrograms as PNG images
- **Performance monitoring**: Track FPS and dropped frames

### Programmatic Usage

```typescript
import { Spectrogram, type SpectroConfig } from '@spectro/viewer';

const config: SpectroConfig = {
  view: '2d-heatmap',
  width: 800,
  height: 400,
  palette: 'viridis',
  dbFloor: -100,
  dbCeiling: 0,
  showLegend: true,
  showGrid: true
};

function App() {
  return (
    <Spectrogram
      config={config}
      onReady={(api) => {
        // Access the spectrogram API
        api.pushFrame(frame);
        api.setConfig({ palette: 'magma' });
      }}
      onHover={(data) => {
        console.log('Hover:', data);
      }}
    />
  );
}
```

### WASM Integration

```typescript
import { fftReal, magnitudeDbfs, stftFrame } from '@spectro/wasm-bindings';

// Process audio data
const signal = new Float32Array(/* your audio data */);
const fftResult = await fftReal(signal);
const magnitudeResult = await magnitudeDbfs(signal, 1.0);
const stftResult = await stftFrame(signal, 'hann', 1.0);
```

## 🔧 Development

### Project Commands

```bash
# Development
pnpm dev:playground          # Start playground development server
pnpm dev:shell              # Start shell app (if implemented)

# Building
pnpm build                  # Build all packages
pnpm build:wasm            # Build WASM packages only
pnpm build:viewer          # Build viewer package only

# Testing
pnpm test                  # Run all tests
pnpm test:unit            # Run unit tests
pnpm test:e2e             # Run end-to-end tests

# Linting & Formatting
pnpm lint                  # Run ESLint
pnpm format               # Run Prettier
pnpm typecheck            # Run TypeScript type checking
```

### Development Workflow

1. **Start development server**
   ```bash
   pnpm dev:playground
   ```

2. **Make changes** to source files
   - Rust code: `web/crates/dsp_core/src/`
   - TypeScript: `web/packages/viewer/src/`
   - Playground: `web/apps/playground/src/`

3. **Rebuild when needed**
   ```bash
   # After Rust changes
   pnpm build:wasm
   
   # After TypeScript changes
   pnpm build:viewer
   ```

4. **Test changes** in the playground

### Adding New Features

#### New Renderer
1. Create renderer in `web/packages/viewer/src/renderers/`
2. Add to `ViewMode` type in `web/packages/viewer/src/index.tsx`
3. Implement in main `Spectrogram` component
4. Add controls to playground

#### New Color Palette
1. Add palette to `web/packages/viewer/src/palettes/index.ts`
2. Update `PaletteName` type
3. Add to playground controls

#### New WASM Function
1. Add function to `web/crates/dsp_core/src/lib.rs`
2. Add binding to `web/packages/wasm-bindings/src/index.ts`
3. Export from main package
4. Test in playground

## 🐛 Debugging

### Common Issues

#### WASM Loading Errors
```bash
# Rebuild WASM packages
pnpm build:wasm

# Check browser console for specific errors
# Ensure WebGL is supported in your browser
```

#### Import Resolution Errors
```bash
# Rebuild all packages
pnpm build

# Clear Vite cache
rm -rf node_modules/.vite
```

#### Performance Issues
- Check FPS in playground stats panel
- Monitor browser's Performance tab
- Reduce `maxRows` or `downsampleTime` parameters
- Ensure WebGL acceleration is enabled

### Debug Tools

#### Browser Developer Tools
- **Console**: WASM test results, hover events, performance logs
- **Performance**: Frame rate analysis, memory usage
- **Network**: WASM file loading, API calls

#### Rust Debugging
```bash
# Build with debug symbols
cd web/crates/dsp_core
cargo build --target wasm32-unknown-unknown

# Use wasm-pack with debug
wasm-pack build --target web --debug
```

#### TypeScript Debugging
```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Build with source maps
pnpm build:viewer --sourcemap
```

### Performance Profiling

1. **Browser Performance Tab**
   - Record while interacting with spectrogram
   - Analyze frame times and bottlenecks
   - Check for memory leaks

2. **WASM Performance**
   - Monitor FFT processing time
   - Check for unnecessary JS↔WASM calls
   - Profile memory usage

3. **GPU Performance**
   - Monitor WebGL calls
   - Check texture memory usage
   - Analyze shader performance

## 📊 Performance Targets

### Desktop (Modern GPU)
- **2D Heatmap**: 1025×1400 Float32 rows ≥ 60 FPS
- **3D Waterfall**: Decimated to 1025×768 ≥ 45 FPS

### Mobile (Mid-range)
- **2D Heatmap**: UNORM8 1025×512 ≥ 45 FPS

### Memory Usage
- **GPU Memory**: < 100MB for typical spectrograms
- **WASM Memory**: < 50MB for FFT processing
- **JavaScript Heap**: < 200MB total

## 🧪 Testing

### Unit Tests
```bash
# Run all unit tests
pnpm test:unit

# Run specific test suites
pnpm test:unit -- --grep "palettes"
pnpm test:unit -- --grep "wasm"
```

### Visual Regression Tests
```bash
# Run visual tests
pnpm test:visual

# Update baselines
pnpm test:visual --update
```

### E2E Tests
```bash
# Run end-to-end tests
pnpm test:e2e

# Run with specific browser
pnpm test:e2e --browser chrome
```

## 📦 Deployment

### Production Build
```bash
# Build all packages for production
pnpm build:prod

# Build playground for deployment
cd web/apps/playground
pnpm build
```

### Docker Deployment
```bash
# Build Docker image
docker build -t spectrogram .

# Run container
docker run -p 3000:3000 spectrogram
```

### CDN Deployment
```bash
# Build and deploy to CDN
pnpm deploy:cdn
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Follow the development workflow
4. Add tests for new features
5. Submit a pull request

### Code Style
- **TypeScript**: Strict mode, comprehensive types
- **Rust**: Clippy warnings, proper error handling
- **React**: Functional components, hooks
- **Documentation**: TSDoc for all public APIs

### Testing Requirements
- Unit tests for all new functions
- Visual regression tests for UI changes
- E2E tests for critical user flows
- Performance benchmarks for optimizations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **kofft**: High-performance FFT library for Rust
- **Three.js**: 3D graphics library
- **React Three Fiber**: React renderer for Three.js
- **Scientific Colormaps**: Perceptually uniform color palettes

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/spectrogram/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/spectrogram/discussions)
- **Documentation**: [Project Wiki](https://github.com/your-org/spectrogram/wiki)

---

**Built with ❤️ using modern web technologies for scientific visualization.**
