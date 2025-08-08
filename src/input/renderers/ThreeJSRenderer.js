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
        const x = ((screenX - rect.left) / rect.width) * 2 - 1;
        const y = -((screenY - rect.top) / rect.height) * 2 + 1;
        
        const vector = new THREE.Vector3(x, y, 0);
        vector.unproject(this.camera);
        
        return { x: vector.x, y: vector.y };
    }
    
    getCanvas() {
        return this.renderer.domElement;
    }
    
    createVisual(type, options) {
        switch(type) {
            case 'button':
                const geometry = new THREE.CircleGeometry(options.size, 32);
                const material = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(options.color),
                    transparent: true,
                    opacity: 0.7,
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(options.position.x, options.position.y, options.position.z || 0);
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
            if (properties.scale && visual.scale) {
                visual.scale.setScalar(properties.scale);
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