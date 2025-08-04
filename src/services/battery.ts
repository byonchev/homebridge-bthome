import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class BatteryHandler extends ServiceHandler {
  private readonly DEFAULT_LOW_BATTERY_THRESHOLD = 10;

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.battery === undefined) {
      return;
    }

    this.service.getCharacteristic(this.Characteristic.BatteryLevel).updateValue(sensorData.battery);

    const lowBatteryThreshold = this.options?.lowBatteryThreshold ?? this.DEFAULT_LOW_BATTERY_THRESHOLD;

    const status =
      sensorData.battery < lowBatteryThreshold
        ? this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
        : this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

    this.service.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(status);
  }

  public static matches(sensorData: BTHomeSensorData): boolean {
    return sensorData.battery !== undefined;
  }
}
