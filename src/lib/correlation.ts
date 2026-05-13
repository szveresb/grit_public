export const pearson = (xs: number[], ys: number[]): number | null => {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n;
  const my = sy / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
};

export const linearRegression = (
  xs: number[],
  ys: number[]
): { slope: number; intercept: number } | null => {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    sxy += xs[i] * ys[i];
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
};

/**
 * Pearson correlation between self[t] and rel[t - lag].
 * Positive lag means relative changes precede self changes by `lag` days.
 */
export const pearsonAtLag = (
  self: Array<number | null>,
  rel: Array<number | null>,
  lag: number
): { r: number | null; n: number } => {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let t = 0; t < self.length; t++) {
    const ti = t - lag;
    if (ti < 0 || ti >= rel.length) continue;
    const s = self[t];
    const r = rel[ti];
    if (s == null || r == null) continue;
    xs.push(s);
    ys.push(r);
  }
  return { r: pearson(xs, ys), n: xs.length };
};