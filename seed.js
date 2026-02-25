// Seed script for Industrial E-Logbook demo data
var userId = db.users.findOne({ email: 'senanur.cetin.work@gmail.com' })._id;

// Insert Assets
var assets = db.assets.insertMany([
    {
        name: "CNC Router XR-500",
        serialNumber: "CNC-2024-001",
        category: "machinery",
        status: "operational",
        location: "Building A - Floor 1",
        createdBy: userId,
        createdAt: new Date("2024-06-15"),
        updatedAt: new Date("2024-06-15")
    },
    {
        name: "Hydraulic Press HP-200",
        serialNumber: "HP-2024-002",
        category: "machinery",
        status: "operational",
        location: "Building A - Floor 2",
        createdBy: userId,
        createdAt: new Date("2024-07-20"),
        updatedAt: new Date("2024-07-20")
    },
    {
        name: "Conveyor Belt CB-100",
        serialNumber: "CB-2024-003",
        category: "equipment",
        status: "maintenance",
        location: "Building B - Assembly Line",
        createdBy: userId,
        createdAt: new Date("2024-05-10"),
        updatedAt: new Date("2025-01-15")
    },
    {
        name: "Forklift FL-50",
        serialNumber: "FL-2024-004",
        category: "vehicle",
        status: "operational",
        location: "Warehouse C - Loading Dock",
        createdBy: userId,
        createdAt: new Date("2024-03-01"),
        updatedAt: new Date("2024-03-01")
    },
    {
        name: "Robotic Arm RA-300",
        serialNumber: "RA-2024-005",
        category: "machinery",
        status: "decommissioned",
        location: "Building C - Robotics Lab",
        createdBy: userId,
        createdAt: new Date("2023-11-20"),
        updatedAt: new Date("2025-02-01")
    },
    {
        name: "Industrial Compressor IC-750",
        serialNumber: "IC-2024-006",
        category: "equipment",
        status: "operational",
        location: "Building A - Utility Room",
        createdBy: userId,
        createdAt: new Date("2024-08-05"),
        updatedAt: new Date("2024-08-05")
    },
    {
        name: "Welding Station WS-400",
        serialNumber: "WS-2024-007",
        category: "equipment",
        status: "operational",
        location: "Building B - Welding Bay",
        createdBy: userId,
        createdAt: new Date("2024-09-12"),
        updatedAt: new Date("2024-09-12")
    },
    {
        name: "Cargo Truck CT-10T",
        serialNumber: "CT-2024-008",
        category: "vehicle",
        status: "maintenance",
        location: "Parking Lot D",
        createdBy: userId,
        createdAt: new Date("2024-01-25"),
        updatedAt: new Date("2025-02-10")
    }
]);

print("Inserted " + assets.insertedIds.length + " assets");

// Get asset IDs
var cncId = db.assets.findOne({ serialNumber: "CNC-2024-001" })._id;
var hpId = db.assets.findOne({ serialNumber: "HP-2024-002" })._id;
var cbId = db.assets.findOne({ serialNumber: "CB-2024-003" })._id;
var flId = db.assets.findOne({ serialNumber: "FL-2024-004" })._id;
var raId = db.assets.findOne({ serialNumber: "RA-2024-005" })._id;
var icId = db.assets.findOne({ serialNumber: "IC-2024-006" })._id;
var wsId = db.assets.findOne({ serialNumber: "WS-2024-007" })._id;
var ctId = db.assets.findOne({ serialNumber: "CT-2024-008" })._id;

// Insert Log Entries
var logs = db.logentries.insertMany([
    {
        asset: cncId,
        author: userId,
        type: "maintenance",
        title: "Quarterly Maintenance - Spindle Lubrication",
        description: "Performed full quarterly maintenance including spindle lubrication, tool calibration, and coolant system flush. All parameters within spec. Next maintenance scheduled for Q2 2025.",
        status: "resolved",
        createdAt: new Date("2025-02-20T09:00:00Z"),
        updatedAt: new Date("2025-02-20T14:30:00Z")
    },
    {
        asset: cncId,
        author: userId,
        type: "incident",
        title: "Vibration Anomaly Detected During Milling",
        description: "Unusual vibration pattern detected during high-speed milling operation at 12,000 RPM. Bearing inspection recommended. Production temporarily halted on this unit pending investigation.",
        status: "open",
        createdAt: new Date("2025-02-24T16:45:00Z"),
        updatedAt: new Date("2025-02-24T16:45:00Z")
    },
    {
        asset: hpId,
        author: userId,
        type: "maintenance",
        title: "Hydraulic Fluid Replacement & Pressure Test",
        description: "Replaced hydraulic fluid (Shell Tellus S3 M46) and all inline filters. System pressure tested at 3000 PSI - nominal. Seals inspected, no leaks detected.",
        status: "resolved",
        createdAt: new Date("2025-02-18T08:00:00Z"),
        updatedAt: new Date("2025-02-18T16:00:00Z")
    },
    {
        asset: cbId,
        author: userId,
        type: "inspection",
        title: "Belt Tension & Alignment Inspection",
        description: "Conveyor belt tension measured at 2.5kN - below the 3.0kN minimum threshold. Belt tracking showing 15mm drift to the left side. Emergency maintenance work order created.",
        status: "open",
        createdAt: new Date("2025-02-22T11:30:00Z"),
        updatedAt: new Date("2025-02-22T11:30:00Z")
    },
    {
        asset: flId,
        author: userId,
        type: "operation",
        title: "Daily Pre-Shift Safety Check",
        description: "Completed daily pre-shift inspection: tire pressure OK, hydraulic levels OK, brake function test passed, warning lights operational. Unit cleared for operations.",
        status: "resolved",
        createdAt: new Date("2025-02-25T06:00:00Z"),
        updatedAt: new Date("2025-02-25T06:15:00Z")
    },
    {
        asset: raId,
        author: userId,
        type: "incident",
        title: "Servo Motor Failure - Joint 3",
        description: "Joint 3 servo motor (Fanuc A06B-0238-B605) failed during welding operation. Motor overheated due to cooling fan obstruction. Unit decommissioned pending replacement parts from manufacturer. ETA: 3 weeks.",
        status: "acknowledged",
        createdAt: new Date("2025-02-01T14:20:00Z"),
        updatedAt: new Date("2025-02-02T09:00:00Z")
    },
    {
        asset: icId,
        author: userId,
        type: "inspection",
        title: "Annual Pressure Vessel Certification",
        description: "Completed annual pressure vessel inspection per ASME standards. Vessel wall thickness measured at 12.3mm (min: 10mm). Safety relief valve tested and certified. Certificate updated until Feb 2026.",
        status: "resolved",
        createdAt: new Date("2025-02-15T10:00:00Z"),
        updatedAt: new Date("2025-02-15T15:00:00Z")
    },
    {
        asset: wsId,
        author: userId,
        type: "maintenance",
        title: "Electrode Tip Replacement & Gas Flow Calibration",
        description: "Replaced worn MIG welding electrode tips (0.035 Lincoln). Calibrated shielding gas (75% Argon / 25% CO2) flow rate to 35 CFH. Wire feed speed verified at 280 IPM.",
        status: "resolved",
        createdAt: new Date("2025-02-23T07:30:00Z"),
        updatedAt: new Date("2025-02-23T09:45:00Z")
    },
    {
        asset: ctId,
        author: userId,
        type: "maintenance",
        title: "Engine Oil Change & Brake Pad Replacement",
        description: "Performed 50,000km service: engine oil change (Mobil Delvac 15W-40), oil filter replacement, brake pads replaced on rear axle (wear at 95%). Front pads at 40% - scheduled for next service.",
        status: "open",
        createdAt: new Date("2025-02-10T08:00:00Z"),
        updatedAt: new Date("2025-02-10T08:00:00Z")
    },
    {
        asset: hpId,
        author: userId,
        type: "operation",
        title: "Production Run - Batch #2025-B044",
        description: "Completed production run of 500 units (Part: STL-BRACKET-A1). Press force: 180 tons. Cycle time: 12 seconds. Zero defects recorded. QC report attached in ERP system.",
        status: "resolved",
        createdAt: new Date("2025-02-24T07:00:00Z"),
        updatedAt: new Date("2025-02-24T18:00:00Z")
    }
]);

print("Inserted " + logs.insertedIds.length + " log entries");
print("Seeding complete!");
