import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class SmokeHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): boolean {
    return sensorData.smokeDetected !== undefined;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.smokeDetected !== undefined) {
      this.service.getCharacteristic(this.Characteristic.SmokeDetected).updateValue(sensorData.smokeDetected);
    }
  }
}
