import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, Service } from 'homebridge';
import { formatError } from 'homebridge-lib';

import { BTHomeAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { BluetoothScanner } from './bluetooth/index.js';
import { BTHomeDevice } from './bthome/index.js';
import { BluetoothAdvertisment } from './bluetooth/types.js';
import { BTHomePlatformConfig, DeviceConfig } from './config.js';

export class BTHomePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: Map<string, PlatformAccessory> = new Map();

  private readonly staleAccessories: PlatformAccessory[] = [];

  private readonly scanner: BluetoothScanner;
  private readonly handles: Map<string, BTHomeAccessory> = new Map();

  constructor(
    public readonly log: Logging,
    public readonly config: BTHomePlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.scanner = new BluetoothScanner(BTHomeDevice.UUID, log);

    this.log.debug('Finished initializing platform:', this.config.platform);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');

      this.removeStaleAccessories();
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    let mac = accessory.context.device?.mac;

    if (typeof mac === 'object' && 'data' in mac) {
      mac = Buffer.from(accessory.context.device.mac.data).toString('hex');
    }

    const config = this.getDeviceConfiguration(mac || '');

    if (!config) {
      this.staleAccessories.push(accessory);
    }

    this.accessories.set(accessory.UUID, accessory);
  }

  removeStaleAccessories() {
    if (this.staleAccessories.length === 0) {
      return;
    }

    this.staleAccessories.forEach(accessory => {
      this.log.info('Removing stale accessory:', accessory.displayName);
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.delete(accessory.UUID);
    });
  }

  async discoverDevices() {
    if (!this.config.devices || this.config.devices.length === 0) {
      this.log.warn('No devices configured');
      return;
    }

    try {
      await this.scanner.start(this.config.bluetooth?.powerOnTimeout);

      this.scanner.onDiscover(this.onDeviceDiscovered.bind(this));

      this.log.info('Bluetooth scanner started');
    } catch (error) {
      this.log.error('Failed to initialize bluetooth scanner.', formatError(error));
    }
  }

  private onDeviceDiscovered(advertisment: BluetoothAdvertisment) {
    this.log.debug(`[${advertisment.mac}] Device is advertising`);

    const config = this.getDeviceConfiguration(advertisment.mac);
    if (!config) {
      this.log.debug(`[${advertisment.mac}] Skipping not configured device`);
      return;
    }

    const uuid = this.generateUUID(advertisment.mac);

    let accessory = this.accessories.get(uuid);

    if (accessory && !this.handles.has(uuid)) {
      this.log.info('Restoring existing accessory from cache:', accessory.displayName);

      this.setAccessoryContext(accessory, config, advertisment);

      this.handles.set(uuid, new BTHomeAccessory(this, accessory));
    }

    if (!accessory) {
      const name = (config.name || advertisment.name).replace(/[^a-zA-Z0-9\s']/g, '');

      this.log.info('Adding new accessory:', name);

      try {
        accessory = new this.api.platformAccessory(name, uuid);
      } catch (error) {
        this.log.error('Failed to create accessory.', formatError(error));
        return;
      }

      this.setAccessoryContext(accessory, config, advertisment);

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

      this.handles.set(uuid, new BTHomeAccessory(this, accessory));
      this.accessories.set(accessory.UUID, accessory);
    }

    accessory.context.device.update(advertisment.serviceData);
  }

  private getDeviceConfiguration(mac: string): DeviceConfig | undefined {
    if (!this.config.devices) {
      this.log.warn('There are no configured BTHome devices');

      return undefined;
    }

    for (const config of this.config.devices) {
      if (config.mac.replaceAll(':', '').toLocaleLowerCase() === mac.replaceAll(':', '').toLocaleLowerCase()) {
        return config;
      }
    }

    return undefined;
  }

  private setAccessoryContext(accessory: PlatformAccessory, config: DeviceConfig, advertisment: BluetoothAdvertisment) {
    accessory.context.device = new BTHomeDevice(advertisment, this.log, config.encryptionKey);
    accessory.context.config = config;
  }

  private generateUUID(mac: string): string {
    return this.api.hap.uuid.generate(mac.toLocaleLowerCase());
  }
}
