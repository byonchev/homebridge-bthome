import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { BluetoothScanner } from './index.js';
import { BluetoothError } from './types.js';
import { Logger } from 'homebridge';
import { Noble, Peripheral, withBindings } from '@stoprocent/noble';
import { withTimeout } from '../util/timeout.js';

vi.mock('@stoprocent/noble', () => ({
  withBindings: vi.fn(),
}));

vi.mock('../util/timeout.js', () => ({
  withTimeout: vi.fn(),
}));

describe('BluetoothScanner', () => {
  let mockLogger: Logger;
  let mockNoble: Noble;
  let mockNobleEvent: Mock;
  let mockNobleStop: Mock;
  let mockNobleStopScanning: Mock;
  let mockCallback: Mock;
  let scanner: BluetoothScanner;

  const testServiceUuid = 'fcd2';

  beforeEach(() => {
    vi.useFakeTimers();
    mockLogger = vi.mocked(new Proxy({}, { get: () => vi.fn() }) as Logger);
    mockNobleEvent = vi.fn();
    mockNobleStop = vi.fn();
    mockNobleStopScanning = vi.fn();
    mockNoble = {
      waitForPoweredOnAsync: vi.fn(),
      startScanningAsync: vi.fn(),
      stopScanningAsync: mockNobleStopScanning,
      stop: mockNobleStop,
      on: mockNobleEvent,
    } as unknown as Noble;
    mockCallback = vi.fn();

    (withBindings as Mock).mockReturnValue(mockNoble);
    (withTimeout as Mock).mockImplementation(fn => fn());

    scanner = new BluetoothScanner(testServiceUuid, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
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

    it('should pass powerOnTimeout to waitForPoweredOnAsync', async () => {
      await scanner.start(5000);

      expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalledWith(5000);
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

  describe('stop', () => {
    it('should stop scanning and cleanup noble instance', async () => {
      await scanner.start();
      await scanner.stop();

      expect(mockNobleStopScanning).toHaveBeenCalled();
      expect(mockNobleStop).toHaveBeenCalled();
    });

    it('should be idempotent', async () => {
      await scanner.start();
      await scanner.stop();
      await scanner.stop();

      expect(mockNobleStopScanning).toHaveBeenCalledTimes(1);
      expect(mockNobleStop).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if scanner was never started', async () => {
      await scanner.stop();

      expect(mockNobleStopScanning).not.toHaveBeenCalled();
      expect(mockNobleStop).not.toHaveBeenCalled();
    });

    it('should allow restart after stop', async () => {
      await scanner.start();
      await scanner.stop();
      await scanner.start();

      expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalledTimes(2);
      expect(mockNoble.startScanningAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('auto recovery', () => {
    let onDiscoverHandler: (peripheral: Peripheral) => void;

    beforeEach(async () => {
      await scanner.start(5000, 30000);

      const discoverCall = mockNobleEvent.mock.calls.find((call: unknown[]) => call[0] === 'discover');
      expect(discoverCall).toBeDefined();

      onDiscoverHandler = discoverCall![1];
    });

    it('should not restart scanner when devices are being discovered', async () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          serviceData: [{ uuid: 'fcd2', data: Buffer.from([]) }],
          manufacturerData: Buffer.from([]),
        },
      } as Peripheral;

      onDiscoverHandler(mockPeripheral);

      await vi.advanceTimersByTimeAsync(20000);

      expect(mockNobleStopScanning).not.toHaveBeenCalled();
      expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalledTimes(1);
    });

    it('should restart scanner when no devices discovered within timeout', async () => {
      await vi.advanceTimersByTimeAsync(40000);

      expect(mockNobleStopScanning).toHaveBeenCalled();
      expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalledTimes(2);
      expect(mockNoble.startScanningAsync).toHaveBeenCalledTimes(2);
    });

    it('should reset when device is discovered', async () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          serviceData: [{ uuid: 'fcd2', data: Buffer.from([]) }],
          manufacturerData: Buffer.from([]),
        },
      } as Peripheral;

      await vi.advanceTimersByTimeAsync(25000);

      onDiscoverHandler(mockPeripheral);

      await vi.advanceTimersByTimeAsync(20000);

      expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalledTimes(1);
    });

    it('should reschedule auto recovery after successful restart', async () => {
      await vi.advanceTimersByTimeAsync(40000);

      expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(40000);

      expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalledTimes(3);
    });

    it('should reschedule auto recovery after failed restart', async () => {
      mockNoble.waitForPoweredOnAsync = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Bluetooth not available'))
        .mockResolvedValueOnce(undefined);

      await scanner.stop();
      await scanner.start(5000, 30000);

      await vi.advanceTimersByTimeAsync(40000);

      await vi.advanceTimersByTimeAsync(40000);

      expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalledTimes(3);
    });

    it('should schedule recovery checks at regular intervals', async () => {
      const mockPeripheral = {
        address: 'aa:bb:cc:dd:ee:ff',
        advertisement: {
          serviceData: [{ uuid: 'fcd2', data: Buffer.from([]) }],
          manufacturerData: Buffer.from([]),
        },
      } as Peripheral;

      onDiscoverHandler(mockPeripheral);

      await vi.advanceTimersByTimeAsync(10000);
      onDiscoverHandler(mockPeripheral);

      await vi.advanceTimersByTimeAsync(10000);
      onDiscoverHandler(mockPeripheral);

      await vi.advanceTimersByTimeAsync(10000);

      expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('onDiscover', () => {
    let onDiscoverHandler: (peripheral: Peripheral) => void;

    beforeEach(async () => {
      scanner.onDiscover(mockCallback);
      await scanner.start();

      const discoverCall = mockNobleEvent.mock.calls.find((call: unknown[]) => call[0] === 'discover');
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
      } as Peripheral;

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
      } as Peripheral;

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
      } as Peripheral;

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
      } as Peripheral;

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
      } as Peripheral;

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
      } as Peripheral;

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
      } as Peripheral;

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
      } as Peripheral;

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
      } as Peripheral;

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
      } as Peripheral;

      onDiscoverHandler(mockPeripheral);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
