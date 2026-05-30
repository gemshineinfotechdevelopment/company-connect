const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  status: { type: String, enum: ['PRESENT', 'ABSENT', 'LEAVE', 'WFH'], required: true },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  totalHours: { type: Number },
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);