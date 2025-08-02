export type BTHomeSensorData = {
  packetId?: number;
  firmwareVersion?: string;
  counter?: number;
  temperature?: number;
  humidity?: number;
  battery?: number;
  button?: ButtonEvent;
  illuminance?: number;
  motionDetected?: boolean;
  contactDetected?: boolean;
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
