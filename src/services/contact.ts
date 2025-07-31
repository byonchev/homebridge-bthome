import { CharacteristicValue } from 'homebridge';
import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceHandler } from './base.js';

export class ContactHandler extends ServiceHandler {
  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.contactDetected !== undefined) {
      const state = this.mapState(sensorData.contactDetected);

      this.service.getCharacteristic(this.Characteristic.ContactSensorState).updateValue(state);
    }
  }

  private mapState(contactDetected: boolean): CharacteristicValue {
    if (contactDetected) {
      return this.Characteristic.ContactSensorState.CONTACT_DETECTED;
    } else {
      return this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
    }
  }
}
