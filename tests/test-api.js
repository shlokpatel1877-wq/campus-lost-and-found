const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/server');

/**
 * Campus Lost and Found - API Endpoint Test Suite
 * 
 * Uses Node 22 native fetch and MongoMemoryServer to verify all
 * CRUD endpoints, query filters, search, and input validations.
 */

async function runTests() {
  console.log('='.repeat(65));
  console.log('  🧪 CAMPUS LOST AND FOUND - BACKEND API TEST SUITE');
  console.log('='.repeat(65));

  let mongod;
  let server;
  const PORT = 5055;
  const BASE_URL = `http://localhost:${PORT}/api/items`;

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      failedTests++;
    }
  }

  try {
    // 1. Initialize In-Memory MongoDB Server
    console.log('\n[Setup] Initializing In-Memory MongoDB instance...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // 2. Connect Mongoose to the memory DB
    await mongoose.connect(uri);
    console.log('[Setup] Connected Mongoose to test database.');

    // 3. Start Express server on test port
    server = app.listen(PORT);
    console.log(`[Setup] Express test server listening at http://localhost:${PORT}\n`);

    // ==========================================
    // TEST 1: Health Check Endpoint
    // ==========================================
    console.log('--- Health Check & Basic Setup ---');
    const healthRes = await fetch(`http://localhost:${PORT}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'OK', 'GET /api/health returns 200 OK');

    // ==========================================
    // TEST 2: Input Validation (Missing Fields)
    // ==========================================
    console.log('\n--- Input Validation Tests ---');
    const invalidCreateRes = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Incomplete Item',
        // Missing type, description, category, location, contact info
      }),
    });
    const invalidCreateData = await invalidCreateRes.json();
    assert(
      invalidCreateRes.status === 400 && invalidCreateData.success === false,
      'POST /api/items returns 400 Bad Request when required fields are missing',
      invalidCreateData.message
    );

    // ==========================================
    // TEST 3: Input Validation (Invalid Email)
    // ==========================================
    const invalidEmailRes = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'lost',
        title: 'Calculator',
        description: 'Casio Scientific Calculator fx-991EX',
        category: 'Electronics',
        location: 'Math Block Room 204',
        contactName: 'Alice',
        contactEmail: 'not-an-email',
      }),
    });
    const invalidEmailData = await invalidEmailRes.json();
    assert(
      invalidEmailRes.status === 400,
      'POST /api/items returns 400 Bad Request on invalid email format',
      invalidEmailData.message
    );

    // ==========================================
    // TEST 4, 5, 6: Report Items (Create Items)
    // ==========================================
    console.log('\n--- Feature 1: Report Lost/Found Items (POST) ---');
    
    // Item 1: Lost Laptop
    const item1Res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'lost',
        title: 'Silver MacBook Pro 14"',
        description: 'Left on 2nd floor library study desk near window, has sticker of React logo',
        category: 'Electronics',
        location: 'Main Library 2nd Floor',
        contactName: 'Alex Johnson',
        contactEmail: 'alex.j@campus.edu',
        contactPhone: '555-0101',
      }),
    });
    const item1Data = await item1Res.json();
    assert(item1Res.status === 201 && item1Data.data.title.includes('MacBook'), 'POST /api/items creates lost item (MacBook Pro)');
    const macbookId = item1Data.data._id;

    // Item 2: Found Water Bottle
    const item2Res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'found',
        title: 'Blue Hydro Flask Bottle',
        description: 'Found on table 4 at cafeteria lunch area',
        category: 'Other',
        location: 'Student Cafeteria',
        contactName: 'Cafeteria Staff',
        contactEmail: 'cafeteria@campus.edu',
      }),
    });
    const item2Data = await item2Res.json();
    assert(item2Res.status === 201 && item2Data.data.type === 'found', 'POST /api/items creates found item (Hydro Flask)');
    const flaskId = item2Data.data._id;

    // Item 3: Lost ID Card
    const item3Res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'lost',
        title: 'Student ID Card - Sarah Miller',
        description: 'Red lanyard with student ID card lost between Science Building and Gym',
        category: 'ID & Cards',
        location: 'Science Building Walkway',
        contactName: 'Sarah Miller',
        contactEmail: 'sarah.m@campus.edu',
      }),
    });
    const item3Data = await item3Res.json();
    assert(item3Res.status === 201 && item3Data.data.category === 'ID & Cards', 'POST /api/items creates lost item (ID Card)');
    const idCardId = item3Data.data._id;

    // ==========================================
    // TEST 7: View All Items
    // ==========================================
    console.log('\n--- Feature 2: View All Item Reports (GET) ---');
    const allRes = await fetch(BASE_URL);
    const allData = await allRes.json();
    assert(
      allRes.status === 200 && allData.count === 3 && Array.isArray(allData.data),
      'GET /api/items retrieves all 3 created reports'
    );

    // ==========================================
    // TEST 8: Search Items by Name (Title/Desc)
    // ==========================================
    console.log('\n--- Feature 3: Search Items by Name (GET ?search=...) ---');
    const searchRes = await fetch(`${BASE_URL}?search=MacBook`);
    const searchData = await searchRes.json();
    assert(
      searchRes.status === 200 && searchData.count === 1 && searchData.data[0].title.includes('MacBook'),
      'GET /api/items?search=MacBook successfully finds the MacBook'
    );

    const searchDescRes = await fetch(`${BASE_URL}?search=cafeteria`);
    const searchDescData = await searchDescRes.json();
    assert(
      searchDescRes.status === 200 && searchDescData.count === 1 && searchDescData.data[0].title.includes('Hydro Flask'),
      'GET /api/items?search=cafeteria searches description/location correctly'
    );

    // ==========================================
    // TEST 9 & 10: Filter by Category and Location
    // ==========================================
    console.log('\n--- Feature 4: Filter by Category and Location ---');
    const catRes = await fetch(`${BASE_URL}?category=ID %26 Cards`);
    const catData = await catRes.json();
    assert(
      catRes.status === 200 && catData.count === 1 && catData.data[0]._id === idCardId,
      'GET /api/items?category=ID & Cards correctly filters by category'
    );

    const locRes = await fetch(`${BASE_URL}?location=Library`);
    const locData = await locRes.json();
    assert(
      locRes.status === 200 && locData.count === 1 && locData.data[0].location.includes('Library'),
      'GET /api/items?location=Library filters by location substring'
    );

    const typeRes = await fetch(`${BASE_URL}?type=found`);
    const typeData = await typeRes.json();
    assert(
      typeRes.status === 200 && typeData.count === 1 && typeData.data[0]._id === flaskId,
      'GET /api/items?type=found filters reports by type'
    );

    // ==========================================
    // TEST 11, 12, 13: View Single Item by ID
    // ==========================================
    console.log('\n--- View Single Item Details (GET /:id) ---');
    const singleRes = await fetch(`${BASE_URL}/${macbookId}`);
    const singleData = await singleRes.json();
    assert(singleRes.status === 200 && singleData.data._id === macbookId, 'GET /api/items/:id returns specific item');

    // Invalid ObjectId format
    const badIdRes = await fetch(`${BASE_URL}/12345notvalid`);
    assert(badIdRes.status === 400, 'GET /api/items/:id with malformed ID returns 400 Bad Request');

    // Valid ObjectId but non-existent
    const nonExistentId = new mongoose.Types.ObjectId();
    const notFoundRes = await fetch(`${BASE_URL}/${nonExistentId}`);
    assert(notFoundRes.status === 404, 'GET /api/items/:id with non-existent ID returns 404 Not Found');

    // ==========================================
    // TEST 14 & 15: Update an Item's Status
    // ==========================================
    console.log('\n--- Feature 5: Update Item Status (PUT /:id) ---');
    // Valid status update to 'claimed'
    const updateRes = await fetch(`${BASE_URL}/${flaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'claimed' }),
    });
    const updateData = await updateRes.json();
    assert(
      updateRes.status === 200 && updateData.data.status === 'claimed',
      'PUT /api/items/:id updates status to "claimed"'
    );

    // Invalid status update
    const invalidStatusRes = await fetch(`${BASE_URL}/${flaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'destroyed' }),
    });
    assert(invalidStatusRes.status === 400, 'PUT /api/items/:id with invalid status returns 400 Bad Request');

    // ==========================================
    // TEST 16 & 17: Delete an Item Report
    // ==========================================
    console.log('\n--- Feature 6: Delete an Item Report (DELETE /:id) ---');
    const deleteRes = await fetch(`${BASE_URL}/${idCardId}`, {
      method: 'DELETE',
    });
    const deleteData = await deleteRes.json();
    assert(
      deleteRes.status === 200 && deleteData.success === true,
      'DELETE /api/items/:id removes the report successfully'
    );

    // Verify it is gone
    const verifyDeleteRes = await fetch(`${BASE_URL}/${idCardId}`);
    assert(verifyDeleteRes.status === 404, 'GET /api/items/:id returns 404 after deletion');

    const remainingRes = await fetch(BASE_URL);
    const remainingData = await remainingRes.json();
    assert(
      remainingRes.status === 200 && remainingData.count === 2,
      'Total item count correctly decreased to 2'
    );

  } catch (err) {
    console.error('\n🚨 Unexpected Error during tests:', err);
    failedTests++;
  } finally {
    // Teardown
    console.log('\n[Teardown] Cleaning up test server and database...');
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
    console.log('[Teardown] Completed.');
  }

  console.log('\n' + '='.repeat(65));
  console.log(`  📊 TEST RESULTS SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('='.repeat(65) + '\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
