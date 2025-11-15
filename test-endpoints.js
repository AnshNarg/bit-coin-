// Simple test script to verify all endpoints are working
const testEndpoints = async () => {
    const baseUrl = 'http://localhost:5000';
    
    console.log('🚀 Testing Crypto Trading Platform API Endpoints...\n');
    
    const endpoints = [
        { url: '/', method: 'GET', name: 'Root Welcome Page' },
        { url: '/health', method: 'GET', name: 'Health Check' },
        { url: '/api/crypto/prices', method: 'GET', name: 'Live Crypto Prices' },
        { url: '/api/crypto/market-overview', method: 'GET', name: 'Market Overview' },
        { url: '/api/crypto/bitcoin/chart', method: 'GET', name: 'Bitcoin Chart Data' },
        { url: '/api/trading/portfolio', method: 'GET', name: 'Trading Portfolio' },
        { url: '/api/predictions/bitcoin', method: 'GET', name: 'Bitcoin Predictions' },
        { url: '/api/predictions/bitcoin/signals', method: 'GET', name: 'Bitcoin Trading Signals' },
        { url: '/api/predictions/market/overview', method: 'GET', name: 'Market Predictions Overview' }
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${baseUrl}${endpoint.url}`);
            const data = await response.json();
            
            if (response.ok && data.success) {
                console.log(`✅ ${endpoint.name}: SUCCESS`);
                results.push({ endpoint: endpoint.name, status: 'SUCCESS', response: response.status });
            } else {
                console.log(`❌ ${endpoint.name}: FAILED (${response.status})`);
                results.push({ endpoint: endpoint.name, status: 'FAILED', response: response.status });
            }
        } catch (error) {
            console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
            results.push({ endpoint: endpoint.name, status: 'ERROR', error: error.message });
        }
    }
    
    console.log('\n🏆 FINAL RESULTS:');
    console.log('==================');
    
    const successful = results.filter(r => r.status === 'SUCCESS').length;
    const total = results.length;
    
    console.log(`✅ Successful endpoints: ${successful}/${total}`);
    console.log(`📊 Success rate: ${((successful/total) * 100).toFixed(1)}%`);
    
    if (successful === total) {
        console.log('\n🎉 ALL ENDPOINTS WORKING PERFECTLY!');
        console.log('🚀 YOUR API IS SUBMISSION READY!');
    } else {
        console.log('\n⚠️  Some endpoints need attention');
    }
    
    return results;
};

// Export for use in other files or run directly
if (require.main === module) {
    testEndpoints().catch(console.error);
}

module.exports = { testEndpoints };
