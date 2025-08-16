import { CharacteristicValue } from 'homebridge';
import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class BatteryHandler extends ServiceHandler {
  private static readonly DEFAULT_LOW_BATTERY_THRESHOLD = 10;

  public static matches(sensorData: BTHomeSensorData): number {
    const batteryLevels = (sensorData.batteryLevel ?? []).length;
    const batteryLow = (sensorData.batteryLow ?? []).length;
    const batteryCharging = (sensorData.batteryCharging ?? []).length;

    return Math.max(batteryLevels, batteryLow, batteryCharging);
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const batteryLow = this.getMeasurement(sensorData, 'batteryLow');
    const batteryLevel = this.getMeasurement(sensorData, 'batteryLevel');
    const batteryCharging = this.getMeasurement(sensorData, 'batteryCharging');

    const lowBatteryStatus = this.mapLowBatteryStatus(batteryLow, batteryLevel);
    const chargingState = this.mapChargingState(batteryCharging);

    this.service.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(lowBatteryStatus);

    if (batteryLevel !== undefined) {
      this.service.getCharacteristic(this.Characteristic.BatteryLevel).updateValue(batteryLevel);
    }

    if (chargingState !== undefined) {
      this.service.getCharacteristic(this.Characteristic.ChargingState).updateValue(chargingState);
    }
  }

  private mapLowBatteryStatus(reportedLow?: boolean, reportedLevel?: number): CharacteristicValue {
    const threshold = this.options?.battery?.lowBatteryThreshold;

    if (reportedLevel !== undefined && threshold !== undefined && reportedLevel < threshold) {
      return this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
    } else if (reportedLow) {
      return this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
    } else if (reportedLevel !== undefined && reportedLevel < BatteryHandler.DEFAULT_LOW_BATTERY_THRESHOLD) {
      return this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
    } else {
      return this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }
  }

  private mapChargingState(charging?: boolean): CharacteristicValue | undefined {
    if (charging === undefined) {
      return;
    }

    return charging ? this.Characteristic.ChargingState.CHARGING : this.Characteristic.ChargingState.NOT_CHARGING;
  }
}
