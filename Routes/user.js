const { Router } = require("express");
const userRoute = Router();
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
var bcrypt = require("bcryptjs");
const { UserModel, PurchaseModel, CourseModel } = require("../db");
const jwt = require("jsonwebtoken");
const { JWT_USER_SECRET } = require("../config");
const { usermiddleware } = require("../middlewares/userauth");

const z = require("zod");

//---------------------Adding zod schema validation for user signup------------------------
const userSignupCred = z.object({
  email: z.string().email({ message: "Incorrect format; must be an email." }),
  username: z
    .string()
    .min(5, { message: "Username must be greater than 5 characters." }),
  password: z
    .string()
    .min(10, { message: "Password must be more than 10 characters." }),
});

//-----------------------------The user Signup function------------------------------------
async function userSignup(req, res) {
  try {
    const userinfo = userSignupCred.parse(req.body);
    const { email, username, password } = userinfo;

    const hashedpassword = await bcrypt.hash(password, 10);

    await UserModel.create({
      email: email,
      username: username,
      password: hashedpassword,
    });
    return res.status(201).json({ message: "User signed up successfully!" });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Validation failed", errors: error.errors });
  }
}

//---------------------Adding zod schema validation for user login-------------------------
const userLoginCred = z.object({
  email: userSignupCred.shape.email,
  password: userSignupCred.shape.password,
});

//-----------------------------The user Login function--------------------------------------
async function userLogin(req, res) {
  try {
    // Validate request body against the login schema
    const uservalidate = userLoginCred.parse(req.body);
    const { email, password } = uservalidate;

    // Find the user by email
    let user = await UserModel.findOne({ email: email });

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        message: "No email found. Kindly provide the correct email!",
      });
    }

    // Compare provided password with stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Incorrect password. Please try again.",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id.toString() }, JWT_USER_SECRET);
    res.json({
      token: token,
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: error.errors });
    }
    // Handle other unexpected errors
    console.error(error); // Log the error for debugging purposes
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

//--------------------The Display all User Course function---------------------------------
async function userCourse(req, res) {
  const userbody = req.userId;
  const userId = ObjectId.isValid(userbody) ? new ObjectId(userbody) : null;
  const purchaseRecord = await PurchaseModel.findOne({ userId: userId });

  try {
    if (!purchaseRecord) {
      return res
        .status(404)
        .json({ message: "No purchase record found for this user." });
    }

    let purchaseCourseIds = purchaseRecord.courseIds;
    const foundCourses = await CourseModel.find({
      _id: { $in: purchaseCourseIds },
    });
    return res.json({
      message: "Courses retrieved successfully",
      courses: foundCourses,
    });
  } catch (e) {
    res.json({
      message: "Unexpect Error occured",
    });
  }
}

//the function is for user to send a purchase request but not implimented the logic rn
async function userPurchase(req, res) {

}

userRoute.post("/signup", userSignup);
userRoute.post("/login", userLogin);
userRoute.use(usermiddleware);
userRoute.put("/userpurchase", userPurchase);
userRoute.get("/usercourse", userCourse);

module.exports = {
  userRoute: userRoute,
};
