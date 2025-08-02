import { API, Service, WithUUID } from 'homebridge';
import { ServiceOptions, ServiceType } from '../config.js';
import { ServiceHandler } from './base.js';

export type ServiceClass = WithUUID<typeof Service>;

export type ServiceHandlerConstructor = new (api: API, service: Service, options?: ServiceOptions) => ServiceHandler;

export interface ServiceDefinition {
  class: ServiceClass;
  type: ServiceType;
  handler: ServiceHandlerConstructor;
}
