import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class IlluminanceHandler extends ServiceHandler {
  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.illuminance !== undefined) {
      this.service.getCharacteristic(this.Characteristic.CurrentAmbientLightLevel).updateValue(sensorData.illuminance);
    }
  }
}
