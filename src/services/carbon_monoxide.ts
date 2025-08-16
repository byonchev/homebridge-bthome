import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class CarbonMonoxideHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): number {
    return (sensorData.carbonMonoxideDetected ?? []).length;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const detected = this.getMeasurement(sensorData, 'carbonMonoxideDetected');

    if (detected !== undefined) {
      this.service.getCharacteristic(this.Characteristic.CarbonMonoxideDetected).updateValue(detected);
    }
  }
}
