import crypto from 'crypto';
import { EventEmitter } from 'events';

import { BTHomeSensorData, BTHomeDecryptionError, BTHomeDecodingError, ButtonEvent } from './types.js';
import { wrapError } from '../util/errors.js';
import { ManufacturerData } from '../bluetooth/types.js';

type DecryptionResult = {
  data: Buffer,
  counter: number
};

export class BTHomeDevice {
  public static readonly UUID = 'FCD2';

  private static readonly UUID_LE = Buffer.from(BTHomeDevice.UUID, 'hex').reverse();
  private static readonly MAX_COUNTER_VALUE = 4294967295;
  private static readonly UPDATE_EVENT = 'update';

  private readonly mac: Buffer;
  private readonly manufacturerData: ManufacturerData;
  private readonly encryptionKey?: Buffer;
  private readonly events : EventEmitter = new EventEmitter();

  private lastSensorData?: BTHomeSensorData;  

  constructor(mac: string, manufacturerData : ManufacturerData, encryptionKey?: string, initialPayload?: Buffer) {
    this.mac = Buffer.from(mac.replaceAll(':', ''), 'hex');
    this.manufacturerData = manufacturerData;
    this.encryptionKey = encryptionKey?.length ? Buffer.from(encryptionKey, 'hex') : undefined;

    if (initialPayload) {
      this.update(initialPayload);
    }
  }

  update(payload: Buffer) {
    const newSensorData = this.decodePayload(payload);

    // Deduplicate repeated events if id is present
    if (this.lastSensorData?.id && this.lastSensorData.id === newSensorData.id) {
      return;
    }

    this.lastSensorData = newSensorData;

    this.events.emit(BTHomeDevice.UPDATE_EVENT, newSensorData);
  }

  onUpdate(callback: (data: BTHomeSensorData) => void) {
    this.events.on(BTHomeDevice.UPDATE_EVENT, callback);
  }

  getSensorData() : BTHomeSensorData | null {
    if (!this.lastSensorData) {
      return null;
    }

    return Object.assign({}, this.lastSensorData);
  }

  getMACAddress() : string {
    return this.mac.toString('hex');
  }

  getManufacturerData() : ManufacturerData {
    return Object.assign({}, this.manufacturerData);
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
      throw new BTHomeDecryptionError('Reused previous counter value in encrypted payload. Possible replay attack');
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
      throw wrapError(error, BTHomeDecryptionError, 'Unknown decryption error');    
    }
  }

  private decodeSensorData(data: Buffer): BTHomeSensorData {
    const result: BTHomeSensorData = {};

    let offset = 0;

    while (offset < data.length) {
      const objectId = data[offset];

      switch (objectId) {
      // ID
      case 0x00:
        result.id = data.readUInt8(offset + 1);
        offset += 2;
        break;

      // Firmware version
      case 0xF1:
        result.firmwareVersion = `${data[offset+4]}.${data[offset+3]}.${data[offset+2]}.${data[offset+1]}`;
        offset += 5;
        break;
      case 0xF2:
        result.firmwareVersion = `${data[offset+3]}.${data[offset+2]}.${data[offset+1]}`;
        offset += 4;
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

      // Button
      case 0x3A:
        result.button = this.decodeButtonEvent(data.readUint8(offset + 1));
        offset += 2;
        break;

      // Illuminance
      case 0x05:
        result.illuminance = data[offset + 1] | (data[offset + 2] << 8) | (data[offset + 3] << 16);
        offset += 4;
        break;

      // Motion
      case 0x21:
        result.motionDetected = (data.readUint8(offset + 1) === 1);
        offset += 2;
        break;

      // Not implemented
      case 0x09:
      case 0x2F:
      case 0x59:
      case 0x46:
      case 0x15:
      case 0x16:
      case 0x17:
      case 0x18:
      case 0x19:
      case 0x1A:
      case 0x1B:
      case 0x1C:
      case 0x0F:
      case 0x1D:
      case 0x1E:
      case 0x1F:
      case 0x20:
      case 0x22:
      case 0x23:
      case 0x11:
      case 0x24:
      case 0x10:
      case 0x25:
      case 0x26:
      case 0x27:
      case 0x28:
      case 0x29:
      case 0x2A:
      case 0x2B:
      case 0x2C:
      case 0x2D:
        offset += 2;
        break;
      case 0x06:
      case 0x07:
      case 0x08:
      case 0x0C:
      case 0x0D:
      case 0x0E:
      case 0x13:
      case 0x14:
      case 0x3D:
      case 0x3F:
      case 0x40:
      case 0x41:
      case 0x43:
      case 0x47:
      case 0x48:
      case 0x49:
      case 0x4A:
      case 0x51:
      case 0x52:
      case 0x5A:
      case 0x5D:
      case 0xF0:
        offset += 3;
        break;
      case 0x42:
      case 0x0A:
      case 0x0B:
      case 0x04:
      case 0x4B:
      case 0x3C:
        offset += 4;
        break;
      case 0x3E:
      case 0x4C:
      case 0x4D:
      case 0x4E:
      case 0x4F:
      case 0x50:
      case 0x5B:
      case 0x5C:
      case 0x55:
        offset += 5;
        break;
      case 0x53:
      case 0x54:
        offset += data.readUint8(offset + 1) + 2;
        break;
      default:
        throw new BTHomeDecodingError('Unsupported object id in payload: 0x' + objectId.toString(16));
      }
    }

    return result;
  }

  private decodeButtonEvent(state: number) {
    switch(state) {
    case 0x00:
      return ButtonEvent.None;
    case 0x01:
      return ButtonEvent.SinglePress;
    case 0x02:
      return ButtonEvent.DoublePress;
    case 0x03:
      return ButtonEvent.TriplePress;
    case 0x04:
      return ButtonEvent.LongPress;
    case 0x05:
      return ButtonEvent.LongDoublePress;
    case 0x06:
      return ButtonEvent.LongTriplePress;
    case 0x80:
    case 0xFE:
      return ButtonEvent.HoldPress;
    default:
      throw new BTHomeDecodingError('Unsupported button event: 0x' + state.toString(16));
    }
  }
}