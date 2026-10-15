import { gradientColorAt, gradientFrame, gradientParamAt, type BackgroundStop, type BackgroundValue } from './background';

/** sRGB bytes and alpha 0..1 of a gradient at t (0..1), the end colours carried past the ends. */
function sample(stops: BackgroundStop[], t: number): [number, number, number, number] {
  const { color, alpha } = gradientColorAt(stops, Math.min(100, Math.max(0, t * 100)));
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha / 100];
}

/**
 * Draws a background value into a 2D canvas, at the canvas's own pixel size:
 * the solid colour, or the gradient with the exact shading rule
 * (gradientFrame and gradientParamAt), all four shapes. For hosts without a
 * WebGL canvas, such as a workbench preview. Media is not drawn: the canvas
 * is cleared (the host shows its own media).
 */
export function paintBackgroundPreview(canvas: HTMLCanvasElement, value: BackgroundValue): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (value.mode === 'solid') {
    ctx.fillStyle = value.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (value.mode !== 'gradient' || width === 0 || height === 0) return;
  const { shape, handles, stops } = value.gradient;
  // A lookup table of 1024 colours, so each pixel is one multiply and a read.
  const size = 1024;
  const table = new Uint8ClampedArray(size * 4);
  for (let i = 0; i < size; i++) {
    const [r, g, b, a] = sample(stops, i / (size - 1));
    table.set([r, g, b, Math.round(a * 255)], i * 4);
  }
  const frame = gradientFrame(handles, width, height);
  const image = ctx.createImageData(width, height);
  const data = image.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = gradientParamAt(shape, frame, x + 0.5, y + 0.5);
      const index = Math.round(Math.min(1, Math.max(0, t)) * (size - 1)) * 4;
      const o = (y * width + x) * 4;
      data[o] = table[index];
      data[o + 1] = table[index + 1];
      data[o + 2] = table[index + 2];
      data[o + 3] = table[index + 3];
    }
  }
  ctx.putImageData(image, 0, 0);
}
