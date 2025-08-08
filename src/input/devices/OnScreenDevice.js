import { InputDevice } from "./InputDevice.js";
import { JoystickVisualControl } from "../widgets/JoystickVisualControl.js";
import { ButtonVisualControl } from "../widgets/ButtonVisualControl.js";
import { Button } from "../core/Button.js";

// Touch Input Device
export class OnScreenDevice extends InputDevice {
    constructor(options = {}) {
        super('touch-' + Date.now());

        this.renderer = options.renderer;
        this.inputManager = options.inputManager;

        this.thumbRadius = options.thumbRadius || 20;
        // If you want a perfectly rounded stick, use 1.0
        // If you want to emulate how PS4 stick behaves, use ~1.1
        // If you want to have a squared stick, use 1.414
        // Other values can give some weird behaviors, up to you how to manage this
        this.stickGateFactor = options.stickGateFactor || 1.1;
        
        // Initialize standard gamepad layout
        this.axes = [0, 0, 0, 0];
        this.buttons = [];
        for (let i = 0; i < 17; i++) {
            this.buttons.push(new Button(i));
        }

        this.controls = new Map();
        this.activeTouches = new Map();

        this._setupEventListeners();
    }

    setThumbRadius(radius) {
        this.thumbRadius = radius;
    }

    _normalizeRadius(touch) {        
        return {
            x: this.thumbRadius,
            y: this.thumbRadius
        };
    }

    _setupEventListeners() {
        const canvas = this.renderer.getCanvas();

        if (!this._boundHandleTouchStart) {
            this._boundHandleTouchStart = this._handleTouchStart.bind(this);
            this._boundHandleTouchMove = this._handleTouchMove.bind(this);
            this._boundHandleTouchEnd = this._handleTouchEnd.bind(this);
        }

        canvas.addEventListener('touchstart', this._boundHandleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this._boundHandleTouchMove, { passive: false });
        canvas.addEventListener('touchend', this._boundHandleTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', this._boundHandleTouchEnd, { passive: false });
    }

    addControl(control) {
        if (this.controls.has(control.id)) {
            throw new Error(`Control with id "${control.id}" already exists`);
        }

        this.controls.set(control.id, control);

        control.inputManager = this.inputManager;
        control.parentDevice = this;
        control._createVisual();

        control.on('press', (data) => {
            if (data.buttonIndex !== undefined) {
                this.buttons[data.buttonIndex].update(true, true);
            }
        });

        control.on('release', (data) => {
            if (data.buttonIndex !== undefined) {
                this.buttons[data.buttonIndex].update(false, false);
            }
        });

        control.on('change', (data) => {
            if (data.axisX !== undefined) {
                this.axes[data.axisX] = data.x;
            }
            if (data.axisY !== undefined) {
                this.axes[data.axisY] = data.y;
            }
        });

        return control;
    }

    removeControl(controlId) {
        const control = this.controls.get(controlId);
        if (control) {
            control.dispose();
            this.controls.delete(controlId);
        }
    }

    createButton(options) {
        const button = new ButtonVisualControl({
            renderer: this.renderer,
            ...options
        });
        return this.addControl(button);
    }
    
    createJoystick(options) {
        const joystick = new JoystickVisualControl({
            renderer: this.renderer,
            gateFactor: this.stickGateFactor,
            ...options
        });
        return this.addControl(joystick);
    }

    _handleTouchStart(event) {
        event.preventDefault();

        // Check if any control was touched
        let touchedAnyControl = false;

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const screenX = touch.clientX;
            const screenY = touch.clientY;

            // Normalize radius
            const normalizedRadius = this._normalizeRadius(touch);

            const touchedControls = [];

            for (const control of this.controls.values()) {
                if (control.containsPoint(screenX, screenY, normalizedRadius.x, normalizedRadius.y)) {
                    control.handleTouchStart(touch, screenX, screenY);
                    touchedControls.push(control);
                }
            }

            this.activeTouches.set(touch.identifier, {
                controls: touchedControls,
                lastX: screenX,
                lastY: screenY,
                radiusX: normalizedRadius.x,
                radiusY: normalizedRadius.y
            });

            if (touchedControls.length > 0) {
                touchedAnyControl = true;
            }
        }
        // Notify renderer about UI touch state
        if (this.renderer.setUITouchActive) {
            this.renderer.setUITouchActive(touchedAnyControl);
        }
    }

    _handleTouchMove(event) {
        event.preventDefault();

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const screenX = touch.clientX;
            const screenY = touch.clientY;

            const touchData = this.activeTouches.get(touch.identifier);
            if (!touchData) continue;

            const normalizedRadius = this._normalizeRadius(touch);

            // Check all controls for touch overlap
            for (const control of this.controls.values()) {
                const isCurrentlyTouched = touchData.controls.includes(control);
                const isNowTouched = control.containsPoint(screenX, screenY, normalizedRadius.x, normalizedRadius.y);

                if (control.type === 'button') {
                    if (!isCurrentlyTouched && isNowTouched) {
                        // New button entered
                        control.handleTouchStart(touch, screenX, screenY);
                        touchData.controls.push(control);
                    } else if (isCurrentlyTouched && !isNowTouched) {
                        // Button exited
                        control.handleTouchEnd(touch);
                        touchData.controls = touchData.controls.filter(c => c !== control);
                    } else if (isCurrentlyTouched) {
                        // Still touching - update position
                        control.handleTouchMove(touch, screenX, screenY);
                    }
                } else if (isCurrentlyTouched) {
                    // For non-buttons (joysticks), maintain existing behavior
                    control.handleTouchMove(touch, screenX, screenY);
                }
            }

            touchData.lastX = screenX;
            touchData.lastY = screenY;
        }
    }

    _handleTouchEnd(event) {
        event.preventDefault();

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];

            const touchData = this.activeTouches.get(touch.identifier);
            if (!touchData) continue;

            touchData.controls.forEach(control => {
                control.handleTouchEnd(touch);
            });

            this.activeTouches.delete(touch.identifier);
        }
    }

    createVisualButton(options) {
        const button = new ButtonVisualControl({
            renderer: this.renderer,
            ...options
        });
        return this.addControl(button);
    }

    createVisualJoystick(options) {
        const joystick = new JoystickVisualControl({
            renderer: this.renderer,
            ...options
        });
        return this.addControl(joystick);
    }

    dispose() {
        // Clean up all controls
        for (const control of this.controls.values()) {
            control.dispose();
        }
        this.controls.clear();

        // Remove event listeners
        const canvas = this.renderer.getCanvas();
        canvas.removeEventListener('touchstart', this._boundHandleTouchStart);
        canvas.removeEventListener('touchmove', this._boundHandleTouchMove);
        canvas.removeEventListener('touchend', this._boundHandleTouchEnd);
        canvas.removeEventListener('touchcancel', this._boundHandleTouchEnd);

        this.disconnect();
    }
}