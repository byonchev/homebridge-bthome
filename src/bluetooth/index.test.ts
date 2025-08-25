import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { BluetoothScanner } from './index.js';
import { BluetoothError } from './types.js';
import { Logger } from 'homebridge';

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock('@stoprocent/noble', () => ({
  withBindings: vi.fn(),
}));

vi.mock('../util/timeout.js', () => ({
  withTimeout: vi.fn(fn => fn()),
}));

import { Noble, Peripheral, withBindings } from '@stoprocent/noble';

describe('BluetoothScanner', () => {
  let mockLogger: Logger;
  let mockNoble: Noble;
  let mockNobleEvent: Mock;
  let mockCallback: Mock;
  let scanner: BluetoothScanner;

  const testServiceUuid = 'fcd2';

  beforeEach(() => {
    mockLogger = vi.mocked(new Proxy({}, { get: () => vi.fn() }) as Logger);
    mockNobleEvent = vi.fn();
    mockNoble = {
      waitForPoweredOnAsync: vi.fn(),
      startScanningAsync: vi.fn(),
      on: mockNobleEvent,
    } as any as Noble;
    mockCallback = vi.fn();

    (withBindings as Mock).mockReturnValue(mockNoble);

    scanner = new BluetoothScanner(testServiceUuid, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create scanner instance', () => {
      expect(scanner).toBeInstanceOf(BluetoothScanner);
    });
  });

  describe('startScanning', () => {
    it('should start scanning for devices', async () => {
      await scanner.start();

      expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalled();
      expect(mockNoble.startScanningAsync).toHaveBeenCalledWith([testServiceUuid], true);
    });

    it('should be idempotent', async () => {
      await scanner.start();
      await scanner.start();

      expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalledTimes(1);
      expect(mockNoble.startScanningAsync).toHaveBeenCalledTimes(1);
    });

    it('should throw BluetoothError when noble is not initialized', async () => {
      (withBindings as Mock).mockImplementation(() => {
        throw new Error('Failed to initialize bluetooth bindings');
      });

      const failingScanner = new BluetoothScanner(testServiceUuid, mockLogger);

      await expect(failingScanner.start()).rejects.toThrow(BluetoothError);
    });

    it('should throw BluetoothError when bluetooth device fails to power on', async () => {
      mockNoble.waitForPoweredOnAsync = vi.fn().mockRejectedValue(new Error('Bluetooth not available'));

      await expect(scanner.start()).rejects.toThrow(BluetoothError);
    });

    it('should throw BluetoothError when bluetooth device fails to start scanning', async () => {
      mockNoble.waitForPoweredOnAsync = vi.fn().mockResolvedValue(undefined);
      mockNoble.startScanningAsync = vi.fn().mockRejectedValue(new Error('Scanning failed'));

      await expect(scanner.start()).rejects.toThrow(BluetoothError);
    });
  });

  describe('onDiscover', () => {
    let onDiscoverHandler: (peripheral: Peripheral) => void;

    beforeEach(async () => {
      scanner.onDiscover(mockCallback);
      await scanner.start();

      const discoverCall = mockNobleEvent.mock.calls.find((call: any[]) => call[0] === 'discover');
      expect(discoverCall).toBeDefined();

      onDiscoverHandler = discoverCall![1];
    });

    it('should successfully decode Shelly manufacturer data', () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          serviceData: [{ uuid: 'fcd2', data: Buffer.from([]) }],
          manufacturerData: Buffer.from([0xa9, 0x0b, 0x0a, 0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 0x0b, 0x01, 0x00]),
          localName: 'TestDevice',
        },
      } as any as Peripheral;

      onDiscoverHandler(mockPeripheral);

      expect(mockCallback).toHaveBeenCalledWith({
        name: 'TestDevice',
        mac: 'aa:bb:cc:dd:ee:ff',
        serviceData: Buffer.from([]),
        manufacturerData: {
          manufacturer: 'Shelly',
          model: 'SBBT-002C',
          mac: 'aa:bb:cc:dd:ee:ff',
        },
      });
    });

    it('should fallback to model name when local name is missing', () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          serviceData: [{ uuid: 'fcd2', data: Buffer.from([]) }],
          manufacturerData: Buffer.from([0xa9, 0x0b, 0x0b, 0x01, 0x00]),
        },
      } as any as Peripheral;

      onDiscoverHandler(mockPeripheral);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'SBBT-002C',
        }),
      );
    });

    it('should prefer address from manufacturer data over physical address', () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          serviceData: [{ uuid: 'fcd2', data: Buffer.from([]) }],
          manufacturerData: Buffer.from([0xa9, 0x0b, 0x0a, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11]),
        },
      } as any as Peripheral;

      onDiscoverHandler(mockPeripheral);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          mac: '11:22:33:44:55:66',
        }),
      );
    });

    it('should handle unrecognized manufacturer data', () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          serviceData: [{ uuid: 'fcd2', data: Buffer.from([]) }],
          manufacturerData: Buffer.from([0xff, 0x0b, 0x0a, 0xbb, 0xaa, 0x0b, 0x01, 0x00]),
          localName: 'TestDevice',
        },
      } as any as Peripheral;

      onDiscoverHandler(mockPeripheral);

      expect(mockCallback).toHaveBeenCalledWith({
        name: 'TestDevice',
        mac: 'aa:bb:cc:dd:ee:ff',
        serviceData: Buffer.from([]),
        manufacturerData: {},
      });
    });

    it('should handle malformed manufacturer data', () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          serviceData: [{ uuid: 'fcd2', data: Buffer.from([]) }],
          manufacturerData: Buffer.from([0xa9, 0x0b, 0x0b]),
          localName: 'TestDevice',
        },
      } as any as Peripheral;

      onDiscoverHandler(mockPeripheral);

      expect(mockCallback).toHaveBeenCalledWith({
        name: 'TestDevice',
        mac: 'aa:bb:cc:dd:ee:ff',
        serviceData: Buffer.from([]),
        manufacturerData: {},
      });
    });

    it('should fallback to generic name when local name and manufacturer data are missing', () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          serviceData: [{ uuid: 'fcd2', data: Buffer.from([]) }],
          manufacturerData: Buffer.from([]),
        },
      } as any as Peripheral;

      onDiscoverHandler(mockPeripheral);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'BLE DDEEFF',
        }),
      );
    });

    it('should handle empty physical address gracefully', () => {
      const mockPeripheral = {
        address: '',
        advertisement: {
          serviceData: [{ uuid: 'fcd2', data: Buffer.from([]) }],
          manufacturerData: Buffer.from([]),
        },
      } as any as Peripheral;

      onDiscoverHandler(mockPeripheral);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          mac: 'unknown',
        }),
      );
    });

    it('should successfully decode service data', () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          serviceData: [{ uuid: 'fcd2', data: Buffer.from([0x01, 0x02, 0x03, 0x04]) }],
          manufacturerData: Buffer.from([]),
          localName: 'TestDevice',
        },
      } as any as Peripheral;

      onDiscoverHandler(mockPeripheral);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceData: Buffer.from([0x01, 0x02, 0x03, 0x04]),
        }),
      );
    });

    it('should handle different service uuids gracefully', () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          serviceData: [{ uuid: '1234', data: Buffer.from([0x01, 0x02, 0x03, 0x04]) }],
          manufacturerData: Buffer.from([]),
          localName: 'TestDevice',
        },
      } as any as Peripheral;

      onDiscoverHandler(mockPeripheral);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle missing service data gracefully', () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          manufacturerData: Buffer.from([]),
          localName: 'TestDevice',
        },
      } as any as Peripheral;

      onDiscoverHandler(mockPeripheral);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
