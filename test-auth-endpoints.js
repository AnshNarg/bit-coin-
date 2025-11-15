// =======================================
// BACKEND AUTHENTICATION ENDPOINTS TEST
// =======================================
// Tests all authentication endpoints to ensure they work correctly
// Run this from the backend directory

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

class BackendAuthTester {
    constructor() {
        this.baseUrl = 'http://localhost:5000/api';
        this.testUser = {
            username: `testuser_backend_${Date.now()}`,
            email: `test_backend_${Date.now()}@example.com`,
            password: 'testpass123',
            firstName: 'Backend',
            lastName: 'Test'
        };
        this.token = null;
        this.userId = null;
    }

    log(step, message, data = null) {
        console.log(`\n${step} ${message}`);
        if (data) {
            console.log('   Response:', JSON.stringify(data, null, 2));
        }
    }

    async testServerHealth() {
        this.log('🏥', 'Testing Server Health...');
        
        try {
            const response = await axios.get('http://localhost:5000/health', { timeout: 5000 });
            
            if (response.data.status === 'success') {
                this.log('✅', 'Server Health Check Passed', {
                    status: response.data.status,
                    message: response.data.message,
                    timestamp: response.data.timestamp
                });
                return true;
            } else {
                throw new Error('Invalid health response');
            }
        } catch (error) {
            this.log('❌', 'Server Health Check Failed', {
                error: error.message,
                code: error.code
            });
            return false;
        }
    }

    async testDatabaseConnection() {
        this.log('🗄️', 'Testing Database Connection...');
        
        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-trading-platform';
            
            // Test connection
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000
            });
            
            const dbState = mongoose.connection.readyState;
            const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
            
            this.log('✅', 'Database Connection Check Passed', {
                state: states[dbState],
                database: mongoose.connection.name,
                host: mongoose.connection.host,
                port: mongoose.connection.port
            });
            
            return true;
        } catch (error) {
            this.log('❌', 'Database Connection Failed', {
                error: error.message
            });
            return false;
        } finally {
            // Close test connection
            await mongoose.disconnect();
        }
    }

    async testRegistrationEndpoint() {
        this.log('📝', 'Testing Registration Endpoint...');
        
        try {
            const response = await axios.post(`${this.baseUrl}/auth/register`, this.testUser);
            
            // Check response structure
            if (!response.data.success) {
                throw new Error('Registration returned success: false');
            }
            
            const { data } = response.data;
            
            // Validate response data
            if (!data.token || !data.user) {
                throw new Error('Missing token or user in response');
            }
            
            if (!data.user._id || !data.user.username || !data.user.email) {
                throw new Error('Incomplete user data in response');
            }
            
            // Store for later tests
            this.token = data.token;
            this.userId = data.user._id;
            
            this.log('✅', 'Registration Endpoint Passed', {
                hasToken: !!data.token,
                hasUser: !!data.user,
                userId: data.user._id,
                username: data.user.username,
                balance: data.user.balance,
                isVerified: data.user.isVerified
            });
            
            return true;
        } catch (error) {
            this.log('❌', 'Registration Endpoint Failed', {
                status: error.response?.status,
                message: error.response?.data?.message || error.message,
                details: error.response?.data?.details
            });
            return false;
        }
    }

    async testLoginEndpoint() {
        this.log('🔐', 'Testing Login Endpoint...');
        
        try {
            const response = await axios.post(`${this.baseUrl}/auth/login`, {
                emailOrUsername: this.testUser.username,
                password: this.testUser.password
            });
            
            if (!response.data.success) {
                throw new Error('Login returned success: false');
            }
            
            const { data } = response.data;
            
            // Validate login response
            if (!data.token || !data.user) {
                throw new Error('Missing token or user in login response');
            }
            
            if (data.user._id !== this.userId) {
                throw new Error('User ID mismatch between registration and login');
            }
            
            this.log('✅', 'Login Endpoint Passed', {
                hasToken: !!data.token,
                userIdMatches: data.user._id === this.userId,
                loginCount: data.user.loginCount,
                lastLogin: data.user.lastLogin
            });
            
            return true;
        } catch (error) {
            this.log('❌', 'Login Endpoint Failed', {
                status: error.response?.status,
                message: error.response?.data?.message || error.message
            });
            return false;
        }
    }

    async testProfileEndpoint() {
        this.log('👤', 'Testing Profile Endpoint...');
        
        if (!this.token) {
            this.log('❌', 'No token available for profile test');
            return false;
        }
        
        try {
            const response = await axios.get(`${this.baseUrl}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.data.success) {
                throw new Error('Profile returned success: false');
            }
            
            const { data } = response.data;
            
            if (!data.user || data.user._id !== this.userId) {
                throw new Error('Invalid user data in profile response');
            }
            
            this.log('✅', 'Profile Endpoint Passed', {
                hasUser: !!data.user,
                userIdMatches: data.user._id === this.userId,
                hasPassword: !!data.user.password // Should be undefined/null for security
            });
            
            return true;
        } catch (error) {
            this.log('❌', 'Profile Endpoint Failed', {
                status: error.response?.status,
                message: error.response?.data?.message || error.message
            });
            return false;
        }
    }

    async testInvalidTokenRejection() {
        this.log('🚫', 'Testing Invalid Token Rejection...');
        
        try {
            await axios.get(`${this.baseUrl}/auth/profile`, {
                headers: {
                    'Authorization': 'Bearer invalid_token_123'
                }
            });
            
            // If we get here, the test failed
            this.log('❌', 'Invalid token was accepted (should be rejected)');
            return false;
        } catch (error) {
            if (error.response?.status === 401) {
                this.log('✅', 'Invalid Token Correctly Rejected', {
                    status: error.response.status,
                    message: error.response.data?.message
                });
                return true;
            } else {
                this.log('❌', 'Unexpected error with invalid token', {
                    status: error.response?.status,
                    message: error.response?.data?.message || error.message
                });
                return false;
            }
        }
    }

    async testPasswordChangeEndpoint() {
        this.log('🔑', 'Testing Password Change Endpoint...');
        
        if (!this.token) {
            this.log('❌', 'No token available for password change test');
            return false;
        }
        
        try {
            const response = await axios.post(`${this.baseUrl}/auth/change-password`, {
                currentPassword: this.testUser.password,
                newPassword: 'newpassword123'
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.data.success) {
                throw new Error('Password change returned success: false');
            }
            
            // Test login with new password
            const loginResponse = await axios.post(`${this.baseUrl}/auth/login`, {
                emailOrUsername: this.testUser.username,
                password: 'newpassword123'
            });
            
            if (!loginResponse.data.success) {
                throw new Error('Login with new password failed');
            }
            
            this.log('✅', 'Password Change Endpoint Passed', {
                passwordChanged: true,
                canLoginWithNewPassword: true
            });
            
            return true;
        } catch (error) {
            this.log('❌', 'Password Change Endpoint Failed', {
                status: error.response?.status,
                message: error.response?.data?.message || error.message
            });
            return false;
        }
    }

    async testLogoutEndpoint() {
        this.log('🚪', 'Testing Logout Endpoint...');
        
        if (!this.token) {
            this.log('❌', 'No token available for logout test');
            return false;
        }
        
        try {
            const response = await axios.post(`${this.baseUrl}/auth/logout`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.data.success) {
                throw new Error('Logout returned success: false');
            }
            
            this.log('✅', 'Logout Endpoint Passed', {
                message: response.data.message
            });
            
            return true;
        } catch (error) {
            this.log('❌', 'Logout Endpoint Failed', {
                status: error.response?.status,
                message: error.response?.data?.message || error.message
            });
            return false;
        }
    }

    async testValidationErrors() {
        this.log('⚠️', 'Testing Validation Error Handling...');
        
        try {
            // Test registration with invalid data
            await axios.post(`${this.baseUrl}/auth/register`, {
                username: 'a', // Too short
                email: 'invalid-email',
                password: '123', // Too short
                // Missing firstName and lastName
            });
            
            this.log('❌', 'Validation should have failed but didn\'t');
            return false;
        } catch (error) {
            if (error.response?.status === 400 && error.response.data?.details) {
                this.log('✅', 'Validation Error Handling Passed', {
                    status: error.response.status,
                    validationError: error.response.data.details
                });
                return true;
            } else {
                this.log('❌', 'Unexpected validation error response', {
                    status: error.response?.status,
                    message: error.response?.data?.message || error.message
                });
                return false;
            }
        }
    }

    async testDuplicateUserRegistration() {
        this.log('🔄', 'Testing Duplicate User Registration Prevention...');
        
        try {
            // Try to register the same user again
            await axios.post(`${this.baseUrl}/auth/register`, this.testUser);
            
            this.log('❌', 'Duplicate registration should have been prevented');
            return false;
        } catch (error) {
            if (error.response?.status === 400) {
                this.log('✅', 'Duplicate Registration Correctly Prevented', {
                    status: error.response.status,
                    message: error.response.data?.message
                });
                return true;
            } else {
                this.log('❌', 'Unexpected duplicate registration error', {
                    status: error.response?.status,
                    message: error.response?.data?.message || error.message
                });
                return false;
            }
        }
    }

    async runAllTests() {
        console.log('🚀 STARTING BACKEND AUTHENTICATION ENDPOINT TESTS');
        console.log('==================================================');
        
        const results = {
            serverHealth: await this.testServerHealth(),
            databaseConnection: await this.testDatabaseConnection(),
            registration: await this.testRegistrationEndpoint(),
            login: await this.testLoginEndpoint(),
            profile: await this.testProfileEndpoint(),
            invalidToken: await this.testInvalidTokenRejection(),
            passwordChange: await this.testPasswordChangeEndpoint(),
            logout: await this.testLogoutEndpoint(),
            validationErrors: await this.testValidationErrors(),
            duplicateUser: await this.testDuplicateUserRegistration()
        };
        
        console.log('\n📊 BACKEND TEST RESULTS SUMMARY');
        console.log('================================');
        
        const passed = Object.values(results).filter(r => r).length;
        const total = Object.keys(results).length;
        
        Object.entries(results).forEach(([test, result]) => {
            console.log(`${result ? '✅' : '❌'} ${test.toUpperCase()}: ${result ? 'PASSED' : 'FAILED'}`);
        });
        
        console.log(`\n🎯 BACKEND TESTS RESULT: ${passed}/${total} passed`);
        
        if (passed === total) {
            console.log('🎉 ALL BACKEND TESTS PASSED!');
            console.log('\n✅ Backend authentication system is fully functional');
            console.log('✅ All endpoints work correctly');
            console.log('✅ Token generation and validation works');
            console.log('✅ Database operations work correctly');
            console.log('✅ Error handling is implemented properly');
            console.log('\n💡 If you have frontend issues, the problem is in:');
            console.log('   • React component logic');
            console.log('   • Redux state management');
            console.log('   • React Router navigation');
            console.log('   • Component re-rendering');
        } else {
            console.log('❌ SOME BACKEND TESTS FAILED');
            console.log('\n🔧 Check the following:');
            console.log('1. MongoDB is running and accessible');
            console.log('2. .env file has all required variables');
            console.log('3. JWT_SECRET is set in .env');
            console.log('4. Server is running on correct port');
            console.log('5. No network connectivity issues');
        }
        
        return results;
    }
}

// Quick test function for common issues
const runQuickBackendTest = async () => {
    console.log('⚡ QUICK BACKEND TEST');
    console.log('=====================');
    
    const tester = new BackendAuthTester();
    
    // Test just the essentials
    const health = await tester.testServerHealth();
    if (!health) return;
    
    const db = await tester.testDatabaseConnection();
    if (!db) return;
    
    const registration = await tester.testRegistrationEndpoint();
    if (!registration) return;
    
    const profile = await tester.testProfileEndpoint();
    
    if (health && db && registration && profile) {
        console.log('\n✅ QUICK TEST RESULT: Backend is working correctly!');
    } else {
        console.log('\n❌ QUICK TEST RESULT: Backend has issues');
    }
};

// Auto-run if this file is executed directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--quick')) {
        runQuickBackendTest().catch(console.error);
    } else {
        const tester = new BackendAuthTester();
        tester.runAllTests().catch(console.error);
    }
}

module.exports = { BackendAuthTester, runQuickBackendTest };
