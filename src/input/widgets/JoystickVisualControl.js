import { VisualControl } from "./VisualControl.js";

// Joystick Control
export class JoystickVisualControl extends VisualControl {
    constructor(options) {
        super({ ...options, type: 'joystick' });

        //this._position = options.position;

        this.axisX = options.axisX || 0;
        this.axisY = options.axisY || 1;
        this.deadzone = options.deadzone || 0.1;
        this.gateFactor = options.gateFactor || 1.1;

        this.currentValue = { x: 0, y: 0 };

        this.baseVisual = null;
        this.knobVisual = null;
        this._activeCanvasId = null;

    }

    set position(newPos) {
        this._position = newPos;
        
        // Update base visual
        if (this.baseVisual && this.renderer) {
            this.renderer.updateVisual(this.baseVisual, {
                position: newPos
            });
        }
        
        // Update knob visual to current position
        if (this.knobVisual && this.renderer) {
            const maxDist = this.size * 0.7;
            this.renderer.updateVisual(this.knobVisual, {
                position: {
                    x: newPos.x + this.currentValue.x * maxDist,
                    y: newPos.y + this.currentValue.y * maxDist,
                    z: (newPos.z || 0) + 0.01
                }
            });
        }
    }


    get position() {
        return this._position;
    }

    set size(newSize) {
        this._size = newSize;
        
        // Update base visual
        if (this.baseVisual && this.renderer) {
            this.renderer.updateVisual(this.baseVisual, {
                innerRadius: newSize * 0.8,
                outerRadius: newSize
            });
        }
        
        // Update knob visual
        if (this.knobVisual && this.renderer) {
            this.renderer.updateVisual(this.knobVisual, {
                radius: newSize * 0.3
            });
        }
        
        // Update knob position with new size
        this._updateKnobPosition();
    }

    get size() {
        return this._size;
    }

    _createVisual() {
        if (this.renderer && this.renderer.createVisual) {
            // Create base ring
            this.baseVisual = this.renderer.createVisual('joystick-base', {
                position: this.position,
                innerRadius: this.size * 0.8,
                outerRadius: this.size,
                color: 0x333333,
                opacity: 0.5
            });
            
            // Create knob
            this.knobVisual = this.renderer.createVisual('joystick-knob', {
                position: { ...this.position, z: (this.position.z || 0) + 0.01 },
                radius: this.size * 0.3,
                color: 0x666666,
                opacity: 0.7
            });
            this.visual = this.baseVisual;
        }
    }

    handleTouchStart(touch, screenX, screenY) {
        const expectedCanvasId = this.renderer?.visualToCanvas?.get(this.baseVisual?.id);
        const worldPos = this._getWorldPosition(screenX, screenY, expectedCanvasId);

        if (!worldPos) {
            return;
        }

        if (expectedCanvasId && worldPos.canvasId && worldPos.canvasId !== expectedCanvasId) {
            return;
        }

        this.touchId = touch.identifier;
        this._activeCanvasId = expectedCanvasId || worldPos.canvasId || null;

        const offsetX = worldPos.x - this.position.x;
        const offsetY = worldPos.y - this.position.y;

        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        const maxDist = this.size * 0.7;

        if (distance <= this.size) {
            // Normalize to -1 to 1 range
            let x = offsetX / maxDist;
            let y = offsetY / maxDist;
            
            const threshold = 0.45;
            
            if (Math.abs(x) <= threshold && Math.abs(y) <= threshold) {
                this.currentValue.x = Math.max(-1, Math.min(1, x));
                this.currentValue.y = Math.max(-1, Math.min(1, y));
            } else {
                const dist = Math.sqrt(x * x + y * y);
                if (dist > 1) {
                    x /= dist;
                    y /= dist;
                }
                this.currentValue.x = x;
                this.currentValue.y = y;
            }

            this._updateKnobPosition();

            this.emit('change', {
                axisX: this.axisX,
                axisY: this.axisY,
                x: this.currentValue.x,
                y: this.currentValue.y
            });
        }

        this.isActive = true;
    }

    // handleTouchMove(touch, screenX, screenY) {
    //     if (this.touchId !== touch.identifier) return;

    //     const worldPos = this.renderer.screenToWorld(screenX, screenY);
    //     const offsetX = worldPos.x - this.position.x;
    //     const offsetY = worldPos.y - this.position.y;

    //     const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    //     const maxDist = this.size * 0.7;

    //     if (distance > maxDist) {
    //         const angle = Math.atan2(offsetY, offsetX);
    //         this.currentValue.x = Math.cos(angle);
    //         this.currentValue.y = Math.sin(angle);
    //     } else {
    //         this.currentValue.x = offsetX / maxDist;
    //         this.currentValue.y = offsetY / maxDist;
    //     }

    //     if (Math.abs(this.currentValue.x) < this.deadzone) this.currentValue.x = 0;
    //     if (Math.abs(this.currentValue.y) < this.deadzone) this.currentValue.y = 0;

    //     this._updateKnobPosition();

    //     this.emit('change', {
    //         axisX: this.axisX,
    //         axisY: this.axisY,
    //         x: this.currentValue.x,
    //         y: this.currentValue.y
    //     });
    // }

    handleTouchMove(touch, screenX, screenY) {
        if (this.touchId !== touch.identifier) return;

        const targetCanvasId = this._activeCanvasId || this.renderer?.visualToCanvas?.get(this.baseVisual?.id);
        const worldPos = this._getWorldPosition(screenX, screenY, targetCanvasId);

        if (!worldPos) {
            return;
        }

        const offsetX = worldPos.x - this.position.x;
        const offsetY = worldPos.y - this.position.y;

        const maxDist = this.size * 0.7;
        
        // Calculate angle and distance from center
        const angle = Math.atan2(offsetY, offsetX);
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        
        // Normalize distance to 0-1 range
        let normalizedDistance = Math.min(distance / maxDist, 1);
        
        // Start with circular coordinates
        let x = Math.cos(angle) * normalizedDistance;
        let y = Math.sin(angle) * normalizedDistance;
        
        // Apply the "rounded rectangle" transformation
        // Factor between 1.0 (circle) and 1.414 (square)
        // 1.1 gives a nice rounded rectangle like PS4/Xbox controllers
        const mFactor = this.gateFactor;
        
        x *= mFactor;
        y *= mFactor;
        
        // Clamp back to -1 to 1 range
        x = Math.max(-1, Math.min(1, x));
        y = Math.max(-1, Math.min(1, y));
        
        this.currentValue.x = x;
        this.currentValue.y = y;

        // Apply deadzone
        if (Math.abs(this.currentValue.x) < this.deadzone) this.currentValue.x = 0;
        if (Math.abs(this.currentValue.y) < this.deadzone) this.currentValue.y = 0;

        this._updateKnobPosition();

        this.emit('change', {
            axisX: this.axisX,
            axisY: this.axisY,
            x: this.currentValue.x,
            y: this.currentValue.y
        });
    }

    handleTouchEnd(touch) {
        if (this.touchId === touch.identifier) {
            this.touchId = null;
            this.isActive = false;
            this.currentValue = { x: 0, y: 0 };
            this._activeCanvasId = null;

            this._updateKnobPosition();

            this.emit('change', {
                axisX: this.axisX,
                axisY: this.axisY,
                x: 0,
                y: 0
            });
        }
    }

    _updateKnobPosition() {
        if (this.knobVisual && this.renderer && this.renderer.updateVisual) {
            const maxDist = this.size * 0.7;
            this.renderer.updateVisual(this.knobVisual, {
                position: {
                    x: this.position.x + this.currentValue.x * maxDist,
                    y: this.position.y + this.currentValue.y * maxDist,
                    z: (this.position.z || 0) + 0.01
                }
            });
        }
    }

    updateVisualState(visualMode = 'touch-only', playerIndex = 0) {
        if (this.touchId !== null) return; // Don't update if being touched
        
        let x = 0, y = 0;
        
        switch(visualMode) {
            case 'all-inputs':
                // Show input from ANY device
                if (this.inputManager) {
                    const stick = this.axisX === 0 ? 'LEFT' : 'RIGHT';
                    const stickValue = this.inputManager.getStick(stick);
                    x = stickValue.x;
                    y = -stickValue.y;
                }
                break;
                
            case 'player-device':
                // Show input from specific player's device
                if (this.inputManager) {
                    const stick = this.axisX === 0 ? 'LEFT' : 'RIGHT';
                    const stickValue = this.inputManager.getStickForPlayer(stick, playerIndex);
                    x = stickValue.x;
                    y = -stickValue.y;
                }
                break;
                
            case 'touch-only':
            default:
                // Only show touch input (use parentDevice state)
                if (this.parentDevice) {
                    x = this.parentDevice.axes[this.axisX] || 0;
                    y = this.parentDevice.axes[this.axisY] || 0;
                }
                break;
        }
        
        this.currentValue.x = x;
        this.currentValue.y = y;
        this._updateKnobPosition();
    }

    _getWorldPosition(screenX, screenY, canvasId) {
        if (canvasId && typeof this.renderer?.screenToWorldForCanvas === 'function') {
            const pos = this.renderer.screenToWorldForCanvas(canvasId, screenX, screenY);
            if (pos) {
                return pos;
            }
        }

        return this.renderer?.screenToWorld?.(screenX, screenY) || null;
    }

    dispose() {
        super.dispose();
        if (this.renderer && this.renderer.removeVisual) {
            if (this.baseVisual) this.renderer.removeVisual(this.baseVisual);
            if (this.knobVisual) this.renderer.removeVisual(this.knobVisual);
        }
    }

}
