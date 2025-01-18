import noble, { Peripheral } from '@stoprocent/noble';
import { EventEmitter } from 'events';

import { BluetoothDevice, BluetoothError } from './types.js';

export class BluetoothScanner {
  private static readonly DISCOVER_EVENT = 'discover';

  private readonly serviceUuid: string;
  private readonly events: EventEmitter = new EventEmitter();

  constructor(serviceUuid: string) {
    this.serviceUuid = serviceUuid.toLocaleLowerCase();
  }

  async start() {
    noble.on('discover', this.onDiscoverInternal.bind(this));

    try {
      await noble.waitForPoweredOn();
      await noble.startScanningAsync([], true);
    } catch (error) {
      let message = 'Unknown bluetooth error';
      
      if (error instanceof Error) {
        message = error.message;
      }
      
      throw new BluetoothError(message);
    }
  }

  async stop() {
    return noble.stopScanningAsync();
  }

  onDiscover(callback: (device: BluetoothDevice) => void) {
    this.events.on(BluetoothScanner.DISCOVER_EVENT, callback);
  }

  private onDiscoverInternal(peripheral: Peripheral) {
    const services = peripheral.advertisement.serviceData || [];
    const service = services.find((service) => service.uuid.toLowerCase() === this.serviceUuid);
    
    if (!service) {
      return;
    }

    const device : BluetoothDevice = {
      mac: peripheral.address.toLowerCase(),
      serviceData: service.data,
    };

    this.events.emit(BluetoothScanner.DISCOVER_EVENT, device);
  }
}