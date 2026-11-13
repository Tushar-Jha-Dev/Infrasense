import dotenv from "dotenv";
import mongoose from "mongoose";
import Asset from "../models/Asset.js";
import Complaint from "../models/Complaint.js";
import MaintenanceRecord from "../models/MaintenanceRecord.js";
import User from "../models/User.js";
import { analyzeComplaint } from "../services/aiAnalysis.js";

dotenv.config();

// Safety check 1: Refuse execution in production
if (process.env.NODE_ENV === "production") {
  console.error(
    "Error: Refusing to seed sample data in production environment (NODE_ENV=production)."
  );
  process.exit(1);
}

// Safety check 2: Validate shared sample user password
const seedPassword = process.env.SEED_USER_PASSWORD?.trim();
if (!seedPassword || seedPassword.length < 8) {
  console.error(
    "Error: Missing or invalid SEED_USER_PASSWORD in environment (must be at least 8 characters)."
  );
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("Error: Missing MONGO_URI in environment.");
  process.exit(1);
}

const shouldReset = process.argv.includes("--reset");

// Calculate historical timestamps across the last 45 days
const now = Date.now();
const daysAgo = (days, hours = 0) =>
  new Date(now - (days * 24 + hours) * 3600 * 1000);

async function runSeed() {
  let exitCode = 0;

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const sampleUserFilter = {
      email: { $regex: /@sample\.infrasense\.test$/i },
    };
    const sampleAssetFilter = { assetId: { $regex: /^AST-S/i } };

    // Idempotency check: if sample data exists and --reset is not specified, exit cleanly
    if (!shouldReset) {
      const existingUserCount = await User.countDocuments(sampleUserFilter);
      const existingAssetCount = await Asset.countDocuments(sampleAssetFilter);

      if (existingUserCount > 0 || existingAssetCount > 0) {
        console.log(
          "Sample data already exists. To recreate from scratch, run with --reset:"
        );
        console.log("  npm run seed:sample -- --reset");
        await mongoose.disconnect().catch(() => {});
        process.exit(0);
      }
    } else {
      // Clean up previous sample documents without touching real admin or production data
      const oldSampleUsers = await User.find(sampleUserFilter).select("_id");
      const oldSampleUserIds = oldSampleUsers.map((u) => u._id);

      const oldSampleComplaints = await Complaint.find({
        submittedBy: { $in: oldSampleUserIds },
      }).select("_id");
      const oldSampleComplaintIds = oldSampleComplaints.map((c) => c._id);

      await MaintenanceRecord.deleteMany({
        complaint: { $in: oldSampleComplaintIds },
      });
      await Complaint.deleteMany({ _id: { $in: oldSampleComplaintIds } });
      await Asset.deleteMany(sampleAssetFilter);
      await User.deleteMany(sampleUserFilter);
    }

    // Locate the existing admin user
    const adminUser = await User.findOne({ role: "admin", isActive: true });
    if (!adminUser) {
      console.error(
        "Error: No active admin user found in database. Please run 'npm run seed:admin' first."
      );
      process.exit(1);
    }

    // 1. Create sample users (3 technicians + 5 regular users)
    const sampleUsersDefs = [
      {
        name: "Rajesh Kumar",
        email: "tech.rajesh@sample.infrasense.test",
        password: seedPassword,
        role: "technician",
        phone: "9876543210",
      },
      {
        name: "Anil Sharma",
        email: "tech.anil@sample.infrasense.test",
        password: seedPassword,
        role: "technician",
        phone: "9876543211",
      },
      {
        name: "Sunil Verma",
        email: "tech.sunil@sample.infrasense.test",
        password: seedPassword,
        role: "technician",
        phone: "9876543212",
      },
      {
        name: "Aarav Patel",
        email: "student.aarav@sample.infrasense.test",
        password: seedPassword,
        role: "user",
        phone: "9876543220",
      },
      {
        name: "Diya Sharma",
        email: "student.diya@sample.infrasense.test",
        password: seedPassword,
        role: "user",
        phone: "9876543221",
      },
      {
        name: "Rohan Gupta",
        email: "student.rohan@sample.infrasense.test",
        password: seedPassword,
        role: "user",
        phone: "9876543222",
      },
      {
        name: "Prof. Priya Mehta",
        email: "staff.priya@sample.infrasense.test",
        password: seedPassword,
        role: "user",
        phone: "9876543223",
      },
      {
        name: "Dr. Vikram Singh",
        email: "staff.vikram@sample.infrasense.test",
        password: seedPassword,
        role: "user",
        phone: "9876543224",
      },
    ];

    const users = [];
    for (const def of sampleUsersDefs) {
      const u = await User.create(def);
      users.push(u);
    }

    const techRajesh = users.find(
      (u) => u.email === "tech.rajesh@sample.infrasense.test"
    );
    const techAnil = users.find(
      (u) => u.email === "tech.anil@sample.infrasense.test"
    );
    const techSunil = users.find(
      (u) => u.email === "tech.sunil@sample.infrasense.test"
    );
    const userAarav = users.find(
      (u) => u.email === "student.aarav@sample.infrasense.test"
    );
    const userDiya = users.find(
      (u) => u.email === "student.diya@sample.infrasense.test"
    );
    const userRohan = users.find(
      (u) => u.email === "student.rohan@sample.infrasense.test"
    );
    const userPriya = users.find(
      (u) => u.email === "staff.priya@sample.infrasense.test"
    );
    const userVikram = users.find(
      (u) => u.email === "staff.vikram@sample.infrasense.test"
    );

    // 2. Create 15 sample assets covering all categories, mixed conditions & statuses
    const sampleAssetsDefs = [
      {
        assetId: "AST-S001",
        name: "[Sample] Main Switchboard Panel A",
        category: "Electrical",
        description: "Primary distribution switchboard supplying ground floor academic labs",
        building: "Main Academic Block",
        location: "Ground Floor Electrical Room",
        installationDate: new Date("2023-01-15"),
        condition: "Fair",
        status: "Operational",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(2),
      },
      {
        assetId: "AST-S002",
        name: "[Sample] Ceiling Fan Array - Room 204",
        category: "Electrical",
        description: "4-unit heavy duty classroom ceiling fan installation",
        building: "Tech Block A",
        location: "Room 204 (2nd Floor)",
        installationDate: new Date("2022-07-20"),
        condition: "Poor",
        status: "Under Maintenance",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(10),
      },
      {
        assetId: "AST-S003",
        name: "[Sample] Water Cooler & Purifier 2F",
        category: "Plumbing",
        description: "Stainless steel 80L refrigerated drinking water cooler with 5-stage RO",
        building: "Library",
        location: "2nd Floor Corridor",
        installationDate: new Date("2023-03-10"),
        condition: "Poor",
        status: "Under Maintenance",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(5),
      },
      {
        assetId: "AST-S004",
        name: "[Sample] Restroom Flush & Drainage System",
        category: "Plumbing",
        description: "Multi-fixture plumbing array with dual-flush valves and soil drain",
        building: "Tech Block B",
        location: "1st Floor Restroom",
        installationDate: new Date("2022-11-05"),
        condition: "Fair",
        status: "Operational",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(4),
      },
      {
        assetId: "AST-S005",
        name: "[Sample] Seminar Hall Central AC Unit 1",
        category: "HVAC",
        description: "10-ton ducted package air conditioning system with digital thermostat",
        building: "Main Academic Block",
        location: "Auditorium / Seminar Hall",
        installationDate: new Date("2022-04-18"),
        condition: "Fair",
        status: "Operational",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(9),
      },
      {
        assetId: "AST-S006",
        name: "[Sample] Computer Lab 3 Split AC",
        category: "HVAC",
        description: "2-ton 5-star inverter split air conditioner for computer server/lab cooling",
        building: "Tech Block A",
        location: "Lab 3 (2nd Floor)",
        installationDate: new Date("2023-06-12"),
        condition: "Poor",
        status: "Out of Service",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(14),
      },
      {
        assetId: "AST-S007",
        name: "[Sample] Library Study Table Set (10 Chairs)",
        category: "Furniture",
        description: "Hardwood 10-seater study station with integrated power sockets and ergonomic chairs",
        building: "Library",
        location: "Reading Hall (Ground Floor)",
        installationDate: new Date("2023-08-01"),
        condition: "Good",
        status: "Operational",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(30),
      },
      {
        assetId: "AST-S008",
        name: "[Sample] Classroom 102 Lecture Benches",
        category: "Furniture",
        description: "Fixed tiered classroom desks and bench seating for 60 students",
        building: "Tech Block B",
        location: "Room 102",
        installationDate: new Date("2021-09-15"),
        condition: "Fair",
        status: "Operational",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(3),
      },
      {
        assetId: "AST-S009",
        name: "[Sample] East Staircase Handrail & Plaster",
        category: "Civil/Structural",
        description: "Reinforced steel safety railing and masonry stairwell landings",
        building: "Tech Block A",
        location: "East Staircase (Floors 1-4)",
        installationDate: new Date("2021-02-10"),
        condition: "Poor",
        status: "Under Maintenance",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(16),
      },
      {
        assetId: "AST-S010",
        name: "[Sample] Room 301 Ceiling & Waterproofing",
        category: "Civil/Structural",
        description: "Acoustic false ceiling and roof waterproofing membrane above faculty wing",
        building: "Main Academic Block",
        location: "Room 301 (3rd Floor)",
        installationDate: new Date("2022-10-01"),
        condition: "Fair",
        status: "Operational",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(6),
      },
      {
        assetId: "AST-S011",
        name: "[Sample] Core Cisco Network Switch 24-Port",
        category: "Networking",
        description: "Gigabit Ethernet managed PoE switch with fiber optic uplink module",
        building: "Tech Block A",
        location: "Server Room Rack 2",
        installationDate: new Date("2023-05-19"),
        condition: "Good",
        status: "Operational",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(31),
      },
      {
        assetId: "AST-S012",
        name: "[Sample] Library Wi-Fi Access Point AP-04",
        category: "Networking",
        description: "Dual-band Wi-Fi 6 enterprise access point ceiling mounted",
        building: "Library",
        location: "1st Floor Stack Area",
        installationDate: new Date("2023-09-05"),
        condition: "Fair",
        status: "Operational",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(10),
      },
      {
        assetId: "AST-S013",
        name: "[Sample] Ground Floor Washroom Sanitation Station",
        category: "Sanitation",
        description: "Automated urinal sensors, soap dispensers and exhaust ventilation",
        building: "Student Center",
        location: "Ground Floor Restrooms",
        installationDate: new Date("2022-03-14"),
        condition: "Poor",
        status: "Out of Service",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(33),
      },
      {
        assetId: "AST-S014",
        name: "[Sample] Cafeteria Waste Disposal & Trap",
        category: "Sanitation",
        description: "Commercial grease trap and outdoor segregated organic waste station",
        building: "Student Center",
        location: "Cafeteria Rear Loading Bay",
        installationDate: new Date("2022-08-22"),
        condition: "Fair",
        status: "Operational",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(7),
      },
      {
        assetId: "AST-S015",
        name: "[Sample] Passenger Elevator Unit 1",
        category: "Other",
        description: "8-passenger traction lift serving basement through 4th floor",
        building: "Main Academic Block",
        location: "Central Lobby",
        installationDate: new Date("2020-12-05"),
        condition: "Poor",
        status: "Under Maintenance",
        createdAt: daysAgo(45),
        updatedAt: daysAgo(18),
      },
    ];

    // Mongoose insertMany with timestamps: false preserves historical createdAt dates over the 45-day span.
    const assets = await Asset.insertMany(sampleAssetsDefs, {
      timestamps: false,
    });
    const assetMap = Object.fromEntries(assets.map((a) => [a.assetId, a]));

    // 3. Create 18 sample complaints (3 Submitted, 3 Under Review, 3 Assigned, 3 In Progress, 4 Resolved, 2 Closed)
    const complaintsRaw = [
      // --- 3 SUBMITTED ---
      {
        complaintId: "CMP-S0001",
        title: "Switchboard sparking in ground floor electrical room",
        description:
          "There was a loud spark and smoke coming from the main switchboard panel near room 101.",
        assetId: "AST-S001",
        location: "Main Academic Block, Ground Floor Electrical Room",
        submittedBy: userAarav._id,
        status: "Submitted",
        createdAt: daysAgo(2),
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userAarav._id,
            changedAt: daysAgo(2),
            note: "Complaint submitted",
          },
        ],
      },
      {
        complaintId: "CMP-S0002",
        title: "Lecture bench wobbly and loose screw",
        description:
          "Third row lecture bench is wobbling badly and one screw has fallen out.",
        assetId: "AST-S008",
        location: "Tech Block B, Room 102",
        submittedBy: userDiya._id,
        status: "Submitted",
        createdAt: daysAgo(3),
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userDiya._id,
            changedAt: daysAgo(3),
            note: "Complaint submitted",
          },
        ],
      },
      {
        // Vague description with no asset (location only) -> triggers needsReview (<4 words / zero score)
        complaintId: "CMP-S0003",
        title: "Strange issue",
        description: "Something is broken",
        assetId: null,
        location: "Outer Pathway near Sports Ground",
        submittedBy: userRohan._id,
        status: "Submitted",
        createdAt: daysAgo(1),
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userRohan._id,
            changedAt: daysAgo(1),
            note: "Complaint submitted",
          },
        ],
      },

      // --- 3 UNDER REVIEW ---
      {
        complaintId: "CMP-S0004",
        title: "Washroom tap leaking and drain blocked",
        description:
          "The middle tap is dripping continuously and the sink drainage is blocked with standing water.",
        assetId: "AST-S004",
        location: "Tech Block B, 1st Floor Restroom",
        submittedBy: userPriya._id,
        status: "Under Review",
        createdAt: daysAgo(5),
        confirmedCategory: "Plumbing",
        confirmedSeverity: "Medium",
        reviewedBy: adminUser._id,
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userPriya._id,
            changedAt: daysAgo(5),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(4, 12),
            note: "Reviewed by admin",
          },
        ],
      },
      {
        // Admin override 1: AI rule may suggest Low, admin confirms High
        complaintId: "CMP-S0005",
        title: "Ceiling dampness and plaster peeling in room 301",
        description:
          "Large wet patch on the ceiling with dampness spreading after recent rain. Paint peeling off.",
        assetId: "AST-S010",
        location: "Main Academic Block, Room 301",
        submittedBy: userVikram._id,
        status: "Under Review",
        createdAt: daysAgo(7),
        confirmedCategory: "Civil/Structural",
        confirmedSeverity: "High", // Override
        reviewedBy: adminUser._id,
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userVikram._id,
            changedAt: daysAgo(7),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(6, 12),
            note: "Reviewed by admin",
          },
        ],
      },
      {
        // Second vague/low-word description triggering needsReview
        complaintId: "CMP-S0006",
        title: "Bad smell and noise",
        description: "Bad smell here",
        assetId: "AST-S014",
        location: "Student Center, Cafeteria Rear Loading Bay",
        submittedBy: userAarav._id,
        status: "Under Review",
        createdAt: daysAgo(8),
        confirmedCategory: "Sanitation",
        confirmedSeverity: "Medium",
        reviewedBy: adminUser._id,
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userAarav._id,
            changedAt: daysAgo(8),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(7, 12),
            note: "Reviewed by admin",
          },
        ],
      },

      // --- 3 ASSIGNED ---
      {
        complaintId: "CMP-S0007",
        title: "AC not cooling in seminar hall before conference",
        description:
          "Central air conditioning blower is running but not cooling the hall at all. Compressor seems off.",
        assetId: "AST-S005",
        location: "Main Academic Block, Auditorium / Seminar Hall",
        submittedBy: userPriya._id,
        status: "Assigned",
        createdAt: daysAgo(10),
        confirmedCategory: "HVAC",
        confirmedSeverity: "Medium",
        reviewedBy: adminUser._id,
        assignedTo: techRajesh._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(9),
        assignmentNotes:
          "Conference scheduled this weekend. Check refrigerant pressure and compressor contactor.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userPriya._id,
            changedAt: daysAgo(10),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(9, 18),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(9),
            note: `Assigned to ${techRajesh.name}`,
          },
        ],
      },
      {
        complaintId: "CMP-S0008",
        title: "Wi-Fi not working and no internet in reading hall",
        description:
          "Students unable to connect to library Wi-Fi. Access point LED is blinking amber and showing packet loss.",
        assetId: "AST-S012",
        location: "Library, 1st Floor Stack Area",
        submittedBy: userDiya._id,
        status: "Assigned",
        createdAt: daysAgo(11),
        confirmedCategory: "Networking",
        confirmedSeverity: "High",
        reviewedBy: adminUser._id,
        assignedTo: techSunil._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(10, 12),
        assignmentNotes: "Verify PoE switch port and DHCP lease pool.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userDiya._id,
            changedAt: daysAgo(11),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(10, 20),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(10, 12),
            note: `Assigned to ${techSunil.name}`,
          },
        ],
      },
      {
        complaintId: "CMP-S0009",
        title: "Water cooler water pressure low and water warm",
        description:
          "Low water pressure from the purifier tap and cooling unit is not chilling the water.",
        assetId: "AST-S003",
        location: "Library, 2nd Floor Corridor",
        submittedBy: userRohan._id,
        status: "Assigned",
        createdAt: daysAgo(12),
        confirmedCategory: "Plumbing",
        confirmedSeverity: "Medium",
        reviewedBy: adminUser._id,
        assignedTo: techAnil._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(11, 12),
        assignmentNotes:
          "Inspect inline sediment filter and compressor thermostat.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userRohan._id,
            changedAt: daysAgo(12),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(11, 20),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(11, 12),
            note: `Assigned to ${techAnil.name}`,
          },
        ],
      },

      // --- 3 IN PROGRESS ---
      {
        complaintId: "CMP-S0010",
        title: "AC water leaking heavily onto computer desks in Lab 3",
        description:
          "Indoor unit of the split air conditioner is overflowing with water dripping directly onto desk row 4.",
        assetId: "AST-S006",
        location: "Tech Block A, Lab 3 (2nd Floor)",
        submittedBy: userVikram._id,
        status: "In Progress",
        createdAt: daysAgo(15),
        confirmedCategory: "HVAC",
        confirmedSeverity: "High",
        reviewedBy: adminUser._id,
        assignedTo: techRajesh._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(14, 12),
        assignmentNotes:
          "Turn off lab circuit immediately if water reaches power strips.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userVikram._id,
            changedAt: daysAgo(15),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(14, 20),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(14, 12),
            note: `Assigned to ${techRajesh.name}`,
          },
          {
            status: "In Progress",
            changedBy: techRajesh._id,
            changedAt: daysAgo(14),
            note: "Work started",
          },
        ],
      },
      {
        complaintId: "CMP-S0011",
        title: "Staircase railing loose and cracked concrete step",
        description:
          "Metal railing on the 3rd floor landing is loose and wobbly, posing a falling risk. Concrete cracked.",
        assetId: "AST-S009",
        location: "Tech Block A, East Staircase",
        submittedBy: userAarav._id,
        status: "In Progress",
        createdAt: daysAgo(17),
        confirmedCategory: "Civil/Structural",
        confirmedSeverity: "High",
        reviewedBy: adminUser._id,
        assignedTo: techSunil._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(16, 12),
        assignmentNotes:
          "Anchor bolts need re-drilling and chemical grouting.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userAarav._id,
            changedAt: daysAgo(17),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(16, 20),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(16, 12),
            note: `Assigned to ${techSunil.name}`,
          },
          {
            status: "In Progress",
            changedBy: techSunil._id,
            changedAt: daysAgo(16),
            note: "Work started",
          },
        ],
      },
      {
        complaintId: "CMP-S0012",
        title: "Elevator door stuck and noisy vibration",
        description:
          "Elevator doors jamming on floor 2 and strange grinding noise during ascent.",
        assetId: "AST-S015",
        location: "Main Academic Block, Central Lobby",
        submittedBy: userPriya._id,
        status: "In Progress",
        createdAt: daysAgo(19),
        confirmedCategory: "Other",
        confirmedSeverity: "High",
        reviewedBy: adminUser._id,
        assignedTo: techRajesh._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(18, 12),
        assignmentNotes:
          "Take lift out of service before checking door motor and guide rails.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userPriya._id,
            changedAt: daysAgo(19),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(18, 20),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(18, 12),
            note: `Assigned to ${techRajesh.name}`,
          },
          {
            status: "In Progress",
            changedBy: techRajesh._id,
            changedAt: daysAgo(18),
            note: "Work started",
          },
        ],
      },

      // --- 4 RESOLVED ---
      {
        complaintId: "CMP-S0013",
        title: "Ceiling fan sparking and regulator burning smell",
        description:
          "Sparking observed inside the fan canopy with burnt smell. Tripping the MCB breaker.",
        assetId: "AST-S002",
        location: "Tech Block A, Room 204",
        submittedBy: userRohan._id,
        status: "Resolved",
        createdAt: daysAgo(25),
        confirmedCategory: "Electrical",
        confirmedSeverity: "Critical",
        reviewedBy: adminUser._id,
        assignedTo: techRajesh._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(24, 12),
        assignmentNotes: "Replace faulty capacitor and rewire burnt lead.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userRohan._id,
            changedAt: daysAgo(25),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(24, 20),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(24, 12),
            note: `Assigned to ${techRajesh.name}`,
          },
          {
            status: "In Progress",
            changedBy: techRajesh._id,
            changedAt: daysAgo(24),
            note: "Work started",
          },
          {
            status: "Resolved",
            changedBy: techRajesh._id,
            changedAt: daysAgo(23, 12),
            note: `Resolved by ${techRajesh.name}`,
          },
        ],
      },
      {
        complaintId: "CMP-S0014",
        title: "Water cooler leaking heavily from drain valve",
        description:
          "Continuous water leak from the bottom tray drain pipe onto corridor floor.",
        assetId: "AST-S003",
        location: "Library, 2nd Floor Corridor",
        submittedBy: userDiya._id,
        status: "Resolved",
        createdAt: daysAgo(28),
        confirmedCategory: "Plumbing",
        confirmedSeverity: "Medium",
        reviewedBy: adminUser._id,
        assignedTo: techAnil._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(27, 12),
        assignmentNotes: "Check pipe fitting and drain gasket.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userDiya._id,
            changedAt: daysAgo(28),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(27, 20),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(27, 12),
            note: `Assigned to ${techAnil.name}`,
          },
          {
            status: "In Progress",
            changedBy: techAnil._id,
            changedAt: daysAgo(27),
            note: "Work started",
          },
          {
            status: "Resolved",
            changedBy: techAnil._id,
            changedAt: daysAgo(26, 12),
            note: `Resolved by ${techAnil.name}`,
          },
        ],
      },
      {
        // Admin override 2: AI suggests Electrical/Other, admin confirms Networking
        complaintId: "CMP-S0015",
        title: "Network switch power supply failure in server rack",
        description:
          "Rack switch shut down unexpectedly causing total network failure across Tech Block A.",
        assetId: "AST-S011",
        location: "Tech Block A, Server Room Rack 2",
        submittedBy: userVikram._id,
        status: "Resolved",
        createdAt: daysAgo(32),
        confirmedCategory: "Networking", // Override
        confirmedSeverity: "Critical",
        reviewedBy: adminUser._id,
        assignedTo: techSunil._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(31, 18),
        assignmentNotes:
          "Emergency switch replacement. Redundant uplink must be re-established.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userVikram._id,
            changedAt: daysAgo(32),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(31, 22),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(31, 18),
            note: `Assigned to ${techSunil.name}`,
          },
          {
            status: "In Progress",
            changedBy: techSunil._id,
            changedAt: daysAgo(31, 12),
            note: "Work started",
          },
          {
            status: "Resolved",
            changedBy: techSunil._id,
            changedAt: daysAgo(31),
            note: `Resolved by ${techSunil.name}`,
          },
        ],
      },
      {
        complaintId: "CMP-S0016",
        title: "Sewer line blockage and overflowing flush cistern",
        description:
          "Toilet flush overflowing and foul sewage smell. Blockage in the main drain outlet.",
        assetId: "AST-S013",
        location: "Student Center, Ground Floor",
        submittedBy: userAarav._id,
        status: "Resolved",
        createdAt: daysAgo(35),
        confirmedCategory: "Sanitation",
        confirmedSeverity: "High",
        reviewedBy: adminUser._id,
        assignedTo: techAnil._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(34, 12),
        assignmentNotes: "Use mechanical snake rod to clear the soil line.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userAarav._id,
            changedAt: daysAgo(35),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(34, 20),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(34, 12),
            note: `Assigned to ${techAnil.name}`,
          },
          {
            status: "In Progress",
            changedBy: techAnil._id,
            changedAt: daysAgo(34),
            note: "Work started",
          },
          {
            status: "Resolved",
            changedBy: techAnil._id,
            changedAt: daysAgo(33, 12),
            note: `Resolved by ${techAnil.name}`,
          },
        ],
      },

      // --- 2 CLOSED ---
      {
        complaintId: "CMP-S0017",
        title: "Ceiling fan noisy rattling and wobbling in room 204",
        description:
          "Fan blade loose creating loud noise and dangerous wobbling during lectures.",
        assetId: "AST-S002",
        location: "Tech Block A, Room 204",
        submittedBy: userDiya._id,
        status: "Closed",
        createdAt: daysAgo(40),
        confirmedCategory: "Electrical",
        confirmedSeverity: "Medium",
        reviewedBy: adminUser._id,
        assignedTo: techRajesh._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(39, 12),
        assignmentNotes: "Tighten blade shank screws and balance blades.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userDiya._id,
            changedAt: daysAgo(40),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(39, 20),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(39, 12),
            note: `Assigned to ${techRajesh.name}`,
          },
          {
            status: "In Progress",
            changedBy: techRajesh._id,
            changedAt: daysAgo(39),
            note: "Work started",
          },
          {
            status: "Resolved",
            changedBy: techRajesh._id,
            changedAt: daysAgo(38, 12),
            note: `Resolved by ${techRajesh.name}`,
          },
          {
            status: "Closed",
            changedBy: adminUser._id,
            changedAt: daysAgo(38),
            note: "Verified repaired by class rep and closed by admin",
          },
        ],
      },
      {
        complaintId: "CMP-S0018",
        title: "Air conditioner blower filter clogged and not cooling",
        description:
          "Split AC indoor unit airflow is extremely weak and room remains hot.",
        assetId: "AST-S006",
        location: "Tech Block A, Lab 3 (2nd Floor)",
        submittedBy: userPriya._id,
        status: "Closed",
        createdAt: daysAgo(44),
        confirmedCategory: "HVAC",
        confirmedSeverity: "Low",
        reviewedBy: adminUser._id,
        assignedTo: techRajesh._id,
        assignedBy: adminUser._id,
        assignedAt: daysAgo(43, 12),
        assignmentNotes: "Perform seasonal deep clean and filter wash.",
        statusHistory: [
          {
            status: "Submitted",
            changedBy: userPriya._id,
            changedAt: daysAgo(44),
            note: "Complaint submitted",
          },
          {
            status: "Under Review",
            changedBy: adminUser._id,
            changedAt: daysAgo(43, 20),
            note: "Reviewed by admin",
          },
          {
            status: "Assigned",
            changedBy: adminUser._id,
            changedAt: daysAgo(43, 12),
            note: `Assigned to ${techRajesh.name}`,
          },
          {
            status: "In Progress",
            changedBy: techRajesh._id,
            changedAt: daysAgo(43),
            note: "Work started",
          },
          {
            status: "Resolved",
            changedBy: techRajesh._id,
            changedAt: daysAgo(42, 12),
            note: `Resolved by ${techRajesh.name}`,
          },
          {
            status: "Closed",
            changedBy: adminUser._id,
            changedAt: daysAgo(42),
            note: "Verified cool airflow and closed by admin",
          },
        ],
      },
    ];

    // Compute AI analysis using analyzeComplaint rules service for each complaint
    const complaintsToInsert = complaintsRaw.map((raw) => {
      const targetAsset = raw.assetId ? assetMap[raw.assetId] : null;
      const analysis = analyzeComplaint({
        title: raw.title,
        description: raw.description,
        assetCategory: targetAsset?.category,
      });

      const doc = {
        complaintId: raw.complaintId,
        title: raw.title,
        description: raw.description,
        location: raw.location,
        submittedBy: raw.submittedBy,
        status: raw.status,
        createdAt: raw.createdAt,
        updatedAt:
          raw.statusHistory[raw.statusHistory.length - 1]?.changedAt ||
          raw.createdAt,
        statusHistory: raw.statusHistory,
        aiAnalysis: {
          category: analysis.category,
          severity: analysis.severity,
          possibleCauses: analysis.possibleCauses,
          source: analysis.source,
          needsReview: Boolean(analysis.needsReview),
          analyzedAt: raw.createdAt,
        },
      };

      if (targetAsset) {
        doc.asset = targetAsset._id;
      }
      if (raw.confirmedCategory) {
        doc.confirmedCategory = raw.confirmedCategory;
      }
      if (raw.confirmedSeverity) {
        doc.confirmedSeverity = raw.confirmedSeverity;
      }
      if (raw.reviewedBy) {
        doc.reviewedBy = raw.reviewedBy;
      }
      if (raw.assignedTo) {
        doc.assignedTo = raw.assignedTo;
      }
      if (raw.assignedBy) {
        doc.assignedBy = raw.assignedBy;
      }
      if (raw.assignedAt) {
        doc.assignedAt = raw.assignedAt;
      }
      if (raw.assignmentNotes) {
        doc.assignmentNotes = raw.assignmentNotes;
      }

      return doc;
    });

    const insertedComplaints = await Complaint.insertMany(complaintsToInsert, {
      timestamps: false,
    });
    const complaintMap = Object.fromEntries(
      insertedComplaints.map((c) => [c.complaintId, c])
    );

    // 4. Create 6 MaintenanceRecords for the 4 Resolved and 2 Closed complaints
    const maintenanceDefs = [
      {
        complaintId: "CMP-S0013",
        diagnosis:
          "Shorted capacitor caused overheating and scorched the motor terminal wiring.",
        actionTaken:
          "Replaced 3.15uF capacitor, re-insulated terminals, and tested bearing rotation.",
        partsUsed: "3.15uF Capacitor, heat-shrink sleeves",
        cost: 450,
        resolutionDetails:
          "Fan tested at all speeds for 30 minutes. MCB holding stable with no burning odour.",
        notes: "Recommended routine inspection of remaining 3 fans in room 204.",
        completedAt: daysAgo(23, 12),
      },
      {
        complaintId: "CMP-S0014",
        diagnosis:
          "Cracked PVC drain elbow connector due to age and vibration.",
        actionTaken:
          "Removed damaged elbow, installed reinforced CPVC coupling and Teflon sealant.",
        partsUsed: "1/2 inch CPVC elbow, Teflon tape, solvent cement",
        cost: 320,
        resolutionDetails:
          "Ran full tank drain test. Zero leakage detected around base or drip pan.",
        notes: "Drip pan cleaned and disinfected.",
        completedAt: daysAgo(26, 12),
      },
      {
        complaintId: "CMP-S0015",
        diagnosis:
          "Internal power supply unit (PSU) capacitor burst due to voltage surge.",
        actionTaken:
          "Replaced modular PSU unit with spare hot-swap unit from central inventory. Restored VLAN configurations.",
        partsUsed: "Cisco 350W Hot-swap AC Power Supply Module",
        cost: 12500,
        resolutionDetails:
          "All 24 ports link up. Ping latency verified < 1ms across all subnets.",
        notes: "UPS line 3 in server room should be audited by electrical contractor.",
        completedAt: daysAgo(31),
      },
      {
        complaintId: "CMP-S0016",
        diagnosis:
          "Heavy foreign object accumulation obstructing 4-inch sewer line trap.",
        actionTaken:
          "Cleared blockage with 25ft drain snake, descaled cistern siphon valve, and flushed line.",
        partsUsed:
          "Replacement cistern siphon washer, caustic drain clean compound",
        cost: 850,
        resolutionDetails:
          "Full flush test completed 5 times successfully with rapid drainage.",
        notes: "Requested housekeeping staff to check trash bins daily.",
        completedAt: daysAgo(33, 12),
      },
      {
        complaintId: "CMP-S0017",
        diagnosis:
          "Loose blade balancing clip and worn rubber downrod dampener.",
        actionTaken:
          "Replaced downrod rubber bush, tightened all 6 blade mounting screws with lock washers.",
        partsUsed: "Heavy-duty fan rubber bush kit, M5 lock washers",
        cost: 180,
        resolutionDetails:
          "Tested fan at maximum speed (setting 5) for 15 minutes. Silent rotation with zero wobble.",
        notes: "Downrod safety pin inspected and confirmed intact.",
        completedAt: daysAgo(38, 12),
      },
      {
        complaintId: "CMP-S0018",
        diagnosis:
          "Dense dust accumulation on mesh filters and blower wheel restricting airflow.",
        actionTaken:
          "Removed and pressure-washed nylon filters, vacuumed cooling fins, disinfected coil.",
        partsUsed: "Coil cleaner foaming spray",
        cost: 0,
        resolutionDetails:
          "Airflow restored to nominal 650 CFM. Outlet temperature dropped to 16°C.",
        notes: "In-house routine maintenance, no third-party parts cost incurred.",
        completedAt: daysAgo(42, 12),
      },
    ];

    const maintenanceRecordsToInsert = maintenanceDefs.map((def) => {
      const c = complaintMap[def.complaintId];
      return {
        complaint: c._id,
        asset: c.asset,
        technician: c.assignedTo,
        diagnosis: def.diagnosis,
        actionTaken: def.actionTaken,
        partsUsed: def.partsUsed,
        cost: def.cost,
        resolutionDetails: def.resolutionDetails,
        notes: def.notes,
        completedAt: def.completedAt,
        createdAt: def.completedAt,
        updatedAt: def.completedAt,
      };
    });

    await MaintenanceRecord.insertMany(maintenanceRecordsToInsert, {
      timestamps: false,
    });

    // Output only counts per collection and sample emails (never passwords or tokens)
    console.log("Sample seed completed successfully.");
    console.log("Collections populated:");
    console.log(`  Users: ${users.length}`);
    console.log(`  Assets: ${assets.length}`);
    console.log(`  Complaints: ${insertedComplaints.length}`);
    console.log(`  MaintenanceRecords: ${maintenanceRecordsToInsert.length}`);
    console.log("\nSample User Accounts (Password: as defined in SEED_USER_PASSWORD):");
    for (const u of users) {
      console.log(`  - [${u.role}] ${u.email} (${u.name})`);
    }
  } catch (err) {
    console.error("Seed error:", err.message);
    exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    process.exit(exitCode);
  }
}

runSeed();
