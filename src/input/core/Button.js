// Button class with state tracking
export class Button {
    constructor(index) {
        this.index = index;
        this.pressed = false;
        this.touched = false;
        this.value = 0.0;

        this.prevPressed = false;
        this.prevTouched = false;

        this.pressStartTime = null;
        this.touchStartTime = null;
    }

    update(pressed, touched = false, value = null) {
        this.prevPressed = this.pressed;
        this.prevTouched = this.touched;

        this.pressed = pressed;
        this.touched = touched;
        this.value = value !== null ? value : (pressed ? 1.0 : 0.0);

        if (pressed && !this.prevPressed) {
            this.pressStartTime = performance.now();
        } else if (!pressed && this.prevPressed) {
            this.pressStartTime = null;
        }

        if (touched && !this.prevTouched) {
            this.touchStartTime = performance.now();
        } else if (!touched && this.prevTouched) {
            this.touchStartTime = null;
        }

        return {
            justPressed: pressed && !this.prevPressed,
            justReleased: !pressed && this.prevPressed,
            justTouched: touched && !this.prevTouched,
            justUntouched: !touched && this.prevTouched,
            pressDuration: this.pressStartTime ? performance.now() - this.pressStartTime : 0
        };
    }

    getPressedDuration() {
        return this.pressStartTime ? performance.now() - this.pressStartTime : 0;
    }
}