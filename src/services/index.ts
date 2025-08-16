import { API, Service } from 'homebridge';
import { Logger, PlatformAccessory } from 'homebridge';
import { ServiceOptions, ServicesConfig, ServiceType } from '../config.js';
import { BTHomeSensorData } from '../bthome/types.js';
import { TemperatureHandler } from './temperature.js';
import { HumidityHandler } from './humidity.js';
import { BatteryHandler } from './battery.js';
import { IlluminanceHandler } from './illuminance.js';
import { ButtonHandler } from './button.js';
import { MotionHandler } from './motion.js';
import { ContactHandler } from './contact.js';
import { InformationHandler } from './information.js';
import { ServiceClass, ServiceDefinition } from './types.js';
import { ServiceHandler } from './base.js';
import { AirQualityHandler } from './air_quality.js';

export class ServiceManager {
  private readonly api: API;
  private readonly accessory: PlatformAccessory;
  private readonly autoDiscovery: boolean;
  private readonly definitions: Record<ServiceType, ServiceDefinition>;
  private readonly handlers: Map<string, ServiceHandler> = new Map();
  private readonly options?: ServiceOptions;
  private readonly log: Logger;

  constructor(
    accessory: PlatformAccessory,
    api: API,
    logger: Logger,
    config?: ServicesConfig,
    options?: ServiceOptions,
  ) {
    this.accessory = accessory;

    this.api = api;
    this.log = logger;

    this.autoDiscovery = config?.autoDiscovery !== false;
    this.definitions = this.createServiceDefinitions();
    this.options = options;

    if (!this.autoDiscovery) {
      this.configureServices(config?.enabled || []);
    }
  }

  public update(sensorData: BTHomeSensorData) {
    if (this.autoDiscovery) {
      this.discoverServices(sensorData);
    }

    this.handlers.forEach(handler => {
      handler.updateValues(sensorData);
    });
  }

  private discoverServices(sensorData: BTHomeSensorData) {
    Object.values(this.definitions).forEach(({ type, handlerClass: handler }) => {
      if (handler.matches(sensorData)) {
        this.configureService(type);
      }
    });
  }

  private configureServices(types: ServiceType[]) {
    const existingServices = [...this.accessory.services];

    types.push('information');

    types.forEach(type => {
      const service = this.configureService(type);

      const serviceIndex = existingServices.findIndex(existingService => existingService === service);

      if (serviceIndex !== -1) {
        existingServices.splice(serviceIndex, 1);
      }
    });

    existingServices.forEach(staleService => {
      this.log.warn(`[${this.accessory.displayName}] Removing stale service: ${staleService.constructor.name}`);

      this.accessory.removeService(staleService);
    });
  }

  private configureService(type: ServiceType): Service {
    const serviceDefinition = this.definitions[type];

    if (!serviceDefinition) {
      throw new Error(`No service definition found for type: ${type}`);
    }

    const service = this.upsertService(serviceDefinition.serviceClass);
    const handlerKey = service.subtype || service.UUID;

    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(handlerKey, new serviceDefinition.handlerClass(this.api, this.log, service, this.options));

      this.log.debug(
        `[${this.accessory.displayName}] Created handler for ${serviceDefinition.serviceClass.name} service`,
      );
    }

    return service;
  }

  private upsertService(serviceClass: ServiceClass, position: number = 1): Service {
    const subType = this.getServiceSubType(serviceClass, position);
    const name = this.accessory.displayName;

    return this.getService(serviceClass, position) || this.accessory.addService(serviceClass, name, subType);
  }

  private getService(serviceClass: ServiceClass, position: number = 1): Service | undefined {
    const subType = this.getServiceSubType(serviceClass, position);

    const service = this.accessory.getServiceById(serviceClass, subType);

    // Fallback to v1 service without subtype
    if (!service && position === 1) {
      return this.accessory.getService(serviceClass);
    }

    return service;
  }

  private getServiceSubType(serviceClass: ServiceClass, position: number = 1): string {
    return `${serviceClass.name}_${position}`;
  }

  private createServiceDefinitions(): Record<ServiceType, ServiceDefinition> {
    const Service = this.api.hap.Service;

    const definitions: Array<ServiceDefinition> = [
      {
        type: 'information',
        serviceClass: Service.AccessoryInformation,
        handlerClass: InformationHandler,
      },
      {
        type: 'temperature',
        serviceClass: Service.TemperatureSensor,
        handlerClass: TemperatureHandler,
      },
      {
        type: 'humidity',
        serviceClass: Service.HumiditySensor,
        handlerClass: HumidityHandler,
      },
      {
        type: 'battery',
        serviceClass: Service.Battery,
        handlerClass: BatteryHandler,
      },
      {
        type: 'illuminance',
        serviceClass: Service.LightSensor,
        handlerClass: IlluminanceHandler,
      },
      {
        type: 'button',
        serviceClass: Service.StatelessProgrammableSwitch,
        handlerClass: ButtonHandler,
      },
      {
        type: 'motion',
        serviceClass: Service.MotionSensor,
        handlerClass: MotionHandler,
      },
      {
        type: 'contact',
        serviceClass: Service.ContactSensor,
        handlerClass: ContactHandler,
      },
      {
        type: 'airQuality',
        serviceClass: Service.AirQualitySensor,
        handlerClass: AirQualityHandler,
      },
    ];

    return definitions.reduce(
      (acc, definition) => ((acc[definition.type] = definition), acc),
      {} as Record<ServiceType, ServiceDefinition>,
    );
  }
}
