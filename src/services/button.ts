import { BTHomeSensorData, ButtonEvent } from '../bthome/types.js';
import { CharacteristicValue } from 'homebridge';
import { ServiceHandler } from './base.js';

export class ButtonHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): boolean {
    return sensorData.button !== undefined;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const buttonEvent = this.mapButtonEvent(sensorData.button);

    if (buttonEvent === null) {
      return;
    }

    this.service.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent).updateValue(buttonEvent);
  }

  private mapButtonEvent(event?: ButtonEvent): CharacteristicValue | null {
    switch (event) {
      case ButtonEvent.SinglePress:
        return this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
      case ButtonEvent.DoublePress:
      case ButtonEvent.TriplePress:
        return this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
      case ButtonEvent.LongPress:
      case ButtonEvent.LongDoublePress:
      case ButtonEvent.LongTriplePress:
      case ButtonEvent.HoldPress:
        return this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
      default:
        return null;
    }
  }
}
