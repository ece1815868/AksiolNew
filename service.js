const path = require('path');
const Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
  name: 'Aksiologiseis',
  description: 'Εφαρμογή Αξιολογήσεων',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: [
    '--max_old_space_size=4096'
  ],
  // username: 'myuser',
  // password: 'mypassword'
});

/* -------------------- EVENTS -------------------- */

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

svc.on('uninstall', () => {
  console.log('Service uninstalled');
});

svc.on('alreadyuninstalled', () => {
  console.log('Service is not installed');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

/* -------------------- ACTION -------------------- */

// Use: node service.js install
// Use: node service.js uninstall
const action = process.argv[2];

if (action === 'uninstall') {
  console.log('Uninstalling service...');
  svc.uninstall();
} else {
  console.log('Installing service...');
  svc.install();
}
