const CompanySetting = require("../models/CompanySetting");
const { sendSuccess, sendError } = require("../utils/response");

exports.getSettings = async (req, res) => {
  try {
    let settings = await CompanySetting.findOne();
    if (!settings) {
      // Return a standard default settings object if none exists in MongoDB yet
      settings = {
        companyName: "Gemshine Infotech",
        latitude: 28.6139, // default Delhi/example coordinate
        longitude: 77.209,
        allowedRadius: 100,
        enforceGeofencing: true,
        lateCheckInCutoffTime: "10:15",
        enforceLateCheckInApproval: true,
      };
    }
    return sendSuccess(res, "Company settings retrieved successfully", { settings });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const {
      companyName,
      latitude,
      longitude,
      allowedRadius,
      enforceGeofencing,
      lateCheckInCutoffTime,
      enforceLateCheckInApproval,
    } = req.body;

    if (
      !companyName ||
      latitude === undefined ||
      longitude === undefined ||
      allowedRadius === undefined
    ) {
      return sendError(res, "All fields are required", 400);
    }

    let settings = await CompanySetting.findOne();
    if (settings) {
      settings.companyName = companyName;
      settings.latitude = Number(latitude);
      settings.longitude = Number(longitude);
      settings.allowedRadius = Number(allowedRadius);
      settings.enforceGeofencing = !!enforceGeofencing;
      if (lateCheckInCutoffTime !== undefined) {
        settings.lateCheckInCutoffTime = lateCheckInCutoffTime;
      }
      if (enforceLateCheckInApproval !== undefined) {
        settings.enforceLateCheckInApproval = !!enforceLateCheckInApproval;
      }
      await settings.save();
    } else {
      settings = new CompanySetting({
        companyName,
        latitude: Number(latitude),
        longitude: Number(longitude),
        allowedRadius: Number(allowedRadius),
        enforceGeofencing: !!enforceGeofencing,
        lateCheckInCutoffTime: lateCheckInCutoffTime || "10:15",
        enforceLateCheckInApproval:
          enforceLateCheckInApproval !== undefined ? !!enforceLateCheckInApproval : true,
      });
      await settings.save();
    }

    return sendSuccess(res, "Company settings updated successfully", { settings });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};
