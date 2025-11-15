#!/usr/bin/env node

// =============================================
// MASTER AUTHENTICATION TEST RUNNER
// =============================================
// Runs all authentication tests in sequence
// Execute this from the root of your project

const { spawn } = require('child_process');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AuthTestRunner {
    constructor() {
        this.results = {};
        this.projectRoot = process.cwd();
    }

    log(section, message, type = 'info') {
        const colors = {
            info: '\x1b[36m',    // Cyan
            success: '\x1b[32m', // Green
            error: '\x1b[31m',   // Red
            warning: '\x1b[33m', // Yellow
            reset: '\x1b[0m'     // Reset
        };
        console.log(`${colors[type]}${section} ${message}${colors.reset}`);
    }

    async runNodeTest(testFile, description, workingDir = null) {
        return new Promise((resolve) => {
            this.log('🔧', `Starting ${description}...`, 'info');
            
            const cwd = workingDir ? path.join(this.projectRoot, workingDir) : this.projectRoot;
            
            const child = spawn('node', [testFile], {
                cwd,
                stdio: 'inherit',
                shell: true
            });

            child.on('close', (code) => {
                if (code === 0) {
                    this.log('✅', `${description} completed successfully`, 'success');
                    resolve(true);
                } else {
                    this.log('❌', `${description} failed with code ${code}`, 'error');
                    resolve(false);
                }
            });

            child.on('error', (error) => {
                this.log('❌', `${description} error: ${error.message}`, 'error');
                resolve(false);
            });
        });
    }

    async checkPrerequisites() {
        this.log('🔍', 'Checking Prerequisites...', 'info');
        
        const checks = [
            { file: 'package.json', desc: 'Project root package.json' },
            { file: 'backend/package.json', desc: 'Backend package.json' },
            { file: 'frontend/package.json', desc: 'Frontend package.json' },
            { file: 'backend/server.js', desc: 'Backend server file' },
            { file: 'frontend/src/App.tsx', desc: 'Frontend App component' }
        ];

        const fs = require('fs');
        let allGood = true;

        for (const check of checks) {
            const filePath = path.join(this.projectRoot, check.file);
            if (fs.existsSync(filePath)) {
                this.log('✅', `Found ${check.desc}`, 'success');
            } else {
                this.log('❌', `Missing ${check.desc}`, 'error');
                allGood = false;
            }
        }

        if (allGood) {
            this.log('✅', 'All prerequisites check passed', 'success');
        } else {
            this.log('❌', 'Some prerequisites are missing', 'error');
        }

        return allGood;
    }

    async testBackendServer() {
        this.log('🖥️', 'Testing Backend Server...', 'info');
        
        try {
            const axios = require('axios');
            const response = await axios.get('http://localhost:5000/health', { 
                timeout: 5000,
                validateStatus: () => true // Accept any status code
            });
            
            if (response.status === 200 && response.data.status === 'success') {
                this.log('✅', 'Backend server is running and healthy', 'success');
                return true;
            } else {
                throw new Error(`Server unhealthy: ${response.status}`);
            }
        } catch (error) {
            this.log('❌', `Backend server is not accessible: ${error.message}`, 'error');
            this.log('💡', 'Please start the backend server first: cd backend && npm start', 'warning');
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 CRYPTO TRADING PLATFORM - COMPREHENSIVE AUTH TESTS');
        console.log('======================================================');
        console.log('This will run all authentication tests to verify your system is working correctly.\n');

        // Step 1: Check prerequisites
        const prereqsOk = await this.checkPrerequisites();
        if (!prereqsOk) {
            this.log('❌', 'Prerequisites check failed. Cannot continue.', 'error');
            return false;
        }
        await delay(1000);

        // Step 2: Check if backend server is running
        const serverOk = await this.testBackendServer();
        if (!serverOk) {
            this.log('❌', 'Backend server is not running. Please start it first.', 'error');
            return false;
        }
        await delay(1000);

        // Step 3: Run backend endpoint tests
        this.log('🎯', 'Running Backend Authentication Endpoint Tests...', 'info');
        this.results.backendTests = await this.runNodeTest(
            'test-auth-endpoints.js --quick',
            'Backend Endpoint Tests',
            'backend'
        );
        await delay(2000);

        // Step 4: Run comprehensive authentication flow test
        this.log('🎯', 'Running Comprehensive Authentication Flow Tests...', 'info');
        this.results.authFlowTests = await this.runNodeTest(
            'test-auth-flow.js --quick',
            'Authentication Flow Tests',
            'frontend'
        );
        await delay(2000);

        // Step 5: Run Redux state management tests
        this.log('🎯', 'Running Redux Authentication State Tests...', 'info');
        this.results.reduxTests = await this.runNodeTest(
            'test-redux-auth.js',
            'Redux State Management Tests',
            'frontend'
        );
        await delay(1000);

        // Step 6: Show results summary
        this.showFinalResults();

        return this.results;
    }

    showFinalResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 FINAL TEST RESULTS SUMMARY');
        console.log('='.repeat(60));

        const tests = [
            { key: 'backendTests', name: 'Backend Endpoint Tests' },
            { key: 'authFlowTests', name: 'Authentication Flow Tests' },
            { key: 'reduxTests', name: 'Redux State Tests' }
        ];

        let passed = 0;
        let total = tests.length;

        tests.forEach(test => {
            const result = this.results[test.key];
            const status = result ? '✅ PASSED' : '❌ FAILED';
            const color = result ? 'success' : 'error';
            this.log(status, test.name, color);
            if (result) passed++;
        });

        console.log('\n' + '='.repeat(60));
        this.log('🎯', `OVERALL RESULT: ${passed}/${total} test suites passed`, passed === total ? 'success' : 'error');

        if (passed === total) {
            console.log('\n🎉 ALL TESTS PASSED! Your authentication system is working correctly!');
            console.log('\n💡 Next steps:');
            console.log('   1. ✅ Backend authentication is fully functional');
            console.log('   2. ✅ Token generation and validation works');
            console.log('   3. ✅ State management is correct');
            console.log('   4. ✅ Registration should redirect to dashboard');
            console.log('\n   If you\'re still having frontend issues:');
            console.log('   • Open the browser test: frontend/test-browser-auth.html');
            console.log('   • Check React component rendering logic');
            console.log('   • Verify router configuration');
            console.log('   • Check browser console for errors');
        } else {
            console.log('\n❌ SOME TESTS FAILED');
            console.log('\n🔧 Troubleshooting steps:');
            
            if (!this.results.backendTests) {
                console.log('   • Backend Issues: Check MongoDB connection and server configuration');
                console.log('   • Verify .env file has JWT_SECRET and MONGODB_URI');
            }
            
            if (!this.results.authFlowTests) {
                console.log('   • Authentication Flow Issues: Check API endpoints and token handling');
            }
            
            if (!this.results.reduxTests) {
                console.log('   • Redux Issues: Check state management and action dispatching');
            }
        }

        console.log('\n📋 Available Tools:');
        console.log('   • Backend tests: cd backend && node test-auth-endpoints.js');
        console.log('   • Flow tests: cd frontend && node test-auth-flow.js');
        console.log('   • Redux tests: cd frontend && node test-redux-auth.js');
        console.log('   • Browser test: Open frontend/test-browser-auth.html in browser');
        console.log('   • Quick test: cd frontend && node test-auth-flow.js --quick');
    }

    async runQuickTest() {
        this.log('⚡', 'Running Quick Authentication Test...', 'info');
        
        // Just test the essentials
        const serverOk = await this.testBackendServer();
        if (!serverOk) return false;

        // Run quick backend test
        const backendOk = await this.runNodeTest(
            'test-auth-endpoints.js --quick',
            'Quick Backend Test',
            'backend'
        );

        if (backendOk) {
            // Run quick flow test
            const flowOk = await this.runNodeTest(
                'test-auth-flow.js --quick',
                'Quick Flow Test',
                'frontend'
            );

            if (flowOk) {
                this.log('🎉', 'Quick test passed! Your authentication is working.', 'success');
                return true;
            }
        }

        this.log('❌', 'Quick test failed. Run full test for details.', 'error');
        return false;
    }
}

// Main execution
async function main() {
    const runner = new AuthTestRunner();
    const args = process.argv.slice(2);

    if (args.includes('--quick')) {
        await runner.runQuickTest();
    } else if (args.includes('--help')) {
        console.log('Crypto Trading Platform - Authentication Test Runner');
        console.log('');
        console.log('Usage:');
        console.log('  node run-all-auth-tests.js          # Run all tests');
        console.log('  node run-all-auth-tests.js --quick  # Run quick tests only');
        console.log('  node run-all-auth-tests.js --help   # Show this help');
        console.log('');
        console.log('Make sure to:');
        console.log('  1. Start backend server: cd backend && npm start');
        console.log('  2. Have MongoDB running');
        console.log('  3. Have proper .env configuration');
    } else {
        await runner.runAllTests();
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = AuthTestRunner;
