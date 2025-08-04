import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class TemperatureHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): boolean {
    return sensorData.temperature !== undefined;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.temperature === undefined) {
      return;
    }

    this.service.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(sensorData.temperature);
  }
}
