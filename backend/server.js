
require("dotenv").config();

const express = require("express");


const app = express();
app.use(express.static("public"));


const webhookRoutes = require("./routes/webhooks")
app.use("/webhooks", express.raw({ type: "application/json" }), webhookRoutes);

app.use(express.json());

const paymentRoutes = require("./routes/payment")

app.get("/", (req, res) => {
  res.json({
    message: "Payment Gateway API is running",
  });
});

app.get("/api/config", (req, res) => {
  res.json({
    keyId: process.env.RAZARPAY_API_KEY,
  });
});


app.use("/api/payments", paymentRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
