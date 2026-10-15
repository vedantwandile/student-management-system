const Student = require('../models/Student');

// Only these fields may be written by a client.
const ALLOWED = ['studentId', 'name', 'email', 'department', 'semester', 'contact'];

function pickAllowed(body = {}) {
  const data = {};
  for (const key of ALLOWED) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      // Force primitives so objects like {"$ne": ""} can never reach a query/update.
      data[key] = typeof body[key] === 'object' ? String(body[key]) : body[key];
    }
  }
  return data;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/students            -> all students
// GET /api/students?search=abc -> match on ID, name, email or department
exports.getStudents = async (req, res, next) => {
  try {
    const filter = {};
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ studentId: rx }, { name: rx }, { email: rx }, { department: rx }];
    }
    const students = await Student.find(filter).sort({ studentId: 1 });
    res.json({ success: true, count: students.length, data: students });
  } catch (err) {
    next(err);
  }
};

// GET /api/students/:id  (id = studentId, e.g. ST101)
exports.getStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({ studentId: req.params.id.toUpperCase() });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
};

// POST /api/students
exports.createStudent = async (req, res, next) => {
  try {
    const student = await Student.create(pickAllowed(req.body));
    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: student
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/students/:id
exports.updateStudent = async (req, res, next) => {
  try {
    const data = pickAllowed(req.body);
    delete data.studentId; // the ID is the record key and cannot be changed
    const student = await Student.findOneAndUpdate(
      { studentId: req.params.id.toUpperCase() },
      data,
      { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, message: 'Student updated successfully', data: student });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/students/:id
exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findOneAndDelete({
      studentId: req.params.id.toUpperCase()
    });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    next(err);
  }
};
