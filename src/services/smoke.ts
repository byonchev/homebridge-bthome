import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class SmokeHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): number {
    return (sensorData.smokeDetected ?? []).length;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const smokeDetected = this.getMeasurement(sensorData, 'smokeDetected');

    if (smokeDetected !== undefined) {
      this.service.getCharacteristic(this.Characteristic.SmokeDetected).updateValue(smokeDetected);
    }
  }
}
