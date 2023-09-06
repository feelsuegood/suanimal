import express from "express";
import dotenv from "dotenv";

const indexRouter = express.Router();
dotenv.config();

/* GET home page. */
indexRouter.get("/", (req, res) => {
  const title = "Welcome to Suanimal";
  console.log("hi");
  res.render("index", { title });
});

export default indexRouter;
