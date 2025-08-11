import { API, Characteristic, Logger, Service } from 'homebridge';
import { ServiceOptions } from '../config.js';
import { BTHomeSensorData } from '../bthome/types.js';

export abstract class ServiceHandler {
  protected readonly Characteristic: typeof Characteristic;

  protected readonly service: Service;
  protected readonly options?: ServiceOptions;
  protected readonly log: Logger;

  constructor(api: API, log: Logger, service: Service, options?: ServiceOptions) {
    this.Characteristic = api.hap.Characteristic;

    this.service = service;
    this.options = options;
    this.log = log;
  }

  public abstract updateValues(sensorData: BTHomeSensorData): void;
}
