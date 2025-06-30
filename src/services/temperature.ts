import { Characteristic, Service } from 'hap-nodejs';
import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceOptions } from '../config.js';

export class TemperatureHandler {
  private readonly service: Service;
  private readonly options?: ServiceOptions;

  constructor(service: Service, options?: ServiceOptions) {
    this.service = service;
    this.options = options;
  }

  updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.temperature !== undefined) {
      this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(sensorData.temperature);
    }
  }
}
