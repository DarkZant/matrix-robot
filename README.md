# Matrix Robot
Robot scene animated purely by matrix calculations.  
All limbs of the robot are made with scaling matrices and are placed in the scene with translation matrices.  
We then animate the robot using rotation and translation matrices.  
The robot has a walk animation, can move each limb indepently and can look around.  
The [three.js](https://threejs.org/) library is used for rendering the scene.  
This project was made with [Martin Medina](https://github.com/medinammartin3) for the [IFT3355](https://admission.umontreal.ca/cours-et-horaires/cours/ift-3355/) UdeM course.  

## Controls
- Use `Left Click` to look around and `Right Click` to slide the camera. Use the `Mouse Wheel` to zoom.
- Press `Q` or `E` to cycle through the limbs of the robot. By default, the torso is selected.  
- If the torso is selected, you can make the robot walk around using `W`, `A`, `S` and `D`.  
- If another limb is selected, you can rotate it around different axes using `W`, `A`, `S` and `D`.  
- Press `F` and point at an object in the scene with your mouse to make a point appear, and the robot will rotate and look at the point.  
- You can make the robot follow the point around if you both make the robot walk forward and point at an object at the same time. 
