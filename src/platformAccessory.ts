import type { PlatformAccessory } from 'homebridge';

import type { BTHomePlatform } from './platform.js';
import { BTHomeDevice } from './bthome/index.js';
import { BTHomeSensorData } from './bthome/types.js';
import { ServiceManager } from './services/index.js';
import { DeviceConfig } from './config.js';

export class BTHomeAccessory {
  private readonly device: BTHomeDevice;

  private readonly services: ServiceManager;

  constructor(
    private readonly platform: BTHomePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.device = this.getDevice();

    const manufacturerData = this.device.getManufacturerData();

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, manufacturerData.manufacturer || 'Unknown')
      .setCharacteristic(this.platform.Characteristic.Model, manufacturerData.model || 'Unknown')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, manufacturerData.serialNumber || 'Unknown');

    const config = this.getDeviceConfiguration();

    this.services = new ServiceManager(accessory, platform.api, platform.log, config.services, platform.config.options);

    this.device.onUpdate(this.onDeviceUpdate.bind(this));
  }

  private onDeviceUpdate(sensorData: BTHomeSensorData) {
    try {
      this.services.update(sensorData);
    } catch (error) {
      this.platform.log.error(`[${this.accessory.displayName}] Error updating services for device:`, error);
    }
  }

  private getDevice(): BTHomeDevice {
    const device = this.accessory.context.device;
    if (!device) {
      throw new Error('BTHome device is not set in the accessory context');
    }

    return device;
  }

  private getDeviceConfiguration(): DeviceConfig {
    const config = this.accessory.context.config;
    if (!config) {
      throw new Error('Device configuration is not set in the accessory context');
    }

    return config;
  }
}
