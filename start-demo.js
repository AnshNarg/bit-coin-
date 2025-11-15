#!/usr/bin/env node

// Robust startup script for crypto trading platform demo server
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Crypto Trading Platform Demo Server...');
console.log('📍 Directory:', __dirname);
console.log('');

// Set NODE_ENV to development
process.env.NODE_ENV = 'development';

// Start the server
const serverProcess = spawn('node', ['server-demo.js'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: process.env
});

serverProcess.on('close', (code) => {
    console.log(`\n🔄 Server process exited with code ${code}`);
    if (code !== 0) {
        console.log('❌ Server encountered an error');
        process.exit(code);
    }
});

serverProcess.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    serverProcess.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    serverProcess.kill('SIGTERM');
    process.exit(0);
});
