import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class IlluminanceHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): number {
    return (sensorData.illuminance ?? []).length;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const illuminance = this.getMeasurement(sensorData, 'illuminance');

    if (illuminance === undefined) {
      return;
    }

    this.service.getCharacteristic(this.Characteristic.CurrentAmbientLightLevel).updateValue(illuminance);
  }
}
