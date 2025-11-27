// ============================================================
// RobotLogic.js  – SCARA 2DOF control + WebSerial
// ============================================================

// ---------------- GLOBAL CONFIGURATION ----------------
let port, writer;

// --- Geometry (mm) ---
const L1 = 100; // First link length
const L2 = 100; // Second link length

// --- Motor & Hardware ---
const STEPS_PER_REV = 1600; // Motor steps per full motor rev (incl. microstepping)

// Gear ratios: jointAngle_deg -> motorAngle_deg = jointAngle_deg * gearRatio
const GEAR_RATIO_J1 = 3;  // J1 has 3:1 reduction (motor turns 3x faster)
const GEAR_RATIO_J2 = 1;  // J2 direct drive (change if you have a gearbox)

// --- Joint Limits (to avoid crossing your "wall") ---
// Here we allow the arm only in front: 0° (right) to 180° (left), passing through up.
// Adjust these if needed.
const THETA1_MIN = 0;    // deg
const THETA1_MAX = 180;  // deg

// --- Angle Offsets (math frame -> motor frame) ---
// Math IK uses 0° along +X.
// Your home is at (x=0, y=200). For equal links, IK gives ~90° there.
// But your J1 motor is 0° at home, so motorAngle = mathAngle - 90
const THETA1_ZERO_OFFSET = 90;  // math 90° → motor 0°
const THETA2_ZERO_OFFSET = 0;   // adjust if elbow zero is different

// --- State tracking (for choosing minimal rotation solution) ---
let currentTheta1 = 90; // Start assuming home at 90° (straight up)

// ============================================================
// SERIAL COMMUNICATION
// ============================================================

async function connectRobot() {
    try {
        const authorizedPorts = await navigator.serial.getPorts();
        if (authorizedPorts.length > 0) {
            port = authorizedPorts[0];
            console.log("Found authorized port.");
        } else {
            port = await navigator.serial.requestPort();
        }

        await port.open({ baudRate: 115200 });

        const textEncoder = new TextEncoderStream();
        textEncoder.readable.pipeTo(port.writable);
        writer = textEncoder.writable.getWriter();

        const statusEl = document.getElementById("status");
        if (statusEl) statusEl.innerText = "Status: Connected!";
    } catch (e) {
        console.error("Connection Failed", e);
        alert("Connection failed or cancelled.");
    }
}

async function sendRawString(dataString) {
    if (writer) {
        await writer.write(dataString + "\n");
    } else {
        console.warn("Not connected");
    }
}

// ============================================================
// UTILS
// ============================================================

// Normalize to [-180, 180)
function normalizeAngle(angle) {
    angle = ((angle + 180) % 360 + 360) % 360 - 180;
    return angle;
}

// Convert joint *motor* degrees to steps with gear ratio
function degreesToSteps(degrees, gearRatio) {
    // (degrees / 360) * STEPS_PER_REV * gearRatio
    return Math.round((degrees / 360) * STEPS_PER_REV * gearRatio);
}

// ============================================================
// INVERSE KINEMATICS (2 solutions + joint limit selection)
// ============================================================

function inverseKinematics(x, y) {
    const r = Math.sqrt(x * x + y * y);

    // Reach check
    if (r > (L1 + L2) + 0.1) {
        console.warn("IK: Outside reach", x, y);
        return null;
    }

    // Law of cosines for elbow
    let cosTheta2 = (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2);
    cosTheta2 = Math.max(-1, Math.min(1, cosTheta2)); // clamp for safety

    // Two possible elbow configs
    const theta2a = Math.acos(cosTheta2);   // elbow-down
    const theta2b = -theta2a;               // elbow-up

    function solve(theta2_rad) {
        const k1 = L1 + L2 * Math.cos(theta2_rad);
        const k2 = L2 * Math.sin(theta2_rad);
        const theta1_rad = Math.atan2(y, x) - Math.atan2(k2, k1);

        let theta1_deg = theta1_rad * 180 / Math.PI;
        let theta2_deg = theta2_rad * 180 / Math.PI;

        theta1_deg = normalizeAngle(theta1_deg);
        theta2_deg = normalizeAngle(theta2_deg);

        return { theta1: theta1_deg, theta2: theta2_deg };
    }

    const solA = solve(theta2a);
    const solB = solve(theta2b);

    // Joint limit check for J1
    const validA = (solA.theta1 >= THETA1_MIN && solA.theta1 <= THETA1_MAX);
    const validB = (solB.theta1 >= THETA1_MIN && solB.theta1 <= THETA1_MAX);

    if (validA && !validB) return solA;
    if (!validA && validB) return solB;

    if (validA && validB) {
        // Both valid: pick one closest to currentTheta1 to avoid big spins
        const dA = Math.abs(normalizeAngle(solA.theta1 - currentTheta1));
        const dB = Math.abs(normalizeAngle(solB.theta1 - currentTheta1));
        return dA <= dB ? solA : solB;
    }

    // Neither solution respects J1 limits
    console.warn("IK: Both solutions violate J1 limits", solA, solB);
    return null;
}

// ============================================================
// HIGH-LEVEL MOVE COMMAND
// ============================================================

async function moveRobotTo(x, y) {
    console.log("moveRobotTo:", x, y);

    const angles = inverseKinematics(x, y);

    if (!angles) {
        alert("Target unreachable or violates joint limits.");
        return;
    }

    // Update currentTheta1 so IK can pick consistent solutions next time
    currentTheta1 = angles.theta1;

    // Convert math angles to motor frame (offsets)
    const theta1Motor = angles.theta1 - THETA1_ZERO_OFFSET;
    const theta2Motor = angles.theta2 - THETA2_ZERO_OFFSET;

    if (isNaN(theta1Motor) || isNaN(theta2Motor)) {
        console.error("NaN in motor angles:", { x, y, angles, theta1Motor, theta2Motor });
        return;
    }

    // Convert motor degrees to steps using gear ratios
    const step1 = degreesToSteps(-theta1Motor, GEAR_RATIO_J1);
    const step2 = degreesToSteps(-theta2Motor, GEAR_RATIO_J2);

    if (isNaN(step1) || isNaN(step2)) {
        console.error("NaN in steps:", { theta1Motor, theta2Motor, step1, step2 });
        return;
    }

    const command = `M,${step1},${step2}`;
    console.log("Sending:", command);
    await sendRawString(command);

    // UI feedback if the elements exist
    const d1 = document.getElementById("dispTheta1");
    const d2 = document.getElementById("dispTheta2");
    if (d1) d1.innerText = angles.theta1.toFixed(2);
    if (d2) d2.innerText = angles.theta2.toFixed(2);
}

// ============================================================
// DIRECT ROTATION (manual joint control, degrees in *motor* frame)
// ============================================================

async function rotateRobot(j1MotorDeg, j2MotorDeg) {
    // j1MotorDeg / j2MotorDeg are direct motor-frame degrees
    const step1 = degreesToSteps(j1MotorDeg, GEAR_RATIO_J1);
    const step2 = degreesToSteps(j2MotorDeg, GEAR_RATIO_J2);

    const command = `M,${step1},${step2}`;
    console.log("Sending (rotateRobot):", command);
    await sendRawString(command);
}
