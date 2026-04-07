/**
 * Test script for San Remo Bônus Webhooks
 * This script simulates a Fidelimax webhook event and sends it to our local server.
 */
const axios = require('axios');

const CPF_TESTE = '12345678901';
const FCM_TOKEN_TESTE = 'mock-fcm-token-12345';
const BASE_URL = 'http://localhost:9999';

async function runTest() {
  console.log('🚀 Starting Webhook Test...\n');

  try {
    // 1. Register a mock token for the user
    console.log(`[Step 1] Registering push token for CPF: ${CPF_TESTE}...`);
    await axios.post(`${BASE_URL}/api/push/register`, {
      cpf: CPF_TESTE,
      token: FCM_TOKEN_TESTE
    });
    console.log('✅ Token registered.\n');

    // 2. Trigger a Points event
    console.log('[Step 2] Triggering "Points Earned" event...');
    const pointsResponse = await axios.post(`${BASE_URL}/api/fidelimax/mock-event`, {
      type: 'points',
      cpf: CPF_TESTE,
      points: 250
    });
    console.log('✅ Response:', pointsResponse.data.message, '\n');

    // 3. Trigger a Redemption event
    console.log('[Step 3] Triggering "Reward Redeemed" event...');
    const redeemResponse = await axios.post(`${BASE_URL}/api/fidelimax/mock-event`, {
      type: 'redeem',
      cpf: CPF_TESTE,
      premio: 'Pizza San Remo GG',
      voucher: 'SR-9988-PZ'
    });
    console.log('✅ Response:', redeemResponse.data.message, '\n');

    console.log('✨ All tests completed! Check the server terminal to see the [Push MOCK] logs.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

runTest();
