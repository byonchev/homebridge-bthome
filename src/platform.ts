import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { BTHomeAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { BluetoothScanner } from './bluetooth/index.js';
import { BTHomeDevice } from './bthome/index.js';
import { BluetoothDevice } from './bluetooth/types.js';

export class BTHomePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

  private readonly scanner : BluetoothScanner;
  private readonly handles: Map<string, BTHomeAccessory> = new Map();

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.scanner = new BluetoothScanner(BTHomeDevice.UUID);

    this.log.debug('Finished initializing platform:', this.config.platform);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');

      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.accessories.set(accessory.UUID, accessory);
  }

  async discoverDevices() {
    try {
      this.scanner.onDiscover(this.onDeviceDiscovered.bind(this));

      await this.scanner.start();
    } catch (error) {
      this.log.error('Failed to initialize bluetooth scanner', error);
    }
  }

  private onDeviceDiscovered(device: BluetoothDevice) {
    const mac = device.mac;

    this.log.debug('Discovered device: ' + mac);

    const config = this.getDeviceConfiguration(mac);
    if (!config) {
      this.log.debug('Skipping not configured device: ', mac);
      return;
    }

    const uuid = this.api.hap.uuid.generate(mac);

    let accessory = this.accessories.get(uuid);

    if (accessory && !this.handles.has(uuid)) {
      this.log.info('Restoring existing accessory from cache:', accessory.displayName);

      accessory.context.device = new BTHomeDevice(mac, config.encryptionKey, device.serviceData);

      this.handles.set(uuid, new BTHomeAccessory(this, accessory));
    }

    if (!accessory) {
      this.log.info('Adding new accessory:', device.name);

      accessory = new this.api.platformAccessory(device.name, uuid);
      accessory.context.device = new BTHomeDevice(mac, config.encryptionKey, device.serviceData);

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

      this.discoveredCacheUUIDs.push(uuid);
      this.handles.set(uuid, new BTHomeAccessory(this, accessory));
      this.accessories.set(accessory.UUID, accessory);
    }

    accessory.context.device.update(device.serviceData);

  }

  private getDeviceConfiguration(mac: string) {
    if (!this.config.devices) {
      this.log.warn('There are no configured BTHome devices');

      return null;
    }

    for (const config of this.config.devices) {
      if (config.mac.toLowerCase() === mac.toLowerCase()) {
        return config;
      }
    }

    return null;
  }
}
