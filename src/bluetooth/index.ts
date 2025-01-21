import noble, { Peripheral } from '@stoprocent/noble';
import { EventEmitter } from 'events';

import { BluetoothDevice, BluetoothError } from './types.js';

export class BluetoothScanner {
  private static readonly DISCOVER_EVENT = 'discover';

  private readonly serviceUuid: string;
  private readonly events: EventEmitter = new EventEmitter();

  private started: boolean = false;

  constructor(serviceUuid: string) {
    this.serviceUuid = serviceUuid.toLocaleLowerCase();
  }

  async start(timeout? : number) {
    try {
      await noble.waitForPoweredOn(timeout);

      noble.on('discover', this.onDiscoverInternal.bind(this));

      await noble.startScanningAsync([this.serviceUuid], true);

      this.started = true;
    } catch (error) {
      let message = 'Unknown bluetooth error';
      
      if (error instanceof Error) {
        message = error.message;
      }
      
      throw new BluetoothError(message);
    }
  }

  async stop() {
    if (!this.started) {
      return;
    }

    return noble.stopScanningAsync();
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