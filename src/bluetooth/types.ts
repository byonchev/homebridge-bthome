export type BluetoothDevice = {
    name: string,
    mac: string,
    serviceData: Buffer
};

export class BluetoothError extends Error {}