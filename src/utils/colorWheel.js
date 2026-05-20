function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function hexToWheelPosition(hex, size) {
  const { h, s } = hexToHsl(hex);
  const radius = (size / 2 - 4) * (s / 100);
  const angle = ((h - 90) * Math.PI) / 180;
  const cx = size / 2;
  const cy = size / 2;

  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

export function pickHexFromWheel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxRadius = size / 2 - 4;

  if (dist > maxRadius) return null;

  const hue = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  const saturation = (dist / maxRadius) * 100;
  return hslToHex((hue + 360) % 360, saturation, 50);
}

function hexToHsl(hex) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized.padStart(6, "0").slice(0, 6);

  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const hue = ((h % 360) + 360) % 360;

  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (channel) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function normalizeHex(value) {
  if (!value) return null;
  let hex = value.trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (!/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) return null;

  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }

  return hex.toLowerCase();
}

export function drawColorWheel(ctx, size) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 4;
  const image = ctx.createImageData(size, size);
  const { data } = image;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const index = (y * size + x) * 4;

      if (dist > radius) {
        data[index + 3] = 0;
        continue;
      }

      const hue = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      const saturation = (dist / radius) * 100;
      const hex = hslToHex((hue + 360) % 360, saturation, 50);
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
}
