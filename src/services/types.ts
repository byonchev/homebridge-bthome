import { API, Service, WithUUID } from 'homebridge';
import { ServiceOptions, ServiceType } from '../config';
import { ServiceHandler } from './base';

export type ServiceClass = WithUUID<typeof Service>;

export type ServiceHandlerConstructor = new (api: API, service: Service, options?: ServiceOptions) => ServiceHandler;

export interface ServiceDefinition {
  class: ServiceClass;
  type: ServiceType;
  handler: ServiceHandlerConstructor;
}
