import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class TemperatureHandler extends ServiceHandler {
  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.temperature !== undefined) {
      this.service.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(sensorData.temperature);
    }
  }
}
