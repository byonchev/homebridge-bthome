import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class MotionHandler extends ServiceHandler {
  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.motionDetected !== undefined) {
      this.service.getCharacteristic(this.Characteristic.MotionDetected).updateValue(sensorData.motionDetected);
    }
  }
}
