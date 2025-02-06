export type BluetoothDevice = {
    name: string,
    mac: string,
    serviceData: Buffer,
    manufacturerData: ManufacturerData
};

export type ManufacturerData = {
    manufacturer?: string,
    model? : string,
    serialNumber? : string,
    mac?: string
};

export class BluetoothError extends Error {}