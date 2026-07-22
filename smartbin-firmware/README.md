# SmartBin Node Firmware

This folder contains the ESP32 firmware for the SmartBin IoT nodes. Each node uses an HC-SR04 ultrasonic sensor to measure bin fill levels and POSTs the data to the Django API over Wi-Fi.

## 1. HARDWARE WIRING

| HC-SR04 | ESP32 |
| :--- | :--- |
| VCC | 3.3V (or 5V if using level shifter) |
| GND | GND |
| TRIG | GPIO 5 |
| ECHO | GPIO 18 |

**Note:** HC-SR04 ECHO outputs 5V logic. ESP32 is 3.3V tolerant. A voltage divider (1kΩ + 2kΩ) on ECHO is recommended.

## 2. ARDUINO IDE SETUP

- Install ESP32 board package via Board Manager
  URL: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
- Install these libraries via Library Manager:
  - **ArduinoJson** by Benoit Blanchon (v6+)
- Select board: "ESP32 Dev Module"
- Select correct COM port
- Upload speed: 115200

## 3. FLASHING MULTIPLE NODES

Before flashing each ESP32, open `smartbin_node/config.h` and change:
```cpp
#define BIN_ID "BIN-01"   // ← change to BIN-02, BIN-03 etc.
```
All other settings stay the same.
Flash → open Serial Monitor at 115200 baud → confirm readings.

## 4. FINDING YOUR LAPTOP'S LOCAL IP

- **Windows:** run `ipconfig` → look for IPv4 Address
- **Mac/Linux:** run `ifconfig` → look for inet under en0 or wlan0

Update `API_HOST` in `config.h` with this IP.
Make sure Django is running with: `python manage.py runserver 0.0.0.0:8000`
(the 0.0.0.0 makes it accessible on your local network)

## 5. TESTING WITHOUT HARDWARE

You can simulate an ESP32 POST using curl:
```bash
curl -X POST http://localhost:8000/api/bins/BIN-01/reading/ \
  -H "Content-Type: application/json" \
  -d '{"distance_cm": 12.4}'
```
Expected response: `{"bin_id":"BIN-01","fill_pct":69.0,"recorded_at":"..."}`

## 6. VOLTAGE DIVIDER WIRING FOR ECHO PIN

```text
Echo pin (5V) → 1kΩ → GPIO 18
                      ↓
                     2kΩ
                      ↓
                     GND
```
This brings 5V down to ~3.3V safely.
