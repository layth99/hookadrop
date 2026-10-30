#!/usr/bin/env node
/**
 * Script to check the 71st order and identify any unexpected status values
 */

import https from 'https';

const API_URL = 'https://hookadrop-api.onrender.com/api/orders?page=1&limit=1000';

const EXPECTED_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

https.get(API_URL, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const orders = Array.isArray(json) ? json : (json.data || []);
      
      console.log('\n========================================');
      console.log('  ORDER STATUS ANALYSIS');
      console.log('========================================\n');
      
      console.log(`Total orders found: ${orders.length}`);
      
      // Count by status
      const statusCounts = {};
      const unexpectedStatuses = new Set();
      
      orders.forEach((order, index) => {
        const status = order.status || 'undefined';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        
        if (!EXPECTED_STATUSES.includes(status)) {
          unexpectedStatuses.add(status);
          console.log(`\n⚠️  Unexpected status found:`);
          console.log(`    Order #${index + 1}: ${order.orderId || order._id}`);
          console.log(`    Status: "${status}"`);
          console.log(`    Customer: ${order.fullname || 'Unknown'}`);
          console.log(`    Date: ${order.createdAt}`);
        }
      });
      
      console.log('\n----------------------------------------');
      console.log('Status Distribution:');
      console.log('----------------------------------------');
      
      EXPECTED_STATUSES.forEach(status => {
        const count = statusCounts[status] || 0;
        console.log(`  ${status.padEnd(12)}: ${count}`);
      });
      
      if (unexpectedStatuses.size > 0) {
        console.log('\n  OTHER:');
        unexpectedStatuses.forEach(status => {
          console.log(`    ${status.padEnd(10)}: ${statusCounts[status]}`);
        });
      }
      
      console.log('\n----------------------------------------');
      console.log(`Total: ${orders.length} orders`);
      console.log('========================================\n');
      
      // Check if total matches the sum
      const sum = Object.values(statusCounts).reduce((a, b) => a + b, 0);
      if (sum !== orders.length) {
        console.log(`❌ ERROR: Sum (${sum}) doesn't match total (${orders.length})`);
      } else {
        console.log(`✅ All orders accounted for`);
      }
      
    } catch (error) {
      console.error('Error parsing response:', error.message);
    }
  });
  
}).on('error', (err) => {
  console.error('Error fetching orders:', err.message);
});
