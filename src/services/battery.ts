import { Characteristic, Service } from 'hap-nodejs';
import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceOptions } from '../config.js';

export class BatteryHandler {
  private readonly service: Service;
  private readonly options?: ServiceOptions;

  constructor(service: Service, options?: ServiceOptions) {
    this.service = service;
    this.options = options;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.battery !== undefined) {
      this.service.getCharacteristic(Characteristic.BatteryLevel).updateValue(sensorData.battery);

      let status = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

      if (this.options?.lowBatteryThreshold !== undefined && sensorData.battery < this.options.lowBatteryThreshold) {
        status = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
      }

      this.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(status);
    }
  }
}
