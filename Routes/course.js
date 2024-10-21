const express = require("express");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Router = express.Router;
const { UserModel, CourseModel, PurchaseModel } = require("../db");
// const { Router } = require("express");

const courseRoute = Router();

//---------Handles the PurchaseModel Collection updation-------------
async function purchaseCourse(req, res) {
  //1st verify that the purchase has been done then add the ourchase record

  const { userId: user, courseId: course } = req.body;

  const userId = ObjectId.isValid(user) ? new ObjectId(user) : null;
  const courseId = ObjectId.isValid(course) ? new ObjectId(course) : null;

  const valuser = await UserModel.findOne({ _id: userId });
  if (!valuser) {
    return res.status(404).json({
      message: "User NOt found",
    });
  }

  if (!userId || !courseId) {
    console.log("entered if for courseId");
    return res.status(400).json({ message: "Invalid userId or courseId" });
  }

  const record = await PurchaseModel.findOne({ userId: userId });
  try {
    if (record) {
      //already have purchase history earlier
      //check if bought same course twice else push or create()
      if (!record.courseIds.includes(courseId)) {
        await PurchaseModel.findOneAndUpdate(
          {
            userId: userId,
          },
          {
            $push: { courseIds: courseId },
          },
          { new: true }
        );
        //await record.save();
      } else {
        return res.json({
          message: "Course Already bought!",
        });
      }
    } else {
      //New purchase
      //create a record
      await PurchaseModel.create({
        userId: userId,
        courseIds: [courseId],
      });
    }
    return res.json({
      message: "Thanks for buying the course",
      PurchaseDetails: record,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error processing purchase.",
      error: error.message,
    });
  }
}

//---------Display All the available Courses-------------
async function displayAllCourses(req, res) {
  try {
    const allCourses = await CourseModel.find();
    if (!allCourses || allCourses == null) {
      throw new Error("NO courses available");
    }
    res.json({
      allCourses,
    });
  } catch (e) {
    if (e instanceof Error) {
      json({
        message: e.message,
      });
    }
    return;
  }
}

courseRoute.post("/purchasecourse", purchaseCourse);
courseRoute.get("/all", displayAllCourses);

module.exports = { courseRoute: courseRoute };
