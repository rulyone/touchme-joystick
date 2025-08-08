import { AbstractRenderer } from "./AbstractRenderer.js";
import * as THREE from 'three';

export class ThreeJSRenderer extends AbstractRenderer {
    constructor(scene, camera, renderer) {
        super();
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
    }
    
    screenToWorld(screenX, screenY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        
        // Convert to normalized device coordinates (-1 to +1)
        const x = ((screenX - rect.left) / rect.width) * 2 - 1;
        const y = -((screenY - rect.top) / rect.height) * 2 + 1;
        
        // Create a ray from the camera
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        
        // Create a plane at Z=0 for intersection
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectPoint = new THREE.Vector3();
        
        // Find where the ray intersects the Z=0 plane
        raycaster.ray.intersectPlane(plane, intersectPoint);
        
        return { 
            x: intersectPoint.x, 
            y: intersectPoint.y 
        };
    }

    
    getCanvas() {
        return this.renderer.domElement;
    }
    
    createVisual(type, options) {
        switch(type) {
            case 'button':
                // Create a cylinder for 3D button
                const geometry = new THREE.CylinderGeometry(
                    options.size,      // top radius
                    options.size,      // bottom radius
                    options.size * 0.3, // height (30% of diameter)
                    32                 // segments
                );
                const material = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(options.color),
                    shininess: 100,
                    specular: 0x222222
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(options.position.x, options.position.y, options.position.z || 0);
                mesh.rotation.x = Math.PI / 2; // Rotate to face camera

                // Store original Z position for press animation
                mesh.userData.originalZ = options.position.z || 0;
                mesh.userData.isButton = true;

                this.scene.add(mesh);
                return mesh;
            case 'joystick-base':
                const baseGeometry = new THREE.RingGeometry(
                    options.innerRadius, 
                    options.outerRadius, 
                    32
                );
                const baseMaterial = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(options.color),
                    transparent: true,
                    opacity: options.opacity || 0.5,
                    side: THREE.DoubleSide
                });
                const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
                baseMesh.position.set(options.position.x, options.position.y, options.position.z || 0);
                this.scene.add(baseMesh);
                return baseMesh;
                
            case 'joystick-knob':
                const knobGeometry = new THREE.CircleGeometry(options.radius, 32);
                const knobMaterial = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(options.color),
                    transparent: true,
                    opacity: options.opacity || 0.7,
                    side: THREE.DoubleSide
                });
                const knobMesh = new THREE.Mesh(knobGeometry, knobMaterial);
                knobMesh.position.set(options.position.x, options.position.y, options.position.z || 0);
                this.scene.add(knobMesh);
                return knobMesh;
        }
    }
    
    updateVisual(visual, properties) {
        if (visual) {
            if (properties.color && visual.material) {
                visual.material.color = new THREE.Color(properties.color);
            }

            // Handle button press animation
            if (visual.userData.isButton && properties.scale !== undefined) {
                const pressDepth = visual.userData.originalZ - (properties.scale === 1.2 ? 10 : 0);
                visual.position.z = pressDepth;
                
                // Also scale the button slightly
                const scaleFactor = properties.scale === 1.2 ? 0.95 : 1.0;
                visual.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                // Update label if exists
                if (visual.userData.labelSprite) {
                    visual.userData.labelSprite.position.z = pressDepth + 0.01;
                    visual.userData.labelSprite.scale.setScalar(scaleFactor * 2);
                }
            }

            if (properties.position && visual.position) {
                visual.position.set(
                    properties.position.x,
                    properties.position.y,
                    properties.position.z || visual.position.z
                );
            }
        }
    }
    
    removeVisual(visual) {
        if (visual && this.scene) {
            this.scene.remove(visual);
        }
    }
}