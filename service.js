const Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
  name: 'Aksiologiseis',                  // Service name
  description: 'Εφαρμογή Αξιολογήσεων',
  script: 'C:\\dev\\aksiol\\server.js', // Absolute path to your main app file
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  // Optionally run as a specific user
  // username: 'myuser',
  // password: 'mypassword'
});

// Listen for "install" event
svc.on('install', () => {
  console.log('Service installed successfully!');
  svc.start();
});

// Install the service
svc.install();
