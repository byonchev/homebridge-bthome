import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class CarbonDioxideHandler extends ServiceHandler {
  private static readonly DEFAULT_THRESHOLD = 1000;

  public static matches(sensorData: BTHomeSensorData): number {
    return (sensorData.carbonDioxideLevel ?? []).length;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const carbonDioxideLevel = this.getMeasurement(sensorData, 'carbonDioxideLevel');
    const threshold = this.options?.carbonDioxide?.threshold ?? CarbonDioxideHandler.DEFAULT_THRESHOLD;

    if (carbonDioxideLevel !== undefined) {
      this.service.getCharacteristic(this.Characteristic.CarbonDioxideLevel).updateValue(carbonDioxideLevel);

      const detected = carbonDioxideLevel > threshold;

      this.service.getCharacteristic(this.Characteristic.CarbonDioxideDetected).updateValue(detected);
    }
  }
}
