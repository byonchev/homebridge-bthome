import { Characteristic, Service } from 'hap-nodejs';
import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceOptions } from '../config.js';

export class HumidityHandler {
  private readonly service: Service;
  private readonly options?: ServiceOptions;

  constructor(service: Service, options?: ServiceOptions) {
    this.service = service;
    this.options = options;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.humidity !== undefined) {
      this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(sensorData.humidity);
    }
  }
}
