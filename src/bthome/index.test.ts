import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { BTHomeDevice } from './index.js';
import { ButtonEvent, BTHomeSensorData } from './types.js';
import { BluetoothAdvertisment, ManufacturerData } from '../bluetooth/types.js';
import { Logger } from 'homebridge';

describe('BTHomeDevice', () => {
  let mockLogger: Logger;
  let mockAdvertisement: BluetoothAdvertisment;
  let mockManufacturerData: ManufacturerData;
  let mockEncryptionKey: string;

  beforeEach(() => {
    mockLogger = vi.mocked(new Proxy({}, { get: () => vi.fn() }) as Logger);

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

  describe('getMacAddress()', () => {
    it('should return the MAC address', () => {
      const device = new BTHomeDevice(mockAdvertisement, mockLogger);
      const mac = device.getMacAddress();

      expect(mac).toEqual(mockAdvertisement.mac);
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
      let callback: Mock<(data: BTHomeSensorData) => void>;

      beforeEach(() => {
        device = new BTHomeDevice(mockAdvertisement, mockLogger);
        callback = vi.fn();
        device.onUpdate(callback);
      });

      it('should decode packet ID', () => {
        const serviceData = Buffer.from('4000FF', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ packetId: 255 }));
      });

      it('should decode firmware version (4 bytes)', () => {
        const serviceData = Buffer.from('40F100010204', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ firmwareVersion: '4.2.1.0' }));
      });

      it('should decode firmware version (3 bytes)', () => {
        const serviceData = Buffer.from('40F2000106', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ firmwareVersion: '6.1.0' }));
      });

      it('should decode battery level', () => {
        const serviceData = Buffer.from('400161', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ batteryLevel: [97] }));
      });

      it('should decode battery low status', () => {
        const serviceData = Buffer.from('401501', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ batteryLow: [true] }));
      });

      it('should decode battery charging status', () => {
        const serviceData = Buffer.from('401601', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ batteryCharging: [true] }));
      });

      it('should decode temperature (precision 1)', () => {
        const serviceData = Buffer.from('4057EA', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ temperature: [-22] }));
      });

      it('should decode temperature (precision 0.35)', () => {
        const serviceData = Buffer.from('4058EA', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ temperature: [-7.7] }));
      });

      it('should decode temperature (precision 0.1)', () => {
        const serviceData = Buffer.from('40451101', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ temperature: [27.3] }));
      });

      it('should decode temperature (precision 0.01)', () => {
        const serviceData = Buffer.from('4002CA09', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ temperature: [25.06] }));
      });

      it('should decode humidity (precision 0.01)', () => {
        const serviceData = Buffer.from('4003BF13', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ humidity: [50.55] }));
      });

      it('should decode humidity (precision 1)', () => {
        const serviceData = Buffer.from('402E23', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ humidity: [35] }));
      });

      it('should decode illuminance', () => {
        const serviceData = Buffer.from('4005138A14', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ illuminance: [13460.67] }));
      });

      it('should decode motion detection', () => {
        const serviceData = Buffer.from('402100', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ motionDetected: [false] }));
      });

      it('should decode door', () => {
        const serviceData = Buffer.from('401A00', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ contactDetected: [true] }));
      });

      it('should decode garage door', () => {
        const serviceData = Buffer.from('401B01', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ contactDetected: [false] }));
      });

      it('should decode window', () => {
        const serviceData = Buffer.from('402D01', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ contactDetected: [false] }));
      });

      it('should decode occupancy detection', () => {
        const serviceData = Buffer.from('402301', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ occupancyDetected: [true] }));
      });

      it('should decode carbon monoxide detection', () => {
        const serviceData = Buffer.from('401700', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ carbonMonoxideDetected: [false] }));
      });

      it('should decode smoke detection', () => {
        const serviceData = Buffer.from('402901', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ smokeDetected: [true] }));
      });

      it('should decode carbon dioxide level', () => {
        const serviceData = Buffer.from('4012E204', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ carbonDioxideLevel: [1250] }));
      });

      it('should decode PM2.5 density', () => {
        const serviceData = Buffer.from('400D120C', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ pm25Density: [3090] }));
      });

      it('should decode PM10 density', () => {
        const serviceData = Buffer.from('400E021C', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ pm10Density: [7170] }));
      });

      it('should decode VOC density', () => {
        const serviceData = Buffer.from('40133301', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ vocDensity: [307] }));
      });

      it('should handle multiple measurements of same type', () => {
        const serviceData = Buffer.from('403A003A01', 'hex');
        device.update(serviceData);
        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({ button: [ButtonEvent.None, ButtonEvent.SinglePress] }),
        );
      });

      it('should decode correctly until an unidentified object id is reached', () => {
        const serviceData = Buffer.from([0x40, 0x00, 0x42, 0xff, 0x01, 0x29, 0x01]);
        device.update(serviceData);

        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ packetId: 66 }));
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
        let callback: Mock<(data: BTHomeSensorData) => void>;

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
