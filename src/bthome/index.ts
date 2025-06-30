import crypto from 'crypto';
import { EventEmitter } from 'events';

import { BTHomeSensorData, BTHomeDecryptionError, BTHomeDecodingError, ButtonEvent } from './types.js';
import { wrapError } from '../util/errors.js';
import { ManufacturerData } from '../bluetooth/types.js';
import { Logger } from 'homebridge';

type DecryptionResult = {
  data: Buffer;
  counter: number;
};

export class BTHomeDevice {
  public static readonly UUID = 'FCD2';

  private static readonly UUID_LE = Buffer.from(BTHomeDevice.UUID, 'hex').reverse();
  private static readonly MAX_COUNTER_VALUE = 4294967295;
  private static readonly UPDATE_EVENT = 'update';

  private readonly mac: Buffer;
  private readonly manufacturerData: ManufacturerData;
  private readonly encryptionKey?: Buffer;
  private readonly events: EventEmitter = new EventEmitter();
  private readonly log: Logger;

  private lastSensorData?: BTHomeSensorData;

  constructor(mac: string, manufacturerData: ManufacturerData, log: Logger, encryptionKey?: string, payload?: Buffer) {
    this.log = log;
    this.mac = Buffer.from(mac.replaceAll(':', ''), 'hex');
    this.manufacturerData = manufacturerData;
    this.encryptionKey = encryptionKey?.length ? Buffer.from(encryptionKey, 'hex') : undefined;

    if (payload) {
      this.update(payload);
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

  getSensorData(): BTHomeSensorData | null {
    if (!this.lastSensorData) {
      return null;
    }

    return Object.assign({}, this.lastSensorData);
  }

  getAddress(separator: string = ':'): string {
    const mac = this.mac.toString('hex');

    return mac.match(/.{1,2}/g)?.join(separator) || mac;
  }

  getManufacturerData(): ManufacturerData {
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

    this.log.debug(`[${this.getAddress()}] Decoding BTHome payload: ${data.toString('hex')}`);

    while (offset < data.length) {
      const objectId = data[offset];

      switch (objectId) {
        // ID
        case 0x00:
          result.id = data.readUInt8(offset + 1);
          offset += 2;
          break;

        // Firmware version
        case 0xf1:
          result.firmwareVersion = `${data[offset + 4]}.${data[offset + 3]}.${data[offset + 2]}.${data[offset + 1]}`;
          offset += 5;
          break;
        case 0xf2:
          result.firmwareVersion = `${data[offset + 3]}.${data[offset + 2]}.${data[offset + 1]}`;
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
        case 0x2e:
          result.humidity = data.readUInt8(offset + 1);
          offset += 2;
          break;

        // Button
        case 0x3a:
          result.button = this.decodeButtonEvent(data.readUint8(offset + 1));
          offset += 2;
          break;

        // Illuminance
        case 0x05:
          result.illuminance = (data[offset + 1] | (data[offset + 2] << 8) | (data[offset + 3] << 16)) / 100;
          offset += 4;
          break;

        // Motion
        case 0x21:
          result.motionDetected = data.readUint8(offset + 1) === 1;
          offset += 2;
          break;

        // Contact
        case 0x1a:
        case 0x1b:
        case 0x2d:
          result.contactDetected = data.readUint8(offset + 1) === 1;
          offset += 2;
          break;

        // Not implemented
        case 0x09:
        case 0x2f:
        case 0x59:
        case 0x46:
        case 0x15:
        case 0x16:
        case 0x17:
        case 0x18:
        case 0x19:
        case 0x1c:
        case 0x0f:
        case 0x1d:
        case 0x1e:
        case 0x1f:
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
        case 0x2a:
        case 0x2b:
        case 0x2c:
          offset += 2;
          break;
        case 0x06:
        case 0x07:
        case 0x08:
        case 0x0c:
        case 0x0d:
        case 0x0e:
        case 0x13:
        case 0x14:
        case 0x3d:
        case 0x3f:
        case 0x40:
        case 0x41:
        case 0x43:
        case 0x47:
        case 0x48:
        case 0x49:
        case 0x4a:
        case 0x51:
        case 0x52:
        case 0x5a:
        case 0x5d:
        case 0xf0:
          offset += 3;
          break;
        case 0x42:
        case 0x0a:
        case 0x0b:
        case 0x04:
        case 0x4b:
        case 0x3c:
          offset += 4;
          break;
        case 0x3e:
        case 0x4c:
        case 0x4d:
        case 0x4e:
        case 0x4f:
        case 0x50:
        case 0x5b:
        case 0x5c:
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

  private decodeButtonEvent(state: number): ButtonEvent {
    switch (state) {
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
      case 0xfe:
        return ButtonEvent.HoldPress;
      default:
        throw new BTHomeDecodingError('Unsupported button event: 0x' + state.toString(16));
    }
  }
}
