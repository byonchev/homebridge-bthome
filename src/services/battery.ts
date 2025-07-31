import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class BatteryHandler extends ServiceHandler {
  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.battery !== undefined) {
      this.service.getCharacteristic(this.Characteristic.BatteryLevel).updateValue(sensorData.battery);

      let status = this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

      if (this.options?.lowBatteryThreshold !== undefined && sensorData.battery < this.options.lowBatteryThreshold) {
        status = this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
      }

      this.service.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(status);
    }
  }
}
