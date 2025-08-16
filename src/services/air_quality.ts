import { BTHomeSensorData } from '../bthome/types.js';
import { AirQualityBreakpoints } from '../config.js';
import { ServiceHandler } from './base.js';

export class AirQualityHandler extends ServiceHandler {
  private static readonly DEFAULT_PM25_BREAKPOINTS: AirQualityBreakpoints = {
    excellent: 15,
    good: 30,
    fair: 55,
    inferior: 110,
  };
  private static readonly DEFAULT_PM10_BREAKPOINTS: AirQualityBreakpoints = {
    excellent: 25,
    good: 50,
    fair: 90,
    inferior: 180,
  };
  private static readonly DEFAULT_VOC_BREAKPOINTS: AirQualityBreakpoints = {
    excellent: 0.3,
    good: 0.5,
    fair: 1,
    inferior: 3,
  };

  public static matches(sensorData: BTHomeSensorData): boolean {
    return (
      sensorData.pm25Density !== undefined ||
      sensorData.pm10Density !== undefined ||
      sensorData.vocDensity !== undefined
    );
  }

  public updateValues(sensorData: BTHomeSensorData) {
    const pm25Breakpoints = {
      ...AirQualityHandler.DEFAULT_PM25_BREAKPOINTS,
      ...this.options?.airQuality?.pm25Breakpoints,
    };
    const pm10Breakpoints = {
      ...AirQualityHandler.DEFAULT_PM10_BREAKPOINTS,
      ...this.options?.airQuality?.pm10Breakpoints,
    };
    const vocBreakpoints = {
      ...AirQualityHandler.DEFAULT_VOC_BREAKPOINTS,
      ...this.options?.airQuality?.vocBreakpoints,
    };

    const airQualityIndicators = [this.Characteristic.AirQuality.UNKNOWN];

    if (sensorData.pm25Density !== undefined) {
      this.service.getCharacteristic(this.Characteristic.PM2_5Density).updateValue(sensorData.pm25Density);

      airQualityIndicators.push(this.calculateAirQuality(sensorData.pm25Density, pm25Breakpoints));
    }

    if (sensorData.pm10Density !== undefined) {
      this.service.getCharacteristic(this.Characteristic.PM10Density).updateValue(sensorData.pm10Density);

      airQualityIndicators.push(this.calculateAirQuality(sensorData.pm10Density, pm10Breakpoints));
    }

    if (sensorData.vocDensity !== undefined) {
      this.service.getCharacteristic(this.Characteristic.VOCDensity).updateValue(sensorData.vocDensity);

      airQualityIndicators.push(this.calculateAirQuality(sensorData.vocDensity, vocBreakpoints));
    }

    const airQuality = Math.max(...airQualityIndicators);

    this.service.getCharacteristic(this.Characteristic.AirQuality).updateValue(airQuality);
  }

  private calculateAirQuality(value: number, breakpoints?: AirQualityBreakpoints): number {
    if (!breakpoints) {
      this.log.warn('Unable to determine air quality - invalid breakpoints provided.');

      return this.Characteristic.AirQuality.UNKNOWN;
    }

    if (value <= breakpoints.excellent) {
      return this.Characteristic.AirQuality.EXCELLENT;
    } else if (value <= breakpoints.good) {
      return this.Characteristic.AirQuality.GOOD;
    } else if (value <= breakpoints.fair) {
      return this.Characteristic.AirQuality.FAIR;
    } else if (value <= breakpoints.inferior) {
      return this.Characteristic.AirQuality.INFERIOR;
    } else {
      return this.Characteristic.AirQuality.POOR;
    }
  }
}
