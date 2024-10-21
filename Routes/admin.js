const { Router } = require("express");
const adminRoute = Router();
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
var bcrypt = require("bcryptjs");
const { AdminModel, CourseModel } = require("../db");
const jwt = require("jsonwebtoken");
const { JWT_ADMIN_SECRET } = require("../config");
const { adminmiddleware } = require("../middlewares/adminauth");

const z = require("zod");

//---------- Zod Validation Schema For Admin SignUP --------------
const adminSignupVal = z.object({
  email: z.string().email({ message: "Please provide a valid email." }),
  username: z
    .string()
    .min(5, { message: "Name must be at least 5 characters long." }),
  password: z
    .string()
    .min(10, { message: "Password must be at least 10 characters long." })
    .max(20, { message: "Password must be at most 20 characters long." }),
});

//------------- Admin Signup --------------------------------------
async function adminSignup(req, res) {
  try {
    // Validate request body against the schema
    const { email, username, password } = adminSignupVal.parse(req.body);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    await AdminModel.create({
      email,
      username,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Signed up successfully!",
    });
  } catch (error) {
    // Handle validation errors and other issues
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        errors: error.errors,
        message: "Validation failed.",
      });
    }

    console.error(error); // Log unexpected errors for debugging
    res.status(500).json({
      message: "Something went wrong.",
    });
  }
}

//-------- Zod Validation Schema for Admin login ---------------
const adminLoginVal = z.object({
  email: adminSignupVal.shape.email,
  password: adminSignupVal.shape.password,
});

//------------- Admin Login --------------------------------------
async function adminLogin(req, res) {
  try {
    // Validate request body against the schema
    const { email, password } = adminLoginVal.parse(req.body);

    // Find user by email
    const user = await AdminModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "No email found. Kindly provide the correct email!",
      });
    }

    // Compare the provided password with the stored hashed password
    //Note you need await as isPasswordValid gives a promise you have to await on it
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid && user) {
      return res.status(401).json({
        message: "Incorrect password. Please try again.",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id.toString() }, JWT_ADMIN_SECRET);
    return res.json({ token });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        errors: error.errors,
        message: "Validation failed.",
      });
    }

    // Log unexpected errors for debugging
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Something went wrong.",
    });
  }
}

//-----------------validation Schema for Create Course---------------
const createCourseval = z.object({
  coursename: z
    .string()
    .min(5, { message: "Course name is required atleast with 5 characters" })
    .max(25, { message: "Maximun length can be 25" }),
  price: z.number().positive(),
  image: z.string(),
  description: z.string().min(10).max(50),
});

//-------------Create A Course------------------------------------
async function createCourse(req, res) {
  const adminId = req.userId;
  // console.log("TYPEOF adminId: " + typeof adminId);
  const instructorId = ObjectId.isValid(adminId) ? new ObjectId(adminId) : null;
  if (instructorId == null) {
    return res.json({
      message: "Token cannot be converted to ID",
    });
  }
  try {
    // Validate request body using zod
    const coursevalidate = createCourseval.parse(req.body);
    const { coursename, description, price, image } = coursevalidate;

    // Retrieve instructor's name and id from the admin record
    const instructorName = await AdminModel.findOne({
      _id: instructorId,
    });

    // Create the course in the CourseModel
    await CourseModel.create({
      coursename: coursename,
      description: description,
      price: price,
      instructorName: instructorName.username,
      instructorId: instructorId,
      image: image,
    });

    // Send success response
    res.json({
      message: "Course created successfully!",
    });
  } catch (e) {
    // Handle any unexpected errors and validation errors
    console.error(e);
    res.status(500).json({
      message: e.message || "An error occurred while creating the course.",
    });
  }
}

//-------------Delete A Course------------------------------------
async function deleteCourse(req, res) {
  const adminId = req.userId;
  const instructorId = ObjectId.isValid(adminId) ? new ObjectId(adminId) : null;
  const course = req.body.courseId;
  const courseId = ObjectId.isValid(course) ? new ObjectId(course) : null;

  if (!instructorId || !courseId) {
    return res.status(400).json({ message: "Invalid admin or course ID" });
  }

  try {
    const courseTodel = await CourseModel.findOne({
      _id: courseId,
    });

    // Check if the course exists and if the admin is authorized to delete it
    if (
      courseTodel &&
      courseTodel.instructorId.toString() === instructorId.toString()
    ) {
      await CourseModel.deleteOne({ _id: courseId });

      return res.status(200).json({ message: "Course deleted successfully" });
    } else {
      return res
        .status(403)
        .json({ message: "Admin not authorized to delete this course" });
    }
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while trying to delete the course",
      error: error.message,
    });
  }
}

//-------------Validation to Update A Course----------------------
const updateCourseVal = z.object({
  courseid: z.string(),
  price: z.number().positive().optional(),
  image: z.string().optional(),
  description: z.string().min(10).max(50).optional(),
  updatedname: z
    .string()
    .min(5, { message: "Course name is required atleast with 5 characters" })
    .max(25, { message: "Maximun length can be 25" })
    .optional(),
});

//-------------Update A Course------------------------------------
async function updateCourse(req, res) {
  const admin = req.userId;
  const adminId = ObjectId.isValid(admin) ? new ObjectId(admin) : null;

  try {
    const courseval = updateCourseVal.parse(req.body);
    const { courseid, description, price, image, updatedname } = courseval;

    const courseId = ObjectId.isValid(courseid) ? new ObjectId(courseid) : null;
    if (!adminId || !courseId) {
      return res.status(400).json({ message: "Invalid admin or course ID" });
    }
    const courses = await CourseModel.findOne({
      _id: courseId,
    });
    if (courses && courses.instructorId.toString() === adminId.toString()) {
      await CourseModel.updateOne(
        {
          instructorId: adminId,
          _id: courseId,
        },
        {
          $set: {
            coursename: updatedname,
            description: description,
            price: price,
            image: image,
          },
        }
      );

      return res.status(200).json({ message: "Course Updated successfully" });
    } else {
      return res
        .status(403)
        .json({ message: "Admin not authorized to Update this course" });
    }
  } catch (e) {
    res.status(500).json({
      error: e.message,
      message: "Error Found",
    });
  }
}

//---------------Preview the Courses That the Instructor has------
async function previewCourse(req, res) {
  const adminId = req.userId;

  try {
    // Find courses where instructorId matches the adminId
    let courses = await CourseModel.find({ instructorId: adminId });

    // Check if any courses were found
    if (courses.length > 0) {
      const courseDetails = courses.map((course) => ({
        coursename: course.coursename,
        price: course.price,
        description: course.description,
      }));
      return res.json({
        message: "Courses retrieved successfully",
        courses: courseDetails,
      });
    } else {
      return res.status(404).json({ message: "No courses found" });
    }
  } catch (e) {
    return res.status(500).json({
      message: "Error retrieving courses",
      error: e.message,
    });
  }
}

adminRoute.post("/signup", adminSignup);
adminRoute.post("/login", adminLogin);
adminRoute.use(adminmiddleware);
adminRoute.put("/course/createcourse", createCourse);
adminRoute.put("/course/updatecourse", updateCourse);
adminRoute.put("/course/deletecourse", deleteCourse);
adminRoute.get("/course/bulk", previewCourse);

module.exports = { adminRoute: adminRoute };
