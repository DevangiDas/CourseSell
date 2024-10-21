const mongoose = require("mongoose");
console.log("connected to the databse");

const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
// const ObjectId = Schema.ObjectId;

const userSchema = new Schema({
  email: { type: String, unique: true },
  username: String,
  password: String,
});

const adminSchema = new Schema({
  email: { type: String, unique: true },
  username: String,
  password: String,
});

const courseSchema = new Schema({
  coursename: String,
  description: String,
  price: { type: Number, isNaN: false },
  image: String,
  instructorName: { type: String, $ref: "admins" },
  instructorId: { type: ObjectId, $ref: "admins" },
});

const purchaseSchema = new Schema({
  userId: { type: ObjectId, $ref: "users", required: true },
  courseIds: [{ type: ObjectId, $ref: "courses", required: true }],
});

const UserModel = mongoose.model("users", userSchema);
const AdminModel = mongoose.model("admins", adminSchema);
const CourseModel = mongoose.model("courses", courseSchema);
const PurchaseModel = mongoose.model("purchases", purchaseSchema);

module.exports = {
  UserModel: UserModel,
  AdminModel: AdminModel,
  CourseModel: CourseModel,
  PurchaseModel: PurchaseModel,
};
