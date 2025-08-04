import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class MotionHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): boolean {
    return sensorData.motionDetected !== undefined;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.motionDetected === undefined) {
      return;
    }

    this.service.getCharacteristic(this.Characteristic.MotionDetected).updateValue(sensorData.motionDetected);
  }
}
