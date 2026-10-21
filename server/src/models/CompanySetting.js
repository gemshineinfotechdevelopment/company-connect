const mongoose = require("mongoose");

const companySettingSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, default: "Gemshine Infotech" },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    allowedRadius: { type: Number, required: true, default: 100 }, // in meters
    enforceGeofencing: { type: Boolean, required: true, default: true },
    lateCheckInCutoffTime: { type: String, required: true, default: "10:15" }, // HH:mm in IST
    enforceLateCheckInApproval: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CompanySetting", companySettingSchema);
