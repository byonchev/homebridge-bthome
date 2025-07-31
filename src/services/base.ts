import { API, Characteristic, Service } from 'homebridge';
import { ServiceOptions } from '../config';
import { BTHomeSensorData } from '../bthome/types';

export abstract class ServiceHandler {
  protected readonly Characteristic: typeof Characteristic;

  protected readonly service: Service;
  protected readonly options?: ServiceOptions;

  constructor(api: API, service: Service, options?: ServiceOptions) {
    this.Characteristic = api.hap.Characteristic;

    this.service = service;
    this.options = options;
  }

  public abstract updateValues(sensorData: BTHomeSensorData): void;
}
