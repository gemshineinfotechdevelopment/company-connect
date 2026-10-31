const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const MonthlyAttendanceSummary = require("../models/MonthlyAttendanceSummary");
const CompanySetting = require("../models/CompanySetting");
const { sendSuccess, sendError } = require("../utils/response");
const geolib = require("geolib");

const getTodayDateString = () => {
  const d = new Date();
  // Ensure we get a consistent YYYY-MM-DD for local time, simple approach for now:
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

exports.checkIn = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const date = getTodayDateString();
    const { latitude, longitude, accuracy, deviceInfo, browserDetails, lateReason, selfie } =
      req.body;

    // Check for approved leave
    const Leave = require("../models/Leave");
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

    const activeLeave = await Leave.findOne({
      employeeId,
      status: "APPROVED",
      fromDate: { $lte: endOfToday },
      toDate: { $gte: startOfToday },
    });

    if (activeLeave) {
      return sendError(res, "You are on approved leave today. Cannot check in.", 400);
    }

    // Check for approved WFH
    const Wfh = require("../models/Wfh");
    const activeWfh = await Wfh.findOne({
      employeeId,
      status: "APPROVED",
      date: { $gte: startOfToday, $lte: endOfToday },
    });

    // Geo-Fencing calculations
    const settings = await CompanySetting.findOne();
    let distance = 0;
    let outsideRadius = false;

    if (settings) {
      if (latitude === undefined || longitude === undefined) {
        return sendError(res, "GPS location details are required to check in.", 400);
      }

      distance = geolib.getDistance(
        { latitude: Number(latitude), longitude: Number(longitude) },
        { latitude: settings.latitude, longitude: settings.longitude },
      );

      outsideRadius = distance > settings.allowedRadius;

      // Block check-in if outside AND geofencing is enforced AND they do NOT have approved WFH status
      if (outsideRadius && settings.enforceGeofencing && !activeWfh) {
        return sendError(res, "You are outside the company location. Check-In not allowed.", 400);
      }
    }

    // Process & store live selfie to prevent proxy attendance
    let selfieUrl = undefined;
    if (selfie && typeof selfie === "string" && selfie.startsWith("data:image")) {
      const fs = require("fs");
      const path = require("path");
      try {
        const matches = selfie.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          const uploadDir = path.join(__dirname, "../../uploads/selfies");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const filename = `selfie_${employeeId}_${Date.now()}.${ext}`;
          const filePath = path.join(uploadDir, filename);
          fs.writeFileSync(filePath, buffer);
          selfieUrl = `/uploads/selfies/${filename}`;
        }
      } catch (e) {
        console.error("Failed to save selfie image:", e);
      }
    }

    const ipAddress =
      req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress || "Unknown IP";
    const status = activeWfh ? "WFH" : "PRESENT";

    // Check if user is already checked in or already has a pending approval for today
    let attendance = await Attendance.findOne({ employeeId, date });
    if (attendance) {
      if (attendance.checkInTime) {
        return sendError(res, "Already checked in for today", 400);
      }
      if (attendance.lateStatus === "PENDING_APPROVAL") {
        return sendError(
          res,
          "Your late check-in request has already been submitted and is awaiting Admin approval.",
          400,
        );
      }
    }

    // Time calculations in Asia/Kolkata (IST)
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const [currHours, currMins, currSecs] = istTimeStr.split(":").map(Number);
    const currTotalSecs = currHours * 3600 + currMins * 60 + currSecs;

    const cutoffTime = (settings && settings.lateCheckInCutoffTime) || "10:15";
    const [cutoffHours, cutoffMins] = cutoffTime.split(":").map(Number);
    const cutoffTotalSecs = cutoffHours * 3600 + cutoffMins * 60;

    const enforceLateApproval =
      settings && settings.enforceLateCheckInApproval !== undefined
        ? settings.enforceLateCheckInApproval
        : true;
    const isLate = currTotalSecs > cutoffTotalSecs;
    const isRegularEmployee = req.user.role !== "ADMIN";

    const checkInLocationData = {
      checkInSelfieUrl: selfieUrl,
      checkInLatitude: latitude ? Number(latitude) : undefined,
      checkInLongitude: longitude ? Number(longitude) : undefined,
      checkInDistance: distance,
      checkInAccuracy: accuracy ? Number(accuracy) : undefined,
      checkInOutsideRadius: outsideRadius,
      checkInIpAddress: ipAddress,
      checkInDeviceInfo: deviceInfo || "Unknown Device",
      checkInBrowserDetails: browserDetails || "Unknown Browser",
    };

    // If regular employee tries to check in after cutoff time (default 10:15 AM)
    if (isRegularEmployee && enforceLateApproval && isLate) {
      const Approval = require("../models/Approval");
      const Notification = require("../models/Notification");

      const time12h = now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const lateReason =
        req.body.lateReason && req.body.lateReason.trim()
          ? req.body.lateReason.trim()
          : `Late check-in requested at ${time12h}`;

      if (!attendance) {
        attendance = new Attendance({
          employeeId,
          date,
          status: "PENDING",
          lateStatus: "PENDING_APPROVAL",
          lateReason,
          requestedCheckInTime: now,
          ...checkInLocationData,
        });
      } else {
        attendance.status = "PENDING";
        attendance.lateStatus = "PENDING_APPROVAL";
        attendance.lateReason = lateReason;
        attendance.requestedCheckInTime = now;
        Object.assign(attendance, checkInLocationData);
      }
      await attendance.save();

      // Create Approval record
      const approval = new Approval({
        employeeId,
        requestType: "LATE_CHECKIN",
        fromDate: now,
        toDate: now,
        reason: lateReason,
        status: "PENDING",
        sourceId: attendance._id,
        selfieUrl: checkInLocationData.checkInSelfieUrl,
      });
      await approval.save();

      attendance.approvalId = approval._id;
      await attendance.save();

      // Send notifications to all Admins
      const employee = await Employee.findById(employeeId);
      const empName = employee ? employee.name : "Employee";
      const admins = await Employee.find({ role: "ADMIN" });

      const notifMessage = `${empName} requested late check-in approval (requested at ${time12h}). Reason: ${lateReason}`;

      for (const admin of admins) {
        const notif = new Notification({
          recipient: admin._id,
          message: notifMessage,
          type: "LATE_CHECKIN_REQUEST",
          relatedId: approval._id,
        });
        await notif.save();
      }

      const io = req.app.get("io");
      if (io) {
        io.emit("admin_notification", {
          message: notifMessage,
          type: "LATE_CHECKIN_REQUEST",
          employeeId,
          employeeName: empName,
          approvalId: approval._id,
        });
      }

      return sendSuccess(
        res,
        `It is past ${cutoffTime}. Your check-in request has been sent to Admin for approval.`,
        {
          attendance,
          requiresApproval: true,
          lateStatus: "PENDING_APPROVAL",
        },
      );
    }

    // Normal on-time check-in (or Admin check-in)
    if (!attendance) {
      attendance = new Attendance({
        employeeId,
        date,
        status,
        checkInTime: now,
        lateStatus: "NONE",
        ...checkInLocationData,
      });
    } else {
      attendance.checkInTime = now;
      attendance.status = status;
      attendance.lateStatus = "NONE";
      Object.assign(attendance, checkInLocationData);
    }
    await attendance.save();

    return sendSuccess(res, "Checked in successfully", { attendance });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.checkOut = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const date = getTodayDateString();
    const { latitude, longitude, accuracy, deviceInfo, browserDetails } = req.body;

    const attendance = await Attendance.findOne({ employeeId, date });
    if (!attendance || !attendance.checkInTime) {
      if (attendance && attendance.lateStatus === "PENDING_APPROVAL") {
        return sendError(
          res,
          "Your check-in is pending Admin approval. You cannot check out yet.",
          400,
        );
      }
      return sendError(res, "No check-in found for today", 400);
    }
    if (attendance.checkOutTime) {
      return sendError(res, "Already checked out for today", 400);
    }

    // Geo-Fencing calculations for checkout (for auditing)
    const settings = await CompanySetting.findOne();
    let distance = 0;
    let outsideRadius = false;

    if (settings && latitude !== undefined && longitude !== undefined) {
      distance = geolib.getDistance(
        { latitude: Number(latitude), longitude: Number(longitude) },
        { latitude: settings.latitude, longitude: settings.longitude },
      );
      outsideRadius = distance > settings.allowedRadius;
    }

    const ipAddress =
      req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress || "Unknown IP";

    attendance.checkOutTime = new Date();

    // calculate total hours
    const msDiff = attendance.checkOutTime.getTime() - attendance.checkInTime.getTime();
    attendance.totalHours = parseFloat((msDiff / (1000 * 60 * 60)).toFixed(2));

    // save checkout location and security logs
    attendance.checkOutLatitude = latitude ? Number(latitude) : undefined;
    attendance.checkOutLongitude = longitude ? Number(longitude) : undefined;
    attendance.checkOutDistance = distance;
    attendance.checkOutAccuracy = accuracy ? Number(accuracy) : undefined;
    attendance.checkOutOutsideRadius = outsideRadius;
    attendance.checkOutIpAddress = ipAddress;
    attendance.checkOutDeviceInfo = deviceInfo || "Unknown Device";
    attendance.checkOutBrowserDetails = browserDetails || "Unknown Browser";

    await attendance.save();

    return sendSuccess(res, "Checked out successfully", { attendance });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.today = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const date = getTodayDateString();

    const attendance = await Attendance.findOne({ employeeId, date });
    return sendSuccess(res, "Today attendance", { attendance });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.monthly = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return sendError(res, "month and year required", 400);

    const employeeId = req.user.id;

    // create a regex for YYYY-MM
    const paddedMonth = month.toString().padStart(2, "0");
    const prefix = `${year}-${paddedMonth}`;

    const records = await Attendance.find({
      employeeId,
      date: { $regex: `^${prefix}` },
    }).sort({ date: 1 });

    return sendSuccess(res, "Monthly attendance", { records });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.history = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const records = await Attendance.find({ employeeId })
      .populate("employeeId", "name designation")
      .sort({ date: -1, checkInTime: -1 });

    return sendSuccess(res, "Employee attendance history", { records });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.myMonthlySummaries = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return sendError(res, "month and year required", 400);

    const paddedMonth = month.toString().padStart(2, "0");
    const employeeId = req.user.id;
    const prefix = `${year}-${paddedMonth}`;

    // Find all attendance records for the given month and employee
    const records = await Attendance.find({
      employeeId,
      date: { $regex: `^${prefix}` },
    }).populate("employeeId", "name designation");

    let totalWorkedDays = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalWfh = 0;
    let totalLeave = 0;
    let totalHoliday = 0;
    let totalHours = 0;

    records.forEach((record) => {
      if (record.status === "PRESENT") {
        totalPresent += 1;
        totalWorkedDays += 1;
      } else if (record.status === "WFH") {
        totalWfh += 1;
        totalWorkedDays += 1;
      } else if (record.status === "ABSENT") {
        totalAbsent += 1;
      } else if (record.status === "LEAVE") {
        totalLeave += 1;
      } else if (record.status === "HOLIDAY") {
        totalHoliday += 1;
      }

      if (record.totalHours) {
        totalHours += record.totalHours;
      }
    });

    const summary = {
      _id: `${employeeId}-${prefix}`,
      employeeId: records.length > 0 ? records[0].employeeId : null,
      month: paddedMonth,
      year: year.toString(),
      totalWorkedDays,
      totalPresent,
      totalAbsent,
      totalWfh,
      totalLeave,
      totalHoliday,
      totalHours: parseFloat(totalHours.toFixed(2)),
    };

    const summaries = [summary];

    return sendSuccess(res, "Monthly summaries retrieved successfully", { summaries });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

// Admin Endpoints
exports.todayForAdmin = async (req, res) => {
  try {
    const date = getTodayDateString();
    const records = await Attendance.find({ date }).populate("employeeId", "name email");
    return sendSuccess(res, "Today attendance", { records });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.monthlyForAdmin = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return sendError(res, "month and year required", 400);

    const paddedMonth = month.toString().padStart(2, "0");
    const prefix = `${year}-${paddedMonth}`;

    const records = await Attendance.find({ date: { $regex: `^${prefix}` } })
      .populate("employeeId", "name designation")
      .lean();

    records.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      const timeA = new Date(a.requestedCheckInTime || a.checkInTime || a.createdAt || 0).getTime();
      const timeB = new Date(b.requestedCheckInTime || b.checkInTime || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return sendSuccess(res, "Monthly attendance", { records });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.dateForAdmin = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return sendError(res, "date is required", 400);

    const records = await Attendance.find({ date })
      .populate("employeeId", "name designation")
      .lean();

    records.sort((a, b) => {
      const timeA = new Date(a.requestedCheckInTime || a.checkInTime || a.createdAt || 0).getTime();
      const timeB = new Date(b.requestedCheckInTime || b.checkInTime || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return sendSuccess(res, "Date attendance", { records });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.historyForAdmin = async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) return sendError(res, "employeeId is required", 400);

    const records = await Attendance.find({ employeeId })
      .populate("employeeId", "name designation")
      .sort({ date: -1 });

    return sendSuccess(res, "Employee attendance history", { records });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.allForAdmin = async (req, res) => {
  try {
    const records = await Attendance.find({})
      .populate("employeeId", "name designation")
      .lean();

    records.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      const timeA = new Date(a.requestedCheckInTime || a.checkInTime || a.createdAt || 0).getTime();
      const timeB = new Date(b.requestedCheckInTime || b.checkInTime || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return sendSuccess(res, "All attendance records", { records });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.wfhTodayForAdmin = async (req, res) => {
  try {
    const date = getTodayDateString();

    const records = await Attendance.aggregate([
      {
        $match: {
          date: date,
          status: "WFH",
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employeeDetails",
        },
      },
      {
        $unwind: "$employeeDetails",
      },
      {
        $sort: {
          checkInTime: -1,
        },
      },
      {
        $project: {
          employeeId: "$employeeDetails._id",
          name: "$employeeDetails.name",
          designation: "$employeeDetails.designation",
          status: 1,
          checkInTime: 1,
        },
      },
    ]);

    return sendSuccess(res, "Today WFH employees", { records });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.generateMonthlySummary = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return sendError(res, "month and year required", 400);

    const paddedMonth = month.toString().padStart(2, "0");
    const prefix = `${year}-${paddedMonth}`;

    // Find all attendance records for the given month
    const records = await Attendance.find({ date: { $regex: `^${prefix}` } });

    // Calculate totals per employee
    const summaryMap = {};

    records.forEach((record) => {
      const empId = record.employeeId.toString();
      if (!summaryMap[empId]) {
        summaryMap[empId] = {
          employeeId: record.employeeId,
          month: paddedMonth,
          year: year.toString(),
          totalWorkedDays: 0,
          totalPresent: 0,
          totalAbsent: 0,
          totalWfh: 0,
          totalLeave: 0,
          totalHoliday: 0,
          totalHours: 0,
        };
      }

      const sum = summaryMap[empId];
      if (record.status === "PRESENT") {
        sum.totalPresent += 1;
        sum.totalWorkedDays += 1;
      } else if (record.status === "WFH") {
        sum.totalWfh += 1;
        sum.totalWorkedDays += 1;
      } else if (record.status === "ABSENT") {
        sum.totalAbsent += 1;
      } else if (record.status === "LEAVE") {
        sum.totalLeave += 1;
      } else if (record.status === "HOLIDAY") {
        sum.totalHoliday += 1;
      }

      if (record.totalHours) {
        sum.totalHours += record.totalHours;
      }
    });

    // Save to DB
    const summaries = Object.values(summaryMap);
    for (const data of summaries) {
      data.totalHours = parseFloat(data.totalHours.toFixed(2));
      await MonthlyAttendanceSummary.findOneAndUpdate(
        { employeeId: data.employeeId, month: data.month, year: data.year },
        { $set: data },
        { upsert: true, new: true },
      );
    }

    const updatedSummaries = await MonthlyAttendanceSummary.find({
      month: paddedMonth,
      year: year.toString(),
    }).populate("employeeId", "name designation");

    return sendSuccess(res, "Monthly summary generated and stored successfully", {
      summaries: updatedSummaries,
    });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};

exports.getMonthlySummaries = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return sendError(res, "month and year required", 400);

    const paddedMonth = month.toString().padStart(2, "0");
    const summaries = await MonthlyAttendanceSummary.find({
      month: paddedMonth,
      year: year.toString(),
    }).populate("employeeId", "name designation");

    return sendSuccess(res, "Monthly summaries retrieved successfully", { summaries });
  } catch (err) {
    console.error(err);
    return sendError(res, "Server error");
  }
};
