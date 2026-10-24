const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZARPAY_API_KEY,
  key_secret: process.env.RAZARPAY_SECRET_KEY,
});

module.exports = razorpay;