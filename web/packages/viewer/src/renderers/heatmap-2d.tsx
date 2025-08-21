/**
 * 2D Heatmap renderer for spectrogram visualization.
 * What: Renders spectrogram data as a 2D color-coded image.
 * Why: Classic spectrogram view with time on X-axis and frequency on Y-axis.
 */

import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpectroRingBuffer } from '../core/ring-buffer';
import { generateLUT, type Palette } from '../palettes';
import { DEFAULT_BG } from '../constants';

/** Width of the generated color lookup table texture in pixels. */
const LUT_WIDTH = 256;
/** Height of the generated color lookup table texture in pixels. */
const LUT_HEIGHT = 1;
/** Side length of the square planes used for background and heatmap quads. */
const PLANE_SIZE = 2;
/** Number of grid lines to draw per axis in the overlay. */
const GRID_LINE_COUNT = 10;
/** Color used for grid overlay lines. */
const GRID_LINE_COLOR = '#333';
/** Transparency applied to grid overlay lines. */
const GRID_LINE_OPACITY = 0.3;
/** Minimum normalized coordinate for grid geometry. */
const GRID_MIN = -1;
/** Maximum normalized coordinate for grid geometry. */
const GRID_MAX = 1;

/**
 * Derive the texture size for the shader from ring buffer statistics.
 * What: Creates a {@link THREE.Vector2} representing the data texture dimensions.
 * Why: Avoids hard-coded sizes and reflects the actual buffer configuration.
 * How: Reads {@link SpectroRingBuffer.getStats} and validates the results.
 */
export function textureSizeFromRingBuffer(
  ringBuffer: SpectroRingBuffer,
  target: THREE.Vector2 = new THREE.Vector2()
): THREE.Vector2 {
  const { binCount, maxRows } = ringBuffer.getStats();
  if (binCount <= 0 || maxRows <= 0) {
    throw new Error(`Invalid ring buffer stats: bins=${binCount}, rows=${maxRows}`);
  }
  return target.set(binCount, maxRows);
}

/** Props for the 2D heatmap renderer. */
interface Heatmap2DProps {
  /** Ring buffer containing spectrogram data. */
  ringBuffer: SpectroRingBuffer;
  /** Color palette for visualization. */
  palette: Palette;
  /** Whether to reverse the palette. */
  paletteReverse?: boolean;
  /** dB range for normalization. */
  dbFloor: number;
  /** dB range for normalization. */
  dbCeiling: number;
  /** Whether to show grid overlay. */
  showGrid?: boolean;
  /** Background color; defaults to {@link DEFAULT_BG}. */
  background?: string;
}

/**
 * Fragment shader for 2D heatmap rendering.
 * What: Samples data texture and maps through color LUT.
 * Why: GPU-accelerated rendering with smooth color interpolation.
 */
const fragmentShader = `
  uniform sampler2D dataTexture;
  uniform sampler2D colorLUT;
  uniform float dbFloor;
  uniform float dbCeiling;
  uniform float paletteReverse;
  uniform vec2 textureSize;
  
  varying vec2 vUv;
  
  void main() {
    // Sample data texture
    float magnitude = texture2D(dataTexture, vUv).r;
    
    // Normalize to [0,1] range
    float normalized = clamp((magnitude - dbFloor) / (dbCeiling - dbFloor), 0.0, 1.0);
    
    // Apply palette reversal if needed
    float t = paletteReverse > 0.5 ? 1.0 - normalized : normalized;
    
    // Sample color LUT
    vec4 color = texture2D(colorLUT, vec2(t, 0.5));
    
    gl_FragColor = color;
  }
`;

/**
 * Vertex shader for 2D heatmap rendering.
 * What: Sets up UV coordinates for texture sampling.
 * Why: Enables proper texture mapping across the quad.
 */
const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * 2D Heatmap renderer component.
 * What: Renders spectrogram data as a 2D color-coded image using WebGL.
 * Why: Provides efficient, real-time visualization of frequency content over time.
 */
export const Heatmap2D: React.FC<Heatmap2DProps> = ({
  ringBuffer,
  palette,
  paletteReverse = false,
  dbFloor,
  dbCeiling,
  showGrid = false,
  background = DEFAULT_BG
}) => {
  const materialRef = React.useRef<THREE.ShaderMaterial>(null);
  const [colorLUT, setColorLUT] = React.useState<THREE.DataTexture | null>(null);

  // Generate color LUT texture
  React.useEffect(() => {
    const lut = generateLUT(palette);
    const texture = new THREE.DataTexture(
      lut,
      LUT_WIDTH,
      LUT_HEIGHT,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    
    setColorLUT(texture);
    
    return () => {
      texture.dispose();
    };
  }, [palette]);

  // Update shader uniforms
  useFrame(() => {
    if (materialRef.current && colorLUT) {
      const material = materialRef.current;
      material.uniforms.dataTexture.value = ringBuffer.getTexture();
      material.uniforms.colorLUT.value = colorLUT;
      material.uniforms.dbFloor.value = dbFloor;
      material.uniforms.dbCeiling.value = dbCeiling;
      material.uniforms.paletteReverse.value = paletteReverse ? 1.0 : 0.0;

      textureSizeFromRingBuffer(
        ringBuffer,
        material.uniforms.textureSize.value as THREE.Vector2
      );
    }
  });

  return (
    <>
      {/* Background */}
      <mesh>
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
        <meshBasicMaterial color={background} />
      </mesh>

      {/* Heatmap quad */}
      <mesh>
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
        <shaderMaterial
            ref={materialRef}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={{
            dataTexture: { value: null },
            colorLUT: { value: null },
            dbFloor: { value: dbFloor },
            dbCeiling: { value: dbCeiling },
            paletteReverse: { value: paletteReverse ? 1.0 : 0.0 },
            textureSize: { value: textureSizeFromRingBuffer(ringBuffer) }
          }}
          transparent={true}
        />
      </mesh>
      
      {/* Grid overlay */}
      {showGrid && (
        <GridOverlay
          binCount={ringBuffer.getStats().binCount}
          maxRows={ringBuffer.getStats().maxRows}
        />
      )}
    </>
  );
};

/**
 * Grid overlay component for frequency and time markers.
 * What: Renders grid lines for frequency and time reference.
 * Why: Helps users interpret spectrogram data with visual guides.
 */
interface GridOverlayProps {
  /** Number of frequency bins; reserved for future adaptive grids. */
  binCount: number;
  /** Maximum rows in the ring buffer; reserved for future adaptive grids. */
  maxRows: number;
}

const GridOverlay: React.FC<GridOverlayProps> = ({ binCount: _binCount, maxRows: _maxRows }) => {
  return (
    <group>
      {/* Frequency grid lines (horizontal) */}
      {Array.from({ length: GRID_LINE_COUNT }, (_, i) => (
        <line key={`freq-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                GRID_MIN,
                GRID_MIN + (i * (GRID_MAX - GRID_MIN)) / (GRID_LINE_COUNT - 1),
                0,
                GRID_MAX,
                GRID_MIN + (i * (GRID_MAX - GRID_MIN)) / (GRID_LINE_COUNT - 1),
                0
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={GRID_LINE_COLOR}
            transparent
            opacity={GRID_LINE_OPACITY}
          />
        </line>
      ))}

      {/* Time grid lines (vertical) */}
      {Array.from({ length: GRID_LINE_COUNT }, (_, i) => (
        <line key={`time-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                GRID_MIN + (i * (GRID_MAX - GRID_MIN)) / (GRID_LINE_COUNT - 1),
                GRID_MIN,
                0,
                GRID_MIN + (i * (GRID_MAX - GRID_MIN)) / (GRID_LINE_COUNT - 1),
                GRID_MAX,
                0
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={GRID_LINE_COLOR}
            transparent
            opacity={GRID_LINE_OPACITY}
          />
        </line>
      ))}
    </group>
  );
};
