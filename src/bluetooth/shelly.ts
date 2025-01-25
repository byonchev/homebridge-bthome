import { ManufacturerData } from './types';

function decodeModelName(identifier: number) : (string | undefined) {
  switch (identifier) {
  case 0x0001:
    return 'Shelly BLU Button1';
  case 0x0002:
    return 'Shelly BLU DoorWindow';
  case 0x0003:
    return 'Shelly BLU HT';
  case 0x0005:
    return 'Shelly BLU Motion';
  case 0x0006:
    return 'Shelly BLU Wall Switch 4';
  case 0x0007:
    return 'Shelly BLU RC Button 4';
  case 0x0008:
    return 'Shelly BLU TRV';
  }
}

export function decodeShellyManufacturerData(data: Buffer) : ManufacturerData {
  const result : ManufacturerData = { manufacturer: 'Shelly' };

  let offset = 2;
  while (offset < data.length) {
    const blockType = data[offset];

    switch (blockType) {
    case 0x01:
      offset += 3;
      break;
    case 0x0A:
      offset += 7;
      break;
    case 0x0B:
      result.model = decodeModelName(data.readUInt16LE(offset + 1));
      offset += 3;
      break;
    }
  }

  return result;
}