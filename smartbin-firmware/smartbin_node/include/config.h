#ifndef CONFIG_H
#define CONFIG_H

// Wi-Fi credentials
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Django API
#define API_HOST      "192.168.1.100"   // your laptop's local IP
#define API_PORT      8000
#define API_PATH      "/api/bins/%s/reading/"  // %s = bin ID

// This node's identity
#define BIN_ID        "BIN-01"   // change per node before flashing
#define DEVICE_API_KEY "YOUR_API_KEY" // Used for X-API-Key header

// HC-SR04 pins
#define TRIG_PIN      5
#define ECHO_PIN      18

// Buzzer pin
#define BUZZER_PIN    4

// Bin physical depth in cm (must match Django BIN_DEPTH_CM = 40.0)
#define BIN_DEPTH_CM  40.0

// How often to send a reading (milliseconds)
#define READ_INTERVAL 30000   // every 30 seconds

#endif
