const { exec } = require('child_process');

// Start the local server
const server = exec('node src/index.js', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error starting server: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Server stderr: ${stderr}`);
        return;
    }
    console.log(`Server stdout: ${stdout}`);
});

server.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
});

// Start ngrok in a separate process
const ngrok = exec('ngrok http 3000', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error starting ngrok: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`ngrok stderr: ${stderr}`);
        return;
    }
    console.log(`ngrok stdout: ${stdout}`);
});

ngrok.stdout.on('data', (data) => {
    console.log(`ngrok: ${data}`);
});