// Optional: inserts sample students. Run locally with:  npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');

const samples = [
  { studentId: 'ST101', name: 'Rahul Sharma', email: 'rahul@example.com', department: 'Computer Science', semester: 5, contact: '9876543210' },
  { studentId: 'ST102', name: 'Priya Patil', email: 'priya@example.com', department: 'Information Technology', semester: 3, contact: '9123456780' },
  { studentId: 'ST103', name: 'Amit Deshmukh', email: 'amit@example.com', department: 'Electronics', semester: 7, contact: '9988776655' },
  { studentId: 'ST104', name: 'Sneha Kulkarni', email: 'sneha@example.com', department: 'Mechanical', semester: 1, contact: '9012345678' }
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const s of samples) {
    await Student.updateOne({ studentId: s.studentId }, s, { upsert: true });
  }
  console.log(`Seeded ${samples.length} students into ${mongoose.connection.name}.students`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
