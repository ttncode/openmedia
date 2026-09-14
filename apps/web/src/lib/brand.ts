export const LOGO_FRAME_PATH =
  'M9 22 V9 H22 M42 9 H55 V22 M55 42 V55 H42 M22 55 H9 V42';
export const LOGO_WAVE_PATH = 'M23 27 V37 M32 20 V44 M41 25 V39';

export const BRAND_TEAL = '#12939c';
export const BRAND_INK = '#15181d';
export const BRAND_MIST = '#eef0f3';
export const PWA_ICON_SIZES = [192, 512] as const;

export function brandSvg({
  frame,
  wave,
  background,
}: {
  frame: string;
  wave: string;
  background?: string;
}): string {
  const plate = background
    ? `<rect width="64" height="64" rx="14" fill="${background}"/>`
    : '';
  const scale = background ? ' transform="translate(9.6 9.6) scale(0.7)"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${plate}<g fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"${scale}><path stroke="${frame}" d="${LOGO_FRAME_PATH}"/><path stroke="${wave}" d="${LOGO_WAVE_PATH}"/></g></svg>`;
}
