import { AbstractRenderer } from "./AbstractRenderer.js";

export class Canvas2DRenderer extends AbstractRenderer {
    constructor(canvas) {
        super();
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.visuals = new Map();
        this._renderPending = false;
    }
    
    screenToWorld(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (screenX - rect.left) * scaleX,
            y: (screenY - rect.top) * scaleY
        };
    }
    
    getCanvas() {
        return this.canvas;
    }
    
    // Helper to convert hex numbers to CSS color strings
    _toColorString(color) {
        if (typeof color === 'string') return color;
        if (typeof color === 'number') {
            return '#' + color.toString(16).padStart(6, '0');
        }
        return '#4444ff'; // default
    }
    
    createVisual(type, options) {
        const visual = {
            type,
            ...options,
            id: Date.now() + Math.random()
        };
        
        this.visuals.set(visual.id, visual);
        this.render();
        return visual;
    }
    
    updateVisual(visual, properties) {
        if (!visual || !this.visuals.has(visual.id)) return;
        
        Object.assign(visual, properties);
        // Batch render calls using requestAnimationFrame
        if (!this._renderPending) {
            this._renderPending = true;
            requestAnimationFrame(() => {
                this.render();
                this._renderPending = false;
            });
        }
    }
    
    removeVisual(visual) {
        if (visual && this.visuals.has(visual.id)) {
            this.visuals.delete(visual.id);
            this.render();
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (const visual of this.visuals.values()) {
            this.ctx.save();
            
            switch(visual.type) {
                case 'button':
                    this.ctx.fillStyle = this._toColorString(visual.color);
                    this.ctx.globalAlpha = visual.opacity || 0.7;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        visual.position.x,
                        visual.position.y,
                        visual.size * (visual.scale || 1),
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                    
                    // Draw label
                    if (visual.label) {
                        this.ctx.fillStyle = this._toColorString(visual.labelColor || '#ffffff');
                        this.ctx.font = `bold ${visual.size * 1}px Arial`;
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText(visual.label, visual.position.x, visual.position.y);
                    }
                    break;
                    
                case 'joystick-base':
                    this.ctx.strokeStyle = this._toColorString(visual.color);
                    this.ctx.lineWidth = visual.outerRadius - visual.innerRadius;
                    this.ctx.globalAlpha = visual.opacity || 0.5;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        visual.position.x,
                        visual.position.y,
                        (visual.innerRadius + visual.outerRadius) / 2,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.stroke();
                    break;
                    
                case 'joystick-knob':
                    this.ctx.fillStyle = this._toColorString(visual.color);
                    this.ctx.globalAlpha = visual.opacity || 0.7;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        visual.position.x,
                        visual.position.y,
                        visual.radius,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                    break;
                default:
                    // Skip unknown types - makes it extensible
                    break;
            }
            
            this.ctx.restore();
        }
    }
}