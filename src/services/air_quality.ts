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

  public static matches(sensorData: BTHomeSensorData): number {
    const pm25Densities = (sensorData.pm25Density ?? []).length;
    const pm10Densities = (sensorData.pm10Density ?? []).length;
    const vocDensities = (sensorData.vocDensity ?? []).length;

    return Math.max(pm25Densities, pm10Densities, vocDensities);
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

    const pm25Density = this.getMeasurement(sensorData, 'pm25Density');
    const pm10Density = this.getMeasurement(sensorData, 'pm10Density');
    const vocDensity = this.getMeasurement(sensorData, 'vocDensity');

    if (pm25Density !== undefined) {
      this.service.getCharacteristic(this.Characteristic.PM2_5Density).updateValue(pm25Density);

      airQualityIndicators.push(this.calculateAirQuality(pm25Density, pm25Breakpoints));
    }

    if (pm10Density !== undefined) {
      this.service.getCharacteristic(this.Characteristic.PM10Density).updateValue(pm10Density);

      airQualityIndicators.push(this.calculateAirQuality(pm10Density, pm10Breakpoints));
    }

    if (vocDensity !== undefined) {
      this.service.getCharacteristic(this.Characteristic.VOCDensity).updateValue(vocDensity);

      airQualityIndicators.push(this.calculateAirQuality(vocDensity, vocBreakpoints));
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
