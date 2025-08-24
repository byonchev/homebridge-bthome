import crypto from 'crypto';
import { EventEmitter } from 'events';

import { BTHomeSensorData, BTHomeDecryptionError, BTHomeDecodingError, ButtonEvent } from './types.js';
import { wrapError } from '../util/errors.js';
import { BluetoothAdvertisment, ManufacturerData } from '../bluetooth/types.js';
import { Logger } from 'homebridge';
import { formatError } from 'homebridge-lib';

type DecryptionResult = {
  data: Buffer;
  counter: number;
};

export class BTHomeDevice {
  public static readonly UUID = 'FCD2';

  private static readonly UUID_LE = Buffer.from(BTHomeDevice.UUID, 'hex').reverse();
  private static readonly MAX_COUNTER_VALUE = 4294967295;
  private static readonly UPDATE_EVENT = 'update';

  private readonly mac: string;
  private readonly manufacturerData: ManufacturerData;
  private readonly encryptionKey?: Buffer;
  private readonly events: EventEmitter = new EventEmitter();
  private readonly log: Logger;

  private lastPacketId?: number;
  private lastCounterValue?: number;

  constructor(advertisment: BluetoothAdvertisment, log: Logger, encryptionKey?: string) {
    this.log = log;
    this.mac = advertisment.mac;
    this.manufacturerData = advertisment.manufacturerData;
    this.encryptionKey = encryptionKey?.length ? Buffer.from(encryptionKey, 'hex') : undefined;
  }

  public update(serviceData: Buffer) {
    try {
      const sensorData = this.decodeServiceData(serviceData);

      // Deduplicate repeated events if packetId is present
      if (this.lastPacketId !== undefined && this.lastPacketId === sensorData.packetId) {
        this.log.debug(`[${this.mac}] Ignoring repeated data with packetId ${sensorData.packetId}`);

        return;
      }

      this.lastPacketId = sensorData.packetId;
      this.lastCounterValue = sensorData.counter;

      this.log.debug(`[${this.mac}] Received BTHome sensor data:\n${JSON.stringify(sensorData, null, 2)}`);

      this.events.emit(BTHomeDevice.UPDATE_EVENT, sensorData);
    } catch (error) {
      this.log.error(`[${this.mac}] Failed to update BTHome device.`, formatError(error));
    }
  }

  public onUpdate(callback: (data: BTHomeSensorData) => void) {
    this.events.on(BTHomeDevice.UPDATE_EVENT, callback);
  }

  public getManufacturerData(): ManufacturerData {
    return Object.assign({}, this.manufacturerData);
  }

  private decodeServiceData(serviceData: Buffer): BTHomeSensorData {
    const flags = serviceData.readUInt8(0);
    const version = (flags >> 5) & 0x07;

    if (version !== 2) {
      throw new BTHomeDecodingError('Unsupported payload version');
    }

    const isEncrypted = (flags & 0x01) !== 0;

    let result: BTHomeSensorData;

    if (isEncrypted) {
      const decryptionResult = this.decryptSensorData(flags, serviceData);

      result = this.decodeSensorData(decryptionResult.data);
      result.counter = decryptionResult.counter;
    } else {
      result = this.decodeSensorData(serviceData.subarray(1));
    }

    return result;
  }

  private decryptSensorData(flags: number, payload: Buffer): DecryptionResult {
    if (!this.encryptionKey) {
      throw new BTHomeDecryptionError('Encrypted payload, but no encryption key provided');
    }

    if (payload.length < 10) {
      throw new BTHomeDecryptionError('Invalid payload');
    }

    const cipherText = payload.subarray(1, -8);
    const counter = payload.subarray(-8, -4);
    const mic = payload.subarray(-4);

    const oldCounterValue = this.lastCounterValue || -1;
    const newCounterValue = counter.readUint32LE();

    if (oldCounterValue < BTHomeDevice.MAX_COUNTER_VALUE && newCounterValue < oldCounterValue) {
      throw new BTHomeDecryptionError('Reused previous counter value in encrypted payload. Possible replay attack');
    }

    const nonce = Buffer.concat([
      Buffer.from(this.mac.replaceAll(':', ''), 'hex'),
      BTHomeDevice.UUID_LE,
      Buffer.from([flags]),
      counter,
    ]);

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

    this.log.debug(`[${this.mac}] Decoding BTHome sensor data: ${data.toString('hex')}`);

    while (offset < data.length) {
      const objectId = data[offset];

      switch (objectId) {
        // Packet ID
        case 0x00:
          result.packetId = data.readUInt8(offset + 1);
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

        // Battery characteristics
        case 0x01:
          this.pushMeasurement(result, 'batteryLevel', data.readUInt8(offset + 1));
          offset += 2;
          break;
        case 0x15:
          this.pushMeasurement(result, 'batteryLow', this.readBool(data, offset + 1));
          offset += 2;
          break;
        case 0x16:
          this.pushMeasurement(result, 'batteryCharging', this.readBool(data, offset + 1));
          offset += 2;
          break;

        // Temperature (°C)
        case 0x02:
          this.pushMeasurement(result, 'temperature', data.readInt16LE(offset + 1) / 100);
          offset += 3;
          break;
        case 0x45:
          this.pushMeasurement(result, 'temperature', data.readInt16LE(offset + 1) / 10);
          offset += 3;
          break;
        case 0x58:
          this.pushMeasurement(result, 'temperature', (data.readInt8(offset + 1) * 35) / 100);
          offset += 2;
          break;
        case 0x57:
          this.pushMeasurement(result, 'temperature', data.readInt8(offset + 1));
          offset += 2;
          break;

        // Humidity (%)
        case 0x03:
          this.pushMeasurement(result, 'humidity', data.readUInt16LE(offset + 1) / 100);
          offset += 3;
          break;
        case 0x2e:
          this.pushMeasurement(result, 'humidity', data.readUInt8(offset + 1));
          offset += 2;
          break;

        // Button event
        case 0x3a:
          this.pushMeasurement(result, 'button', this.decodeButtonEvent(data.readUint8(offset + 1)));
          offset += 2;
          break;

        // Illuminance level (lux)
        case 0x05:
          this.pushMeasurement(result, 'illuminance', this.readUInt24LE(data, offset + 1) / 100);
          offset += 4;
          break;

        // Motion detected
        case 0x21:
          this.pushMeasurement(result, 'motionDetected', this.readBool(data, offset + 1));
          offset += 2;
          break;

        // Contact detected
        case 0x1a:
        case 0x1b:
        case 0x2d:
          this.pushMeasurement(result, 'contactDetected', !this.readBool(data, offset + 1));
          offset += 2;
          break;

        // Occupancy detected
        case 0x23:
          this.pushMeasurement(result, 'occupancyDetected', this.readBool(data, offset + 1));
          offset += 2;
          break;

        // Carbon monoxide detected
        case 0x17:
          this.pushMeasurement(result, 'carbonMonoxideDetected', this.readBool(data, offset + 1));
          offset += 2;
          break;

        // Smoke detected
        case 0x29:
          this.pushMeasurement(result, 'smokeDetected', this.readBool(data, offset + 1));
          offset += 2;
          break;

        // Carbon dioxide concentration (ppm)
        case 0x12:
          this.pushMeasurement(result, 'carbonDioxideLevel', data.readUInt16LE(offset + 1));
          offset += 3;
          break;

        // Particulate matter 2.5uM (ug/m3)
        case 0x0d:
          this.pushMeasurement(result, 'pm25Density', data.readUInt16LE(offset + 1));
          offset += 3;
          break;

        // Particulate matter 10uM (ug/m3)
        case 0x0e:
          this.pushMeasurement(result, 'pm10Density', data.readUInt16LE(offset + 1));
          offset += 3;
          break;

        // Volatile organic compounds (ug/m3)
        case 0x13:
          this.pushMeasurement(result, 'vocDensity', data.readUInt16LE(offset + 1));
          offset += 3;
          break;

        // Not implemented
        case 0x09:
        case 0x0f:
        case 0x10:
        case 0x11:
        case 0x18:
        case 0x19:
        case 0x1c:
        case 0x1d:
        case 0x1e:
        case 0x1f:
        case 0x20:
        case 0x22:
        case 0x24:
        case 0x25:
        case 0x26:
        case 0x27:
        case 0x28:
        case 0x2a:
        case 0x2b:
        case 0x2c:
        case 0x2f:
        case 0x46:
        case 0x59:
        case 0x60:
          offset += 2;
          break;
        case 0x06:
        case 0x07:
        case 0x08:
        case 0x0c:
        case 0x14:
        case 0x3d:
        case 0x3f:
        case 0x40:
        case 0x41:
        case 0x43:
        case 0x44:
        case 0x47:
        case 0x48:
        case 0x49:
        case 0x4a:
        case 0x51:
        case 0x52:
        case 0x56:
        case 0x5a:
        case 0x5d:
        case 0x5e:
        case 0x5f:
        case 0xf0:
          offset += 3;
          break;
        case 0x04:
        case 0x0a:
        case 0x0b:
        case 0x3c:
        case 0x42:
        case 0x4b:
          offset += 4;
          break;
        case 0x3e:
        case 0x4c:
        case 0x4d:
        case 0x4e:
        case 0x4f:
        case 0x50:
        case 0x55:
        case 0x5b:
        case 0x5c:
          offset += 5;
          break;
        case 0x53:
        case 0x54:
          offset += data.readUint8(offset + 1) + 2;
          break;
        default:
          this.log.warn(
            `[${this.mac}] ` +
              `Unsupported object id 0x${objectId.toString(16)} at offset ${offset}. ` +
              `The rest of the payload will be ignored.`,
          );

          return result;
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
        this.log.warn(`[${this.mac}] Unsupported button event: 0x${state.toString(16)}`);

        return ButtonEvent.None;
    }
  }

  private readUInt24LE(data: Buffer, offset: number): number {
    return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
  }

  private readBool(data: Buffer, offset: number): boolean {
    return data.readUint8(offset) === 1;
  }

  private pushMeasurement<K extends keyof BTHomeSensorData>(
    data: BTHomeSensorData,
    key: K,
    value: BTHomeSensorData[K] extends (infer U)[] | undefined ? U : never,
  ) {
    if (data[key] === undefined) {
      (data[key] as unknown) = [];
    }

    (data[key] as unknown as unknown[]).push(value);
  }
}
