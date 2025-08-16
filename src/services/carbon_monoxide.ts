import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class CarbonMonoxideHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): boolean {
    return sensorData.carbonMonoxideDetected !== undefined;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const detected = sensorData.carbonMonoxideDetected;

    if (detected !== undefined) {
      this.service.getCharacteristic(this.Characteristic.CarbonMonoxideDetected).updateValue(detected);
    }
  }
}
