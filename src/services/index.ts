import { Service, WithUUID } from 'hap-nodejs';
import { Logger, PlatformAccessory } from 'homebridge';
import { ServiceConfig, ServiceOptions, ServicesConfig, ServiceType } from '../config.js';
import { BTHomeSensorData } from '../bthome/types.js';
import { TemperatureHandler } from './temperature.js';
import { HumidityHandler } from './humidity.js';
import { BatteryHandler } from './battery.js';
import { IlluminanceHandler } from './illuminance.js';
import { ButtonHandler } from './button.js';
import { MotionHandler } from './motion.js';
import { ContactHandler } from './contact.js';
import { InformationHandler } from './information.js';

type ServiceClass = WithUUID<typeof Service>;

interface ServiceHandler {
  updateValues: (sensorData: BTHomeSensorData) => void;
}

type ServiceHandlerConstructor = new (service: Service, options?: ServiceOptions) => ServiceHandler;

interface ServiceDefinition {
  class: ServiceClass;
  type: ServiceType;
  handler: ServiceHandlerConstructor;
}

const SERVICE_DEFINITIONS: Record<ServiceType, ServiceDefinition> = {
  information: {
    class: Service.AccessoryInformation,
    type: 'information',
    handler: InformationHandler,
  },
  temperature: {
    class: Service.TemperatureSensor,
    type: 'temperature',
    handler: TemperatureHandler,
  },
  humidity: {
    class: Service.HumiditySensor,
    type: 'humidity',
    handler: HumidityHandler,
  },
  battery: {
    class: Service.Battery,
    type: 'battery',
    handler: BatteryHandler,
  },
  illuminance: {
    class: Service.LightSensor,
    type: 'illuminance',
    handler: IlluminanceHandler,
  },
  button: {
    class: Service.StatelessProgrammableSwitch,
    type: 'button',
    handler: ButtonHandler,
  },
  motion: {
    class: Service.MotionSensor,
    type: 'motion',
    handler: MotionHandler,
  },
  contact: {
    class: Service.ContactSensor,
    type: 'contact',
    handler: ContactHandler,
  },
};

export class ServiceManager {
  private readonly accessory: PlatformAccessory;
  private readonly autoDiscovery: boolean;
  private readonly handlers: Map<string, ServiceHandler> = new Map();
  private readonly log: Logger;

  constructor(accessory: PlatformAccessory, logger: Logger, config?: ServicesConfig) {
    this.accessory = accessory;
    this.autoDiscovery = config?.autoDiscovery !== false;
    this.log = logger;

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
    this.configureService({ type: 'information' });

    if (sensorData.temperature !== undefined) {
      this.configureService({ type: 'temperature' });
    }

    if (sensorData.humidity !== undefined) {
      this.configureService({ type: 'humidity' });
    }

    if (sensorData.battery !== undefined) {
      this.configureService({ type: 'battery', options: { lowBatteryThreshold: 10 } });
    }

    if (sensorData.illuminance !== undefined) {
      this.configureService({ type: 'illuminance' });
    }

    if (sensorData.button !== undefined) {
      this.configureService({ type: 'button' });
    }

    if (sensorData.motionDetected !== undefined) {
      this.configureService({ type: 'motion' });
    }

    if (sensorData.contactDetected !== undefined) {
      this.configureService({ type: 'contact' });
    }
  }

  private configureServices(configs: ServiceConfig[]) {
    const existingServices = [...this.accessory.services];

    configs.push({ type: 'information' });

    configs.forEach(config => {
      const service = this.configureService(config);

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

  private configureService(config: ServiceConfig) {
    const serviceDefinition = this.getServiceDefinition(config.type);

    if (!serviceDefinition) {
      throw new Error(`No service definition found for type: ${config.type}`);
    }

    this.log.debug(
      `[${this.accessory.displayName}] Configuring ${serviceDefinition.class.name} with options:`,
      config.options || {},
    );

    const service = this.upsertService(serviceDefinition.class, config.options?.position);
    const handlerKey = service.subtype || service.UUID;

    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(handlerKey, new serviceDefinition.handler(service, config.options));
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

    return this.accessory.getServiceById(serviceClass, subType) || this.accessory.getService(serviceClass);
  }

  private getServiceDefinition(serviceType: ServiceType): ServiceDefinition | undefined {
    if (SERVICE_DEFINITIONS[serviceType]) {
      return SERVICE_DEFINITIONS[serviceType];
    }

    return undefined;
  }

  private getServiceSubType(serviceClass: ServiceClass, position: number = 1): string {
    return `${serviceClass.name}_${position}`;
  }
}
