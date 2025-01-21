<p align="center">
  <img width="410px" src="https://github.com/user-attachments/assets/999cf798-d454-4df7-998f-af1d9850f0fd">
</p>

# homebridge-bthome

Homebridge plugin for integrating BTHome devices into HomeKit

[![npm](https://img.shields.io/npm/v/homebridge-bthome/latest?label=latest)](https://www.npmjs.com/package/homebridge-bthome)

### Overview

The `homebridge-bthome` plugin enables seamless integration of Bluetooth devices using the [BTHome](https://bthome.io/) data format into your HomeKit ecosystem.

Please note that the plugin is in its early development stage and currently supports a limited range of sensor types. <br/>Refer to the [Supported Features](#supported_features) section for detailed information.

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

- Temperature
- Relative Humidity
- Battery Level
- Push Button

<a id="supported_features"></a>
### Supported Features

| Feature                               | Support Status     |
| ------------------------------------- | ------------------ |
| Encryption                            | :heavy_check_mark: |
| Occasional Sensor Data*               | :heavy_check_mark: |
| Multiple Bluetooth Devices**          | :x:                |
| Multiple Sensor Readings of Same Type | :x:                |

#### Notes:
- *\*Occasional Sensor Data:* This refers to data not consistently present in the device payload. For instance, the Shelly BLU H&T device only reports its push button state when the button is pressed; this data is absent in periodic updates.
- *\*\*Multiple Bluetooth Devices:* If your setup includes multiple Bluetooth devices, the plugin will default to using the first available device.

### Contributing

We welcome contributions! If you would like to contribute, please create an issue first, detailing the feature or functionality you intend to implement and the device you are working with.

Pull requests are encouraged and appreciated!

