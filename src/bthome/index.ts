import crypto from 'crypto';
import { EventEmitter } from 'events';

import { BTHomeSensorData, BTHomeDecryptionError } from './types.js';

type DecryptionResult = {
  data: Buffer,
  counter: number
};

export class BTHomeDevice {
  public static readonly UUID = Buffer.from('FCD2', 'hex');

  private static readonly UUID_LE = Buffer.from(BTHomeDevice.UUID).reverse();
  private static readonly MAX_COUNTER_VALUE = 4294967295;
  private static readonly UPDATE_EVENT = 'update';

  private readonly mac: Buffer;
  private readonly encryptionKey?: Buffer;
  private readonly events: EventEmitter = new EventEmitter();

  private lastSensorData?: BTHomeSensorData;

  constructor(mac: string, encryptionKey?: string) {
    this.mac = Buffer.from(mac.replaceAll(':', ''), 'hex');
    this.encryptionKey = encryptionKey?.length ? Buffer.from(encryptionKey, 'hex') : undefined;
  }

  update(payload: Buffer) {
    this.lastSensorData = this.decodePayload(payload);
    this.events.emit(BTHomeDevice.UPDATE_EVENT, this.lastSensorData);
  }

  onUpdate(callback: (data: BTHomeSensorData) => void) {
    return this.events.on(BTHomeDevice.UPDATE_EVENT, callback);
  }

  private decodePayload(payload: Buffer): BTHomeSensorData {
    const flags = payload.readUInt8(0);
    const isEncrypted = (flags & 0x01) !== 0;

    let result: BTHomeSensorData;

    if (isEncrypted) {
      const decryptionResult = this.decryptPayload(flags, payload);

      result = this.decodeSensorData(decryptionResult.data);
      result.counter = decryptionResult.counter;
    } else {
      result = this.decodeSensorData(payload.subarray(1));
    }

    return result;
  }

  private decryptPayload(flags: number, payload: Buffer): DecryptionResult {
    if (!this.encryptionKey) {
      throw new BTHomeDecryptionError('Encrypted payload, but no encryption key provided');
    }

    if (payload.length < 10) {
      throw new BTHomeDecryptionError('Invalid payload');
    }

    const cipherText = payload.subarray(1, -8);
    const counter = payload.subarray(-8, -4);
    const mic = payload.subarray(-4);

    const previousCounterValue = this.lastSensorData?.counter || -1;
    const newCounterValue = counter.readUint32LE();

    if (previousCounterValue < BTHomeDevice.MAX_COUNTER_VALUE && newCounterValue < previousCounterValue) {
      throw new BTHomeDecryptionError('Reused previous counter value in encrypted payload. Possible replay attack.');
    }

    const nonce = Buffer.concat([this.mac, BTHomeDevice.UUID_LE, Buffer.from([flags]), counter]);

    try {
      const decipher = crypto.createDecipheriv('aes-128-ccm', this.encryptionKey, nonce, { authTagLength: 4 });

      decipher.setAuthTag(mic);

      return {
        data: Buffer.concat([decipher.update(cipherText), decipher.final()]),
        counter: counter.readUint32LE(),
      };
    } catch (error) {
      let message = 'Unknown decryption error';

      if (error instanceof Error) {
        message = error.message;
      }

      throw new BTHomeDecryptionError(message);
    }
  }

  private decodeSensorData(data: Buffer): BTHomeSensorData {
    const result: BTHomeSensorData = {};

    let offset = 0;

    while (offset < data.length) {
      switch (data[offset]) {
      // ID
      case 0x00:
        result.id = data.readUInt8(offset + 1);
        offset += 2;
        break;

      // Battery
      case 0x01:
        result.battery = data.readUInt8(offset + 1);
        offset += 2;
        break;

      // Temperature
      case 0x02:
        result.temperature = data.readInt16LE(offset + 1) / 100;
        offset += 3;
        break;
      case 0x45:
        result.temperature = data.readInt16LE(offset + 1) / 10;
        offset += 3;
        break;
      case 0x58:
        result.temperature = (data.readInt8(offset + 1) * 100) / 35;
        offset += 2;
        break;
      case 0x57:
        result.temperature = data.readInt8(offset + 1);
        offset += 2;
        break;

      // Humidity
      case 0x03:
        result.humidity = data.readUInt16LE(offset + 1) / 100;
        offset += 3;
        break;
      case 0x2E:
        result.humidity = data.readUInt8(offset + 1);
        offset += 2;
        break;
      }
    }

    return result;
  }
}