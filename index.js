require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const { userRoute } = require("./Routes/user");
const { courseRoute } = require("./Routes/course");
const { adminRoute } = require("./Routes/admin");

app.use("/api/v1/user", userRoute);
app.use("/api/v1/course", courseRoute);
app.use("/api/v1/admin", adminRoute);

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
  app.listen(3000);
  console.log("listning");
}

main();
