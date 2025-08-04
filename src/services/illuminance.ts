import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class IlluminanceHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): boolean {
    return sensorData.illuminance !== undefined;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.illuminance === undefined) {
      return;
    }

    this.service.getCharacteristic(this.Characteristic.CurrentAmbientLightLevel).updateValue(sensorData.illuminance);
  }
}
