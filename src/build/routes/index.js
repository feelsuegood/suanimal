"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _express = _interopRequireDefault(require("express"));
var _dotenv = _interopRequireDefault(require("dotenv"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
var indexRouter = _express["default"].Router();
_dotenv["default"].config();

/* GET home page. */
indexRouter.get("/", function (req, res) {
  var title = "Welcome to Suanimal";
  console.log("hi");
  res.render("index", {
    title: title
  });
});
var _default = indexRouter;
exports["default"] = _default;