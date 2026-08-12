#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ── Config — fill these ───────────────────────────────────────
const char* WIFI_SSID     = "POTHIGAI HOSTEL";
const char* WIFI_PASSWORD = "Pothigai@$C%I$T";
const char* API_BASE_URL  = "http://172.16.29.35:8000/api";  // Local IP automatically detected
const char* API_KEY       = ""; // BIN-01 does not have an API key set in the database currently
const char* BIN_ID        = "BIN-01";   // change per physical bin

// ── Pins ──────────────────────────────────────────────────────
#define TRIG_PIN  5
#define ECHO_PIN  18
#define BUZZER    4

// ── Bin config ────────────────────────────────────────────────
const float BIN_HEIGHT   = 40.0;  // Changed to 40.0 to match the backend DB configuration
const float BIN_DIAMETER = 20.0;
const float FULL_THRESH  = 80.0;  // match your dashboard alert threshold
const float CLEAR_THRESH = 70.0;
const int   POST_INTERVAL = 30000; // ms — post every 30 seconds
const int   NUM_SAMPLES  = 7;

bool  buzzerOn    = false;
long  lastPostMs  = 0;

// ── Helpers ───────────────────────────────────────────────────
float pingCm() {
  digitalWrite(TRIG_PIN, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dur = pulseIn(ECHO_PIN, HIGH, 30000);
  if (dur == 0) return -1.0;
  float d = dur * 0.0343 / 2.0;
  return (d > BIN_HEIGHT) ? BIN_HEIGHT : d;
}

void sortArr(float a[], int n) {
  for (int i = 0; i < n-1; i++)
    for (int j = 0; j < n-i-1; j++)
      if (a[j] > a[j+1]) { float t=a[j]; a[j]=a[j+1]; a[j+1]=t; }
}

float medianDist() {
  float s[NUM_SAMPLES]; int v = 0;
  for (int i = 0; i < NUM_SAMPLES; i++) {
    float d = pingCm();
    if (d > 0) s[v++] = d;
    delay(50);
  }
  if (v == 0) return -1.0;
  sortArr(s, v);
  return (v % 2 == 0) ? (s[v/2-1]+s[v/2])/2.0 : s[v/2];
}

float calcFill(float distance) {
  float r     = BIN_DIAMETER / 2.0;
  float gh    = constrain(BIN_HEIGHT - distance, 0.0, BIN_HEIGHT);
  float total = 3.14159 * r * r * BIN_HEIGHT;
  float fill  = 3.14159 * r * r * gh;
  return (fill / total) * 100.0;
}

// ── WiFi ──────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("[WiFi] Connecting to "); Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500); Serial.print("."); tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WiFi] FAILED — running offline");
  }
}

// ── HTTP POST ─────────────────────────────────────────────────
bool postReading(float distCm, float fillPct) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Not connected — skipping POST");
    return false;
  }

  // NOTE: Appended trailing slash since Django expects /reading/
  String url = String(API_BASE_URL) + "/bins/" + BIN_ID + "/reading/";

  // Build JSON body
  JsonDocument doc;
  doc["bin_id"]          = BIN_ID;
  doc["fill_percentage"] = round(fillPct * 10) / 10.0;
  doc["distance_cm"]     = round(distCm * 10) / 10.0;
  doc["status"]          = fillPct >= FULL_THRESH ? "full" :
                           fillPct >= 60 ? "high" : "ok";
  String body;
  serializeJson(doc, body);

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // NOTE: Changed from X-API-Key to X-Device-Key to match Django views.py
  if (strlen(API_KEY) > 0) {
    http.addHeader("X-Device-Key", API_KEY);
  }
  http.setTimeout(8000);

  int code = http.POST(body);

  if (code > 0) {
    Serial.print("[HTTP] POST → "); Serial.print(code);
    Serial.print(" | "); Serial.println(http.getString());
  } else {
    Serial.print("[HTTP] Error: "); Serial.println(http.errorToString(code));
  }

  http.end();
  return (code == 200 || code == 201);
}

// ── Setup ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  // Startup beep
  digitalWrite(BUZZER, HIGH); delay(300); digitalWrite(BUZZER, LOW);

  connectWiFi();
  Serial.println("=== OptiWaste Hardware Node Ready ===");
  Serial.print("Bin ID: "); Serial.println(BIN_ID);
}

// ── Loop ──────────────────────────────────────────────────────
void loop() {
  // Reconnect if WiFi dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Reconnecting...");
    connectWiFi();
  }

  float dist = medianDist();
  if (dist < 0) {
    Serial.println("[SENSOR] No valid reading");
    delay(2000); return;
  }

  float fill = calcFill(dist);

  // Serial output
  Serial.println("─────────────────────────────");
  Serial.print("Distance : "); Serial.print(dist, 1);  Serial.println(" cm");
  Serial.print("Fill     : "); Serial.print(fill, 1);  Serial.println(" %");
  Serial.print("Bin ID   : "); Serial.println(BIN_ID);

  // Buzzer hysteresis
  if (!buzzerOn && fill >= FULL_THRESH) {
    buzzerOn = true;
    Serial.println("[ALERT] FULL");
  } else if (buzzerOn && fill < CLEAR_THRESH) {
    buzzerOn = false;
    Serial.println("[OK] Cleared");
  }

  if (buzzerOn) {
    digitalWrite(BUZZER, HIGH); delay(200);
    digitalWrite(BUZZER, LOW);  delay(200);
  } else {
    digitalWrite(BUZZER, LOW);
  }

  // POST every 30 seconds
  long now = millis();
  if (now - lastPostMs >= POST_INTERVAL) {
    Serial.println("[HTTP] Posting to dashboard...");
    bool ok = postReading(dist, fill);
    if (ok) lastPostMs = now;
  }

  delay(1000);
}
