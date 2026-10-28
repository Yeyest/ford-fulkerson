// Réplica del módulo `random` de Python (Mersenne Twister MT19937).
// Con la misma semilla produce exactamente los mismos números que Python 3.12,
// lo que permite que el layout (random.Random(7)) y el generador aleatorio
// den resultados idénticos a los del programa original.

const N = 624;
const M = 397;

export class PyRandom {
  private mt = new Uint32Array(N);
  private mti = N + 1;

  constructor(semilla: number = Math.floor(Math.random() * 0x100000000)) {
    this.seed(semilla);
  }

  /** random.seed(entero): init_by_array con la semilla en palabras de 32 bits. */
  seed(semilla: number): void {
    let n = Math.abs(Math.trunc(semilla));
    const clave: number[] = [];
    while (n > 0) {
      clave.push(n % 0x100000000);
      n = Math.floor(n / 0x100000000);
    }
    if (clave.length === 0) clave.push(0);
    this.initByArray(clave);
  }

  private initGenrand(s: number): void {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.mti = N;
  }

  private initByArray(clave: number[]): void {
    const mt = this.mt;
    this.initGenrand(19650218);
    let i = 1;
    let j = 0;
    for (let k = Math.max(N, clave.length); k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + clave[j] + j) >>> 0;
      i++;
      j++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
      if (j >= clave.length) j = 0;
    }
    for (let k = N - 1; k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0;
      i++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
    }
    mt[0] = 0x80000000;
  }

  private genrandUint32(): number {
    const mt = this.mt;
    let y: number;
    if (this.mti >= N) {
      let kk = 0;
      for (; kk < N - M; kk++) {
        y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      for (; kk < N - 1; kk++) {
        y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      y = (mt[N - 1] & 0x80000000) | (mt[0] & 0x7fffffff);
      mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      this.mti = 0;
    }
    y = mt[this.mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** random.random() */
  random(): number {
    const a = this.genrandUint32() >>> 5;
    const b = this.genrandUint32() >>> 6;
    return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
  }

  /** getrandbits(k) para 0 < k <= 32 */
  private getrandbits(k: number): number {
    if (k <= 0) return 0;
    return this.genrandUint32() >>> (32 - k);
  }

  /** _randbelow_with_getrandbits(n) */
  randbelow(n: number): number {
    const k = n.toString(2).length;
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }

  /** random.randint(a, b) */
  randint(a: number, b: number): number {
    return a + this.randbelow(b - a + 1);
  }

  /** random.choice(seq) */
  choice<T>(seq: readonly T[]): T {
    return seq[this.randbelow(seq.length)];
  }

  /** random.shuffle(x) (in-place) */
  shuffle<T>(x: T[]): void {
    for (let i = x.length - 1; i > 0; i--) {
      const j = this.randbelow(i + 1);
      const t = x[i];
      x[i] = x[j];
      x[j] = t;
    }
  }

  /** random.sample(population, k) */
  sample<T>(poblacion: readonly T[], k: number): T[] {
    const n = poblacion.length;
    if (k < 0 || k > n) throw new Error("Sample larger than population or is negative");
    const resultado: T[] = new Array(k);
    let setsize = 21;
    if (k > 5) setsize += 4 ** Math.ceil(Math.log(k * 3) / Math.log(4));
    if (n <= setsize) {
      const pool = poblacion.slice();
      for (let i = 0; i < k; i++) {
        const j = this.randbelow(n - i);
        resultado[i] = pool[j];
        pool[j] = pool[n - i - 1];
      }
    } else {
      const seleccionados = new Set<number>();
      for (let i = 0; i < k; i++) {
        let j = this.randbelow(n);
        while (seleccionados.has(j)) j = this.randbelow(n);
        seleccionados.add(j);
        resultado[i] = poblacion[j];
      }
    }
    return resultado;
  }
}

/** sum() de Python 3.12 sobre floats (suma compensada de Neumaier). */
export function pySum(valores: Iterable<number>): number {
  let f = 0;
  let c = 0;
  for (const x of valores) {
    const t = f + x;
    if (Math.abs(f) >= Math.abs(x)) c += f - t + x;
    else c += x - t + f;
    f = t;
  }
  if (c && Number.isFinite(c)) f += c;
  return f;
}
