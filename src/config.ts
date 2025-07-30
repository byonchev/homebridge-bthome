import type { PlatformConfig } from 'homebridge';

export type ServiceType =
  | 'information'
  | 'temperature'
  | 'humidity'
  | 'battery'
  | 'illuminance'
  | 'button'
  | 'motion'
  | 'contact';

export interface ServiceOptions {
  lowBatteryThreshold?: number;
  position?: number;
}

export interface ServiceConfig {
  type: ServiceType;
  options?: ServiceOptions;
}

export interface ServicesConfig {
  autoDiscovery?: boolean;
  enabled?: ServiceConfig[];
}

export interface DeviceConfig {
  name?: string;
  mac: string;
  encryptionKey?: string;
  services?: ServicesConfig;
}

export interface BluetoothConfig {
  powerOnTimeout?: number;
}

export interface BTHomePlatformConfig extends PlatformConfig {
  devices?: DeviceConfig[];
  bluetooth?: BluetoothConfig;
}
