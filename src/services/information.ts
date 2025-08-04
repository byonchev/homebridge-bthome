import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class InformationHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): boolean {
    return sensorData.firmwareVersion !== undefined;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.firmwareVersion === undefined) {
      return;
    }

    this.service.getCharacteristic(this.Characteristic.FirmwareRevision).updateValue(sensorData.firmwareVersion);
  }
}
