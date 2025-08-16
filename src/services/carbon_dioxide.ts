import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class CarbonDioxideHandler extends ServiceHandler {
  private static readonly DEFAULT_THRESHOLD = 1000;

  public static matches(sensorData: BTHomeSensorData): boolean {
    return sensorData.carbonDioxideLevel !== undefined;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const threshold = this.options?.carbonDioxide?.threshold ?? CarbonDioxideHandler.DEFAULT_THRESHOLD;

    if (sensorData.carbonDioxideLevel !== undefined) {
      this.service.getCharacteristic(this.Characteristic.CarbonDioxideLevel).updateValue(sensorData.carbonDioxideLevel);

      const detected = sensorData.carbonDioxideLevel > threshold;

      this.service.getCharacteristic(this.Characteristic.CarbonDioxideDetected).updateValue(detected);
    }
  }
}
