const path = require('path');
const Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
  name: 'Aksiologiseis',                  // Service name
  description: 'Εφαρμογή Αξιολογήσεων',
  script: path.join(__dirname,'server.js'), 
  nodeOptions: [
    '--max_old_space_size=4096'
  ],
  // Optionally run as a specific user
  // username: 'myuser',
  // password: 'mypassword'
});

svc.on('install', () => {
  console.log('Service installed');
  svc.start();
});

svc.on('start', () => {
  console.log('Service started');
});

svc.on('alreadyinstalled', () => {
  console.log('Service is already installed');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

// Install the service (run this script as administrator)
svc.install();