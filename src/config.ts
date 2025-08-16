import type { PlatformConfig } from 'homebridge';

export type ServiceType =
  | 'information'
  | 'temperature'
  | 'humidity'
  | 'battery'
  | 'illuminance'
  | 'button'
  | 'motion'
  | 'contact'
  | 'airQuality';

export interface AirQualityBreakpoints {
  excellent: number;
  good: number;
  fair: number;
  inferior: number;
}

export interface ServicesConfig {
  autoDiscovery?: boolean;
  enabled?: ServiceType[];
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

export interface ServiceOptions {
  battery?: {
    lowBatteryThreshold?: number;
  };
  airQuality?: {
    pm25Breakpoints?: AirQualityBreakpoints;
    pm10Breakpoints?: AirQualityBreakpoints;
    vocBreakpoints?: AirQualityBreakpoints;
  };
}

export interface BTHomePlatformConfig extends PlatformConfig {
  devices?: DeviceConfig[];
  options?: ServiceOptions;
  bluetooth?: BluetoothConfig;
}
