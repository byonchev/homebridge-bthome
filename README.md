<p align="center">
  <img width="410px" src="https://github.com/user-attachments/assets/999cf798-d454-4df7-998f-af1d9850f0fd">
</p>

# homebridge-bthome

Homebridge plugin for integrating BTHome devices into HomeKit

[![npm](https://img.shields.io/npm/v/homebridge-bthome/latest?label=latest)](https://www.npmjs.com/package/homebridge-bthome) [![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

### Overview

`homebridge-bthome` enables seamless integration of Bluetooth devices that communicate using the [BTHome](https://bthome.io/) data format into your HomeKit setup.

It works locally — no gateways or cloud services are required. The plugin connects directly to supported devices.

### Prerequisites

To utilize this plugin, ensure that:

- Your Homebridge setup includes Bluetooth hardware.
- The necessary drivers for your Bluetooth hardware are installed and functioning correctly.

### Configuration

This plugin does not automatically add all discovered BTHome devices. Each device must be manually configured.

#### Required Fields:

- **Device MAC Address:** The unique MAC address of the device must be specified.
- **Encryption Key (if applicable):** If the device payload is encrypted, you must provide the encryption key. Note that the plugin does not share or store this key outside the configuration file.

### Supported Sensor Types

- Air Quality (PM2.5, PM10 and VOC)
- Battery Level
- Push Button
- Carbon Dioxide Levels
- Carbon Monoxide Detection
- Contact Detection
- Relative Humidity
- Illuminance
- Motion Detection
- Occupancy Detection
- Smoke Detection
- Temperature

### Supported Devices

| Device                 | Support status       | Tested             |
| ---------------------- | ------------------   | ------------------ |
| Shelly BLU H&T         | :heavy_check_mark:   | :heavy_check_mark: |
| Shelly BLU Motion      | :heavy_check_mark:   | :heavy_check_mark: |
| Shelly BLU Door/Window | :heavy_check_mark:   | :heavy_check_mark: |
| Shelly BLU Button      | :heavy_check_mark:   | :x:                |
| Shelly BLU Wall Switch | :heavy_check_mark:   | :x:                |
| Shelly BLU RC Button   | :heavy_check_mark:   | :x:                |
| Shelly BLU TRV         | _Partial support\*_  | :x:                |


_If you own some of the untested devices and the plugin works for you, please let me know so I can update its status._

#### Notes:

- _\* Partial support:_ The BTHome protocol is one-way (read-only), which means Homebridge can only receive data from these devices. If a device requires additional features that depend on sending data back (e.g., configuration changes, control commands, switching modes), those functions will not be available while using this plugin.

<a id="supported_features"></a>

### Supported Features

| Feature                               | Support Status     |
| ------------------------------------- | ------------------ |
| Encryption                            | :heavy_check_mark: |
| Multiple Sensor Readings of Same Type | :heavy_check_mark: |
| Multiple Bluetooth Devices\*          | :x:                |
| EVE Services & Characteristics        | Planned            |
| Fakegato                              | Planned            |

#### Notes:

- _\* Multiple Bluetooth Devices:_ If your setup includes multiple Bluetooth devices, the plugin will default to using the first available device.

### Contributing

We welcome contributions! If you would like to contribute, please create an issue first, detailing the feature or functionality you intend to implement and the device you are working with.

Pull requests are encouraged and appreciated!
