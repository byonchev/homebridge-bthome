import type { PlatformAccessory } from 'homebridge';

import type { BTHomePlatform } from './platform.js';
import { BTHomeDevice } from './bthome/index.js';
import { BTHomeSensorData } from './bthome/types.js';
import { ServicesConfig } from './config.js';
import { ServiceManager } from './services/index.js';

export class BTHomeAccessory {
  private readonly device: BTHomeDevice;

  private readonly services: ServiceManager;

  // private readonly configuredServices: Set<typeof Service> = new Set();
  // private readonly lastKnownSensorValues = new Map();
  // private readonly serviceConfiguration: ServicesConfig;

  constructor(
    private readonly platform: BTHomePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.device = this.getDevice();
    this.services = new ServiceManager(this.accessory, platform.log, this.getServiceConfiguration());

    const manufacturerData = this.device.getManufacturerData();

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, manufacturerData.manufacturer || 'Unknown')
      .setCharacteristic(this.platform.Characteristic.Model, manufacturerData.model || 'Unknown')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, manufacturerData.serialNumber || 'Unknown');

    this.device.onUpdate(this.onDeviceUpdate.bind(this));
  }

  private onDeviceUpdate(sensorData: BTHomeSensorData) {
    try {
      this.services.update(sensorData);
    } catch (error) {
      this.platform.log.error(`Error updating services for device ${this.accessory.displayName}:`, error);
    }
  }

  //   if (sensorData?.firmwareVersion !== undefined) {
  //     this.updateFirmwareVersion(sensorData.firmwareVersion);
  //   }
  // }

  private getDevice(): BTHomeDevice {
    const device = this.accessory.context.device;
    if (!device) {
      throw new Error('BTHome device is not set in the accessory context');
    }

    return device;
  }

  private getServiceConfiguration(): ServicesConfig {
    const config = this.accessory.context.services;
    if (!config) {
      throw new Error('Accessory service configuration is not set in the context');
    }

    return config;
  }

  // private updateFirmwareVersion(version: string) {
  //   const service = this.accessory.getService(this.platform.Service.AccessoryInformation);
  //   if (!service) {
  //     return;
  //   }

  //   service.setCharacteristic(this.platform.Characteristic.FirmwareRevision, version);
  // }

  /* Characteristics related code end here */
}
