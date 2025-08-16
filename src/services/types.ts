import { API, Logger, Service, WithUUID } from 'homebridge';
import { ServiceOptions, ServiceType } from '../config.js';
import { ServiceHandler } from './base.js';
import { BTHomeSensorData } from '../bthome/types.js';

export type ServiceClass = WithUUID<typeof Service>;

export interface ServiceDefinition {
  type: ServiceType;
  serviceClass: ServiceClass;
  handlerClass: ServiceHandlerClass;
}

export interface ServiceHandlerClass {
  new (api: API, log: Logger, service: Service, position: number, options?: ServiceOptions): ServiceHandler;
  matches(sensorData: BTHomeSensorData): number;
}
