const net = require('net');
const { Server } = require('socket.io');

// 1. Setup the WebSocket Server for your Browser (Port 4000)
const io = new Server(4000, {
    cors: { origin: "http://localhost:3000" }
});

console.log("Bridge Active: Waiting for Python Stream...");

// 2. Connect to the Python TCP Stream (Port 9999)
// Note: Ensure the Python script is running first!
const pythonClient = new net.Socket();

function connectToPython() {
    pythonClient.connect(9999, '127.0.0.1', () => {
        console.log("Connected to Python Data Engine");
    });
}

pythonClient.on('data', (data) => {
    try {
        const telemetry = JSON.parse(data.toString());
        // Send the data to your GRID.01 dashboard
        io.emit('telemetry_update', telemetry);
    } catch (e) {
        // Handle partial data packets
    }
});

pythonClient.on('error', () => {
    console.log("Python Stream not found. Retrying in 5s...");
    setTimeout(connectToPython, 5000);
});

connectToPython();