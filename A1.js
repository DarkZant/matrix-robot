// ASSIGNMENT-SPECIFIC API EXTENSION
THREE.Object3D.prototype.setMatrix = function(a) {
  this.matrix = a;
  this.matrix.decompose(this.position, this.quaternion, this.scale);
};

var start = Date.now();
// SETUP RENDERER AND SCENE
var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0xffffff); // white background colour
document.body.appendChild(renderer.domElement);

// SETUP CAMERA
var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000); // view angle, aspect ratio, near, far
camera.position.set(10,5,10);
camera.lookAt(scene.position);
scene.add(camera);

// SETUP ORBIT CONTROL OF THE CAMERA
var controls = new THREE.OrbitControls(camera);
controls.damping = 0.2;

// ADAPT TO WINDOW RESIZE
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

// FLOOR WITH CHECKERBOARD
var floorTexture = new THREE.ImageUtils.loadTexture('images/tile.jpg');
floorTexture.wrapS = floorTexture.wrapT = THREE.MirroredRepeatWrapping;
floorTexture.repeat.set(4, 4);

var floorMaterial = new THREE.MeshBasicMaterial({ map: floorTexture, side: THREE.DoubleSide });
var floorGeometry = new THREE.PlaneBufferGeometry(15, 15);
var floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = Math.PI / 2;
floor.position.y = 0.0;
scene.add(floor);

// TRANSFORMATIONS

function multMat(m1, m2){
  return new THREE.Matrix4().multiplyMatrices(m1, m2);
}

function inverseMat(m){
  return new THREE.Matrix4().getInverse(m, true);
}

function idMat4() {
    // Create Identity matrix
    // TODO (check)
    var m = new THREE.Matrix4();
    m.set( 1, 0, 0, 0,
           0, 1, 0, 0,
           0, 0, 1, 0,
           0, 0, 0, 1
    )
    return m;
}

function translateMat(matrix, x, y, z) {
    // Apply translation [x, y, z] to @matrix
    // matrix: THREE.Matrix4
    // x, y, z: float

    // TODO (Check)
    var m = new THREE.Matrix4();
    m.set(
        1, 0, 0, x,
        0, 1, 0, y,
        0, 0, 1, z,
        0, 0, 0, 1
    )
    return multMat(m, matrix);
}

function rotateMat(matrix, angle, axis){
    // Apply rotation by @angle with respect to @axis to @matrix
    // matrix: THREE.Matrix4
    // angle: float
    // axis: string "x", "y" or "z"
  
    // TODO (Check)

    return multMat(getRotationMatrix(angle, axis), matrix);
}

function rotateVec3(v, angle, axis){
    // Apply rotation by @angle with respect to @axis to vector @v
    // v: THREE.Vector3
    // angle: float
    // axis: string "x", "y" or "z"

    // TODO (Check)

    return v.applyMatrix4(getRotationMatrix(angle, axis));
}

//Retourne une THREE.Matrix4 de rotation selon un angle et un axe
function getRotationMatrix(angle, axis) {
    var rotateMat = new THREE.Matrix4();
    switch(axis) {
        case "x": {
            rotateMat.set(
                1, 0, 0, 0,
                0, Math.cos(angle), -Math.sin(angle), 0,
                0, Math.sin(angle), Math.cos(angle), 0,
                0, 0, 0, 1
            );
            break;
        }
        case "y": {
            rotateMat.set(
                Math.cos(angle), 0, Math.sin(angle), 0,
                0, 1, 0, 0,
                -Math.sin(angle), 0, Math.cos(angle), 0,
                0, 0, 0, 1
            );
            break;
        }
        case "z": {
            rotateMat.set(
                Math.cos(angle), -Math.sin(angle), 0, 0,
                Math.sin(angle), Math.cos(angle), 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            );
            break;
        }
    }
    return rotateMat;
}

function rescaleMat(matrix, x, y, z){
    // Apply scaling @x, @y and @z to @matrix
    // matrix: THREE.Matrix4
    // x, y, z: float

    // TODO (Check)
    var scaleMat = new THREE.Matrix4();
    scaleMat.set(
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,
        0, 0, 0, 1
    );

    return multMat(scaleMat, matrix);
}

class Robot {
    constructor() {
        // Geometry

        this.overlapConst = 0.2 // Constante pour "overlap" les articulations des jambes et des bras

        // Torso
        this.torsoHeight = 1.5;
        this.torsoRadius = 0.75;

        // Head
        this.headRadius = 0.32;
        // Add parameters for parts
        // TODO (check)

        // Arms
        this.armsScaleY = 2.25;
        this.armsRadius = 0.2;
        this.armsHeight = this.armsScaleY * this.armsRadius * 2;

        // // Forearms
        this.forearmsScaleY = 2.25;
        this.forearmsRadius = 0.175;

        // Thighs
        this.thighsScaleY = 2.55;
        this.thighsRadius = 0.25;
        this.thighsHeight = this.thighsScaleY * this.thighsRadius * 2;

        // Legs
        this.legsScaleY = 2.5;
        this.legsRadius = 0.22;
        this.legsHeight = this.legsScaleY * this.legsRadius * 2;

        // Animation
        this.walkDirection = new THREE.Vector3( 0, 0, 1 );

        // Material
        this.material = new THREE.MeshNormalMaterial();

        // Initial pose
        this.initialize()
    }

    initialTorsoMatrix(){
        var initialTorsoMatrix = idMat4();
        initialTorsoMatrix = translateMat(initialTorsoMatrix, 0,this.torsoRadius + this.legsHeight + this.thighsHeight - this.overlapConst, 0);

        return initialTorsoMatrix;
    }

    initialHeadMatrix(){
        var initialHeadMatrix = idMat4();
        initialHeadMatrix = translateMat(initialHeadMatrix, 0, this.torsoRadius + this.headRadius, 0);

        return initialHeadMatrix;
    }

    initialArmsMatrix(isRightSide){
        var initialArmsMatrix = idMat4();
        var scaleMatrix = rescaleMat(initialArmsMatrix, 1, this.armsScaleY, 1)
        var translateMatrix = translateMat(initialArmsMatrix, (isRightSide? 1:-1)*(this.torsoRadius + this.armsRadius), this.torsoRadius/2, 0);
        initialArmsMatrix = multMat(translateMatrix, scaleMatrix)

        return initialArmsMatrix;
    }

    initialForearmsMatrix(isRightSide){
         var initialForearmsMatrix = idMat4();
         var scaleMatrix = rescaleMat(initialForearmsMatrix, 1, this.forearmsScaleY, 1)
         var translateMatrix = translateMat(initialForearmsMatrix, (isRightSide? 1:-1)*(this.torsoRadius + this.armsRadius), this.torsoRadius/2 - this.armsHeight + this.overlapConst, 0);
         initialForearmsMatrix = multMat(translateMatrix, scaleMatrix)

        return initialForearmsMatrix;
    }

    initialThighsMatrix(isRightSide){
        var initialThighsMatrix = idMat4();
        var scaleMatrix = rescaleMat(initialThighsMatrix, 1, this.thighsScaleY, 1)
        var translateMatrix = translateMat(initialThighsMatrix, (isRightSide? 1:-1)*(this.torsoRadius/4 + this.thighsRadius), -this.torsoHeight + this.overlapConst, 0);
        initialThighsMatrix = multMat(translateMatrix, scaleMatrix)

        return initialThighsMatrix;
    }

    initialLegsMatrix(isRightSide){
        var initialLegsMatrix = idMat4();
        var scaleMatrix = rescaleMat(initialLegsMatrix, 1, this.legsScaleY, 1)
        var translateMatrix = translateMat(initialLegsMatrix, (isRightSide? 1:-1)*(this.torsoRadius/4 + this.thighsRadius), -this.torsoHeight - this.thighsHeight/2 - this.overlapConst, 0);
        initialLegsMatrix = multMat(translateMatrix, scaleMatrix)

        return initialLegsMatrix;
    }

    initialize() {
        // Torso
        var torsoGeometry = new THREE.CubeGeometry(this.torsoHeight, this.torsoHeight, this.torsoRadius, 64);
        this.torso = new THREE.Mesh(torsoGeometry, this.material);

        // Head
        var headGeometry = new THREE.CubeGeometry(2*this.headRadius, this.headRadius, this.headRadius);
        this.head = new THREE.Mesh(headGeometry, this.material);

        // Add parts
        // TODO (check)

        // Arms
        var armsGeometry = new THREE.SphereGeometry(this.armsRadius, 30, 30)
        this.leftArm = new THREE.Mesh(armsGeometry, this.material);
        this.rightArm = new THREE.Mesh(armsGeometry, this.material);

        // Forearms
        var forearmsGeometry = new THREE.SphereGeometry(this.forearmsRadius, 30, 30)
        this.leftForearm = new THREE.Mesh(forearmsGeometry, this.material);
        this.rightForearm = new THREE.Mesh(forearmsGeometry, this.material);

        // Thighs
        var thighsGeometry = new THREE.SphereGeometry(this.thighsRadius, 30, 30)
        this.leftThigh = new THREE.Mesh(thighsGeometry, this.material);
        this.rightThigh = new THREE.Mesh(thighsGeometry, this.material);

        // Legs
        var legsGeometry = new THREE.SphereGeometry(this.legsRadius, 30, 30)
        this.leftLeg = new THREE.Mesh(legsGeometry, this.material);
        this.rightLeg = new THREE.Mesh(legsGeometry, this.material);


        // Transformations

        // Torso transformation
        this.torsoInitialMatrix = this.initialTorsoMatrix();
        this.torsoMatrix = idMat4();
        this.torso.setMatrix(this.torsoInitialMatrix);

        // Head transformation
        this.headInitialMatrix = this.initialHeadMatrix();
        this.headMatrix = idMat4();
        this.head.setMatrix(multMat(this.torsoInitialMatrix, this.headInitialMatrix));

        // Add transformations
        // TODO

        // Arms transformations
        this.rightArmInitialMatrix = this.initialArmsMatrix(true);
        this.leftArmInitialMatrix = this.initialArmsMatrix(false);
        this.leftArmMatrix = idMat4();
        this.rightArmMatrix = idMat4();
        this.rightArm.setMatrix(multMat(this.torsoInitialMatrix, this.rightArmInitialMatrix));
        this.leftArm.setMatrix(multMat(this.torsoInitialMatrix, this.leftArmInitialMatrix));

        // Forearms transformations
        this.rightForearmInitialMatrix = this.initialForearmsMatrix(true);
        this.leftForearmInitialMatrix = this.initialForearmsMatrix(false);
        this.leftForearmMatrix = idMat4();
        this.rightForearmMatrix = idMat4();
        this.rightForearm.setMatrix(multMat(this.torsoInitialMatrix, this.rightForearmInitialMatrix));
        this.leftForearm.setMatrix(multMat(this.torsoInitialMatrix, this.leftForearmInitialMatrix));

        // Thighs transformations
        this.rightThighInitialMatrix = this.initialThighsMatrix(true);
        this.leftThighInitialMatrix = this.initialThighsMatrix(false);
        this.leftThighMatrix = idMat4();
        this.rightThighMatrix = idMat4();
        this.rightThigh.setMatrix(multMat(this.torsoInitialMatrix, this.rightThighInitialMatrix));
        this.leftThigh.setMatrix(multMat(this.torsoInitialMatrix, this.leftThighInitialMatrix));

        // Legs transformations
        this.rightLegInitialMatrix = this.initialLegsMatrix(true);
        this.leftLegInitialMatrix = this.initialLegsMatrix(false);
        this.leftForearmMatrix = idMat4();
        this.rightForearmMatrix = idMat4();
        this.rightLeg.setMatrix(multMat(this.torsoInitialMatrix, this.rightLegInitialMatrix));
        this.leftLeg.setMatrix(multMat(this.torsoInitialMatrix, this.leftLegInitialMatrix));



        // Add robot to scene
        scene.add(this.torso);
        scene.add(this.head);
        // Add parts
        // TODO (check)
        scene.add(this.leftForearm);
        scene.add(this.rightForearm);
        scene.add(this.leftArm);
        scene.add(this.rightArm);
        scene.add(this.leftThigh);
        scene.add(this.rightThigh);
        scene.add(this.leftLeg);
        scene.add(this.rightLeg);
    }

  rotateTorso(angle){
    var torsoMatrix = this.torsoMatrix;

    this.torsoMatrix = idMat4();
    this.torsoMatrix = rotateMat(this.torsoMatrix, angle, "y");
    this.torsoMatrix = multMat(torsoMatrix, this.torsoMatrix);

    var matrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);
    this.torso.setMatrix(matrix);

    var matrix2 = multMat(this.headMatrix, this.headInitialMatrix);
    matrix = multMat(matrix, matrix2);
    this.head.setMatrix(matrix);

    this.walkDirection = rotateVec3(this.walkDirection, angle, "y");
  }

  moveTorso(speed){
    this.torsoMatrix = translateMat(this.torsoMatrix, speed * this.walkDirection.x, speed * this.walkDirection.y, speed * this.walkDirection.z);

    var matrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);
    this.torso.setMatrix(matrix);

    var matrix2 = multMat(this.headMatrix, this.headInitialMatrix);
    matrix = multMat(matrix, matrix2);
    this.head.setMatrix(matrix);
  }

  rotateHead(angle){
    var headMatrix = this.headMatrix;

    this.headMatrix = idMat4();
    this.headMatrix = rotateMat(this.headMatrix, angle, "y");
    this.headMatrix = multMat(headMatrix, this.headMatrix);

    var matrix = multMat(this.headMatrix, this.headInitialMatrix);
    matrix = multMat(this.torsoMatrix, matrix);
    matrix = multMat(this.torsoInitialMatrix, matrix);
    this.head.setMatrix(matrix);
  }

  // Add methods for other parts
  // TODO

  look_at(point){
    // Compute and apply the correct rotation of the head and the torso for the robot to look at @point
      //TODO
  }
}

var robot = new Robot();

// LISTEN TO KEYBOARD
var keyboard = new THREEx.KeyboardState();

var selectedRobotComponent = 0;
var components = [
    "Torso",
    "Head",
    // Add parts names
    // TODO (check)
    "LeftForearm",
    "RightForearm",
    "LeftArm",
    "RightArm",
    "LeftThigh",
    "RightThigh",
    "LeftLeg",
    "RightLeg"
];
var numberComponents = components.length;

//MOUSE EVENTS
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var sphere = null;

document.addEventListener('mousemove', onMouseMove, false);

var isRightButtonDown = false;

function checkKeyboard() {
  // Next element
  if (keyboard.pressed("e")){
    selectedRobotComponent = selectedRobotComponent + 1;

    if (selectedRobotComponent<0){
      selectedRobotComponent = numberComponents - 1;
    }

    if (selectedRobotComponent >= numberComponents){
      selectedRobotComponent = 0;
    }

    window.alert(components[selectedRobotComponent] + " selected");
  }

  // Previous element
  if (keyboard.pressed("q")){
    selectedRobotComponent = selectedRobotComponent - 1;

    if (selectedRobotComponent < 0){
      selectedRobotComponent = numberComponents - 1;
    }

    if (selectedRobotComponent >= numberComponents){
      selectedRobotComponent = 0;
    }

    window.alert(components[selectedRobotComponent] + " selected");
  }

  // UP
  if (keyboard.pressed("w")){
    switch (components[selectedRobotComponent]){
      case "Torso":
        robot.moveTorso(0.1);
        break;
      case "Head":
        break;
      // Add more cases
      // TODO
    }
  }

  // DOWN
  if (keyboard.pressed("s")){
    switch (components[selectedRobotComponent]){
      case "Torso":
        robot.moveTorso(-0.1);
        break;
      case "Head":
        break;
      // Add more cases
      // TODO
    }
  }

  // LEFT
  if (keyboard.pressed("a")){
    switch (components[selectedRobotComponent]){
      case "Torso":
        robot.rotateTorso(0.1);
        break;
      case "Head":
        robot.rotateHead(0.1);
        break;
      // Add more cases
      // TODO
    }
  }

  // RIGHT
  if (keyboard.pressed("d")){
    switch (components[selectedRobotComponent]){
      case "Torso":
        robot.rotateTorso(-0.1);
        break;
      case "Head":
        robot.rotateHead(-0.1);
        break;
      // Add more cases
      // TODO
    }
  }

    if (keyboard.pressed("f")) {
        isRightButtonDown = true;

        var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);

        vector.unproject(camera);

        var dir = vector.sub(camera.position).normalize();

        raycaster.ray.origin.copy(camera.position);
        raycaster.ray.direction.copy(dir);

        var intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            if (!sphere) {
                var geometry = new THREE.SphereGeometry(0.1, 32, 32);
                var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                sphere = new THREE.Mesh(geometry, material);
                scene.add(sphere);
            }
        }

        updateLookAtPosition();
    }
    else{
        isRightButtonDown = false;

        if (sphere) {
            scene.remove(sphere);
            sphere.geometry.dispose();
            sphere.material.dispose();
            sphere = null;
        }
    }
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    if (isRightButtonDown) {
        updateLookAtPosition();
    }
}

function updateLookAtPosition() {
    var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);

    vector.unproject(camera);

    var dir = vector.sub(camera.position).normalize();

    raycaster.ray.origin.copy(camera.position);
    raycaster.ray.direction.copy(dir);

    var intersects = raycaster.intersectObjects(scene.children.filter(obj => obj !== sphere), true);

    if (intersects.length > 0) {
        var intersect = intersects[0]
        sphere.position.copy(intersect.point);
        robot.look_at(intersect.point);
    }
}

// SETUP UPDATE CALL-BACK
function update() {
  checkKeyboard();
  requestAnimationFrame(update);
  renderer.render(scene, camera);
}

update();
