const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Item = require('./models/Item');

dotenv.config();

const sampleItems = [
  {
    type: 'lost',
    title: 'Silver MacBook Pro 14"',
    description: 'Left on the 2nd floor library study desk near window. Has a React sticker on the lid.',
    category: 'Electronics',
    location: 'Main Library 2nd Floor',
    status: 'open',
    contactName: 'Alex Johnson',
    contactEmail: 'alex.j@campus.edu',
    contactPhone: '555-0101',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    type: 'found',
    title: 'Blue Hydro Flask Bottle',
    description: 'Found on table 4 at the cafeteria lunch area. Good condition with university logo.',
    category: 'Other',
    location: 'Student Cafeteria',
    status: 'open',
    contactName: 'Cafeteria Staff',
    contactEmail: 'cafeteria@campus.edu',
    date: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
  },
  {
    type: 'lost',
    title: 'Student ID Card - Sarah Miller',
    description: 'Red lanyard with student card lost between the Science Building and Gym.',
    category: 'ID & Cards',
    location: 'Science Building Walkway',
    status: 'claimed',
    contactName: 'Sarah Miller',
    contactEmail: 'sarah.m@campus.edu',
    date: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
  },
  {
    type: 'found',
    title: 'Set of Dorm Keys with Brass Keychain',
    description: 'Ring of 3 keys found near the basketball court bleachers.',
    category: 'Keys',
    location: 'Campus Sports Complex',
    status: 'resolved',
    contactName: 'Campus Security',
    contactEmail: 'security@campus.edu',
    date: new Date(Date.now() - 96 * 60 * 60 * 1000), // 4 days ago
  },
];

const seedDB = async () => {
  try {
    await connectDB();
    await Item.deleteMany({});
    console.log('[Seed] Cleared existing items.');

    const created = await Item.insertMany(sampleItems);
    console.log(`[Seed] Successfully inserted ${created.length} sample campus items.`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] ${error.message}`);
    process.exit(1);
  }
};

seedDB();
