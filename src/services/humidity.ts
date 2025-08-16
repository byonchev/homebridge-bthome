import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class HumidityHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): number {
    return (sensorData.humidity ?? []).length;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const humidity = this.getMeasurement(sensorData, 'humidity');

    if (humidity === undefined) {
      return;
    }

    this.service.getCharacteristic(this.Characteristic.CurrentRelativeHumidity).updateValue(humidity);
  }
}
