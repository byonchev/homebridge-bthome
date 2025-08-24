import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BTHomeDevice } from './index.js';
import { ButtonEvent } from './types.js';
import { BluetoothAdvertisment, ManufacturerData } from '../bluetooth/types.js';
import { Logger } from 'homebridge';

vi.mock('homebridge-lib', () => ({
  formatError: vi.fn(error => error?.message || String(error)),
}));

describe('BTHomeDevice', () => {
  let mockLogger: Logger;
  let mockAdvertisement: BluetoothAdvertisment;
  let mockManufacturerData: ManufacturerData;
  let mockEncryptionKey: string;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      success: vi.fn(),
    } as Logger;

    mockManufacturerData = {
      manufacturer: 'Test',
      model: 'TestDevice',
    };

    mockAdvertisement = {
      name: 'TestDevice',
      mac: '54:48:e6:8f:80:a5',
      serviceData: Buffer.from([]),
      manufacturerData: mockManufacturerData,
    };

    mockEncryptionKey = '231d39c1d7cc1ab1aee224cd096db932';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create device without encryption key', () => {
      const device = new BTHomeDevice(mockAdvertisement, mockLogger);
      expect(device).toBeInstanceOf(BTHomeDevice);
      expect(device.getManufacturerData()).toEqual(mockManufacturerData);
    });

    it('should create device with encryption key', () => {
      const device = new BTHomeDevice(mockAdvertisement, mockLogger, mockEncryptionKey);
      expect(device).toBeInstanceOf(BTHomeDevice);
    });

    it('should handle empty encryption key', () => {
      const device = new BTHomeDevice(mockAdvertisement, mockLogger, '');
      expect(device).toBeInstanceOf(BTHomeDevice);
    });
  });

  describe('getManufacturerData()', () => {
    it('should return a copy of manufacturer data', () => {
      const device = new BTHomeDevice(mockAdvertisement, mockLogger);
      const data = device.getManufacturerData();

      expect(data).toEqual(mockManufacturerData);
      expect(data).not.toBe(mockManufacturerData);
    });
  });

  describe('onUpdate()', () => {
    it('should register update callback', () => {
      const device = new BTHomeDevice(mockAdvertisement, mockLogger);
      const callback = vi.fn();

      device.onUpdate(callback);

      const serviceData = Buffer.from([0x40, 0x00, 0x01]);
      device.update(serviceData);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          packetId: 1,
        }),
      );
    });

    it('should handle multiple callbacks', () => {
      const device = new BTHomeDevice(mockAdvertisement, mockLogger);
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      device.onUpdate(callback1);
      device.onUpdate(callback2);

      const serviceData = Buffer.from([0x40, 0x00, 0x01]);
      device.update(serviceData);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('should process unencrypted data successfully', () => {
      const device = new BTHomeDevice(mockAdvertisement, mockLogger);
      const callback = vi.fn();
      device.onUpdate(callback);

      const serviceData = Buffer.from([0x40, 0x00, 0x01, 0x02, 0x64, 0x00]);
      device.update(serviceData);

      expect(callback).toHaveBeenCalledWith({
        packetId: 1,
        temperature: [1],
      });
    });

    it('should deduplicate repeated packets', () => {
      const device = new BTHomeDevice(mockAdvertisement, mockLogger);
      const callback = vi.fn();
      device.onUpdate(callback);

      const serviceData = Buffer.from([0x40, 0x00, 0x01]);

      device.update(serviceData);
      device.update(serviceData);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid data gracefully', () => {
      const device = new BTHomeDevice(mockAdvertisement, mockLogger);
      const callback = vi.fn();
      device.onUpdate(callback);

      const invalidServiceData = Buffer.from([0x00]);
      device.update(invalidServiceData);

      expect(callback).not.toHaveBeenCalled();
    });

    describe('data decoding', () => {
      let device: BTHomeDevice;
      let callback: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        device = new BTHomeDevice(mockAdvertisement, mockLogger);
        callback = vi.fn();
        device.onUpdate(callback);
      });

      it('should decode packet ID', () => {
        const serviceData = Buffer.from([0x40, 0x00, 0xff]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ packetId: 255 }));
      });

      it('should decode firmware version (4 bytes)', () => {
        const serviceData = Buffer.from([0x40, 0xf1, 0x01, 0x02, 0x03, 0x04]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ firmwareVersion: '4.3.2.1' }));
      });

      it('should decode firmware version (3 bytes)', () => {
        const serviceData = Buffer.from([0x40, 0xf2, 0x01, 0x02, 0x03]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ firmwareVersion: '3.2.1' }));
      });

      it('should decode battery level', () => {
        const serviceData = Buffer.from([0x40, 0x01, 0x64]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ batteryLevel: [100] }));
      });

      it('should decode battery low status', () => {
        const serviceData = Buffer.from([0x40, 0x15, 0x01]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ batteryLow: [true] }));
      });

      it('should decode battery charging status', () => {
        const serviceData = Buffer.from([0x40, 0x16, 0x00]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ batteryCharging: [false] }));
      });

      it('should decode temperature (precision 0.01)', () => {
        const serviceData = Buffer.from([0x40, 0x02, 0x64, 0x00]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ temperature: [1] }));
      });

      it('should decode temperature (precision 0.1)', () => {
        const serviceData = Buffer.from([0x40, 0x45, 0x64, 0x00]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ temperature: [10] }));
      });

      it('should decode temperature (1 byte)', () => {
        const serviceData = Buffer.from([0x40, 0x57, 0x19]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ temperature: [25] }));
      });

      it('should decode temperature (precision 0.35)', () => {
        const serviceData = Buffer.from([0x40, 0x58, 0x23]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ temperature: [100] }));
      });

      it('should decode humidity (precision 0.01)', () => {
        const serviceData = Buffer.from([0x40, 0x03, 0x40, 0x1f]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ humidity: [80] }));
      });

      it('should decode humidity (1 byte)', () => {
        const serviceData = Buffer.from([0x40, 0x2e, 0x50]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ humidity: [80] }));
      });

      it('should decode illuminance', () => {
        const serviceData = Buffer.from([0x40, 0x05, 0x10, 0x27, 0x00]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ illuminance: [100] }));
      });

      it('should decode motion detection', () => {
        const serviceData = Buffer.from([0x40, 0x21, 0x01]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ motionDetected: [true] }));
      });

      it('should decode contact detection (inverted)', () => {
        const serviceData = Buffer.from([0x40, 0x1a, 0x00]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ contactDetected: [true] }));
      });

      it('should decode occupancy detection', () => {
        const serviceData = Buffer.from([0x40, 0x23, 0x01]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ occupancyDetected: [true] }));
      });

      it('should decode carbon monoxide detection', () => {
        const serviceData = Buffer.from([0x40, 0x17, 0x01]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ carbonMonoxideDetected: [true] }));
      });

      it('should decode smoke detection', () => {
        const serviceData = Buffer.from([0x40, 0x29, 0x01]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ smokeDetected: [true] }));
      });

      it('should decode carbon dioxide level', () => {
        const serviceData = Buffer.from([0x40, 0x12, 0x90, 0x01]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ carbonDioxideLevel: [400] }));
      });

      it('should decode PM2.5 density', () => {
        const serviceData = Buffer.from([0x40, 0x0d, 0x19, 0x00]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ pm25Density: [25] }));
      });

      it('should decode PM10 density', () => {
        const serviceData = Buffer.from([0x40, 0x0e, 0x32, 0x00]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ pm10Density: [50] }));
      });

      it('should decode VOC density', () => {
        const serviceData = Buffer.from([0x40, 0x13, 0x64, 0x00]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ vocDensity: [100] }));
      });

      it('should handle multiple measurements of same type', () => {
        const serviceData = Buffer.from([0x40, 0x02, 0x64, 0x00, 0x02, 0xc8, 0x00]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ temperature: [1, 2] }));
      });

      it('should handle unsupported object IDs gracefully', () => {
        const serviceData = Buffer.from([0x40, 0xff, 0x01]);
        device.update(serviceData);

        expect(callback).toHaveBeenCalledWith(expect.objectContaining({}));
      });

      it('should skip unimplemented object IDs', () => {
        const serviceData = Buffer.from([0x40, 0x09, 0x01, 0x00, 0x02]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ packetId: 2 }));
      });

      it('should skip unimplemented object IDs with different byte lengths', () => {
        const serviceData = Buffer.from([
          0x40, 0x09, 0xaa, 0x06, 0xbb, 0xcc, 0x04, 0xdd, 0xee, 0xff, 0x3e, 0x11, 0x22, 0x33, 0x44, 0x53, 0x03, 0x55,
          0x66, 0x77, 0x00, 0x42,
        ]);
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ packetId: 66 }));
      });

      describe('button events', () => {
        let device: BTHomeDevice;
        let callback: ReturnType<typeof vi.fn>;

        beforeEach(() => {
          device = new BTHomeDevice(mockAdvertisement, mockLogger);
          callback = vi.fn();
          device.onUpdate(callback);
        });

        it('should decode all button events correctly', () => {
          const testCases = [
            { input: 0x00, expected: ButtonEvent.None },
            { input: 0x01, expected: ButtonEvent.SinglePress },
            { input: 0x02, expected: ButtonEvent.DoublePress },
            { input: 0x03, expected: ButtonEvent.TriplePress },
            { input: 0x04, expected: ButtonEvent.LongPress },
            { input: 0x05, expected: ButtonEvent.LongDoublePress },
            { input: 0x06, expected: ButtonEvent.LongTriplePress },
            { input: 0x80, expected: ButtonEvent.HoldPress },
            { input: 0xfe, expected: ButtonEvent.HoldPress },
          ];

          testCases.forEach(({ input, expected }) => {
            callback.mockClear();
            const serviceData = Buffer.from([0x40, 0x3a, input]);
            device.update(serviceData);
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ button: [expected] }));
          });
        });

        it('should handle unsupported button events', () => {
          const serviceData = Buffer.from([0x40, 0x3a, 0x99]);
          device.update(serviceData);

          expect(callback).toHaveBeenCalledWith(expect.objectContaining({ button: [ButtonEvent.None] }));
        });
      });
    });

    describe('encryption handling', () => {
      it('should handle encrypted data without key gracefully', () => {
        const deviceWithoutKey = new BTHomeDevice(mockAdvertisement, mockLogger);
        const callback = vi.fn();
        deviceWithoutKey.onUpdate(callback);

        const encryptedData = Buffer.from([0x41]);
        deviceWithoutKey.update(encryptedData);

        expect(callback).not.toHaveBeenCalled();
      });

      it('should successfully decrypt data with correct key', () => {
        const device = new BTHomeDevice(mockAdvertisement, mockLogger, mockEncryptionKey);
        const callback = vi.fn();
        device.onUpdate(callback);

        const encryptedData = Buffer.from('41a47266c95f730011223378237214', 'hex');

        device.update(encryptedData);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            temperature: [25.06],
            humidity: [50.55],
          }),
        );
      });

      it('should handle invalid encrypted payload length gracefully', () => {
        const device = new BTHomeDevice(mockAdvertisement, mockLogger, mockEncryptionKey);
        const callback = vi.fn();
        device.onUpdate(callback);

        const shortPayload = Buffer.from([0x41, 0x01, 0x02]);
        device.update(shortPayload);

        expect(callback).not.toHaveBeenCalled();
      });

      it('should handle decryption failure with wrong key', () => {
        const wrongKey = 'ffffffffffffffffffffffffffffffff';
        const device = new BTHomeDevice(mockAdvertisement, mockLogger, wrongKey);
        const callback = vi.fn();
        device.onUpdate(callback);

        const encryptedData = Buffer.from('41a47266c95f730011223378237214', 'hex');
        device.update(encryptedData);

        expect(callback).not.toHaveBeenCalled();
      });

      it('should detect counter reuse in encrypted payloads', () => {
        const device = new BTHomeDevice(mockAdvertisement, mockLogger, mockEncryptionKey);
        const callback = vi.fn();
        device.onUpdate(callback);

        const firstEncryptedData = Buffer.from('41a47266c95f730011223378237214', 'hex');
        device.update(firstEncryptedData);

        expect(callback).toHaveBeenCalledTimes(1);
        callback.mockClear();

        const replayData = Buffer.from('41a47266c95f73002211003311223344', 'hex');
        device.update(replayData);

        expect(callback).not.toHaveBeenCalled();
      });
    });
  });

  describe('constants', () => {
    it('should have correct service data UUID', () => {
      expect(BTHomeDevice.UUID).toBe('FCD2');
    });
  });
});
