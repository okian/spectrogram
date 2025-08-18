# Quick Start Guide

Get the Spectrogram Visualization System up and running in minutes!

## 🚀 One-Command Setup

```bash
# Complete setup (install deps, build WASM, start dev server)
make quick
```

This will:
1. Install all dependencies
2. Build WASM packages
3. Start the playground development server
4. Open your browser to `http://localhost:5176`

## 📋 Prerequisites

Make sure you have these installed:

- **Node.js** (v18+) - [Download](https://nodejs.org/)
- **Rust** - [Install with rustup](https://rustup.rs/)
- **pnpm** - `npm install -g pnpm`

## 🛠️ Manual Setup

If you prefer step-by-step:

```bash
# 1. Install dependencies
make install

# 2. Add Rust WASM target
rustup target add wasm32-unknown-unknown

# 3. Build WASM packages
make wasm

# 4. Start development server
make dev
```

## 🎮 Using the Playground

Once running, you'll see:

### **WASM Test Section**
- ✅ **Status indicator**: Confirms Rust/WASM integration
- 📊 **FFT test**: Processes 100Hz sine wave
- 🔍 **Real-time feedback**: Shows detected peak frequency

### **Spectrogram Demo**
- 🎨 **Interactive 2D heatmap** with real-time rendering
- 🎛️ **Control panel** with adjustable parameters
- 📈 **Performance stats**: FPS, dropped frames, row/bin counts

### **Color Palettes**
- 🌈 **Visual showcase** of 8 scientific colormaps
- 📖 **Usage guidelines** for each palette type

## 🎛️ Quick Controls

### **Layout**
- **Width/Height**: Resize the spectrogram
- **Background**: Change background color
- **Show Legend/Grid**: Toggle overlays

### **Visualization**
- **Color Palette**: Choose from 8 scientific colormaps
- **dB Range**: Adjust floor (-120 to -60) and ceiling (-20 to +20)
- **Reverse Palette**: Flip color mapping

### **Actions**
- **Clear Data**: Reset the spectrogram
- **Export PNG**: Download current view

## 🔧 Development Commands

```bash
# Start development server
make dev

# Build all packages
make build

# Build WASM only
make wasm

# Run tests
make test

# Check code quality
make check

# Clean build artifacts
make clean

# Show project status
make status

# Check available ports
make ports
```

## 🐛 Troubleshooting

### **WASM Loading Issues**
```bash
# Rebuild WASM packages
make wasm

# Check browser console for errors
# Ensure WebGL is supported
```

### **Import Resolution Errors**
```bash
# Rebuild all packages
make build

# Clear Vite cache
make clean
```

### **Performance Issues**
- Check FPS in playground stats panel
- Monitor browser's Performance tab
- Reduce `maxRows` or `downsampleTime` parameters

## 📊 What You're Seeing

### **Real-time Data**
- **5-second synthetic audio** with multiple frequencies
- **440Hz, 880Hz, 1320Hz, 1760Hz** (A4, A5, E6, A6)
- **Real-time FFT processing** via Rust/WASM
- **GPU-accelerated rendering** with WebGL

### **Technical Stack**
- **Rust/WASM**: High-performance signal processing
- **WebGL**: Hardware-accelerated visualization
- **React**: Interactive UI components
- **TypeScript**: Type-safe development

## 🎯 Next Steps

1. **Experiment with controls** - Try different palettes and parameters
2. **Check browser console** - See WASM test results and hover events
3. **Monitor performance** - Use browser DevTools Performance tab
4. **Explore the code** - Check out the source files in `web/`

## 📚 More Information

- **Full Documentation**: [README.md](README.md)
- **Architecture**: See the Architecture section in README
- **API Reference**: Check inline TSDoc comments in source code
- **Examples**: See the playground source code

---

**Happy visualizing! 🎨📊**
