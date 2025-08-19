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

    updateVisualState(visualMode = 'touch-only', playerIndex = 0) {
        if (this.touchId !== null) return; // Don't update if being touched
        
        let isPressed = false;
        
        switch(visualMode) {
            case 'all-inputs':
                // Show input from ANY device
                if (this.inputManager) {
                    isPressed = this.inputManager.isButtonPressed(this.buttonIndex);
                }
                break;
                
            case 'player-device':
                // Show input from specific player's device
                if (this.inputManager) {
                    isPressed = this.inputManager.isButtonPressedForPlayer(this.buttonIndex, playerIndex);
                }
                break;
                
            case 'touch-only':
            default:
                // Only show touch input
                if (this.parentDevice) {
                    isPressed = this.parentDevice.buttons[this.buttonIndex]?.pressed || false;
                }
                break;
        }
        
        this.setHighlight(isPressed);
    }

}