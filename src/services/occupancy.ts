import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class OccupancyHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): boolean {
    return sensorData.occupancyDetected !== undefined;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.occupancyDetected !== undefined) {
      this.service.getCharacteristic(this.Characteristic.OccupancyDetected).updateValue(sensorData.occupancyDetected);
    }
  }
}
