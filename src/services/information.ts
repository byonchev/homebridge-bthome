import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class InformationHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): number {
    return sensorData.firmwareVersion !== undefined ? 1 : 0;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.firmwareVersion === undefined) {
      return;
    }

    this.service.updateCharacteristic(this.Characteristic.FirmwareRevision, sensorData.firmwareVersion);
  }
}
