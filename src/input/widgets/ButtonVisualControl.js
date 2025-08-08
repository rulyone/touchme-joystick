import { VisualControl } from './VisualControl.js';

// Generic Button Control
export class ButtonVisualControl extends VisualControl {
    constructor(options) {
        super({ ...options, type: 'button' });

        this.buttonIndex = options.buttonIndex || 0;
        this.label = options.label || 'A';
        this.color = options.color || 0x4444ff;
        this.activeColor = options.activeColor || 0x6666ff;
        this.labelColor = options.labelColor || '#ffffff';

        this.isTouched = false;
    }

    handleTouchStart(touch, screenX, screenY) {
        this.touchId = touch.identifier;
        this.isTouched = true;
        this.setHighlight(true);

        this.emit('press', {
            buttonIndex: this.buttonIndex,
            touchId: this.touchId
        });
    }


    handleTouchMove(touch, screenX, screenY) {
    }

    handleTouchEnd(touch) {
        if (this.touchId === touch.identifier) {
            this.touchId = null;
            this.isTouched = false;
            this.setHighlight(false);

            this.emit('release', {
                buttonIndex: this.buttonIndex,
                touchId: touch.identifier
            });
        }
    }

    updateVisualState() {
        if (this.parentDevice) {
            const isPressed = this.parentDevice.buttons[this.buttonIndex]?.pressed || false;
            this.isActive = isPressed;
            this.setHighlight(isPressed);
        }
    }

}