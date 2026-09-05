// Automated API Verification Script for Horizon Properties
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING HORIZON PROPERTIES API TESTS ---');
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
    } else {
      console.error(`❌ FAIL: ${message}`);
      failures++;
    }
  }

  try {
    // 1. Test GET all properties
    console.log('\n1. Testing GET /api/properties...');
    const allProps = await request('/api/properties');
    assert(allProps.status === 200, 'Status should be 200');
    assert(allProps.data.success === true, 'Response should indicate success');
    assert(allProps.data.count >= 20, `Should have at least 20 mock properties (found ${allProps.data.count})`);

    // 2. Test filter by type
    console.log('\n2. Testing filter by type (Condo)...');
    const condos = await request('/api/properties?type=Condo');
    assert(condos.data.count > 0, 'Should find condo listings');
    assert(condos.data.data.every(p => p.type.toLowerCase() === 'condo'), 'All results must be condos');

    // 3. Test filter by neighborhood
    console.log('\n3. Testing filter by neighborhood (Downtown)...');
    const downtown = await request('/api/properties?neighborhood=Downtown');
    assert(downtown.data.count > 0, 'Should find downtown listings');
    assert(downtown.data.data.every(p => p.neighborhood.toLowerCase().includes('downtown')), 'All results must be Downtown');

    // 4. Test combined filter (Type + Min/Max Price + Neighborhood)
    console.log('\n4. Testing combined filters (Condo + Downtown + max_price=1000000)...');
    const combined = await request('/api/properties?type=Condo&neighborhood=Downtown&max_price=1000000');
    assert(combined.status === 200, 'Status should be 200');
    assert(combined.data.data.every(p => p.type === 'Condo' && p.neighborhood === 'Downtown' && p.price <= 1000000), 'Combined filter conditions met');

    // 5. Test GET single property
    console.log('\n5. Testing GET /api/properties/:id...');
    const singleProp = await request('/api/properties/HP-ATX-001');
    assert(singleProp.status === 200, 'Single property returns 200');
    assert(singleProp.data.data.id === 'HP-ATX-001', 'Correct property ID returned');

    // 6. Test CREATE property (POST /api/properties)
    console.log('\n6. Testing POST /api/properties (Admin CRUD)...');
    const newPropPayload = {
      title: 'Test Austin Modern Loft',
      type: 'Condo',
      price: 675000,
      description: 'Brand new construction in South Lamar area.',
      neighborhood: 'South Congress',
      address: '1500 South Congress Ave #301, Austin, TX 78704',
      bedrooms: 2,
      bathrooms: 2,
      area_sqft: 1100,
      status: 'Available'
    };
    const createdProp = await request('/api/properties', { method: 'POST' }, newPropPayload);
    assert(createdProp.status === 201, 'Property creation returns 201');
    assert(createdProp.data.data.id.startsWith('HP-ATX-'), 'Generated unique Property ID');
    const createdId = createdProp.data.data.id;

    // 7. Test UPDATE property (PUT /api/properties/:id)
    console.log('\n7. Testing PUT /api/properties/:id...');
    const updateProp = await request(`/api/properties/${createdId}`, { method: 'PUT' }, {
      price: 699000,
      status: 'Reserved'
    });
    assert(updateProp.status === 200, 'Update returns 200');
    assert(updateProp.data.data.price === 699000, 'Price was updated');
    assert(updateProp.data.data.status === 'Reserved', 'Status was updated');

    // 8. Test DELETE property (DELETE /api/properties/:id)
    console.log('\n8. Testing DELETE /api/properties/:id...');
    const delProp = await request(`/api/properties/${createdId}`, { method: 'DELETE' });
    assert(delProp.status === 200, 'Delete returns 200');
    const verifyDel = await request(`/api/properties/${createdId}`);
    assert(verifyDel.status === 404, 'Deleted property now returns 404');

    // 9. Test CREATE Booking (POST /api/bookings - for n8n)
    console.log('\n9. Testing POST /api/bookings (n8n booking endpoint)...');
    const bookingPayload = {
      property_id: 'HP-ATX-001',
      customer_name: 'David Travis',
      customer_email: 'david.travis@austinmail.com',
      customer_phone: '(512) 555-9012',
      booking_date: '2026-09-20',
      booking_time: '15:30',
      notes: 'Interested in financing and HOA fees.'
    };
    const createdBooking = await request('/api/bookings', { method: 'POST' }, bookingPayload);
    assert(createdBooking.status === 201, 'Booking creation returns 201');
    assert(createdBooking.data.data.id.startsWith('BK-'), 'Generated unique Booking ID');
    const bookingId = createdBooking.data.data.id;

    // 10. Test GET bookings filter by customer_email
    console.log('\n10. Testing GET /api/bookings?customer_email=...');
    const customerBookings = await request(`/api/bookings?customer_email=david.travis@austinmail.com`);
    assert(customerBookings.status === 200, 'GET bookings returns 200');
    assert(customerBookings.data.data.length > 0, 'Customer has active booking');
    assert(customerBookings.data.data[0].customer_email === 'david.travis@austinmail.com', 'Matches customer email');

    // 11. Test UPDATE Booking status (PUT /api/bookings/:id)
    console.log('\n11. Testing PUT /api/bookings/:id status update...');
    const updateBooking = await request(`/api/bookings/${bookingId}`, { method: 'PUT' }, {
      status: 'Confirmed'
    });
    assert(updateBooking.status === 200, 'Booking update returns 200');
    assert(updateBooking.data.data.status === 'Confirmed', 'Booking status is now Confirmed');

    // 12. Test DELETE Booking (DELETE /api/bookings/:id)
    console.log('\n12. Testing DELETE /api/bookings/:id...');
    const delBooking = await request(`/api/bookings/${bookingId}`, { method: 'DELETE' });
    assert(delBooking.status === 200, 'Booking delete returns 200');

    // 13. Test Stats endpoint
    console.log('\n13. Testing GET /api/stats...');
    const stats = await request('/api/stats');
    assert(stats.status === 200, 'Stats return 200');
    assert(stats.data.data.total_properties >= 20, 'Stats correctly count properties');

    console.log('\n=========================================');
    if (failures === 0) {
      console.log('🎉 ALL API & N8N TESTS PASSED SUCCESSFULLY!');
    } else {
      console.error(`⚠️ ${failures} TEST(S) FAILED!`);
    }
  } catch (err) {
    console.error('Test runner encountered error:', err);
  }
}

// Start server if needed or run tests against running server
const server = app = require('./server.js');
// Wait for server to bind then run
setTimeout(() => {
  runTests().then(() => {
    process.exit(0);
  });
}, 1000);
