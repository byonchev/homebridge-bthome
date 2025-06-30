import { Peripheral } from '@stoprocent/noble';
import { EventEmitter } from 'events';

import { BluetoothDevice, ManufacturerData, BluetoothError } from './types.js';
import { wrapError } from '../util/errors.js';
import { decodeShellyManufacturerData } from './shelly.js';
import { Logger } from 'homebridge';
import { withTimeout } from '../util/timeout.js';

export class BluetoothScanner {
  private static readonly DISCOVER_EVENT = 'discover';
  private static readonly DEFAULT_TIMEOUT = 60000;

  private readonly serviceUuid: string;
  private readonly events: EventEmitter = new EventEmitter();
  private readonly log: Logger;

  private started: boolean = false;

  constructor(serviceUuid: string, log: Logger) {
    this.serviceUuid = serviceUuid.toLocaleLowerCase();
    this.log = log;
  }

  async getNobleInstance() {
    try {
      if (['linux', 'freebsd', 'win32'].includes(process.platform)) {
        const { default: BluetoothHciSocket } = await import('@stoprocent/bluetooth-hci-socket');

        const socket = new BluetoothHciSocket();
        const device = process.env.NOBLE_HCI_DEVICE_ID ? Number.parseInt(process.env.NOBLE_HCI_DEVICE_ID, 10) : undefined;

        // @ts-expect-error parameter is not used and can be undefined, but there's a wrong typescript definition in library
        socket.bindRaw(device);
      }

      const module = await import('@stoprocent/noble');

      return module.default;
    } catch (error) {
      throw wrapError(error, BluetoothError, 'Failed to instantiate noble');
    }
  }

  async start(timeout : number = BluetoothScanner.DEFAULT_TIMEOUT) {
    if (this.started) {
      return;
    }

    return withTimeout(async () => {
      const noble = await this.getNobleInstance();
      this.log.debug('Loaded noble instance');

      try {
        await noble.waitForPoweredOn(timeout);
        this.log.debug('Bluetooth device powered on');

        noble.on('discover', this.onDiscoverInternal.bind(this));

        await noble.startScanningAsync([this.serviceUuid], true);
        this.log.debug(`Started scanning for devices with service uuid: ${this.serviceUuid}`);

        this.started = true;
      } catch (error) {
        throw wrapError(error, BluetoothError, 'Unknown bluetooth error');
      }
    },
    timeout, new BluetoothError('Bluetooth scanner initialization timeout'));
  }

  onDiscover(callback: (device: BluetoothDevice) => void) {
    this.events.on(BluetoothScanner.DISCOVER_EVENT, callback);
  }

  private onDiscoverInternal(peripheral: Peripheral) {
    const advertisementData = peripheral.advertisement;
    const services = advertisementData.serviceData || [];
    const service = services.find(service => service.uuid.toLowerCase() === this.serviceUuid);

    if (!service) {
      return;
    }

    const serviceData = service.data;
    const manufacturerData = this.decodeManufacturerData(advertisementData.manufacturerData);
    const mac = peripheral.address.toLowerCase() || manufacturerData?.mac?.toLowerCase() || 'unknown';
    const name = advertisementData.localName || this.generateDeviceName(mac);

    if (!manufacturerData.serialNumber) {
      manufacturerData.serialNumber = mac;
    }

    const device: BluetoothDevice = { name, mac, serviceData, manufacturerData };

    this.events.emit(BluetoothScanner.DISCOVER_EVENT, device);
  }

  private generateDeviceName(mac: string) {
    return 'BLE ' + mac.replaceAll(':', '').slice(6).toUpperCase();
  }

  private decodeManufacturerData(data?: Buffer): ManufacturerData {
    if (!data) {
      return {};
    }

    const companyIdentifier = data.readUInt16LE(0);

    switch (companyIdentifier) {
      case 0x0ba9:
        return decodeShellyManufacturerData(data);
      default:
        return {};
    }
  }
}
