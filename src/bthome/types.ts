export type BTHomeSensorData = {
  packetId?: number;
  firmwareVersion?: string;
  counter?: number;
  temperature?: number;
  humidity?: number;
  batteryLevel?: number;
  batteryLow?: boolean;
  batteryCharging?: boolean;
  button?: ButtonEvent;
  illuminance?: number;
  motionDetected?: boolean;
  contactDetected?: boolean;
  occupancyDetected?: boolean;
  carbonMonoxideDetected?: boolean;
  smokeDetected?: boolean;
  carbonDioxideLevel?: number;
  vocDensity?: number;
  pm25Density?: number;
  pm10Density?: number;
};

export enum ButtonEvent {
  None,
  SinglePress,
  DoublePress,
  TriplePress,
  LongPress,
  LongDoublePress,
  LongTriplePress,
  HoldPress,
}

export class BTHomeDecryptionError extends Error {}
export class BTHomeDecodingError extends Error {}
