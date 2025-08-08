import { EventEmitter } from "./EventEmitter.js";
import { OnScreenDevice } from "../devices/OnScreenDevice.js";
import { GamepadDevice } from "../devices/GamepadDevice.js";

// Standard Gamepad button mapping
export const StandardMapping = {
    buttons: {
        A: 0,
        B: 1,
        X: 2,
        Y: 3,
        LB: 4,
        RB: 5,
        LT: 6,
        RT: 7,
        SELECT: 8,
        START: 9,
        LS: 10,
        RS: 11,
        DPAD_UP: 12,
        DPAD_DOWN: 13,
        DPAD_LEFT: 14,
        DPAD_RIGHT: 15,
        HOME: 16
    },
    axes: {
        LEFT_STICK_X: 0,
        LEFT_STICK_Y: 1,
        RIGHT_STICK_X: 2,
        RIGHT_STICK_Y: 3
    }
};

// Main Input Manager
export class InputManager extends EventEmitter {
    constructor() {
        super();
        this.devices = new Map();

        this.playerDevices = new Map();

        this.lastUpdateTime = performance.now();

        // Check for native gamepad support
        this.supportsGamepad = 'getGamepads' in navigator;

        if (this.supportsGamepad) {
            this._setupGamepadListeners();
        }
    }

    // Assign a device to a player
    assignDeviceToPlayer(deviceId, playerIndex) {
        const device = this.devices.get(deviceId);
        if (device) {
            this.playerDevices.set(playerIndex, device);
            this.emit('playerdeviceassigned', { device, playerIndex });
        }
    }

    unassignPlayer(playerIndex) {
        if (this.playerDevices.has(playerIndex)) {
            const device = this.playerDevices.get(playerIndex);
            this.playerDevices.delete(playerIndex);
            this.emit('playerdeviceunassigned', { device, playerIndex });
        }
    }

    hasPlayerDevice(playerIndex) {
        return this.playerDevices.has(playerIndex) && this.playerDevices.get(playerIndex)?.connected;
    }

    // Get device for specific player
    getPlayerDevice(playerIndex) {
        return this.playerDevices.get(playerIndex);
    }

    createOnScreenDevice(options) {
        if (!options.renderer) {
            throw new Error('No renderer provided for on screen device');
        }
        const device = new OnScreenDevice({
            ...options,
            inputManager: this
        });

        return this.addDevice(device);
    }

    _setupGamepadListeners() {
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Physical gamepad connected:', e.gamepad);
            this._handleGamepadConnected(e.gamepad);
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('Physical gamepad disconnected:', e.gamepad);
            this._handleGamepadDisconnected(e.gamepad);
        });
    }

    _handleGamepadConnected(gamepad) {
        // Check if we already have this gamepad by looking for its device ID
        const gamepadId = 'gamepad-' + gamepad.index;
        if (this.devices.has(gamepadId)) {
            return;
        }

        // Create new GamepadDevice device
        const gamepadDevice = new GamepadDevice(gamepad);
        this.addDevice(gamepadDevice);

        // Auto-assign to next available player slot
        let assigned = false;
        for (let i = 0; i < 4; i++) { // Support up to 4 players
            if (!this.playerDevices.has(i)) {
                this.assignDeviceToPlayer(gamepadDevice.id, i);
                assigned = true;
                console.log(`Assigned gamepad to Player ${i + 1}`);
                
                // Vibrate to confirm assignment
                gamepadDevice.vibrate(200, 0.5, 1.0);
                break;
            }
        }

        // Emit connection event with assignment info
        this.emit('gamepadconnected', { 
            device: gamepadDevice, 
            gamepad: gamepad,
            playerIndex: assigned ? Array.from(this.playerDevices.keys()).pop() : null
        });

        if (!assigned) {
            console.warn('No available player slots for gamepad');
        }

    }

    _handleGamepadDisconnected(gamepad) {
        const gamepadId = 'gamepad-' + gamepad.index;
        const device = this.devices.get(gamepadId);
        if (device) {
            // Find and remove from player assignments
            let playerIndex = null;
            for (const [index, playerDevice] of this.playerDevices.entries()) {
                if (playerDevice === device) {
                    playerIndex = index;
                    this.playerDevices.delete(index);
                    break;
                }
            }

            this.removeDevice(device.id);
            
            this.emit('gamepaddisconnected', { 
                device: device, 
                gamepad: gamepad,
                playerIndex: playerIndex
            });
        }
    }

    addDevice(device) {
        this.devices.set(device.id, device);
        device.connect();

        // Forward all device events with player info
        const events = ['buttondown', 'buttonup', 'buttonpress', 'buttonlongpress', 'axischange'];
        events.forEach(eventName => {
            device.on(eventName, (data) => {
                // Find which player this device belongs to
                let playerIndex = null;
                for (const [index, playerDevice] of this.playerDevices.entries()) {
                    if (playerDevice === device) {
                        playerIndex = index;
                        break;
                    }
                }
                this.emit(eventName, { ...data, device, playerIndex });
            });
        });

        return device;
    }

    update() {
        const now = performance.now();
        const deltaTime = now - this.lastUpdateTime;
        this.lastUpdateTime = now;

        // TODO: see if this is really necessary
        // // Poll for new gamepads (for browsers that don't fire events reliably)
        // if (this.supportsGamepad) {
        //     const gamepads = navigator.getGamepads();
        //     for (let i = 0; i < gamepads.length; i++) {
        //         const gamepad = gamepads[i];
        //         if (gamepad) {
        //             const gamepadId = 'gamepad-' + i;
        //             if (!this.devices.has(gamepadId)) {
        //                 this._handleGamepadConnected(gamepad);
        //             }
        //         }
        //     }
        // }

        // Update all devices
        for (const device of this.devices.values()) {
            if (device.connected) {
                device.update(deltaTime);
                
                // Update visual controls for OnScreenDevices
                if (device.constructor.name === 'OnScreenDevice' && device.controls) {

                    for (const control of device.controls.values()) {
                        control.updateVisualState();
                    }
                }
            }
        }
    }

    // Helper methods
    isButtonPressed(button) {
        const buttonIndex = typeof button === 'string' ? StandardMapping.buttons[button] : button;
    
        // Check all connected devices
        for (const device of this.devices.values()) {
            if (device.connected && device.buttons[buttonIndex]?.pressed) {
                return true;
            }
        }
        return false;
    }

    // Check button for specific player
    isButtonPressedForPlayer(button, playerIndex) {
        const device = this.playerDevices.get(playerIndex);
        if (!device?.connected) return false;
        
        const buttonIndex = typeof button === 'string' ? StandardMapping.buttons[button] : button;
        return device.buttons[buttonIndex]?.pressed || false;
    }

    isButtonJustPressed(button) {
        const buttonIndex = typeof button === 'string' ? StandardMapping.buttons[button] : button;
        
        // Check all connected devices
        for (const device of this.devices.values()) {
            if (device.connected) {
                const btn = device.buttons[buttonIndex];
                if (btn && btn.pressed && !btn.prevPressed) {
                    return true;
                }
            }
        }
        return false;
    }

    // Player-specific just pressed
    isButtonJustPressedForPlayer(button, playerIndex) {
        const device = this.playerDevices.get(playerIndex);
        if (!device?.connected) return false;
        
        const buttonIndex = typeof button === 'string' ? StandardMapping.buttons[button] : button;
        const btn = device.buttons[buttonIndex];
        return btn ? btn.pressed && !btn.prevPressed : false;
    }

    isButtonJustReleased(button) {
        const buttonIndex = typeof button === 'string' ? StandardMapping.buttons[button] : button;
        
        // Check all connected devices
        for (const device of this.devices.values()) {
            if (device.connected) {
                const btn = device.buttons[buttonIndex];
                if (btn && !btn.pressed && btn.prevPressed) {
                    return true;
                }
            }
        }
        return false;
    }

    // Player-specific just released
    isButtonJustReleasedForPlayer(button, playerIndex) {
        const device = this.playerDevices.get(playerIndex);
        if (!device?.connected) return false;
        
        const buttonIndex = typeof button === 'string' ? StandardMapping.buttons[button] : button;
        const btn = device.buttons[buttonIndex];
        return btn ? !btn.pressed && btn.prevPressed : false;
    }

    getButtonPressDuration(button) {
        const buttonIndex = typeof button === 'string' ? StandardMapping.buttons[button] : button;
        let maxDuration = 0;
        
        // Return the longest press duration from any device
        for (const device of this.devices.values()) {
            if (device.connected) {
                const btn = device.buttons[buttonIndex];
                if (btn) {
                    const duration = btn.getPressedDuration();
                    maxDuration = Math.max(maxDuration, duration);
                }
            }
        }
        return maxDuration;
    }

    // Player-specific press duration
    getButtonPressDurationForPlayer(button, playerIndex) {
        const device = this.playerDevices.get(playerIndex);
        if (!device?.connected) return 0;
        
        const buttonIndex = typeof button === 'string' ? StandardMapping.buttons[button] : button;
        const btn = device.buttons[buttonIndex];
        return btn ? btn.getPressedDuration() : 0;
    }

    getAxis(axis) {
        const axisIndex = typeof axis === 'string' ? StandardMapping.axes[axis] : axis;
        let maxValue = 0;
        
        // Return highest absolute value from any device
        for (const device of this.devices.values()) {
            if (device.connected && device.axes[axisIndex] !== undefined) {
                const value = device.axes[axisIndex];
                if (Math.abs(value) > Math.abs(maxValue)) {
                    maxValue = value;
                }
            }
        }
        return maxValue;
    }

    // Player-specific axis
    getAxisForPlayer(axis, playerIndex) {
        const device = this.playerDevices.get(playerIndex);
        if (!device?.connected) return 0;
        
        const axisIndex = typeof axis === 'string' ? StandardMapping.axes[axis] : axis;
        return device.axes[axisIndex] || 0;
    }

    getStick(stick = 'LEFT') {
        const xAxis = stick === 'LEFT' ? 0 : 2;
        const yAxis = stick === 'LEFT' ? 1 : 3;
        
        let x = 0, y = 0;
        let maxMagnitude = 0;
        
        // Return stick values from device with highest magnitude
        for (const device of this.devices.values()) {
            if (device.connected) {
                const deviceX = device.axes[xAxis] || 0;
                const deviceY = device.axes[yAxis] || 0;
                const magnitude = deviceX * deviceX + deviceY * deviceY;
                
                if (magnitude > maxMagnitude) {
                    maxMagnitude = magnitude;
                    x = deviceX;
                    y = deviceY;
                }
            }
        }
        
        return { x, y };
    }

    // Player-specific stick
    getStickForPlayer(stick = 'LEFT', playerIndex) {
        const device = this.playerDevices.get(playerIndex);
        if (!device?.connected) return { x: 0, y: 0 };
        
        const xAxis = stick === 'LEFT' ? 0 : 2;
        const yAxis = stick === 'LEFT' ? 1 : 3;
        
        return {
            x: device.axes[xAxis] || 0,
            y: device.axes[yAxis] || 0
        };
    }

    getPlayerInput(playerIndex) {
        const device = this.playerDevices.get(playerIndex);
        if (!device?.connected) return null;
        
        return {
            // Methods bound to this player
            isButtonPressed: (button) => this.isButtonPressedForPlayer(button, playerIndex),
            isButtonJustPressed: (button) => this.isButtonJustPressedForPlayer(button, playerIndex),
            isButtonJustReleased: (button) => this.isButtonJustReleasedForPlayer(button, playerIndex),
            getButtonPressDuration: (button) => this.getButtonPressDurationForPlayer(button, playerIndex),
            getAxis: (axis) => this.getAxisForPlayer(axis, playerIndex),
            getStick: (stick) => this.getStickForPlayer(stick, playerIndex),
            device: device
        };
    }

    // Get all connected devices
    getDevices() {
        return Array.from(this.devices.values());
    }

    // Get devices by type
    getGamepads() {
        return this.getDevices().filter(device => device instanceof GamepadDevice);
    }

    getOnScreenDevices() {
        return this.getDevices().filter(device => device instanceof OnScreenDevice);
    }

    removeDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (device) {
            device.disconnect();
            this.devices.delete(deviceId);
        }
    }

    // Vibrate the active device (if supported)
    vibrate(duration = 200, weakMagnitude = 0.5, strongMagnitude = 1.0) {
        for (const device of this.devices.values()) {
            if (device.connected && device.vibrate) {
                device.vibrate(duration, weakMagnitude, strongMagnitude);
            }
        }
    }

    // Vibrate specific player's device
    vibrateForPlayer(playerIndex, duration = 200, weakMagnitude = 0.5, strongMagnitude = 1.0) {
        const device = this.playerDevices.get(playerIndex);
        if (device?.connected && device.vibrate) {
            device.vibrate(duration, weakMagnitude, strongMagnitude);
        }
    }

}