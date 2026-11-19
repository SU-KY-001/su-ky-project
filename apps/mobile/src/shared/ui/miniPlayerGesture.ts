export function shouldCaptureMiniPlayerDrag(dx: number, dy: number): boolean {
  return dy > 10 && dy > Math.abs(dx) * 1.4;
}

export function shouldDismissMiniPlayer(dy: number, velocityY: number): boolean {
  return dy > 35 || (dy > 20 && velocityY > 0.8);
}
