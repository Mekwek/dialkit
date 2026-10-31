import { paintGradient, type BackgroundValue } from './background';
import { clamp, colorToRgb, fitGamut, parseColor } from './color';

/**
 * Draws a background value into a canvas at the canvas's own size: the solid
 * color, or the gradient exactly, every shape (`paintGradient`). For a host
 * that previews the background without drawing it itself. Media is not
 * drawn; the canvas is cleared and the host shows its own.
 */
export function paintBackgroundPreview(canvas: HTMLCanvasElement, value: BackgroundValue): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  if (value.mode === 'gradient') { paintGradient(canvas, value.gradient); return; }
  if (value.mode !== 'solid') return;
  // In sRGB, as the gradient is painted, so any color the control accepts draws.
  const color = parseColor(value.color) ?? { l: 0, c: 0, h: 0, a: 1 };
  const [r, g, b] = colorToRgb(fitGamut(color)).map(n => Math.round(clamp(n) * 255));
  context.fillStyle = `rgb(${r} ${g} ${b} / ${color.a})`;
  context.fillRect(0, 0, width, height);
}
