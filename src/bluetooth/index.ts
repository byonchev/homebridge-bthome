import { Peripheral } from '@stoprocent/noble';
import { EventEmitter } from 'events';

import { BluetoothDevice, BluetoothError } from './types.js';
import { wrapError } from '../util/errors.js';

export class BluetoothScanner {
  private static readonly DISCOVER_EVENT = 'discover';

  private readonly serviceUuid: string;
  private readonly events: EventEmitter = new EventEmitter();

  private started: boolean = false;

  constructor(serviceUuid: string) {
    this.serviceUuid = serviceUuid.toLocaleLowerCase();
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

  async start(timeout? : number) {
    if (this.started) {
      return;
    }

    const noble = await this.getNobleInstance();

    try {
      await noble.waitForPoweredOn(timeout);

      noble.on('discover', this.onDiscoverInternal.bind(this));

      await noble.startScanningAsync([this.serviceUuid], true);

      this.started = true;
    } catch (error) {
      throw wrapError(error, BluetoothError, 'Unknown bluetooth error');
    }
  }

  onDiscover(callback: (device: BluetoothDevice) => void) {
    this.events.on(BluetoothScanner.DISCOVER_EVENT, callback);
  }

  private onDiscoverInternal(peripheral: Peripheral) {
    const advertisementData = peripheral.advertisement;
    const services = advertisementData.serviceData || [];
    const service = services.find((service) => service.uuid.toLowerCase() === this.serviceUuid);

    if (!service) {
      return;
    }

    const mac = peripheral.address.toLowerCase();
    const name = advertisementData.localName || this.generateDeviceName(mac);
    const serviceData = service.data;

    const device : BluetoothDevice = { name, mac, serviceData };

    this.events.emit(BluetoothScanner.DISCOVER_EVENT, device);
  }

  private generateDeviceName(mac: string) {
    return 'BLE ' + mac.replaceAll(':', '').slice(6).toUpperCase();
  }
}