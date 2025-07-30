import { Characteristic, Service } from 'hap-nodejs';
import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceOptions } from '../config.js';

export class IlluminanceHandler {
  private readonly service: Service;
  private readonly options?: ServiceOptions;

  constructor(service: Service, options?: ServiceOptions) {
    this.service = service;
    this.options = options;
  }

  updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.illuminance !== undefined) {
      this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(sensorData.illuminance);
    }
  }
}
