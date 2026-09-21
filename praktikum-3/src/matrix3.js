/**
 * Praktikum Grafika Komputer - Pertemuan 3
 * Matrix 3x3 Transformation Helper (Column-Major Float32Array)
 *
 * Kelompok: Kelompok YOLO
 * 1. JALU CAHYO SENODIPUTRO (NRP 5025241155)
 * 2. ERLANGGA RIZQI DWI RASWANTO (NRP 5025241179)
 */

export const Mat3 = {
  /**
   * Membuat matriks identitas 3x3
   */
  identity() {
    return new Float32Array([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ]);
  },

  /**
   * Membuat matriks translasi 2D 3x3
   * @param {number} tx - Translasi sumbu X
   * @param {number} ty - Translasi sumbu Y
   */
  translation(tx, ty) {
    return new Float32Array([
      1,  0,  0,
      0,  1,  0,
      tx, ty, 1
    ]);
  },

  /**
   * Membuat matriks rotasi 2D 3x3
   * @param {number} rad - Sudut rotasi dalam radian
   */
  rotation(rad) {
    const c = Math.cos(rad);
    const s = Math.sin(rad);

    return new Float32Array([
       c, s, 0,
      -s, c, 0,
       0, 0, 1
    ]);
  },

  /**
   * Membuat matriks penskalaan 2D 3x3 (uniform maupun non-uniform)
   * @param {number} sx - Faktor skala sumbu X
   * @param {number} sy - Faktor skala sumbu Y
   */
  scaling(sx, sy) {
    return new Float32Array([
      sx, 0,  0,
      0,  sy, 0,
      0,  0,  1
    ]);
  },

  /**
   * Perkalian matriks 3x3 column-major: A x B
   * @param {Float32Array} a
   * @param {Float32Array} b
   * @returns {Float32Array}
   */
  multiply(a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2];
    const a10 = a[3], a11 = a[4], a12 = a[5];
    const a20 = a[6], a21 = a[7], a22 = a[8];

    const b00 = b[0], b01 = b[1], b02 = b[2];
    const b10 = b[3], b11 = b[4], b12 = b[5];
    const b20 = b[6], b21 = b[7], b22 = b[8];

    return new Float32Array([
      b00 * a00 + b01 * a10 + b02 * a20,
      b00 * a01 + b01 * a11 + b02 * a21,
      b00 * a02 + b01 * a12 + b02 * a22,

      b10 * a00 + b11 * a10 + b12 * a20,
      b10 * a01 + b11 * a11 + b12 * a21,
      b10 * a02 + b11 * a12 + b12 * a22,

      b20 * a00 + b21 * a10 + b22 * a20,
      b20 * a01 + b21 * a11 + b22 * a21,
      b20 * a02 + b21 * a12 + b22 * a22
    ]);
  },

  /**
   * Transformasi titik 2D menggunakan matriks 3x3
   */
  transformPoint(m, x, y) {
    return [
      m[0] * x + m[3] * y + m[6],
      m[1] * x + m[4] * y + m[7]
    ];
  }
};

/**
 * Konversi derajat ke radian
 */
export function degToRad(degree) {
  return (degree * Math.PI) / 180;
}

/**
 * Konversi radian ke derajat
 */
export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Komposisi Standar: P' = T x R x S x P
 * Scale -> Rotate -> Translate (objek berputar di tempat pada poros origin lokalnya)
 */
export function createTRSMatrix(transform) {
  const t = Mat3.translation(transform.x, transform.y);
  const r = Mat3.rotation(degToRad(transform.rotation));
  const s = Mat3.scaling(transform.scaleX, transform.scaleY);

  // M = T * (R * S)
  return Mat3.multiply(t, Mat3.multiply(r, s));
}

/**
 * Komposisi Pembanding: P' = R x T x S x P (atau T x R x P)
 * Scale -> Translate -> Rotate (objek ditranslasi lalu dirotasi terhadap world origin, menghasilkan gerakan orbit)
 */
export function createRTMatrix(transform) {
  const t = Mat3.translation(transform.x, transform.y);
  const r = Mat3.rotation(degToRad(transform.rotation));
  const s = Mat3.scaling(transform.scaleX, transform.scaleY);

  // M = R * (T * S) -> Translasi ikut terrotasi mengitari (0,0)
  return Mat3.multiply(r, Mat3.multiply(t, s));
}
