const jwt = require("jsonwebtoken");
const { JWT_USER_SECRET } = require("../config");

function usermiddleware(req, res, next) {
  const token = req.headers.token;
  const tokendata = jwt.verify(token, JWT_USER_SECRET);

  if (tokendata.id) {
    req.userId = tokendata.id;
    next();
  } else {
    res.status(403).json({
      message: "user not found",
    });
  }
}

module.exports = {
  usermiddleware,
};
