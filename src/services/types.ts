import { API, Service, WithUUID } from 'homebridge';
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
  new (api: API, service: Service, options?: ServiceOptions): ServiceHandler;
  matches(sensorData: BTHomeSensorData): boolean;
}
