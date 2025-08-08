# TouchMeJoystick

Unified input handling for web games - supports touch controls, physical gamepads, and multi-player.

You can create your Virtual Touch Joysticks and buttons on Canvas HTML, ThreeJS scenes, or you can customize it further for any other rendering library by simply extending AbstractRendering class

Here's a Demo using ThreeJS using 2 cameras, a Perspective camera to show the world (with Orbital Controls) and a Ortographic camera to show the Virtual Joystick. Orbital controls are disabled when using the Virtual Touch buttons/joystick for a better experience.

[**PLAY IT YOURSELF!**](https://quantumentangled.dev/touchme-joystick/joythreejs3Dper.html)

<img src="demo_with_orbital_control_support.png?raw=true" width="20%" alt="Demo of TouchMeJoystick">

You can view the source code of the Demo at [joythreejs3Dper.html](joythreejs3Dper.html)

You also have other Demos in joycanvasmin.html (supports multiplayer), joythreejsmin.html (only using an Ortographic camera) and joythreejs3Dmin.html (if you are only interested in the pieces that creates a touch joystick)

<img src="demo_custom_layout.png?raw=true" width="20%" alt="Custom layout demo">

## Features

- 🎮 **Multi-device**: Touch, Physical gamepad, keyboard (coming soon)
- 👥 **Multi-player**: Up to 4 players with independent controls  
- 📱 **Touch-optimized**: Visual on-screen controls
- 🎯 **Unified API**: One interface for all input types
- 🔌 **Flexible rendering**: Canvas2D, Three.js, or custom

## Installation

```javascript
import { InputManager, StandardMapping } from './touchme-joystick/src/input/core/InputManager.js';
```

## Quick Start

```javascript
// Setup
const inputManager = new InputManager();
const canvas = document.getElementById('gameCanvas');
const renderer = new Canvas2DRenderer(canvas);

// Create on-screen controls
const thumbRadius = 20; // default if not passed as param
const device = inputManager.createOnScreenDevice({ renderer: renderer, thumbRadius: thumbRadius });

const joystick = device.createJoystick({
  position: { x: 100, y: 300 },
  size: 60
});

const buttonA = device.createButton({
  position: { x: 400, y: 300 },
  size: 30,
  buttonIndex: StandardMapping.buttons.A, //can be any index, but StandardMapping is encouraged for physical Gamepad support
  label: 'A'
});

// Game loop
function update() {
  inputManager.update();
  
  // Get input
  const stick = inputManager.getStick('LEFT');
  player.move(stick.x, stick.y);
  
  if (inputManager.isButtonPressed(StandardMapping.buttons.A)) {
    player.jump();
  }
  
  requestAnimationFrame(update);
}
update();
```

## Multi-Player

```javascript
// Player 1
const device1 = inputManager.createOnScreenDevice({ renderer: renderer1 });
inputManager.assignDeviceToPlayer(device1.id, 0);
const p1_joystick = device1.createJoystick({ position: { x: 100, y: 300 } });

// Player 2 - Physical gamepad auto-assigns
inputManager.on('gamepadconnected', (e) => {
  console.log(`Gamepad connected to Player ${e.playerIndex + 1}`);
});

// Check player-specific input
if (inputManager.isButtonPressedForPlayer(StandardMapping.buttons.A, 0)) player1.jump();
if (inputManager.isButtonPressedForPlayer(StandardMapping.buttons.A, 1)) player2.jump();
```

## API

### InputManager

```javascript
// Devices
createOnScreenDevice(options)         // Create touch controls
assignDeviceToPlayer(deviceId, playerIndex)  // Assign device to player

// Input queries (any device)
isButtonPressed(button)               // button: 0-16 or 'A', 'B', 'X', 'Y', etc.
isButtonJustPressed(button)           // True on first frame pressed
getStick(stick)                       // stick: 'LEFT' or 'RIGHT', returns {x, y}
getAxis(axis)                         // axis: 0-3 or 'LEFT_STICK_X', etc.

// Player-specific
isButtonPressedForPlayer(button, playerIndex)
getStickForPlayer(stick, playerIndex)

// Events
on('buttondown', callback)            // {button, device, playerIndex}
on('gamepadconnected', callback)      // {device, gamepad, playerIndex}
```

### OnScreenDevice

```javascript
createButton(options)                 // Create visual button
createJoystick(options)              // Create visual joystick
```

### Button/Joystick Options

```javascript
{
  position: { x, y },                // World position
  size: 60,                          // Size in world units
  id: 'unique-id',                   // Required unique ID
  buttonIndex: 0,                    // Usage of StandardMapping values is encouraged for Physical Gamepad support
  label: 'A',                        // Button label
  color: 0xff0000,                   // Color (hex or string)
}
```

## Standard Mapping

```javascript
StandardMapping.buttons = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  SELECT: 8, START: 9,
  LS: 10, RS: 11,
  DPAD_UP: 12, DPAD_DOWN: 13,
  DPAD_LEFT: 14, DPAD_RIGHT: 15
};

StandardMapping.axes = {
  LEFT_STICK_X: 0, LEFT_STICK_Y: 1,
  RIGHT_STICK_X: 2, RIGHT_STICK_Y: 3
};
```

## Renderers

```javascript
// Canvas2D
import { Canvas2DRenderer } from './touchme-joystick/src/input/renderers/Canvas2DRenderer.js';
const renderer = new Canvas2DRenderer(canvas);

// Three.js
import { ThreeJSRenderer } from './touchme-joystick/src/input/renderers/ThreeJSRenderer.js';
const renderer = new ThreeJSRenderer(scene, camera, webglRenderer);
```

## Advanced

### Joystick Gate Shape
```javascript
// Configure joystick response curve
const device = inputManager.createOnScreenDevice({ 
  renderer: renderer,
  stickGateFactor: 1.1  // 1.0 = circle, 1.414 = square, 1.1 = rounded square (PS4 analog alike)
});
```

## License

MIT