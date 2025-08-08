import { InputDevice } from "./InputDevice.js";
import { Button } from "../core/Button.js";

// Gamepad Input Device
export class GamepadDevice extends InputDevice {
    constructor(gamepad) {
        super('gamepad-' + gamepad.index);
        
        this.gamepadIndex = gamepad.index;
        this.gamepad = gamepad;
        
        // Initialize axes and buttons based on the gamepad
        this.axes = new Array(gamepad.axes.length).fill(0);
        this.buttons = [];
        
        // Create button instances matching the gamepad
        for (let i = 0; i < gamepad.buttons.length; i++) {
            this.buttons.push(new Button(i));
        }
        
        // Copy initial state
        this._updateFromGamepad();
        
        // Configuration
        this.deadzone = 0.1;
        this.invertYAxis = true;
        this.axisThreshold = 0.5; // For treating axes as buttons (triggers)
    }
    
    _updateFromGamepad() {
        // Get the latest gamepad state
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.gamepadIndex];
        
        if (!gamepad) {
            this.disconnect();
            return;
        }
        
        this.gamepad = gamepad;
        
        // Update axes with deadzone
        for (let i = 0; i < gamepad.axes.length; i++) {
            let value = gamepad.axes[i];
            if (this.invertYAxis && (i === 1 || i === 3)) {
                value = -value;
            }
            this.axes[i] = Math.abs(value) < this.deadzone ? 0 : value;
        }
        
        // Update buttons
        for (let i = 0; i < gamepad.buttons.length; i++) {
            const gpButton = gamepad.buttons[i];
            this.buttons[i].update(
                gpButton.pressed,
                gpButton.touched || gpButton.pressed,
                gpButton.value
            );
        }
    }
    
    update(deltaTime) {
        this._updateFromGamepad();
        
        // Call parent update to handle button events
        super.update(deltaTime);
        
        // Emit axis change events
        for (let i = 0; i < this.axes.length; i++) {
            const value = this.axes[i];
            if (value !== 0 || this._lastAxes?.[i] !== 0) {
                this.emit('axischange', {
                    axis: i,
                    value: value,
                    device: this,
                    timestamp: this.timestamp
                });
            }
        }
        
        this._lastAxes = [...this.axes];
    }
    
    vibrate(duration = 200, weakMagnitude = 0.5, strongMagnitude = 1.0) {
        if (this.gamepad.vibrationActuator) {
            this.gamepad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: duration,
                weakMagnitude: weakMagnitude,
                strongMagnitude: strongMagnitude
            });
        }
    }
    
    dispose() {
        this.disconnect();
    }
}