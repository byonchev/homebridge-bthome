export type BluetoothDevice = {
    mac: string,
    serviceData: Buffer
};

export class BluetoothError extends Error {}