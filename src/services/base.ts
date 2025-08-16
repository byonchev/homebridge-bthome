import { API, Characteristic, Logger, Service } from 'homebridge';
import { ServiceOptions } from '../config.js';
import { BTHomeSensorData } from '../bthome/types.js';

type Measurement<T extends keyof BTHomeSensorData> = BTHomeSensorData[T] extends (infer U)[] | undefined ? U : never;

export abstract class ServiceHandler {
  protected readonly Characteristic: typeof Characteristic;

  protected readonly service: Service;
  protected readonly position: number;
  protected readonly options?: ServiceOptions;
  protected readonly log: Logger;

  constructor(api: API, log: Logger, service: Service, position: number, options?: ServiceOptions) {
    this.Characteristic = api.hap.Characteristic;

    this.service = service;
    this.position = position;
    this.options = options;
    this.log = log;
  }

  protected getMeasurement<T extends keyof BTHomeSensorData>(
    sensorData: BTHomeSensorData,
    key: T,
  ): Measurement<T> | undefined {
    const value = sensorData[key];

    if (Array.isArray(value)) {
      return value[this.position - 1] as Measurement<T>;
    }

    return undefined;
  }

  public abstract updateValues(sensorData: BTHomeSensorData): void;
}
