import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class TemperatureHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): number {
    return (sensorData.temperature ?? []).length;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const temperature = this.getMeasurement(sensorData, 'temperature');

    if (temperature === undefined) {
      return;
    }

    this.service.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(temperature);
  }
}
