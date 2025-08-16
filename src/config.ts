import type { PlatformConfig } from 'homebridge';

export type ServiceType =
  | 'airQuality'
  | 'battery'
  | 'button'
  | 'carbonDioxide'
  | 'carbonMonoxide'
  | 'contact'
  | 'humidity'
  | 'illuminance'
  | 'information'
  | 'motion'
  | 'occupancy'
  | 'smoke'
  | 'temperature';

export interface AirQualityBreakpoints {
  excellent: number;
  good: number;
  fair: number;
  inferior: number;
}

export interface ServicesConfig {
  autoDiscovery?: boolean;
  enabled?: Partial<Record<ServiceType, number>>;
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
  airQuality?: {
    pm25Breakpoints?: AirQualityBreakpoints;
    pm10Breakpoints?: AirQualityBreakpoints;
    vocBreakpoints?: AirQualityBreakpoints;
  };
  battery?: {
    lowBatteryThreshold?: number;
  };
  carbonDioxide?: {
    threshold?: number;
  };
}

export interface BTHomePlatformConfig extends PlatformConfig {
  devices?: DeviceConfig[];
  options?: ServiceOptions;
  bluetooth?: BluetoothConfig;
}
