// CompositeCanvasRenderer.js
import { AbstractRenderer } from "./AbstractRenderer.js";

export class CompositeCanvasRenderer extends AbstractRenderer {
    constructor() {
        super();
        this.canvases = new Map(); // canvas id -> {canvas, ctx, bounds}
        this.visuals = new Map();
        this.visualToCanvas = new Map(); // visual.id -> canvas id
        this._renderPending = false;
        this.activeCanvasId = null; // Track which canvas is currently active
    }
    
    addCanvas(id, canvas) {
        const rect = canvas.getBoundingClientRect();
        this.canvases.set(id, {
            canvas,
            ctx: canvas.getContext('2d'),
            bounds: {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom
            }
        });
    }
    
    setActiveCanvas(canvasId) {
        this.activeCanvasId = canvasId;
    }
    
    screenToWorld(screenX, screenY) {
        // Find which canvas contains this point
        for (const [id, data] of this.canvases) {
            const rect = data.canvas.getBoundingClientRect();
            if (screenX >= rect.left && screenX <= rect.right &&
                screenY >= rect.top && screenY <= rect.bottom) {
                
                const scaleX = data.canvas.width / rect.width;
                const scaleY = data.canvas.height / rect.height;
                
                return {
                    x: (screenX - rect.left) * scaleX,
                    y: (screenY - rect.top) * scaleY,
                    canvasId: id  // ADD THIS - return which canvas was hit
                };
            }
        }
        return { x: screenX, y: screenY, canvasId: null };
    }
    
    getCanvas() {
        // Return the active canvas if set, otherwise first canvas
        if (this.activeCanvasId && this.canvases.has(this.activeCanvasId)) {
            return this.canvases.get(this.activeCanvasId).canvas;
        }
        return this.canvases.values().next().value?.canvas;
    }

    getAllCanvases() {
        return Array.from(this.canvases.values()).map(data => data.canvas);
    }
    
    _toColorString(color) {
        if (typeof color === 'string') return color;
        if (typeof color === 'number') {
            return '#' + color.toString(16).padStart(6, '0');
        }
        return '#4444ff';
    }
    
    createVisual(type, options) {
        const visual = {
            type,
            ...options,
            id: Date.now() + Math.random()
        };
        
        this.visuals.set(visual.id, visual);
        
        // Use the active canvas that was set when creating this visual
        const canvasId = this.activeCanvasId || this.canvases.keys().next().value;
        this.visualToCanvas.set(visual.id, canvasId);
                
        this.render();
        return visual;
    }

    
    _determineCanvas(x, y) {
        // If we have an active canvas set (for batch creation), use it
        if (this.activeCanvasId && this.canvases.has(this.activeCanvasId)) {
            return this.activeCanvasId;
        }
        
        // Default to first canvas if no active canvas set
        return this.canvases.keys().next().value;
    }

    
    updateVisual(visual, properties) {
        if (!visual || !this.visuals.has(visual.id)) return;
        
        Object.assign(visual, properties);
        
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
            this.visualToCanvas.delete(visual.id);
            this.render();
        }
    }
    
    render() {
        // Clear all canvases
        for (const data of this.canvases.values()) {
            data.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
        }
        
        // Render each visual ONLY on its assigned canvas
        for (const visual of this.visuals.values()) {
            const canvasId = this.visualToCanvas.get(visual.id);
            const canvasData = this.canvases.get(canvasId);
            
            if (!canvasData) continue;
            
            // No coordinate adjustment needed - just render as-is
            this._renderVisual(canvasData.ctx, visual);
        }
    }
    
    _renderVisual(ctx, visual) {
        ctx.save();
        
        switch(visual.type) {
            case 'button':
                ctx.fillStyle = this._toColorString(visual.color);
                ctx.globalAlpha = visual.opacity || 0.7;
                ctx.beginPath();
                ctx.arc(
                    visual.position.x,
                    visual.position.y,
                    visual.size * (visual.scale || 1),
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                
                if (visual.label) {
                    ctx.fillStyle = this._toColorString(visual.labelColor || '#ffffff');
                    ctx.font = `bold ${visual.size * 1}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(visual.label, visual.position.x, visual.position.y);
                }
                break;
                
            case 'joystick-base':
                ctx.strokeStyle = this._toColorString(visual.color);
                ctx.lineWidth = visual.outerRadius - visual.innerRadius;
                ctx.globalAlpha = visual.opacity || 0.5;
                ctx.beginPath();
                ctx.arc(
                    visual.position.x,
                    visual.position.y,
                    (visual.innerRadius + visual.outerRadius) / 2,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
                break;
                
            case 'joystick-knob':
                ctx.fillStyle = this._toColorString(visual.color);
                ctx.globalAlpha = visual.opacity || 0.7;
                ctx.beginPath();
                ctx.arc(
                    visual.position.x,
                    visual.position.y,
                    visual.radius,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }
}