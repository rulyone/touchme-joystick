// EventEmitter for handling input events
export class EventEmitter {
    constructor() {
        this.events = {};
        this.maxListeners = 10;
    }

    on(event, callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('Callback must be a function');
        }
        
        if (!this.events[event]) {
            this.events[event] = [];
        }
        
        // Warn about potential memory leaks
        if (this.events[event].length >= this.maxListeners) {
            console.warn(`Warning: ${event} has ${this.events[event].length} listeners attached`);
        }
        
        this.events[event].push(callback);
        return this; // Allow chaining
    }

    once(event, callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('Callback must be a function');
        }
        
        const onceWrapper = (data) => {
            callback(data);
            this.off(event, onceWrapper);
        };
        
        onceWrapper.originalCallback = callback; // For removal
        this.on(event, onceWrapper);
        return this;
    }

    off(event, callback) {
        if (!this.events[event]) return this;
        
        if (callback) {
            this.events[event] = this.events[event].filter(cb => 
                cb !== callback && cb.originalCallback !== callback
            );
        } else {
            // Remove all listeners for this event
            delete this.events[event];
        }
        
        return this;
    }

    emit(event, data) {
        if (!this.events[event]) return false;
        
        // Copy array to prevent issues if listeners are removed during emit
        const listeners = [...this.events[event]];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for "${event}":`, error);
            }
        });
        
        return true; // Indicates event had listeners
    }

    removeAllListeners(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
        return this;
    }

    listenerCount(event) {
        return this.events[event] ? this.events[event].length : 0;
    }

    eventNames() {
        return Object.keys(this.events);
    }

    setMaxListeners(n) {
        this.maxListeners = n;
        return this;
    }

}