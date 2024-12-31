// ASSIGNMENT-SPECIFIC API EXTENSION
THREE.Object3D.prototype.setMatrix = function(a) {
  this.matrix = a;
  this.matrix.decompose(this.position, this.quaternion, this.scale);
};

var start = Date.now();
// SETUP RENDERER AND SCENE
var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer();
// Skybox
// Load the skybox textures
var textureCube = THREE.ImageUtils.loadTextureCube([
    'Images/Skybox/px.png', // +X
    'Images/Skybox/nx.png', // -X
    'Images/Skybox/py.png', // +Y
    'Images/Skybox/ny.png', // -Y
    'Images/Skybox/pz.png', // +Z
    'Images/Skybox/nz.png'  // -Z
]);

// Set the cube texture as the background material
var shader = THREE.ShaderLib['cube'];
shader.uniforms['tCube'].value = textureCube;

var skyboxMaterial = new THREE.ShaderMaterial({
    fragmentShader: shader.fragmentShader,
    vertexShader: shader.vertexShader,
    uniforms: shader.uniforms,
    depthWrite: false,
    side: THREE.BackSide
});

// Create a cube for the skybox
var skyboxGeometry = new THREE.BoxGeometry(10000, 10000, 10000);
var skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);

// Add the skybox to the scene
scene.add(skybox);

// renderer.setClearColor(0xFFFFFF); // white background colour
document.body.appendChild(renderer.domElement);

// SETUP CAMERA
var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 10500); // view angle, aspect ratio, near, far
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
var floorGeometry = new THREE.PlaneBufferGeometry(50, 50);
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
        this.armMaxAngleX = 1.18;
        this.armMaxAngleZ = 2.5;
        this.armMinAngleX = -2.5;
        this.walkArmMinAngleX = -1.18;
        this.armMinAngleZ = 0;
        this.hasReachedMax = false;

        // Forearms
        this.forearmsScaleY = 2.5;
        this.forearmsRadius = 0.175;
        this.forearmsHeight = this.forearmsScaleY * this.forearmsRadius * 2;
        this.forearmMaxAngle = 0;
        this.forearmMinAngle = -2.5;

        // Thighs
        this.thighsScaleY = 2.55;
        this.thighsRadius = 0.25;
        this.thighsHeight = this.thighsScaleY * this.thighsRadius * 2;
        this.thighMaxAngle = 0.79;
        this.thighMinAngle = -0.79;

        // Legs
        this.legsScaleY = 2.5;
        this.legsRadius = 0.22;
        this.legsHeight = this.legsScaleY * this.legsRadius * 2;
        this.legMaxAngle = 2;
        this.legMinAngle = 0;

        // Animation
        this.walkDirection = new THREE.Vector3( 0, 0, 1 );

        // Material
        this.material = new THREE.MeshNormalMaterial();

        // Initial pose
        this.initialize()
    }

    initialTorsoMatrix(){
        var initialTorsoMatrix = idMat4();
        initialTorsoMatrix = translateMat(initialTorsoMatrix, 0,this.torsoRadius + this.legsHeight + this.thighsHeight - this.overlapConst * 1.875, 0);

        return initialTorsoMatrix;
    }

    initialHeadMatrix(){
        var initialHeadMatrix = idMat4();
        initialHeadMatrix = translateMat(initialHeadMatrix, 0, this.torsoRadius + this.headRadius, 0);

        return initialHeadMatrix;
    }


    initialize() {
        // Torso
        var torsoGeometry = new THREE.BoxGeometry(this.torsoHeight, this.torsoHeight, this.torsoRadius, 64);
        this.torso = new THREE.Mesh(torsoGeometry, this.material);

        // Head
        var headGeometry = new THREE.BoxGeometry(2*this.headRadius, this.headRadius, this.headRadius);
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
        // TODO (check)

        // Arms transformations
        this.leftArmInitialTMatrix = translateMat(idMat4(), (this.torsoRadius + this.armsRadius), this.torsoRadius/2, 0);
        this.rightArmInitialTMatrix = translateMat(idMat4(), -(this.torsoRadius + this.armsRadius), this.torsoRadius/2, 0);
        this.armInitialSMatrix = rescaleMat(idMat4(), 1, this.armsScaleY, 1);
        this.leftArmInitialMatrix = multMat(this.leftArmInitialTMatrix, this.armInitialSMatrix);
        this.rightArmInitialMatrix = multMat(this.rightArmInitialTMatrix, this.armInitialSMatrix);
        this.leftArmMatrix = idMat4();
        this.rightArmMatrix = idMat4();
        this.leftArm.setMatrix(multMat(this.torsoInitialMatrix, this.leftArmInitialMatrix));
        this.rightArm.setMatrix(multMat(this.torsoInitialMatrix, this.rightArmInitialMatrix));
        this.leftArmXAngle = 0;
        this.leftArmZAngle = 0;
        this.rightArmXAngle = 0;
        this.rightArmZAngle = 0;

        // Forearms transformations
        this.forearmInitialTMatrix = translateMat(idMat4(), 0, -this.forearmsHeight + this.overlapConst, 0);
        this.forearmInitialSMatrix =  rescaleMat(idMat4(), 1, this.forearmsScaleY, 1)
        this.forearmInitialMatrix = multMat(this.forearmInitialTMatrix, this.forearmInitialSMatrix);
        this.leftForearmMatrix = idMat4();
        this.rightForearmMatrix = idMat4();
        this.leftForearm.setMatrix(multMat(multMat(this.torsoInitialMatrix, this.leftArmInitialTMatrix), this.forearmInitialMatrix));
        this.rightForearm.setMatrix(multMat(multMat(this.torsoInitialMatrix, this.rightArmInitialTMatrix), this.forearmInitialMatrix));
        this.leftForearmAngle = 0;
        this.rightForearmAngle = 0;

        // Thighs transformations
        this.leftThighInitialTMatrix =  translateMat(idMat4(), this.torsoRadius/4 + this.thighsRadius, -this.torsoHeight + this.overlapConst, 0);
        this.rightThighInitialTMatrix = translateMat(idMat4(), -(this.torsoRadius/4 + this.thighsRadius), -this.torsoHeight + this.overlapConst, 0);
        this.thighInitialSMatrix = rescaleMat(idMat4(), 1, this.thighsScaleY, 1);
        this.leftThighInitialMatrix = multMat(this.leftThighInitialTMatrix, this.thighInitialSMatrix);
        this.rightThighInitialMatrix = multMat(this.rightThighInitialTMatrix, this.thighInitialSMatrix);
        this.leftThighMatrix = idMat4();
        this.rightThighMatrix = idMat4();
        this.leftThigh.setMatrix(multMat(this.torsoInitialMatrix, this.leftThighInitialMatrix));
        this.rightThigh.setMatrix(multMat(this.torsoInitialMatrix, this.rightThighInitialMatrix));
        this.leftThighAngle = 0;
        this.rightThighAngle = 0;

        // Legs transformations
        this.legInitialTMatrix = translateMat(idMat4(), 0, -this.legsHeight + this.overlapConst, 0);
        this.legInitialSMatrix = rescaleMat(idMat4(), 1, this.legsScaleY, 1);
        this.legInitialMatrix = multMat(this.legInitialTMatrix, this.legInitialSMatrix);
        this.leftLegMatrix = idMat4();
        this.rightLegMatrix = idMat4();
        this.leftLeg.setMatrix(multMat(multMat(this.torsoInitialMatrix, this.leftThighInitialTMatrix), this.legInitialMatrix));
        this.rightLeg.setMatrix(multMat(multMat(this.torsoInitialMatrix, this.rightThighInitialTMatrix), this.legInitialMatrix));
        this.leftLegAngle = 0;
        this.rightLegAngle = 0;



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

        this.walkDirection = rotateVec3(this.walkDirection, angle, "y");

        this.moveAllWithTorso();

    }

    forwardAnimation(){
        // Thighs animation
        this.rotateThigh(true, 0.03)
        this.rotateThigh(false, -0.03)

        // Legs animation
        this.rotateLeg(true, 0.03)
        this.rotateLeg(false, -0.03)

        // Arms animation
        this.rotateArm(true, -0.06, "x")
        this.rotateArm(false, 0.06, "x")

        // Forearms animation
        this.rotateForearm(true, -0.03)
        this.rotateForearm(false, 0.03)
    }

    backwardAnimation(){
        // Thighs animation
        this.rotateThigh(true, -0.03)
        this.rotateThigh(false, 0.03)

        // Legs animation
        this.rotateLeg(true, -0.03)
        this.rotateLeg(false, 0.03)

        // Arms animation
        this.rotateArm(true, 0.06, "x")
        this.rotateArm(false, -0.06, "x")

        // Forearms animation
        this.rotateForearm(true, 0.03)
        this.rotateForearm(false, -0.03)
    }

    updateGroundTouch(){
        var torsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);

        var leftLegMatrix = multMat(this.leftLegMatrix, this.legInitialMatrix);
        var leftThighMatrix = multMat(this.leftThighMatrix, this.leftThighInitialTMatrix);
        var leftThighPosMatrix = multMat(torsoMatrix, leftThighMatrix);
        var leftLegPosMatrix = multMat(leftThighPosMatrix, leftLegMatrix);

        var rightLegMatrix = multMat(this.rightLegMatrix, this.legInitialMatrix);
        var rightThighMatrix = multMat(this.rightThighMatrix, this.rightThighInitialTMatrix);
        var rightThighPosMatrix = multMat(torsoMatrix, rightThighMatrix);
        var rightLegPosMatrix = multMat(rightThighPosMatrix, rightLegMatrix);

        var leftLegPosY = leftLegPosMatrix.elements[13];
        var rightLegPosY = rightLegPosMatrix.elements[13];

        let centerLeftLegGroundHyp = leftLegPosY / Math.cos(this.leftThighAngle + this.leftLegAngle);
        let bottomLeftLegGroundHyp = centerLeftLegGroundHyp - this.legsHeight/2;
        var bottomLeftLegPosY = Math.cos(this.leftThighAngle + this.leftLegAngle) * bottomLeftLegGroundHyp;

        let centerRightLegGroundHyp = rightLegPosY / Math.cos(this.rightThighAngle + this.rightLegAngle);
        let bottomRightLegGroundHyp = centerRightLegGroundHyp - this.legsHeight/2;
        var bottomRightLegPosY = Math.cos(this.rightThighAngle + this.rightLegAngle) * bottomRightLegGroundHyp;

        let supportLegY = Math.min(bottomRightLegPosY, bottomLeftLegPosY)

        // Solution ground clipping
        let torsoPosY = torsoMatrix.elements[13];
        if (torsoPosY - supportLegY + 0.01 < 1.825)
            return


        this.torsoMatrix = translateMat(this.torsoMatrix, 0, -supportLegY + 0.01, 0);

        var finalTorsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);
        this.torso.setMatrix(finalTorsoMatrix);
    }


    moveTorso(speed){
        let torsoMatrix = translateMat(this.torsoMatrix, speed * this.walkDirection.x, speed * this.walkDirection.y, speed * this.walkDirection.z);

        let torsoX = torsoMatrix.elements[12];
        let torsoZ = torsoMatrix.elements[14];
        console.log(torsoX, torsoZ);
        if (Math.abs(torsoX) > 25 || Math.abs(torsoZ) > 25)
            return torsoX;

        this.torsoMatrix = torsoMatrix;
        var matrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);
        this.torso.setMatrix(matrix);

        // WALK ANIMATION

        if(speed > 0){ // Robot marche vers l'avant

            if(this.leftArmXAngle < this.walkArmMinAngleX){
                this.hasReachedMax = true
            }

            if(this.leftArmXAngle >= this.armMaxAngleX - 0.07){
                this.hasReachedMax = false
            }

            if(!this.hasReachedMax){
                this.forwardAnimation()
                this.updateGroundTouch()
            } else{
                this.backwardAnimation()
                this.updateGroundTouch()
            }

        } else{ // Robot marche vers l'arrière

            if(this.leftArmXAngle < this.walkArmMinAngleX){
                this.hasReachedMax = false
            }

            if(this.leftArmXAngle >= this.armMaxAngleX - 0.1){
                this.hasReachedMax = true
            }

            if(this.hasReachedMax){
                this.forwardAnimation()
                this.updateGroundTouch()
            } else{
                this.backwardAnimation()
                this.updateGroundTouch()
            }

        }

        this.moveAllWithTorso();
    }

    moveAllWithTorso() {
        var torsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix)

        // Head
        var headMatrix = multMat(this.headMatrix, this.headInitialMatrix);
        headMatrix = multMat(torsoMatrix, headMatrix);
        this.head.setMatrix(headMatrix);

        // Left Arm and Forearm
        var leftArmMatrix = multMat(torsoMatrix, multMat(this.leftArmMatrix, this.leftArmInitialMatrix))
        this.leftArm.setMatrix(leftArmMatrix);

        var leftArmMatrixT = multMat(this.leftArmMatrix, this.leftArmInitialTMatrix);
        leftArmMatrixT = multMat(torsoMatrix, leftArmMatrixT);
        this.leftForearm.setMatrix(multMat(leftArmMatrixT, multMat(this.leftForearmMatrix, this.forearmInitialMatrix)));


        // Right Arm and Forearm
        var rightArmMatrix = multMat(torsoMatrix, multMat(this.rightArmMatrix, this.rightArmInitialMatrix))
        this.rightArm.setMatrix(rightArmMatrix);

        var rightArmMatrixT = multMat(this.rightArmMatrix, this.rightArmInitialTMatrix);
        rightArmMatrixT = multMat(torsoMatrix, rightArmMatrixT);
        this.rightForearm.setMatrix(multMat(rightArmMatrixT, multMat(this.rightForearmMatrix, this.forearmInitialMatrix)));


        // Left Thigh and Leg
        var leftThighMatrix = multMat(torsoMatrix, multMat(this.leftThighMatrix, this.leftThighInitialMatrix))
        this.leftThigh.setMatrix(leftThighMatrix);

        var leftThighMatrixT = multMat(this.leftThighMatrix, this.leftThighInitialTMatrix)
        leftThighMatrixT = multMat(torsoMatrix, leftThighMatrixT);
        this.leftLeg.setMatrix(multMat(leftThighMatrixT, multMat(this.leftLegMatrix, this.legInitialMatrix)));


        // Right Thigh and Leg
        var rightTighMatrix = multMat(torsoMatrix, multMat(this.rightThighMatrix, this.rightThighInitialMatrix))
        this.rightThigh.setMatrix(rightTighMatrix);

        var rightTighMatrixT = multMat(this.rightThighMatrix, this.rightThighInitialTMatrix)
        rightTighMatrixT = multMat(torsoMatrix, rightTighMatrixT);
        this.rightLeg.setMatrix(multMat(rightTighMatrixT, multMat(this.rightLegMatrix, this.legInitialMatrix)));
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
  // TODO (check)

    rotateArm(isLeft, angle, axis) {
        if(isLeft) {
            if (axis === 'x') {
                let newAngle = this.leftArmXAngle + angle;
                if (newAngle < this.armMinAngleX || newAngle > this.armMaxAngleX)
                    return;
                this.leftArmXAngle = newAngle;
            }
            if (axis === 'z') {
                let newAngle = this.leftArmZAngle + angle;
                if (newAngle < this.armMinAngleZ || newAngle > this.armMaxAngleZ)
                    return;
                this.leftArmZAngle = newAngle;
            }

            var oldLAMatrix = this.leftArmMatrix;

            this.leftArmMatrix = idMat4();

            if (axis === "x") {
                this.leftArmMatrix = translateMat(this.leftArmMatrix, 0, -this.armsHeight * 3 / 4, 0);
                this.leftArmMatrix = rotateMat(this.leftArmMatrix, angle, axis);
                this.leftArmMatrix = translateMat(this.leftArmMatrix, 0, this.armsHeight * 3 / 4, 0);
            } else if (axis === "z") {
                this.leftArmMatrix = translateMat(this.leftArmMatrix, -this.torsoRadius - this.armsRadius, -this.armsHeight * 3 / 4, 0);
                this.leftArmMatrix = rotateMat(this.leftArmMatrix, angle, axis);
                this.leftArmMatrix = translateMat(this.leftArmMatrix, this.torsoRadius + this.armsRadius, this.armsHeight * 3 / 4, 0);
            }
            this.leftArmMatrix = multMat(oldLAMatrix, this.leftArmMatrix)

            // Rotate and position Left Arm
            let leftArmMatrix = multMat(this.leftArmMatrix, this.leftArmInitialMatrix);
            let torsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix)
            this.leftArm.setMatrix(multMat(torsoMatrix, leftArmMatrix));

            // Rotate and position Left Forearm
            let leftArmMatrixT = multMat(this.leftArmMatrix, this.leftArmInitialTMatrix);
            leftArmMatrixT = multMat(torsoMatrix, leftArmMatrixT);

            let leftForearmMatrix = multMat(this.leftForearmMatrix, this.forearmInitialMatrix);
            leftForearmMatrix = multMat(leftArmMatrixT, leftForearmMatrix);

            this.leftForearm.setMatrix(leftForearmMatrix);


        }
        else {
            if (axis === 'x') {
                let newAngle = this.rightArmXAngle + angle;
                if (newAngle < this.armMinAngleX ||  newAngle > this.armMaxAngleX)
                    return;
                this.rightArmXAngle = newAngle;
            }
            if (axis === 'z') {
                let newAngle = this.rightArmZAngle + angle;
                if (newAngle > this.armMinAngleZ ||  newAngle < -this.armMaxAngleZ)
                    return;
                this.rightArmZAngle = newAngle;
            }


            var oldRAMatrix = this.rightArmMatrix;

            this.rightArmMatrix = idMat4();
            if (axis === "x") {
                this.rightArmMatrix = translateMat(this.rightArmMatrix, 0, -this.armsHeight * 3/4, 0);
                this.rightArmMatrix = rotateMat(this.rightArmMatrix, angle, axis);
                this.rightArmMatrix = translateMat(this.rightArmMatrix, 0, this.armsHeight * 3/4, 0);
            }
            else if (axis === "z") {
                this.rightArmMatrix = translateMat(this.rightArmMatrix, this.torsoRadius + this.armsRadius, -this.armsHeight * 3/4, 0);
                this.rightArmMatrix = rotateMat(this.rightArmMatrix, angle, axis);
                this.rightArmMatrix = translateMat(this.rightArmMatrix, -this.torsoRadius - this.armsRadius, this.armsHeight * 3/4, 0);
            }
            this.rightArmMatrix = multMat(oldRAMatrix, this.rightArmMatrix)

            // Rotate and position Right Arm
            var rightArmMatrix = multMat(this.rightArmMatrix, this.rightArmInitialMatrix);
            var torsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix)
            this.rightArm.setMatrix(multMat(torsoMatrix, rightArmMatrix));

            // Rotate and position Right Forearm
            var rightArmMatrixT = multMat(this.rightArmMatrix, this.rightArmInitialTMatrix);
            rightArmMatrixT = multMat(torsoMatrix, rightArmMatrixT);

            var rightForearmMatrix = multMat(this.rightForearmMatrix, this.forearmInitialMatrix);
            rightForearmMatrix = multMat(rightArmMatrixT, rightForearmMatrix);

            this.rightForearm.setMatrix(rightForearmMatrix);
        }
    }



    rotateForearm(isLeft, angle) {
        if(isLeft) {
            var newAngle = this.leftForearmAngle + angle;
            if (newAngle < this.forearmMinAngle ||  newAngle > this.forearmMaxAngle)
                return;
            this.leftForearmAngle = newAngle;

            var oldRFMatrix = this.leftForearmMatrix;

            this.leftForearmMatrix = idMat4();
            this.leftForearmMatrix = translateMat(this.leftForearmMatrix, 0, this.forearmsHeight / 2, 0);
            this.leftForearmMatrix = rotateMat(this.leftForearmMatrix, angle, "x");
            this.leftForearmMatrix = translateMat(this.leftForearmMatrix, 0, -this.forearmsHeight / 2, 0);
            this.leftForearmMatrix = multMat(oldRFMatrix, this.leftForearmMatrix)

            // Rotate and position Left Forearm
            var leftForearmMatrix = multMat(this.leftForearmMatrix, this.forearmInitialMatrix)

            var torsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix)
            var leftArmMatrix = multMat(this.leftArmMatrix, this.leftArmInitialTMatrix)

            var translateMatrix = multMat(torsoMatrix, leftArmMatrix);

            leftForearmMatrix = multMat(translateMatrix, leftForearmMatrix);

            this.leftForearm.setMatrix(leftForearmMatrix);

        }
        else {
            var newAngle = this.rightForearmAngle + angle;
            if (newAngle < this.forearmMinAngle ||  newAngle > this.forearmMaxAngle)
                return;
            this.rightForearmAngle = newAngle;

            var oldRFMatrix = this.rightForearmMatrix;

            this.rightForearmMatrix = idMat4();
            this.rightForearmMatrix = translateMat(this.rightForearmMatrix, 0, this.forearmsHeight / 2, 0);
            this.rightForearmMatrix = rotateMat(this.rightForearmMatrix, angle, "x");
            this.rightForearmMatrix = translateMat(this.rightForearmMatrix, 0, -this.forearmsHeight / 2, 0);
            this.rightForearmMatrix = multMat(oldRFMatrix, this.rightForearmMatrix)

            // Rotate and position Right Forearm
            var rightForearmMatrix = multMat(this.rightForearmMatrix, this.forearmInitialMatrix)

            var torsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix)
            var rightArmMatrix = multMat(this.rightArmMatrix, this.rightArmInitialTMatrix)

            var translateMatrix = multMat(torsoMatrix, rightArmMatrix);

            rightForearmMatrix = multMat(translateMatrix, rightForearmMatrix);

            this.rightForearm.setMatrix(rightForearmMatrix);
        }
    }
    rotateThigh(isLeft, angle) {
        if (isLeft) {
            let newAngle = this.leftThighAngle + angle;
            if (newAngle < this.thighMinAngle ||  newAngle > this.thighMaxAngle)
                return;
            this.leftThighAngle = newAngle;

            let oldMatrix = this.leftThighMatrix;

            this.leftThighMatrix = idMat4();
            this.leftThighMatrix = translateMat(this.leftThighMatrix, 0, this.thighsHeight / 2, 0);
            this.leftThighMatrix = rotateMat(this.leftThighMatrix, angle, "x");
            this.leftThighMatrix = translateMat(this.leftThighMatrix, 0, -this.thighsHeight / 2, 0);
            this.leftThighMatrix = multMat(oldMatrix, this.leftThighMatrix)

            // Rotate and position Left Thigh
            let thighMatrix = multMat(this.leftThighMatrix, this.leftThighInitialMatrix)

            let torsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix)

            thighMatrix = multMat(torsoMatrix, thighMatrix);

            this.leftThigh.setMatrix(thighMatrix);

            // Rotate and Position Left Leg
            let leftThighMatrixT = multMat(this.leftThighMatrix, this.leftThighInitialTMatrix);
            leftThighMatrixT = multMat(torsoMatrix, leftThighMatrixT);

            let leftLegMatrix = multMat(this.leftLegMatrix, this.legInitialMatrix);
            leftLegMatrix = multMat(leftThighMatrixT, leftLegMatrix);

            this.leftLeg.setMatrix(leftLegMatrix);
        }
        else {
            let newAngle = this.rightThighAngle + angle;
            if (newAngle < this.thighMinAngle ||  newAngle > this.thighMaxAngle)
                return;
            this.rightThighAngle = newAngle;

            let oldMatrix = this.rightThighMatrix;

            this.rightThighMatrix = idMat4();
            this.rightThighMatrix = translateMat(this.rightThighMatrix, 0, this.thighsHeight / 2, 0);
            this.rightThighMatrix = rotateMat(this.rightThighMatrix, angle, "x");
            this.rightThighMatrix = translateMat(this.rightThighMatrix, 0, -this.thighsHeight / 2, 0);
            this.rightThighMatrix = multMat(oldMatrix, this.rightThighMatrix)

            // Rotate and position right Thigh
            let thighMatrix = multMat(this.rightThighMatrix, this.rightThighInitialMatrix)

            let torsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix)

            thighMatrix = multMat(torsoMatrix, thighMatrix);

            this.rightThigh.setMatrix(thighMatrix);

            // Rotate and Position right Leg
            let rightThighMatrixT = multMat(this.rightThighMatrix, this.rightThighInitialTMatrix);
            rightThighMatrixT = multMat(torsoMatrix, rightThighMatrixT);

            let rightLegMatrix = multMat(this.rightLegMatrix, this.legInitialMatrix);
            rightLegMatrix = multMat(rightThighMatrixT, rightLegMatrix);

            this.rightLeg.setMatrix(rightLegMatrix);
        }
    }
    rotateLeg(isLeft, angle) {
        if (isLeft) {
            let newAngle = this.leftLegAngle + angle;
            if (newAngle < this.legMinAngle ||  newAngle > this.legMaxAngle)
                return;
            this.leftLegAngle = newAngle;

            let oldMatrix = this.leftLegMatrix;

            this.leftLegMatrix = idMat4();
            this.leftLegMatrix = translateMat(this.leftLegMatrix, 0, this.legsHeight / 2, 0);
            this.leftLegMatrix = rotateMat(this.leftLegMatrix, angle, "x");
            this.leftLegMatrix = translateMat(this.leftLegMatrix, 0, -this.legsHeight / 2, 0);
            this.leftLegMatrix = multMat(oldMatrix, this.leftLegMatrix)

            // Rotate and position Left leg
            let legMatrix = multMat(this.leftLegMatrix, this.legInitialMatrix)

            let torsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix)
            let leftThighMatrix = multMat(this.leftThighMatrix, this.leftThighInitialTMatrix)

            let translateMatrix = multMat(torsoMatrix, leftThighMatrix);

            legMatrix = multMat(translateMatrix, legMatrix);

            this.leftLeg.setMatrix(legMatrix);
        }
        else {
            let newAngle = this.rightLegAngle + angle;
            if (newAngle < this.legMinAngle ||  newAngle > this.legMaxAngle)
                return;
            this.rightLegAngle = newAngle;

            let oldMatrix = this.rightLegMatrix;

            this.rightLegMatrix = idMat4();
            this.rightLegMatrix = translateMat(this.rightLegMatrix, 0, this.legsHeight / 2, 0);
            this.rightLegMatrix = rotateMat(this.rightLegMatrix, angle, "x");
            this.rightLegMatrix = translateMat(this.rightLegMatrix, 0, -this.legsHeight / 2, 0);
            this.rightLegMatrix = multMat(oldMatrix, this.rightLegMatrix)

            // Rotate and position right leg
            let legMatrix = multMat(this.rightLegMatrix, this.legInitialMatrix)

            let torsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix)
            let rightThighMatrix = multMat(this.rightThighMatrix, this.rightThighInitialTMatrix)

            let translateMatrix = multMat(torsoMatrix, rightThighMatrix);

            legMatrix = multMat(translateMatrix, legMatrix);

            this.rightLeg.setMatrix(legMatrix);
        }

    }

  look_at(point){
    // Compute and apply the correct rotation of the head and the torso for the robot to look at @point
      let torsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);
      let headPosMatrix = multMat(torsoMatrix, this.headInitialMatrix);

      // Coordonnées de positions de la tête
      let hX = headPosMatrix.elements[12];
      let hY = headPosMatrix.elements[13];
      let hZ = headPosMatrix.elements[14];

      // On calcule les angles
      let deltaX = hX - point.x;
      let deltaY = hY - point.y;
      let deltaZ = hZ - point.z;
      let deltaXZ = Math.sqrt(deltaX ** 2 + deltaZ ** 2);
      let angleX = -Math.atan(deltaXZ / deltaY);
      let angleY = Math.atan(deltaX / deltaZ) - (deltaZ > 0 ? Math.PI : 0);

      //On ajoute un angle à la tête
      let headRotMatrix = translateMat(idMat4(), 0, -this.headRadius - this.torsoRadius, 0)
      headRotMatrix = rotateMat(headRotMatrix, angleX, "x");
      headRotMatrix = translateMat(headRotMatrix, 0, this.headRadius + this.torsoRadius, 0)

      this.headMatrix = headRotMatrix;

      // if (Math.abs(deltaX) < 1 && Math.abs(deltaZ) < 1) {
      //     this.head.setMatrix(multMat(torsoMatrix, multMat(this.headMatrix, this.headInitialMatrix)));
      //     return;
      // }


      // On tourne le torse
      let newTorsoMatrix = rotateMat(idMat4(), angleY, "y");
      let torsoPosX = this.torsoMatrix.elements[12];
      let torsoPosY = this.torsoMatrix.elements[13];
      let torsoPosZ = this.torsoMatrix.elements[14];
      newTorsoMatrix = translateMat(newTorsoMatrix, torsoPosX, torsoPosY, torsoPosZ);
      this.torsoMatrix = newTorsoMatrix;
      this.torso.setMatrix(multMat(newTorsoMatrix, this.torsoInitialMatrix));
      this.walkDirection = rotateVec3(new THREE.Vector3( 0, 0, 1 ), angleY, "y");
      this.moveAllWithTorso();

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
    "Left Upper Arm",
    "Left Forearm",
    "Right Upper Arm",
    "Right Forearm",
    "Left Thigh",
    "Left Lower Leg",
    "Right Thigh",
    "Right Lower Leg"
];
var numberComponents = components.length;

//MOUSE EVENTS
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var sphere = null;

document.addEventListener('mousemove', onMouseMove, false);

var isRightButtonDown = false;

let lastPressedTimeLimb = 0;
const limbCooldown = 1000;

function checkKeyboard() {
    let currentTime = Date.now();
    let timeDiffLimbs = currentTime - lastPressedTimeLimb;

  // Next element
  if (keyboard.pressed("e") && timeDiffLimbs > limbCooldown) {
      lastPressedTimeLimb = currentTime;
    selectedRobotComponent = selectedRobotComponent + 1;

    if (selectedRobotComponent < 0){
      selectedRobotComponent = numberComponents - 1;
    }

    if (selectedRobotComponent >= numberComponents){
      selectedRobotComponent = 0;
    }

    updateLimbs(components[selectedRobotComponent]);
  }

  // Previous element
  if (keyboard.pressed("q") && timeDiffLimbs > limbCooldown){
      lastPressedTimeLimb = currentTime;
      selectedRobotComponent = selectedRobotComponent - 1;

    if (selectedRobotComponent < 0){
      selectedRobotComponent = numberComponents - 1;
    }

    if (selectedRobotComponent >= numberComponents){
      selectedRobotComponent = 0;
    }

    updateLimbs(components[selectedRobotComponent]);
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
            // TODO (check)

            case "Left Forearm":
                robot.rotateForearm(true, -0.05)
                break;

            case "Right Forearm":
                robot.rotateForearm(false, -0.05)
                break;

            case "Left Upper Arm":
                robot.rotateArm(true, -0.05, 'x')
                break;

            case "Right Upper Arm":
                robot.rotateArm(false, -0.05, 'x')
                break;

            case "Left Thigh":
                robot.rotateThigh(true, -0.05);
                robot.updateGroundTouch();
                robot.moveAllWithTorso();
                break;

            case "Right Thigh":
                robot.rotateThigh(false, -0.05);
                robot.updateGroundTouch();
                robot.moveAllWithTorso();
                break;

            case "Left Lower Leg":
                robot.rotateLeg(true, -0.05);
                robot.updateGroundTouch();
                robot.moveAllWithTorso();
                break;

            case "Right Lower Leg":
                robot.rotateLeg(false, -0.05);
                robot.updateGroundTouch();
                robot.moveAllWithTorso();
                break;
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
      // TODO (check)

        case "Left Forearm":
            robot.rotateForearm(true, 0.05);
            break;

        case "Right Forearm":
            robot.rotateForearm(false, 0.05);
            break;

        case "Left Upper Arm":
            robot.rotateArm(true, 0.05, 'x');
            break;

        case "Right Upper Arm":
            robot.rotateArm(false, 0.05, 'x');
            break;

        case "Left Thigh":
            robot.rotateThigh(true, 0.05);
            robot.updateGroundTouch();
            robot.moveAllWithTorso();
            break;

        case "Right Thigh":
            robot.rotateThigh(false, 0.05);
            robot.updateGroundTouch();
            robot.moveAllWithTorso();
            break;

        case "Left Lower Leg":
            robot.rotateLeg(true, 0.05);
            robot.updateGroundTouch();
            robot.moveAllWithTorso();
            break;

        case "Right Lower Leg":
            robot.rotateLeg(false, 0.05);
            robot.updateGroundTouch();
            robot.moveAllWithTorso();
            break;
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
      // TODO (check)

        case "Left Upper Arm":
            robot.rotateArm(true, -0.05, 'z')
            break;

        case "Right Upper Arm":
            robot.rotateArm(false, -0.05, 'z')
            break;
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
      // TODO(check)

        case "Left Upper Arm":
            robot.rotateArm(true, 0.05, 'z')
            break;

        case "Right Upper Arm":
            robot.rotateArm(false, 0.05, 'z')
            break;
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

function updateLimbs(limbName) {
    let limbs = document.getElementById("limbs");
    limbs.style.opacity = "100%";
    limbs.children[1].innerHTML = limbName;
    setTimeout(function() {
        limbs.style.opacity = "0%";
    }, 2000);
}

// SETUP UPDATE CALL-BACK
function update() {
  checkKeyboard();
  requestAnimationFrame(update);
  renderer.render(scene, camera);
}

update();
