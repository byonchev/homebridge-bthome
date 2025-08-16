import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class MotionHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): number {
    return (sensorData.motionDetected ?? []).length;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const motionDetected = this.getMeasurement(sensorData, 'motionDetected');

    if (motionDetected === undefined) {
      return;
    }

    this.service.getCharacteristic(this.Characteristic.MotionDetected).updateValue(motionDetected);
  }
}
