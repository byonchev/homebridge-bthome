import { CharacteristicValue } from 'homebridge';
import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class BatteryHandler extends ServiceHandler {
  private static readonly DEFAULT_LOW_BATTERY_THRESHOLD = 10;

  public static matches(sensorData: BTHomeSensorData): boolean {
    return (
      sensorData.batteryLevel !== undefined ||
      sensorData.batteryLow !== undefined ||
      sensorData.batteryCharging !== undefined
    );
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const { batteryLow, batteryLevel, batteryCharging } = sensorData;

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
    const threshold = this.options?.lowBatteryThreshold;

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
