export type BTHomeSensorData = {
    id?: number,
    counter?: number,
    temperature?: number,
    humidity?: number,
    battery?: number
};

export class BTHomeDecryptionError extends Error {}