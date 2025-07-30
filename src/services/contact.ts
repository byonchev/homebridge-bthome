import { Characteristic, CharacteristicValue, Service } from 'hap-nodejs';
import { BTHomeSensorData } from '../bthome/types.js';
import { ServiceOptions } from '../config.js';

export class ContactHandler {
  private readonly service: Service;
  private readonly options?: ServiceOptions;

  constructor(service: Service, options?: ServiceOptions) {
    this.service = service;
    this.options = options;
  }

  public updateValues(sensorData: BTHomeSensorData) {
    if (sensorData.contactDetected !== undefined) {
      const state = this.mapState(sensorData.contactDetected);

      this.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(state);
    }
  }

  private mapState(contactDetected: boolean): CharacteristicValue {
    if (contactDetected) {
      return Characteristic.ContactSensorState.CONTACT_DETECTED;
    } else {
      return Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
    }
  }
}
