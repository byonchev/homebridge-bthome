import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { BTHomePlatform } from './platform.js';
import { BTHomeDevice } from './bthome/index.js';
import { ButtonEvent } from './bthome/types.js';

export class BTHomeAccessory {
  private static readonly LOW_BATTERY_PERCENTAGE = 20;

  private readonly configuredServices : Set<typeof Service> = new Set();

  constructor(
    private readonly platform: BTHomePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    const device : BTHomeDevice = this.getDevice();

    this.setupServices();

    device.onUpdate(this.onDeviceUpdate.bind(this));
  }

  private onDeviceUpdate() {
    // Support dynamic services that are not included with each payload
    this.setupServices();

    this.triggerEvents();
  }

  private getSensorData(sensorType: string) {
    const device = this.getDevice();
    const sensorData = device.getSensorData();

    type SensorKey = keyof typeof sensorData;

    const key = sensorType as SensorKey;

    if (!sensorData || !sensorData[key]) {
      const mac = device.getMACAddress();

      this.platform.log.warn('BTHome device with MAC address ' + mac + ' has not provided value for ' + sensorType + ' reading');

      return null;
    }

    return sensorData[key];
  }

  /* Sensor specific characteristic and events begin here */

  private setupServices() {
    const device = this.getDevice();
    const data = device.getSensorData();

    const servicesConfig = [
      {
        dataKey: 'temperature',
        serviceType: this.platform.Service.TemperatureSensor,
        characteristicHandlers: [
          {
            characteristic: this.platform.Characteristic.CurrentTemperature,
            handler: this.getTemperature,
          },
        ],
      },
      {
        dataKey: 'humidity',
        serviceType: this.platform.Service.HumiditySensor,
        characteristicHandlers: [
          {
            characteristic: this.platform.Characteristic.CurrentRelativeHumidity,
            handler: this.getHumidity,
          },
        ],
      },
      {
        dataKey: 'battery',
        serviceType: this.platform.Service.Battery,
        characteristicHandlers: [
          {
            characteristic: this.platform.Characteristic.BatteryLevel,
            handler: this.getBatteryLevel,
          },
          {
            characteristic: this.platform.Characteristic.StatusLowBattery,
            handler: this.getLowBatteryStatus,
          },
        ],
      },
      {
        dataKey: 'button',
        serviceType: this.platform.Service.StatelessProgrammableSwitch,
        characteristicHandlers: [],
      },
    ];

    servicesConfig.forEach(({ dataKey, serviceType, characteristicHandlers }) => {
      const key = dataKey as keyof typeof data;
      const value = data?.[key];

      if (value !== undefined && !this.configuredServices.has(serviceType)) {
        const service = this.accessory.getService(serviceType) || this.accessory.addService(serviceType);

        characteristicHandlers.forEach(({ characteristic, handler }) => {
          service.getCharacteristic(characteristic).onGet(handler.bind(this));
        });

        this.configuredServices.add(serviceType);
      }
    });
  }

  private triggerEvents() {
    const sensorData = this.getDevice().getSensorData();

    if (sensorData?.button) {
      this.handleButtonEvent(sensorData.button);
    }
  }

  private getDevice() : BTHomeDevice {
    return this.accessory.context.device;
  }

  private getTemperature() : CharacteristicValue {
    return this.getSensorData('temperature') ?? -270;
  }

  private getHumidity() : CharacteristicValue {
    return this.getSensorData('humidity') ?? 0;
  }

  private getBatteryLevel() : CharacteristicValue {
    return this.getSensorData('battery') ?? 0;
  }

  private getLowBatteryStatus() : CharacteristicValue {
    return (this.getSensorData('battery') ?? 100) < BTHomeAccessory.LOW_BATTERY_PERCENTAGE;
  }

  private handleButtonEvent(event: ButtonEvent) {
    const service = this.accessory.getService(this.platform.Service.StatelessProgrammableSwitch);

    if (!service) {
      return;
    }

    const characteristic = service.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent);

    switch (event) {
    case ButtonEvent.SinglePress:
      characteristic.setValue(this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
      break;
    case ButtonEvent.DoublePress:
    case ButtonEvent.TriplePress:
      characteristic.setValue(this.platform.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
      break;
    case ButtonEvent.LongPress:
    case ButtonEvent.LongDoublePress:
    case ButtonEvent.LongTriplePress:
    case ButtonEvent.HoldPress:
      characteristic.setValue(this.platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
      break;
    default:
      return;
    }
  }

  /* Sensor specific characteristic and events end here */
}
