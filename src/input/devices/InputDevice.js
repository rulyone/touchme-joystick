import { EventEmitter } from '../core/EventEmitter.js';

// Base InputDevice class
export class InputDevice extends EventEmitter {
    constructor(id) {
        super();
        this.id = id;
        this.connected = false;
        this.timestamp = 0;

        this.axes = [];
        this.buttons = [];
        this.mapping = 'standard';
    }

    update(deltaTime) {
        this.timestamp = performance.now();

        this.buttons.forEach((button, index) => {

            if (button.pressed && !button.prevPressed) {
                this.emit('buttondown', {
                    button: index,
                    device: this,
                    timestamp: this.timestamp
                });
            }

            if (!button.pressed && button.prevPressed) {
                const duration = button.getPressedDuration();
                this.emit('buttonup', {
                    button: index,
                    device: this,
                    timestamp: this.timestamp,
                    duration: duration
                });

                if (duration < 500) {
                    this.emit('buttonpress', {
                        button: index,
                        device: this,
                        timestamp: this.timestamp,
                        duration: duration
                    });
                }
            }

            if (button.pressed && button.getPressedDuration() > 500 && !button.longPressEmitted) {
                button.longPressEmitted = true;
                this.emit('buttonlongpress', {
                    button: index,
                    device: this,
                    timestamp: this.timestamp,
                    duration: button.getPressedDuration()
                });
            }

            // Update previous state for next frame
            button.prevPressed = button.pressed;
            button.prevTouched = button.touched;
        });
    }

    connect() {
        this.connected = true;
        this.emit('connected', { device: this });
    }

    disconnect() {
        this.connected = false;
        this.emit('disconnected', { device: this });
    }

    getState() {
        return {
            id: this.id,
            connected: this.connected,
            timestamp: this.timestamp,
            mapping: this.mapping,
            axes: [...this.axes],
            buttons: this.buttons.map(btn => ({
                pressed: btn.pressed,
                touched: btn.touched,
                value: btn.value
            }))
        };
    }
}

