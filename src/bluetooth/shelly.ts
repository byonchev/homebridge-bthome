import { ManufacturerData } from './types';

function decodeModelName(identifier: number) : (string | undefined) {
  switch (identifier) {
  case 0x0001:
    return 'SBBT-002C';
  case 0x0002:
    return 'SBDW-002C';
  case 0x0003:
    return 'SBHT-003C';
  case 0x0005:
    return 'SBMO-003Z';
  case 0x0006:
    return 'SBBT-004CEU';
  case 0x0007:
    return 'SBBT-004CUS';
  case 0x0008:
    return 'SBTR-001AEU';
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