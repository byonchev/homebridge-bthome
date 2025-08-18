# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - Unreleased

### Added
- Implement support for multiple measurements of the same sensor type
- Introduce configuration options for enabling/disabling services
- Add support for contact sensors ([#2])
- Add support for air quality measurements (PM2.5, PM10 and VOC)
- Add support for carbon dioxide level monitoring
- Add support for carbon monoxide detection
- Add support for occupancy detection
- Add support for smoke detection
- Add support for battery status monitoring (charging state and low battery warnings)
- Enhance logging with additional debug information

### Security
- Update dependencies to resolve security vulnerabilities

## [1.2.5] - 2025-08-01

### Fixed
- Resolve illuminance sensor issue where zero readings incorrectly fallback to invalid values ([#3])

## [1.2.4] - 2025-07-30

### Added
- Implement Bluetooth initialization timeout ([#5])
- Add additional debug logging for troubleshooting connectivity issues

### Changed
- Enhance README

## [1.2.3] - 2025-07-27

### Fixed
- Correct illuminance value conversion factor from 1 to 0.01 for accurate lux readings ([#1])
- Improve motion detection by properly implementing `setValue` method to ensure HomeKit scenes and automations trigger correctly

## [1.2.2] - 2025-06-17

### Security
- Update dependencies to address potential security vulnerabilities

## [1.2.1] - 2025-06-17

### Security
- Update dependency versions to resolve security issues

## [1.2.0] - 2025-02-06

### Added
- Implement manufacturer data parsing for improved device identification
- Add fallback mechanism to extract MAC addresses from manufacturer data when not available in standard fields

### Changed
- Switch to short model names for Shelly devices

## [1.1.0] - 2025-01-23

### Added
- Implement caching mechanism for sensor values to improve reliability during connection issues
- Add support for illuminance (light) sensors and motion detectors

### Changed
- Improve module loading by dynamically importing noble Bluetooth library to enhance compatibility

## [1.0.4] - 2025-01-21

### Fixed
- Prevent platform initialization when Bluetooth hardware is unavailable to avoid crashes

## [1.0.3] - 2025-01-21

### Changed
- Enhance config schema with display name and platform name fields for better identification

## [1.0.2] - 2025-01-21

### Fixed
- Add support for legacy 0xFE button event code used by older Shelly BLU H&T devices to properly detect hold press actions

## [1.0.1] - 2025-01-21

### Fixed
- Remove problematic Bluetooth scanning termination during initialization that caused connectivity issues on certain platforms

## [1.0.0] - 2025-01-20

### Added
- Implement BTHome protocol payload decoding for compatible sensors
- Create Bluetooth scanning system with advertisement data extraction
- Add support for button press events with deduplication to prevent multiple triggers

[2.0.0]: https://github.com/byonchev/homebridge-bthome/compare/v1.2.5...v2.0.0
[1.2.5]: https://github.com/byonchev/homebridge-bthome/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/byonchev/homebridge-bthome/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/byonchev/homebridge-bthome/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/byonchev/homebridge-bthome/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/byonchev/homebridge-bthome/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/byonchev/homebridge-bthome/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/byonchev/homebridge-bthome/compare/v1.0.4...v1.1.0
[1.0.4]: https://github.com/byonchev/homebridge-bthome/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/byonchev/homebridge-bthome/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/byonchev/homebridge-bthome/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/byonchev/homebridge-bthome/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/byonchev/homebridge-bthome/releases/tag/v1.0.0

[#1]: https://github.com/byonchev/homebridge-bthome/issues/1
[#2]: https://github.com/byonchev/homebridge-bthome/issues/2
[#3]: https://github.com/byonchev/homebridge-bthome/issues/3
[#5]: https://github.com/byonchev/homebridge-bthome/issues/5
