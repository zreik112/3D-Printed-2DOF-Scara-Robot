function handleZoneClick(event) {
    // 1. Get raw click position
    let rawX = event.offsetX;
    let rawY = event.offsetY;

    // 2. SHIFT COORDINATES (Canvas Center = 200, 200)
    let robotX = rawX - 200;
    let robotY = 200 - rawY;

    // 3. SAFETY CHECK (Radius)
    let distance = Math.sqrt(robotX * robotX + robotY * robotY);
    if (distance > (L1 + L2)) {
        alert("Clicked outside the safe zone!");
        return; 
    }

    // 4. Update the Display
    if(document.getElementById('dispX')) document.getElementById('dispX').innerText = robotX;
    if(document.getElementById('dispY')) document.getElementById('dispY').innerText = robotY;

    // 5. Move the visual dot
    let dot = document.getElementById('target-dot');
    if(dot) {
        dot.style.display = 'block';
        dot.style.left = (rawX - 5) + "px"; 
        dot.style.top = (rawY - 5) + "px";
    }

    // 6. EXECUTE MOVE (Uses function from kinematics.js)
    console.log(`Manual Move: ${robotX}, ${robotY}`);
    moveRobotTo(robotX, robotY);
}

// Initialize Listener
document.addEventListener('DOMContentLoaded', function() {
    const zone = document.getElementById('zone');
    if (zone) {
        zone.addEventListener('click', handleZoneClick);
    }
});