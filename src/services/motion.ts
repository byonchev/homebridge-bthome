import { Characteristic, Service } from 'hap-nodejs';
import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceOptions } from '../config.js';

export class MotionHandler {
  private readonly service: Service;
  private readonly options?: ServiceOptions;

  constructor(service: Service, options?: ServiceOptions) {
    this.service = service;
    this.options = options;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.motionDetected !== undefined) {
      this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(sensorData.motionDetected);
    }
  }
}
