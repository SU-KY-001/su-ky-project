import { CanvasTexture, SRGBColorSpace } from "three";

export function makeConcreteMaps(): { color: CanvasTexture; roughness: CanvasTexture } {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext("2d");
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = roughCanvas.height = 1024;
  const roughContext = roughCanvas.getContext("2d");
  if (context) {
    const pixels = context.createImageData(1024, 1024);
    const roughPixels = context.createImageData(1024, 1024);
    let seed = 1975;
    for (let y = 0; y < 1024; y++) {
      for (let x = 0; x < 1024; x++) {
        seed = (seed * 16807) % 2147483647;
        const broad = Math.sin(x * 0.009 + Math.sin(y * 0.005) * 2.1) * Math.cos(y * 0.008 - x * 0.003);
        const mottling = Math.sin(x * 0.032 + y * 0.019) * Math.cos(y * 0.028) * 0.9;
        // The atlas covers the full building; hairline joints stay quiet at this scale.
        const joint = x % 44 < 0.8 || y % 34 < 0.8;
        const shade = 150 + broad * 2.2 + mottling + (seed % 7) * 0.15 - (joint ? 3 : 0);
        const i = (y * 1024 + x) * 4;
        pixels.data[i] = shade;
        pixels.data[i + 1] = shade + 3;
        pixels.data[i + 2] = shade + 7;
        pixels.data[i + 3] = 255;
        const roughness = Math.round((0.48 + broad * 0.045) * 255);
        roughPixels.data[i] = roughPixels.data[i + 1] = roughPixels.data[i + 2] = roughness;
        roughPixels.data[i + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    roughContext?.putImageData(roughPixels, 0, 0);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  const roughness = new CanvasTexture(roughCanvas);
  return { color: texture, roughness };
}

export function makePlasterMaps(): { color: CanvasTexture; normal: CanvasTexture; roughness: CanvasTexture } {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const normalCanvas = document.createElement("canvas"); normalCanvas.width = normalCanvas.height = 512;
  const roughCanvas = document.createElement("canvas"); roughCanvas.width = roughCanvas.height = 512;
  if (context) {
    const colorPixels = context.createImageData(512, 512);
    const normalPixels = context.createImageData(512, 512);
    const roughPixels = context.createImageData(512, 512);
    let seed = 1975;
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        seed = seed * 16807 % 2147483647;
        const grit = (seed % 101) / 100;
        const broad = Math.sin(x * 0.021 + Math.sin(y * 0.013)) * Math.cos(y * 0.017 + x * 0.008);
        const i = (y * 512 + x) * 4;
        const shade = 242 + broad * 4 + grit * 5 - (1 - y / 512) * 6;
        colorPixels.data[i] = colorPixels.data[i + 1] = colorPixels.data[i + 2] = shade;
        colorPixels.data[i + 3] = 255;
        normalPixels.data[i] = 128 + (grit - 0.5) * 14;
        normalPixels.data[i + 1] = 128 + (((seed * 29 % 101) / 100) - 0.5) * 14;
        normalPixels.data[i + 2] = normalPixels.data[i + 3] = 255;
        roughPixels.data[i] = roughPixels.data[i + 1] = roughPixels.data[i + 2] = 222 + grit * 25;
        roughPixels.data[i + 3] = 255;
      }
    }
    context.putImageData(colorPixels, 0, 0);
    normalCanvas.getContext("2d")?.putImageData(normalPixels, 0, 0);
    roughCanvas.getContext("2d")?.putImageData(roughPixels, 0, 0);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return { color: texture, normal: new CanvasTexture(normalCanvas), roughness: new CanvasTexture(roughCanvas) };
}

export function makeCanvasShadow(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 20, 64, 64, 64);
    gradient.addColorStop(0, "rgba(5,8,8,0.8)");
    gradient.addColorStop(0.75, "rgba(5,8,8,0.5)");
    gradient.addColorStop(1, "rgba(5,8,8,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  return new CanvasTexture(canvas);
}
