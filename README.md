# SmartBin Municipal Waste Management ERP

## Manual Testing, Demo Data & Real Hardware Guide

**Purpose**: This README is the practical guide for manually testing and demonstrating the SmartBin Municipal Waste Management ERP.

The project uses one real physical SmartBin/ESP32 device for genuine IoT telemetry and a controlled Demo/Simulation Data Generator to populate the rest of the municipal ERP with clearly marked simulated records.

---

### 1. System Overview

The ERP contains:
- Authentication
- Role-Based Access Control (RBAC)
- Municipality → Zone → Ward hierarchy
- SmartBin IoT monitoring
- Alerts
- Fleet / Vehicle Management
- Staff / Workforce Management
- Collection Scheduling
- Dispatch
- OR-Tools route optimization
- Driver / Field Worker operations
- Collection Records
- Audit Logs
- Reports & Analytics
- Internal Notifications
- Demo / Simulation Data Generator

**The overall operational flow is:**
```
REAL SMARTBIN / DEMO DATA
          ↓
      BIN READINGS
          ↓
        ALERTS
          ↓
 COLLECTION SCHEDULING
          ↓
   ROUTE OPTIMIZATION
          ↓
       DISPATCH
          ↓
 DRIVER / FIELD WORKER
          ↓
     COLLECTION
          ↓
      AUDIT LOG
          ↓
       REPORTS
```

---

### 2. Real Hardware vs Demo Data

This distinction is critical.

**Real Hardware**
The physical SmartBin is the authoritative IoT source.
`ESP32 → HC-SR04 → X-Device-Key → IoT API → Real BinReading → Dashboard / Alerts`

The physical device should be represented as:
- **Data Source**: REAL
- **Example**: `BIN-REAL-001`
- **Source**: REAL DEVICE
- **Hardware**: ESP32
- **Sensor**: HC-SR04
- **Status**: ONLINE
- **Fill**: 67%

**Simulated Data**
Demo bins and supporting records are generated only for development/testing.
- **Data Source**: SIMULATED
- **Example**: `BIN-SIM-001`
- **Source**: SIMULATED / DEMO
- **Fill**: 92%
- **Status**: DEMO

> **Golden Rule**: Never present simulated sensor readings as real hardware telemetry. The database should contain an authoritative source indicator such as `REAL` or `SIMULATED`. Do not rely only on naming conventions such as BIN-SIM-001.

---

### 3. Recommended Demonstration Setup

**Use**:
- 1 REAL SMARTBIN
- 10 SIMULATED SMARTBINS
- 3 VEHICLES
- 3 DRIVERS
- 5 FIELD WORKERS
- 3 COLLECTION SCHEDULES

**Recommended demo dataset**:
- 1 Municipality, 3 Zones, 5 Wards, 1 Depot, 1 Processing Facility
- 10 Simulated SmartBins
- 3 Vehicles, 3 Drivers, 5 Field Workers
- 3 Collection Schedules
- Multiple simulated readings and simulated alerts

This gives the evaluator a realistic municipal environment while still demonstrating genuine hardware integration.

---

### 4. Environment Requirements

**Backend**: Python, Django, Django REST Framework, OR-Tools, SQLite for current development configuration
**Frontend**: Node.js, React, Vite
**Hardware**: ESP32, HC-SR04 ultrasonic sensor, Network connectivity

---

### 5. Start the Backend

From the project root:
```bash
cd backend
# Activate the virtual environment
venv\Scripts\activate
# Run migrations
python manage.py migrate
# Start Django
python manage.py runserver
```
Typical development address: `http://127.0.0.1:8000`

---

### 6. Start the Frontend

From the project root:
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal. Typical address: `http://localhost:5173`

---

### 7. Simulator Configuration

The existing simulator must remain controlled by: `ENABLE_SIMULATOR`

- **Development**: `ENABLE_SIMULATOR=True`
- **Production**: `ENABLE_SIMULATOR=False`

When disabled:
- Demo generation must be unavailable.
- Simulator endpoints must reject requests.
- Normal real hardware ingestion must continue to work.
- The simulator must never bypass IoT authentication for the real device.

---

### 8. Test Accounts

The Demo Data Generator automatically creates the following development accounts for each important role.

> **Note**: Use unique strong passwords for actual deployments. Do not use development passwords in production.

| Role | Username | Password | Testing Purpose |
|------|----------|----------|-----------------|
| SYSTEM_ADMIN | `sysadmin` | `demo123` | Full administration |
| MUNICIPAL_ADMIN | `municipaladmin` | `demo123` | Municipality-level operations |
| MUNICIPAL_OFFICER | `officer` | `demo123` | Municipal operations |
| ZONE_SUPERVISOR | `zonesupervisor` | `demo123` | Zone-level operations |
| DRIVER | `driver01` | `demo123` | Route execution |
| FIELD_WORKER | `worker01` | `demo123` | Collection operations |
| AUDITOR | `auditor` | `demo123` | Read-only audit/reporting |

*Additional generic test accounts like `driver02`, `worker02`, etc., are also generated with the same password.*

---

### 9. Master Data Setup

Before operational testing, ensure the following exists (created via generator):
- **Municipality**: Demo Municipality
- **Zones**: North Zone, South Zone, East Zone
- **Wards**: Ward 1A, Ward 1B, Ward 2A, Ward 2B, Ward 3A
- **Depot**: Central Demo Depot (Requires valid coordinates for route optimization)
- **Processing Facility**: Municipal Demo Processing Facility

---

### 10. Demo Data Generator

The ERP provides a controlled administrative area:
`Administration → System Tools → Demo / Simulation`

The page should show environment status, simulator engine status, and counts of Real Devices vs Simulated Bins. 
The **GENERATE DEMO DATA** button requires intentional user action and must not generate data automatically on page load.

---

### 11. Generating Demo Data

Click **GENERATE DEMO DATA** and confirm the warning.
The generator will use the existing models and relationships to create the dataset.

---

### 12. Demo Data Idempotency

Clicking the button multiple times must not create uncontrolled duplicates. 
- **First click**: Demo dataset created.
- **Second click**: Demo dataset already exists. No duplicate records were created.

---

### 13. Demo Dataset Must Not Modify Real Hardware

The generator must never modify:
- Real SmartBin identity
- Real device API key
- Real BinReadings
- Real hardware configuration
- Real operational history

The real device remains separate from the demo dataset.

---

### 14. Recommended Simulated Bins

The generator creates `BIN-SIM-001` through `BIN-SIM-010`. These demo values must never be presented as real sensor observations.

---

### 15. Real SmartBin Test

Find the physical SmartBin in Bin Management. It should be clearly identified as `BIN-REAL-001` with source `REAL DEVICE`.
Physically change the sensor distance/fill condition and verify:
- [x] ESP32 powered
- [x] HC-SR04 working
- [x] Network connected
- [x] Device API key configured
- [x] Backend running
- [x] Reading reaches backend
- [x] Timestamp updates
- [x] Fill percentage changes
- [x] Dashboard updates
- [x] Alert triggers when threshold is crossed

**Do not manually edit the database to fake this test.**

---

### 16. Real vs Simulated UI

The UI clearly shows badges `REAL DEVICE` (Blue) and `SIMULATED` (Purple) to differentiate them. The Bin Management view provides a "Data Source" filter for `ALL`, `REAL`, and `SIMULATED`.

---

### 17. RBAC Manual Testing

Test each role separately to verify they only have access to their permitted modules, zones, municipalities, and actions. For example:
- **ZONE_SUPERVISOR**: Verify assigned zone only, relevant bins/alerts/staff/vehicles, scheduling within scope.
- **DRIVER**: Verify assigned schedules/routes, start route, collect, complete route. Must NOT manage staff/vehicles or create schedules.
- **AUDITOR**: Verify read-only reports and audit access. No operational mutation.

---

### 18. RBAC Attack Tests

Intentionally attempt unauthorized actions.
- Driver A → Driver B Schedule (Expected: 403 FORBIDDEN)
- Zone Supervisor A → Zone B Bin (Expected: 403 FORBIDDEN)
- Municipality A Admin → Municipality B Vehicle (Expected: 403 FORBIDDEN)

---

### 19. Fleet & Staff Testing

Verify creation, assignment, scope enforcement, and status changes for Vehicles and Staff.

---

### 20. Collection Scheduling & Route Optimization Test

- Create a schedule using simulated bins.
- Assign Vehicle, Driver, Workers, and Depot.
- Generate Route and verify OR-Tools calculates sequence and distance accurately.
- Dispatch the schedule.

---

### 21. Driver Workflow & Collection Exception Test

- Login as the assigned Driver.
- View Route → Start Route → Arrived → Collected → Next Stop.
- At one simulated bin, choose **UNABLE TO COLLECT** (Reason: ACCESS_BLOCKED). Verify exception is recorded, route progress remains accurate, and audit event is created.
- Complete the route.

---

### 22. Audit & Notification Testing

- Inspect Audit Logs for `SCHEDULE_CREATED`, `ROUTE_STARTED`, `COLLECTION_RECORDED`, etc. Verify correct user, role, record, timestamp.
- Verify internal notifications are generated for critical bins, dispatched schedules, and collection exceptions to the correct recipients.

---

### 23. Reports Testing

Verify reports reflect actual data. Check Collection report, Exception report, SmartBin report, Fleet report, Route report. Use data-source filtering (`REAL`, `SIMULATED`, `ALL`) where supported.

---

### 24. Complete End-to-End Demonstration

Use this exact sequence for the final project demonstration:
1. **Admin Login**: Login as `sysadmin`.
2. **Generate Demo Dataset**: Go to Demo/Simulation and click GENERATE DEMO DATA.
3. **Show Master Data**: Show Municipality, Zones, Wards, Depot.
4. **Show SmartBins**: Show 1 REAL DEVICE + 10 SIMULATED DEVICES.
5. **Demonstrate Real IoT**: Physically change the sensor and show the real reading updating.
6. **Demonstrate Alerts**: Show a critical/high bin alert.
7. **Demonstrate Fleet & Staff**: Show vehicles, drivers, supervisors.
8. **Create/Use Schedule**: Select simulated bins and assign resources.
9. **Generate Route**: Show OR-Tools route sequence.
10. **Dispatch**: Dispatch the schedule.
11. **Driver Login**: Login as `driver01`.
12. **Execute Collection**: START → ARRIVED → COLLECTED.
13. **Exception**: Mark one stop as UNABLE TO COLLECT.
14. **Complete Route**: Complete the route with exception preserved.
15. **Admin Verification**: Return to admin and show schedule, route, collection records, audit log, notifications, and reports.

---

### 25. Final Project Principle

The project should be demonstrated honestly:
One real physical SmartBin proves the IoT hardware integration. The simulated municipal dataset proves that the ERP can operate at a realistic municipal scale.

**1 REAL SMARTBIN + CONTROLLED SIMULATED MUNICIPAL DATA = VALID DEVELOPMENT / ACADEMIC DEMONSTRATION**

The simulated data must always be clearly identified and must never be represented as physical hardware telemetry.
