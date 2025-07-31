import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class HumidityHandler extends ServiceHandler {
  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.humidity === undefined) {
      return;
    }

    this.service.getCharacteristic(this.Characteristic.CurrentRelativeHumidity).updateValue(sensorData.humidity);
  }
}
