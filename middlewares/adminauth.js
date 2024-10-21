const jwt = require("jsonwebtoken");
const { JWT_ADMIN_SECRET } = require("../config");

function adminmiddleware(req, res, next) {
  const token = req.headers.token;
  const tokendata = jwt.verify(token, JWT_ADMIN_SECRET);

  if (tokendata.id) {
    req.userId = tokendata.id;
    next();
  } else {
    res.status(403).json({
      message: "Admin not found",
    });
  }
}

module.exports = {
  adminmiddleware,
};
