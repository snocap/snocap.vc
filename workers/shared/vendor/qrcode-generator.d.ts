// Hand-written types for the vendored qrcode-generator.js. Upstream ships its
// own dist/qrcode.d.ts, but that file declares a global `var qrcode` plus a
// `declare module "qrcode-generator"` block, which is the wrong shape for a
// relative import — and pulling in @types-style globals would put a dependency
// back on the workers, which is the thing the vendoring exists to avoid.
//
// This is deliberately a subset: the factory plus the three methods the gates
// call. Add to it if a caller needs more of the upstream surface.

/** 1 to 40 sizes the symbol explicitly; 0 picks the smallest that fits. */
type TypeNumber =
  | 0
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30
  | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40;

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

type Mode = "Numeric" | "Alphanumeric" | "Byte" | "Kanji";

interface QRCode {
  /** Queues data to encode. Defaults to "Byte" mode. */
  addData(data: string, mode?: Mode): void;
  /** Builds the module matrix. Call once, after all addData calls. */
  make(): void;
  /** Rendered width/height of the matrix, in modules. */
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
  createSvgTag(opts?: {
    cellSize?: number;
    margin?: number;
    scalable?: boolean;
  }): string;
  createSvgTag(cellSize?: number, margin?: number): string;
}

declare function qrcode(
  typeNumber: TypeNumber,
  errorCorrectionLevel: ErrorCorrectionLevel,
): QRCode;

export default qrcode;
