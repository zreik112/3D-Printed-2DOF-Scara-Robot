#include <Arduino.h>
#include <AccelStepper.h>

// --- CONFIGURATION ---
// Adjust these pins to match your wiring
// (Example: CNC Shield V3 mappings for X and Y drivers)
#define MOTOR_X_STEP_PIN 2
#define MOTOR_X_DIR_PIN  3
#define MOTOR_Y_STEP_PIN 4
#define MOTOR_Y_DIR_PIN  5

// Define stepper types (1 = Driver with Step/Dir pins)
AccelStepper stepper1(1, MOTOR_X_STEP_PIN, MOTOR_X_DIR_PIN);
AccelStepper stepper2(1, MOTOR_Y_STEP_PIN, MOTOR_Y_DIR_PIN);
 
// Global buffers
const int MAX_SPEED = 1000;
const int ACCELERATION = 500;

void setup() {
  // 1. Initialize Serial to match JS baudRate
  Serial.begin(115200);
  
  // PlatformIO usually requires a slight delay to stabilize Serial on some boards
  delay(100); 

  // 2. Setup Motors (Shoulder)
  stepper1.setMaxSpeed(MAX_SPEED);
  stepper1.setAcceleration(ACCELERATION);

  // 3. Setup Motors (Elbow)
  stepper2.setMaxSpeed(MAX_SPEED);
  stepper2.setAcceleration(ACCELERATION);
}

void loop() {
  // --- PART 1: READ COMMANDS ---
  if (Serial.available() > 0) {
    char cmd = Serial.read(); // Read the first letter

    // Check if the command is 'M' (Move)
    if (cmd == 'M') {
      
      // Serial.parseInt() looks for the next integer
      long target1 = Serial.parseInt(); 
      long target2 = Serial.parseInt();

      // Set the new target positions
      stepper1.moveTo(target1);
      stepper2.moveTo(target2);

      // Optional: Echo back for debugging
      // Serial.print("Moving: "); Serial.print(target1); Serial.print(" "); Serial.println(target2);
    }
    
    // Clear buffer of any leftover characters/newlines
    while(Serial.available() > 0) { Serial.read(); }
  }

  // --- PART 2: MOVE MOTORS ---
  stepper1.run();
  stepper2.run();
}