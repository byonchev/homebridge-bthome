import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, Service } from 'homebridge';

import { BTHomeAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { BluetoothScanner } from './bluetooth/index.js';
import { BTHomeDevice } from './bthome/index.js';
import { BluetoothDevice } from './bluetooth/types.js';
import { BTHomePlatformConfig, DeviceConfig } from './config.js';

export class BTHomePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

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

      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    const devices = this.config.devices || [];

    for (const device of devices) {
      const deviceUUID = this.generateUUID(device.mac);

      if (deviceUUID !== accessory.UUID) {
        continue;
      }

      this.setAccessoryContext(accessory, device, accessory.context.device);
      return;
    }

    this.log.info('Removing stale accessory:', accessory.displayName);
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
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
      this.log.error('Failed to initialize bluetooth scanner:', error);
    }
  }

  private onDeviceDiscovered(device: BluetoothDevice) {
    const mac = device.mac;

    this.log.debug('Device with MAC address ' + mac + ' is advertising');

    const config = this.getDeviceConfiguration(mac);
    if (!config) {
      this.log.debug('Skipping not configured device:', mac);
      return;
    }

    const uuid = this.generateUUID(mac);

    let accessory = this.accessories.get(uuid);

    if (accessory && !this.handles.has(uuid)) {
      this.log.info('Restoring existing accessory from cache:', accessory.displayName);

      this.setAccessoryContext(accessory, config, device);

      this.handles.set(uuid, new BTHomeAccessory(this, accessory));
    }

    if (!accessory) {
      const name = (config.name || device.name).replace(/[^a-zA-Z0-9\s']/g, '');

      this.log.info('Adding new accessory:', name);

      try {
        accessory = new this.api.platformAccessory(name, uuid);
      } catch (error) {
        this.log.error('Failed to create accessory:', error);
        return;
      }

      this.setAccessoryContext(accessory, config, device);

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

      this.discoveredCacheUUIDs.push(uuid);
      this.handles.set(uuid, new BTHomeAccessory(this, accessory));
      this.accessories.set(accessory.UUID, accessory);
    }

    try {
      accessory.context.device.update(device.serviceData);
    } catch (error) {
      this.log.error('Failed to update BTHome device: ', error);
    }
  }

  private getDeviceConfiguration(mac: string): DeviceConfig | undefined {
    if (!this.config.devices) {
      this.log.warn('There are no configured BTHome devices');

      return undefined;
    }

    for (const config of this.config.devices) {
      if (config.mac.toLowerCase() === mac.toLowerCase()) {
        return config;
      }
    }

    return undefined;
  }

  private setAccessoryContext(accessory: PlatformAccessory, config: DeviceConfig, device: BluetoothDevice) {
    accessory.context.device = new BTHomeDevice(
      device.mac,
      device.manufacturerData,
      this.log,
      config.encryptionKey,
      device.serviceData,
    );

    accessory.context.services = config.services || { autoDiscovery: true };
  }

  private generateUUID(mac: string): string {
    return this.api.hap.uuid.generate(mac);
  }
}
