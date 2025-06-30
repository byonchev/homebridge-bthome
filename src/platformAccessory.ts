import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { BTHomePlatform } from './platform.js';
import { BTHomeDevice } from './bthome/index.js';
import { BTHomeSensorData, ButtonEvent } from './bthome/types.js';
import { ServicesConfig } from './config.js';
import { ServiceManager } from './services/index.js';

export class BTHomeAccessory {
  private static readonly LOW_BATTERY_PERCENTAGE = 20;

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
    this.services = new ServiceManager(this.accessory, this.getServiceConfiguration());

    // this.serviceConfiguration = this.getServiceConfiguration();

    const manufacturerData = this.device.getManufacturerData();

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, manufacturerData.manufacturer || 'Unknown')
      .setCharacteristic(this.platform.Characteristic.Model, manufacturerData.model || 'Unknown')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, manufacturerData.serialNumber || 'Unknown');

    // this.configureServices();

    const initialSensorData = this.device.getSensorData();
    if (initialSensorData) {
      this.services.update(initialSensorData);
    }

    this.device.onUpdate(this.onDeviceUpdate.bind(this));
  }

  private onDeviceUpdate(sensorData: BTHomeSensorData) {
    try {
      this.services.update(sensorData);
    } catch (error) {
      this.platform.log.error(`Error updating services for device ${this.accessory.displayName}:`, error);
    }
    // type SensorKey = keyof typeof sensorData;

    // for (const key in sensorData) {
    //   const value = sensorData[key as SensorKey];
    //   this.lastKnownSensorValues.set(key, value);

    //   this.platform.log.debug(`[${this.device.getAddress()}] Received update for ${key}: ${value}`);
    // }

    // this.configureServices();

    // this.triggerEvents();
  }

  // private getSensorData(sensorType: string) {
  //   const device = this.getDevice();
  //   const sensorData = device.getSensorData();

  //   type SensorKey = keyof typeof sensorData;

  //   const key = sensorType as SensorKey;

  //   if (!sensorData || !sensorData[key]) {
  //     return null;
  //   }

  //   return sensorData[key];
  // }

  // private getCharacteristicValue(sensorType: string, fallback: CharacteristicValue) {
  //   const value = this.getSensorData(sensorType);

  //   if (value) {
  //     return value;
  //   }

  //   const message = 'Device ' + this.accessory.displayName + ' has not provided value for ' + sensorType + ' reading. ';

  //   const lastKnownValue = this.lastKnownSensorValues.get(sensorType);
  //   if (lastKnownValue) {
  //     this.platform.log.warn(message + 'Reusing previously known value...');
  //     return lastKnownValue;
  //   }

  //   this.platform.log.error(message + 'Using invalid value ' + fallback + ' to satisfy characteristic...');
  //   return fallback;
  // }

  // /* Characteristics related code begin here */

  // private configureServices() {
  //   const device = this.getDevice();
  //   const data = device.getSensorData();

  //   const servicesConfig = [
  //     {
  //       dataKey: 'temperature',
  //       serviceType: this.platform.Service.TemperatureSensor,
  //       characteristicHandlers: [
  //         {
  //           characteristic: this.platform.Characteristic.CurrentTemperature,
  //           handler: this.getTemperature,
  //         },
  //       ],
  //     },
  //     {
  //       dataKey: 'humidity',
  //       serviceType: this.platform.Service.HumiditySensor,
  //       characteristicHandlers: [
  //         {
  //           characteristic: this.platform.Characteristic.CurrentRelativeHumidity,
  //           handler: this.getHumidity,
  //         },
  //       ],
  //     },
  //     {
  //       dataKey: 'battery',
  //       serviceType: this.platform.Service.Battery,
  //       characteristicHandlers: [
  //         {
  //           characteristic: this.platform.Characteristic.BatteryLevel,
  //           handler: this.getBatteryLevel,
  //         },
  //         {
  //           characteristic: this.platform.Characteristic.StatusLowBattery,
  //           handler: this.getLowBatteryStatus,
  //         },
  //       ],
  //     },
  //     {
  //       dataKey: 'button',
  //       serviceType: this.platform.Service.StatelessProgrammableSwitch,
  //       characteristicHandlers: [],
  //     },
  //     {
  //       dataKey: 'illuminance',
  //       serviceType: this.platform.Service.LightSensor,
  //       characteristicHandlers: [
  //         {
  //           characteristic: this.platform.Characteristic.CurrentAmbientLightLevel,
  //           handler: this.getIlluminance,
  //         },
  //       ],
  //     },
  //     {
  //       dataKey: 'motionDetected',
  //       serviceType: this.platform.Service.MotionSensor,
  //       characteristicHandlers: [],
  //     },
  //   ];

  //   servicesConfig.forEach(({ dataKey, serviceType, characteristicHandlers }) => {
  //     const key = dataKey as keyof typeof data;
  //     const value = data?.[key];

  //     console.log(this.platform.Service.StatefulProgrammableSwitch.name);
  //     if (value !== undefined && !this.configuredServices.has(serviceType)) {
  //       const service =
  //         this.accessory.getService(serviceType) ||
  //         this.accessory.addService(serviceType, this.accessory.displayName, `${serviceType.name}_1`);

  //       characteristicHandlers.forEach(({ characteristic, handler }) => {
  //         service.getCharacteristic(characteristic).onGet(handler.bind(this));
  //       });

  //       this.configuredServices.add(serviceType);
  //     }
  //   });
  // }

  // private triggerEvents() {
  //   const sensorData = this.getDevice().getSensorData();

  //   if (sensorData?.button !== undefined) {
  //     this.handleButtonEvent(sensorData.button);
  //   }

  //   if (sensorData?.motionDetected !== undefined) {
  //     this.handleMotionEvent(sensorData.motionDetected);
  //   }

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

  // private getTemperature(): CharacteristicValue {
  //   return this.getCharacteristicValue('temperature', -270);
  // }

  // private getHumidity(): CharacteristicValue {
  //   return this.getCharacteristicValue('humidity', 0);
  // }

  // private getBatteryLevel(): CharacteristicValue {
  //   return this.getCharacteristicValue('battery', 100);
  // }

  // private getLowBatteryStatus(): CharacteristicValue {
  //   return this.getCharacteristicValue('battery', 100) < BTHomeAccessory.LOW_BATTERY_PERCENTAGE;
  // }

  // private getIlluminance(): CharacteristicValue {
  //   return this.getCharacteristicValue('illuminance', 100000);
  // }

  // private handleButtonEvent(event: ButtonEvent) {
  //   const service = this.accessory.getService(this.platform.Service.StatelessProgrammableSwitch);
  //   if (!service) {
  //     return;
  //   }

  //   const characteristic = service.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent);

  //   switch (event) {
  //     case ButtonEvent.SinglePress:
  //       characteristic.setValue(this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
  //       break;
  //     case ButtonEvent.DoublePress:
  //     case ButtonEvent.TriplePress:
  //       characteristic.setValue(this.platform.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
  //       break;
  //     case ButtonEvent.LongPress:
  //     case ButtonEvent.LongDoublePress:
  //     case ButtonEvent.LongTriplePress:
  //     case ButtonEvent.HoldPress:
  //       characteristic.setValue(this.platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
  //       break;
  //     default:
  //       return;
  //   }
  // }

  // private handleMotionEvent(motionDetected: boolean) {
  //   const service = this.accessory.getService(this.platform.Service.MotionSensor);
  //   if (!service) {
  //     return;
  //   }

  //   service.getCharacteristic(this.platform.Characteristic.MotionDetected).setValue(motionDetected);
  // }

  // private updateFirmwareVersion(version: string) {
  //   const service = this.accessory.getService(this.platform.Service.AccessoryInformation);
  //   if (!service) {
  //     return;
  //   }

  //   service.setCharacteristic(this.platform.Characteristic.FirmwareRevision, version);
  // }

  /* Characteristics related code end here */
}
