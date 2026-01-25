import { withBindings, Peripheral, Noble } from '@stoprocent/noble';
import { EventEmitter } from 'events';

import { BluetoothAdvertisment, ManufacturerData, BluetoothError } from './types.js';
import { wrapError } from '../util/errors.js';
import { decodeShellyManufacturerData } from './shelly.js';
import { Logger } from 'homebridge';
import { withTimeout } from '../util/timeout.js';
import { formatError } from 'homebridge-lib';

export class BluetoothScanner {
  private static readonly AUTO_RECOVERY_INTERVAL = 1 * 10000;
  private static readonly DISCOVER_EVENT = 'discover';

  private readonly serviceUuid: string;
  private readonly events: EventEmitter = new EventEmitter();
  private readonly log: Logger;

  private noble: Noble | null = null;
  private lastDiscoveryTime: Date = new Date();
  private autoRecoveryHandler?: NodeJS.Timeout;

  constructor(serviceUuid: string, log: Logger) {
    this.serviceUuid = serviceUuid.toLocaleLowerCase();
    this.log = log;
  }

  public async start(powerOnTimeout: number = 0, discoveryTimeout: number = 0) {
    if (this.noble != null) {
      return;
    }

    return withTimeout(
      async () => {
        const noble = this.getNobleInstance();
        this.log.debug('Loaded noble instance');

        try {
          this.lastDiscoveryTime = new Date();

          await noble.waitForPoweredOnAsync(powerOnTimeout);
          this.log.debug('Bluetooth device powered on');

          noble.on('discover', this.onDiscoverInternal.bind(this));

          await noble.startScanningAsync([this.serviceUuid], true);
          this.log.debug(`Started scanning for devices with service uuid: ${this.serviceUuid}`);

          this.noble = noble;

          if (discoveryTimeout > 0) {
            this.scheduleAutoRecovery(powerOnTimeout, discoveryTimeout);
          }

          this.log.info('Bluetooth scanner started');
        } catch (error) {
          throw wrapError(error, BluetoothError, 'Unknown bluetooth error');
        }
      },
      powerOnTimeout,
      new BluetoothError('Bluetooth scanner initialization timeout'),
    );
  }

  public async stop() {
    if (this.noble == null) {
      return;
    }

    await this.noble.stopScanningAsync();
    this.noble.stop();
    this.noble = null;

    if (this.autoRecoveryHandler) {
      clearTimeout(this.autoRecoveryHandler);
      this.autoRecoveryHandler = undefined;
    }
  }

  public onDiscover(callback: (device: BluetoothAdvertisment) => void) {
    this.events.on(BluetoothScanner.DISCOVER_EVENT, callback);
  }

  private onDiscoverInternal(peripheral: Peripheral) {
    const advertisementData = peripheral.advertisement;
    const services = advertisementData.serviceData || [];
    const service = services.find(service => service.uuid.toLowerCase() === this.serviceUuid);

    if (!service) {
      return;
    }

    this.lastDiscoveryTime = new Date();

    const serviceData = service.data;
    const manufacturerData = this.decodeManufacturerData(advertisementData.manufacturerData);
    const mac = manufacturerData?.mac?.toLocaleLowerCase() || peripheral.address.toLowerCase() || 'unknown';
    const name = advertisementData.localName || manufacturerData.model || this.generateDeviceName(mac);

    const device: BluetoothAdvertisment = { name, mac, serviceData, manufacturerData };

    this.events.emit(BluetoothScanner.DISCOVER_EVENT, device);
  }

  private scheduleAutoRecovery(powerOnTimeout: number, discoveryTimeout: number) {
    if (this.autoRecoveryHandler) {
      clearTimeout(this.autoRecoveryHandler);
    }

    const checkFn = this.autoRecover.bind(this, powerOnTimeout, discoveryTimeout);

    this.autoRecoveryHandler = setTimeout(checkFn, BluetoothScanner.AUTO_RECOVERY_INTERVAL);
  }

  private async autoRecover(powerOnTimeout: number, discoveryTimeout: number) {
    const now = new Date();
    const timeSinceLastDiscovery = now.getTime() - this.lastDiscoveryTime.getTime();

    if (timeSinceLastDiscovery < discoveryTimeout) {
      this.scheduleAutoRecovery(powerOnTimeout, discoveryTimeout);
      return;
    }

    this.log.info('No devices discovered within timeout, restarting bluetooth scanner...');

    try {
      await this.stop();
      await this.start(powerOnTimeout, discoveryTimeout);
    } catch (error) {
      this.log.error(`Restart failed:`, formatError(error));
      this.scheduleAutoRecovery(powerOnTimeout, discoveryTimeout);
    }
  }

  private generateDeviceName(mac: string) {
    return 'BLE ' + mac.replaceAll(':', '').slice(6).toUpperCase();
  }

  private decodeManufacturerData(data?: Buffer): ManufacturerData {
    if (!data || data.length < 2) {
      return {};
    }

    const companyIdentifier = data.readUInt16LE(0);

    try {
      switch (companyIdentifier) {
        case 0x0ba9:
          return { manufacturer: 'Shelly', ...decodeShellyManufacturerData(data) };
        default:
          return {};
      }
    } catch (error) {
      this.log.warn(`Failed to decode manufacturer data:`, formatError(error));
      return {};
    }
  }

  private getNobleInstance(): Noble {
    try {
      return withBindings('default');
    } catch (error) {
      throw wrapError(error, BluetoothError, 'Failed to instantiate noble');
    }
  }
}
