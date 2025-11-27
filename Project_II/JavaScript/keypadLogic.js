// Current Virtual Position (Tracking where we think the robot is)
var currentY = 0; // Assume starting at full extension
var currentX = 0;
const STEP_SIZE = 10; // Move 10mm per button press

// 2. DIRECTIONAL BUTTONS METHOD
function jog(direction) {
    switch(direction) {
        case 'UP':
            currentY += STEP_SIZE;
            break;
        case 'DOWN':
            currentY -= STEP_SIZE;
            break;
        case 'RIGHT':
            currentX += STEP_SIZE;
            break;
        case 'LEFT':
            currentX -= STEP_SIZE;
            break;
    }


    document.getElementById("dispX").innerText = currentX;
    document.getElementById("dispY").innerText = currentY;
    rotateRobot(currentX, currentY);

}

function setHome() {
    currentX = 0;
    currentY = L1 + L2; // 200

    if (document.getElementById('inputX')) document.getElementById('inputX').value = currentX;
    if (document.getElementById('inputY')) document.getElementById('inputY').value = currentY;

    document.getElementById("dispX").innerText = currentX;
    document.getElementById("dispY").innerText = currentY;
    moveRobotTo(currentX, currentY);
}


