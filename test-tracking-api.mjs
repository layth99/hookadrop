#!/usr/bin/env node

/**
 * Test script to check if tracking API returns correct estimated delivery
 * Usage: node test-tracking-api.mjs <orderId> <token>
 */

const orderId = process.argv[2] || 'ORD-12345';
const token = process.argv[3];

if (!token) {
  console.error('❌ Error: JWT token required');
  console.log('Usage: node test-tracking-api.mjs <orderId> <token>');
  process.exit(1);
}

const API_URL = 'https://hookadrop-api.onrender.com';

async function testTracking() {
  try {
    console.log('🔍 Testing Order Tracking API...');
    console.log(`📦 Order ID: ${orderId}`);
    console.log(`🔗 Endpoint: ${API_URL}/api/orders/${orderId}/tracking`);
    console.log('');

    const response = await fetch(`${API_URL}/api/orders/${orderId}/tracking`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Response:', errorText);
      process.exit(1);
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ API Error:', data.message || 'Unknown error');
      process.exit(1);
    }

    const tracking = data.data;

    console.log('✅ API Response Success!');
    console.log('');
    console.log('📊 Tracking Data:');
    console.log('─────────────────────────────────────');
    console.log(`Order ID: ${tracking.orderId}`);
    console.log(`Status: ${tracking.currentStatus}`);
    console.log('');
    
    if (tracking.deliveryWindow) {
      console.log('📅 Delivery Window:');
      console.log(`  Label: ${tracking.deliveryWindow.label}`);
      console.log(`  Start: ${tracking.deliveryWindow.start}`);
      console.log(`  End: ${tracking.deliveryWindow.end}`);
      console.log(`  Start Time: ${tracking.deliveryWindow.startTime}`);
      console.log(`  End Time: ${tracking.deliveryWindow.endTime}`);
      
      // Parse and display in local time
      const startDate = new Date(tracking.deliveryWindow.start);
      const endDate = new Date(tracking.deliveryWindow.end);
      console.log('');
      console.log('🕐 Local Time:');
      console.log(`  Start: ${startDate.toLocaleString()}`);
      console.log(`  End: ${endDate.toLocaleString()}`);
    } else {
      console.log('⚠️  No delivery window found');
    }

    console.log('');
    
    if (tracking.courier) {
      console.log('🚗 Courier Info:');
      console.log(`  Name: ${tracking.courier.name || 'N/A'}`);
      console.log(`  Phone: ${tracking.courier.phone || 'N/A'}`);
      console.log(`  Vehicle: ${tracking.courier.vehicle || 'N/A'}`);
      console.log('');
    }

    console.log('─────────────────────────────────────');
    console.log('');
    console.log('✅ Test Complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testTracking();
