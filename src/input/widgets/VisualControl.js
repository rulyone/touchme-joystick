import { EventEmitter } from "../core/EventEmitter.js";

// Generic control base class
export class VisualControl extends EventEmitter {
    constructor(options = {}) {
        super();

        // Enforce unique ID
        if (!options.id) {
            throw new Error('Control requires an id option. Must be unique');
        }

        if (!options.position) {
            throw new Error('Control requires a position option with {x, y} coordinates');
        }

        this.id = options.id;
        this.type = options.type || 'button';
        this.renderer = options.renderer;

        this._position = options.position;
        this._size = options.size || 1;

        this.visual = null;
        this.touchId = null;
        this.isActive = false;

    }

    set position(newPos) {
        this._position = newPos;
        if (this.visual && this.renderer) {
            this.renderer.updateVisual(this.visual, {
                position: newPos
            });
        }
    }

    get position() {
        return this._position;
    }

    set size(newSize) {
        this._size = newSize;
        if (this.visual && this.renderer) {
            this.renderer.updateVisual(this.visual, {
                size: newSize
            });
        }
    }

    get size() {
        return this._size;
    }

    _createVisual() {

        if (this.renderer && this.renderer.createVisual) {
            this.visual = this.renderer.createVisual(this.type, {
                position: this.position,
                size: this.size,
                color: this.color,
                label: this.label,
                labelColor: this.labelColor
            });
        }
    }

    containsPoint(screenX, screenY, touchRadiusX = 0, touchRadiusY = 0) {
        if (!this.renderer) return false;
        const controlCanvasId = this.renderer.visualToCanvas?.get(this.visual?.id);

        let worldPos = null;
        if (controlCanvasId && typeof this.renderer.screenToWorldForCanvas === 'function') {
            worldPos = this.renderer.screenToWorldForCanvas(controlCanvasId, screenX, screenY);
            if (worldPos && worldPos.withinBounds === false) {
                return false;
            }
        }

        if (!worldPos) {
            worldPos = this.renderer.screenToWorld(screenX, screenY);

            if (controlCanvasId && worldPos.canvasId && worldPos.canvasId !== controlCanvasId) {
                return false;
            }
        }

        if (!worldPos) {
            return false;
        }

        const dx = worldPos.x - this.position.x;
        const dy = worldPos.y - this.position.y;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        const touchRadius = Math.max(touchRadiusX, touchRadiusY);
        
        return distance <= (this.size + touchRadius);
    }

    updateVisualState() {
        // Override in subclasses
    }

    handleTouchStart(touch, screenX, screenY) {
        // Override in subclasses
    }

    handleTouchMove(touch, screenX, screenY) {
        // Override in subclasses
    }

    handleTouchEnd(touch) {
        // Override in subclasses
    }

    setHighlight(active) {
        if (this.renderer && this.renderer.updateVisual) {
            this.renderer.updateVisual(this.visual, {
                color: active ? this.activeColor : this.color,
                scale: active ? 1.2 : 1.0
            });
        }
    }

    dispose() {
        if (this.renderer && this.renderer.removeVisual) {
            this.renderer.removeVisual(this.visual);
        }
    }

}
