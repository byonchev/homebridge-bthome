import { Service, WithUUID } from 'hap-nodejs';
import { PlatformAccessory } from 'homebridge';
import { ServiceConfig, ServiceOptions, ServicesConfig, ServiceType } from '../config.js';
import { BTHomeSensorData } from '../bthome/types.js';
import { TemperatureHandler } from './temperature.js';

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

export class ServiceManager {
  private readonly accessory: PlatformAccessory;
  private readonly autoDiscovery: boolean;
  private readonly handlers: Map<string, ServiceHandler> = new Map();

  constructor(accessory: PlatformAccessory, config?: ServicesConfig) {
    this.accessory = accessory;
    this.autoDiscovery = config?.autoDiscovery !== false;

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
    if (sensorData.temperature !== undefined) {
      this.configureService({ type: 'temperature' });
    }

    // if (sensorData.humidity !== undefined) {
    //   this.configureService({ type: 'humidity' });
    // }

    // if (sensorData.battery !== undefined) {
    //   this.configureService({ type: 'battery', options: { lowBatteryThreshold: 10 } });
    // }

    // if (sensorData.illuminance !== undefined) {
    //   this.configureService({ type: 'illuminance' });
    // }

    // if (sensorData.button !== undefined) {
    //   this.configureService({ type: 'button' });
    // }

    // if (sensorData.motionDetected !== undefined) {
    //   this.configureService({ type: 'motion' });
    // }

    // if (sensorData.contactDetected !== undefined) {
    //   this.configureService({ type: 'contact' });
    // }
  }

  private configureServices(configs: ServiceConfig[]) {
    configs.forEach(config => {
      this.configureService(config);
    });
  }

  private configureService(config: ServiceConfig) {
    const serviceDefinition = this.getServiceDefinition(config.type);

    if (!serviceDefinition) {
      throw new Error(`No service definition found for type: ${config.type}`);
    }

    const service = this.upsertService(serviceDefinition.class, config.options?.position);
    const handlerKey = service.subtype || service.UUID;

    if (!this.handlers.has(handlerKey)) {
      this.handlers.set(handlerKey, new serviceDefinition.handler(service, config.options));
    }
  }

  private upsertService(serviceClass: ServiceClass, position: number = 1): Service {
    const subType = `${serviceClass.name}_${position}`;

    return (
      this.accessory.getServiceById(serviceClass, subType) ||
      this.accessory.getService(serviceClass) ||
      this.accessory.addService(serviceClass, this.accessory.displayName, subType)
    );
  }

  private getServiceDefinition(serviceType: ServiceType): ServiceDefinition | undefined {
    const result = { type: serviceType } as ServiceDefinition;

    switch (serviceType) {
      case 'temperature':
        result.class = Service.TemperatureSensor;
        result.handler = TemperatureHandler;
        break;
      // case 'humidity':
      //   result.class = Service.HumiditySensor;
      //   break;
      // case 'battery':
      //   result.class = Service.Battery;
      //   break;
      // case 'illuminance':
      //   result.class = Service.LightSensor;
      //   break;
      // case 'button':
      //   result.class = Service.StatelessProgrammableSwitch;
      //   break;
      // case 'motion':
      //   result.class = Service.MotionSensor;
      //   break;
      // case 'contact':
      //   result.class = Service.ContactSensor;
      //   break;
      default:
        throw new Error(`Unsupported service type: ${serviceType}`);
    }

    return result;
  }
}
