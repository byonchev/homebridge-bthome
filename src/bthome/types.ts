export type BTHomeSensorData = {
    id?: number,
    counter?: number,
    temperature?: number,
    humidity?: number,
    battery?: number,
    button?: ButtonEvent
};

export enum ButtonEvent {
    None,
    SinglePress,
    DoublePress,
    TriplePress,
    LongPress,
    LongDoublePress,
    LongTriplePress,
    HoldPress
};

export class BTHomeDecryptionError extends Error {}
export class BTHomeDecodingError extends Error {}