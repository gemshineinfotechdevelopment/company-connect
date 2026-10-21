const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "TASK_ASSIGNED",
        "TASK_OVERDUE",
        "TASK_COMPLETED",
        "LATE_CHECKIN_REQUEST",
        "LATE_CHECKIN_APPROVED",
        "LATE_CHECKIN_REJECTED",
      ],
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
