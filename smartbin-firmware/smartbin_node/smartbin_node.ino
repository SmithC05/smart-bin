#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"

unsigned long lastReadTime = 0;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! IP: ");
  Serial.println(WiFi.localIP());
  
  Serial.printf("SmartBin Node %s ready\n", BIN_ID);
}

float readDistanceCM() {
  // Send 10 microsecond HIGH pulse
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Read echo duration (timeout 30000 µs)
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) {
    return -1.0;
  }
  
  // Convert duration to distance in cm
  float distance = duration * 0.034 / 2.0;
  return distance;
}

float computeFillPct(float distance_cm) {
  if (distance_cm <= 0) return -1.0;
  
  float fill = (1.0 - distance_cm / BIN_DEPTH_CM) * 100.0;
  
  // Clamp between 0.0 and 100.0
  if (fill < 0.0) fill = 0.0;
  if (fill > 100.0) fill = 100.0;
  
  return fill;
}

bool postReading(float distance_cm) {
  char url[256];
  char path[128];
  sprintf(path, API_PATH, BIN_ID);
  sprintf(url, "http://%s:%d%s", API_HOST, API_PORT, path);

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  if (strlen(DEVICE_API_KEY) > 0) {
    http.addHeader("X-Device-Key", DEVICE_API_KEY);
  }

  // Build JSON body using ArduinoJson
  StaticJsonDocument<200> doc;
  doc["distance_cm"] = distance_cm;
  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  String response = http.getString();
  
  // Uncomment the lines below to print the raw HTTP code and response for debugging
  // Serial.printf("HTTP Code: %d\n", httpCode);
  // Serial.println(response);

  http.end();

  return (httpCode == 201 || httpCode == 200);
}

void loop() {
  // Check if READ_INTERVAL has elapsed (or it's the first run)
  if (millis() - lastReadTime >= READ_INTERVAL || lastReadTime == 0) {
    Serial.println("---");
    float dist = readDistanceCM();
    
    if (dist == -1.0) {
      Serial.println("Sensor error \xE2\x80\x94 skipping this reading");
    } else {
      float pct = computeFillPct(dist);
      Serial.printf("Distance: %.1f cm | Fill: %.1f%%\n", dist, pct);
      
      bool ok = postReading(dist);
      if (ok) {
        Serial.printf("POST success \xE2\x86\x92 %s reading saved\n", BIN_ID);
      } else {
        Serial.println("POST failed \xE2\x80\x94 will retry next interval");
      }
    }
    lastReadTime = millis();
  }
  
  delay(100); // small delay to yield
}
