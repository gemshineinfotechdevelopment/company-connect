const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.header('Authorization');
  if (!header) return res.status(401).json({ message: 'No token provided' });

  const parts = header.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      ...payload,
      role: typeof payload.role === 'string' ? payload.role.toUpperCase() : payload.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function restrictEmployeeProfileUpdates(req, res, next) {
  if (req.user?.role === 'EMPLOYEE') {
    const forbiddenFields = [
      'employeeId',
      'department',
      'designation',
      'role',
      'joiningDate',
      'status',
    ];
    forbiddenFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        delete req.body[field];
      }
    });
  }
  next();
}

module.exports = {
  auth,
  restrictEmployeeProfileUpdates,
};
