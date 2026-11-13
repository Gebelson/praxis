// A mild easing preserves the reference thirds without a time-based animation.
export function blurIntensityFromProgress(progress) {
  const t=Math.min(1,Math.max(0,(progress-.85)/.15));
  return .8*t+.2*t*t*(3-2*t);
}
