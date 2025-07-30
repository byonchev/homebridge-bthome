import { Service, Characteristic, CharacteristicValue } from 'hap-nodejs';
import { BTHomeSensorData, ButtonEvent } from '../bthome/types.js';
import { ServiceOptions } from '../config.js';

export class ButtonHandler {
  private readonly service: Service;
  private readonly options?: ServiceOptions;

  constructor(service: Service, options?: ServiceOptions) {
    this.service = service;
    this.options = options;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const buttonEvent = this.mapButtonEvent(sensorData.button);

    if (buttonEvent !== null) {
      this.service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(buttonEvent);
    }
  }

  private mapButtonEvent(event?: ButtonEvent): CharacteristicValue | null {
    switch (event) {
      case ButtonEvent.SinglePress:
        return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
      case ButtonEvent.DoublePress:
      case ButtonEvent.TriplePress:
        return Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
      case ButtonEvent.LongPress:
      case ButtonEvent.LongDoublePress:
      case ButtonEvent.LongTriplePress:
      case ButtonEvent.HoldPress:
        return Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
      default:
        return null;
    }
  }
}
