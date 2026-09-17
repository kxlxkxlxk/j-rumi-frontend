// CIELAB(D65) -> sRGB 변환 (색상 스와치를 화면에 보여주기 위한 용도).
// 백엔드가 계산해서 돌려주는 L, a, b 값을 사람이 눈으로 보는 색으로 바꿔줘요.

function finv(t: number): number {
  const t3 = t * t * t;
  return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
}

function gammaCorrect(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, v));
}

export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  // D65 기준 백색점
  const Xn = 95.047;
  const Yn = 100.0;
  const Zn = 108.883;

  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  const X = (Xn * finv(fx)) / 100;
  const Y = (Yn * finv(fy)) / 100;
  const Z = (Zn * finv(fz)) / 100;

  let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  let bl = X * 0.0557 + Y * -0.204 + Z * 1.057;

  r = gammaCorrect(r);
  g = gammaCorrect(g);
  bl = gammaCorrect(bl);

  return [Math.round(r * 255), Math.round(g * 255), Math.round(bl * 255)];
}

export function labToCss(L: number, a: number, b: number): string {
  const [r, g, bl] = labToRgb(L, a, b);
  return `rgb(${r}, ${g}, ${bl})`;
}
