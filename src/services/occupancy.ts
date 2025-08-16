import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class OccupancyHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): number {
    return (sensorData.occupancyDetected ?? []).length;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const occupancyDetected = this.getMeasurement(sensorData, 'occupancyDetected');

    if (occupancyDetected !== undefined) {
      this.service.getCharacteristic(this.Characteristic.OccupancyDetected).updateValue(occupancyDetected);
    }
  }
}
