import { createZip, crc32 } from './zip.utils';

const encoder = new TextEncoder();

describe('zip.utils', () => {
  describe('crc32', () => {
    it('matches the canonical CRC-32 check value', () => {
      // The standard CRC-32 check value for "123456789" is 0xCBF43926.
      expect(crc32(encoder.encode('123456789'))).toBe(0xcbf43926);
    });

    it('matches a known value for "hello"', () => {
      expect(crc32(encoder.encode('hello'))).toBe(0x3610a686);
    });
  });

  describe('createZip', () => {
    it('produces a non-empty archive with the local + central + end signatures', () => {
      const zip = createZip([{ name: 'a.txt', data: encoder.encode('hi') }]);
      expect(zip.length).toBeGreaterThan(0);
      // Local file header signature PK\x03\x04
      expect([zip[0], zip[1], zip[2], zip[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
      // End-of-central-directory signature PK\x05\x06 appears near the tail.
      const tail = zip.slice(zip.length - 22);
      expect([tail[0], tail[1], tail[2], tail[3]]).toEqual([0x50, 0x4b, 0x05, 0x06]);
    });
  });
});
