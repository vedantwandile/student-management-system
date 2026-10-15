const express = require('express');
const ctrl = require('../controllers/studentController');

const router = express.Router();

router.route('/').get(ctrl.getStudents).post(ctrl.createStudent);
router
  .route('/:id')
  .get(ctrl.getStudent)
  .put(ctrl.updateStudent)
  .delete(ctrl.deleteStudent);

module.exports = router;
