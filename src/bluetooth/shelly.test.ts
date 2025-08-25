import { describe, it, expect } from 'vitest';
import { decodeShellyManufacturerData } from './shelly.js';

describe('Shelly Bluetooth', () => {
  describe('decodeShellyManufacturerData', () => {
    it('should decode MAC address', () => {
      const data = Buffer.from([0x00, 0x00, 0x0a, 0xa5, 0x80, 0x8f, 0xe6, 0x48, 0x54]);

      const result = decodeShellyManufacturerData(data);

      expect(result).toEqual({
        mac: '54:48:e6:8f:80:a5',
      });
    });

    describe('model name decoding', () => {
      const modelTestCases = [
        { input: 0x01, expectedModel: 'SBBT-002C' },
        { input: 0x02, expectedModel: 'SBDW-002C' },
        { input: 0x03, expectedModel: 'SBHT-003C' },
        { input: 0x05, expectedModel: 'SBMO-003Z' },
        { input: 0x06, expectedModel: 'SBBT-004CEU' },
        { input: 0x07, expectedModel: 'SBBT-004CUS' },
        { input: 0x08, expectedModel: 'SBTR-001AEU' },
      ];

      it.each(modelTestCases)('should decode model $expectedModel', ({ input, expectedModel }) => {
        const data = Buffer.from([0x00, 0x00, 0x0b, input, 0x00]);

        const result = decodeShellyManufacturerData(data);

        expect(result).toEqual({
          model: expectedModel,
        });
      });

      it('should handle unrecognized model gracefully', () => {
        const data = Buffer.from([0x00, 0x00, 0x0b, 0x99, 0x00]);

        const result = decodeShellyManufacturerData(data);

        expect(result).toEqual({});
      });
    });

    it('should decode complex data with multiple blocks', () => {
      const data = Buffer.from([
        0x00, 0x00, 0x01, 0xff, 0xff, 0x0a, 0xa5, 0x80, 0x8f, 0xe6, 0x48, 0x54, 0x0b, 0x03, 0x00,
      ]);

      const result = decodeShellyManufacturerData(data);

      expect(result).toEqual({
        mac: '54:48:e6:8f:80:a5',
        model: 'SBHT-003C',
      });
    });

    it('should throw on unknown block types', () => {
      const data = Buffer.from([0x00, 0x00, 0x99, 0xff, 0xff]);

      expect(() => decodeShellyManufacturerData(data)).toThrowError();
    });

    it('should handle empty data gracefully', () => {
      const data = Buffer.from([0x00, 0x00]);
      const result = decodeShellyManufacturerData(data);

      expect(result).toEqual({});
    });
  });
});
