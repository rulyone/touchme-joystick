export class AbstractRenderer {
    constructor() {}
    
    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        throw new Error('screenToWorld must be implemented by subclass');
    }
    
    // Get canvas element
    getCanvas() {
        throw new Error('getCanvas must be implemented by subclass');
    }
    
    // Visual methods (optional for renderers to implement)
    createVisual(type, options) { return null; }
    updateVisual(visual, properties) { }
    removeVisual(visual) { }
    setUITouchActive(active) {} //useful to disable certain behaviors like OrbitControls if touching a button
}