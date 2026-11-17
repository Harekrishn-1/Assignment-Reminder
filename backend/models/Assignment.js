const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    googleAssignmentId: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    alternateLink: {
      type: String,
      default: '',
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderTime: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee uniqueness per user and assignment
assignmentSchema.index({ googleAssignmentId: 1, userId: 1 }, { unique: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;
