import { API, Service } from 'homebridge';
import { Logger, PlatformAccessory } from 'homebridge';
import { ServiceOptions, ServicesConfig as ServiceConfig, ServiceType } from '../config.js';
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
import { CarbonDioxideHandler } from './carbon_dioxide.js';
import { CarbonMonoxideHandler } from './carbon_monoxide.js';
import { OccupancyHandler } from './occupancy.js';
import { SmokeHandler } from './smoke.js';

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
    config?: ServiceConfig,
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
      const matches = handler.matches(sensorData);

      for (let position = 0; position < matches; position++) {
        this.configureService(type, position + 1);
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

  private configureService(type: ServiceType, position: number = 1): Service {
    const serviceDefinition = this.definitions[type];

    if (!serviceDefinition) {
      throw new Error(`No service definition found for type: ${type}`);
    }

    const serviceClass = serviceDefinition.serviceClass;
    const service = this.upsertService(serviceClass, position);
    const handlerKey = service.subtype || service.UUID;

    if (!this.handlers.has(handlerKey)) {
      const handler = new serviceDefinition.handlerClass(this.api, this.log, service, position, this.options);

      this.handlers.set(handlerKey, handler);

      this.log.debug(`[${this.accessory.displayName}] Created handler #${position} for ${serviceClass.name} service`);
    }

    return service;
  }

  private upsertService(serviceClass: ServiceClass, position: number): Service {
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
        type: 'airQuality',
        serviceClass: Service.AirQualitySensor,
        handlerClass: AirQualityHandler,
      },
      {
        type: 'battery',
        serviceClass: Service.Battery,
        handlerClass: BatteryHandler,
      },
      {
        type: 'button',
        serviceClass: Service.StatelessProgrammableSwitch,
        handlerClass: ButtonHandler,
      },
      {
        type: 'carbonDioxide',
        serviceClass: Service.CarbonDioxideSensor,
        handlerClass: CarbonDioxideHandler,
      },
      {
        type: 'carbonMonoxide',
        serviceClass: Service.CarbonMonoxideSensor,
        handlerClass: CarbonMonoxideHandler,
      },
      {
        type: 'contact',
        serviceClass: Service.ContactSensor,
        handlerClass: ContactHandler,
      },
      {
        type: 'humidity',
        serviceClass: Service.HumiditySensor,
        handlerClass: HumidityHandler,
      },
      {
        type: 'illuminance',
        serviceClass: Service.LightSensor,
        handlerClass: IlluminanceHandler,
      },
      {
        type: 'information',
        serviceClass: Service.AccessoryInformation,
        handlerClass: InformationHandler,
      },
      {
        type: 'motion',
        serviceClass: Service.MotionSensor,
        handlerClass: MotionHandler,
      },
      {
        type: 'occupancy',
        serviceClass: Service.OccupancySensor,
        handlerClass: OccupancyHandler,
      },
      {
        type: 'smoke',
        serviceClass: Service.SmokeSensor,
        handlerClass: SmokeHandler,
      },
      {
        type: 'temperature',
        serviceClass: Service.TemperatureSensor,
        handlerClass: TemperatureHandler,
      },
    ];

    return definitions.reduce(
      (acc, definition) => ((acc[definition.type] = definition), acc),
      {} as Record<ServiceType, ServiceDefinition>,
    );
  }
}
