/**
 * Minimal, dependency-free ZIP writer using the STORE method (no compression).
 *
 * This exists solely so the module can produce a genuine `.xlsx` (which is a
 * ZIP of XML parts) without pulling in a third-party archive/spreadsheet
 * dependency. STORE keeps the implementation tiny and correct — the only cost
 * is a larger file, which is negligible for report-sized data.
 */

export interface ZipEntry {
  /** Path inside the archive, e.g. `xl/worksheets/sheet1.xml`. */
  name: string;
  data: Uint8Array;
}

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** Standard CRC-32 (as required by the ZIP local/central headers). */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    const index = (crc ^ bytes[i]) & 0xff;
    crc = CRC_TABLE[index] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** DOS date/time — fixed to 1980-01-01 for deterministic, reproducible output. */
const DOS_TIME = 0;
const DOS_DATE = 33; // ((1980-1980) << 9) | (1 << 5) | 1

/** Build a ZIP archive (STORE) from the given entries. */
export function createZip(entries: readonly ZipEntry[]): Uint8Array {
  const fileChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const localHeader = new Uint8Array([
      ...u32(0x04034b50),
      ...u16(20), // version needed
      ...u16(0), // flags
      ...u16(0), // method: store
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(crc),
      ...u32(size), // compressed size
      ...u32(size), // uncompressed size
      ...u16(nameBytes.length),
      ...u16(0), // extra length
      ...nameBytes,
    ]);
    fileChunks.push(localHeader, entry.data);

    const centralHeader = new Uint8Array([
      ...u32(0x02014b50),
      ...u16(20), // version made by
      ...u16(20), // version needed
      ...u16(0), // flags
      ...u16(0), // method
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0), // extra length
      ...u16(0), // comment length
      ...u16(0), // disk number start
      ...u16(0), // internal attrs
      ...u32(0), // external attrs
      ...u32(offset), // local header offset
      ...nameBytes,
    ]);
    centralChunks.push(centralHeader);

    offset += localHeader.length + entry.data.length;
  }

  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const centralOffset = offset;

  const endRecord = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0), // disk number
    ...u16(0), // disk with central dir
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(centralSize),
    ...u32(centralOffset),
    ...u16(0), // comment length
  ]);

  return concat([...fileChunks, ...centralChunks, endRecord]);
}
