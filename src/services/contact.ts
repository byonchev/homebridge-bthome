import { CharacteristicValue } from 'homebridge';
import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class ContactHandler extends ServiceHandler {
  public static matches(sensorData: BTHomeSensorData): number {
    return (sensorData.contactDetected ?? []).length;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const contactDetected = this.getMeasurement(sensorData, 'contactDetected');

    if (contactDetected === undefined) {
      return;
    }

    const state = this.mapState(contactDetected);

    this.service.getCharacteristic(this.Characteristic.ContactSensorState).updateValue(state);
  }

  private mapState(contactDetected: boolean): CharacteristicValue {
    if (contactDetected) {
      return this.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } else {
      return this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
    }
  }
}
