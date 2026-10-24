
const express = require("express");
const razorpay = require("../config/razarpay");
const pool = require("../config/db");
const crypto = require('crypto')
const router = express.Router();



router.post('/razorpay', async (req, res) => {
    try {
        // get the signature from razorpay
        const signature = req.headers["x-razorpay-signature"];

        console.log("Razorpay webhook received");

        // req.body must be the RAW request body (a Buffer)
        const expectedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_WEBHOOK_SECRET
            )
            .update(req.body)
            .digest("hex");

        const expected = Buffer.from(expectedSignature, "hex");
        const received = Buffer.from(signature ?? "", "hex");

        // compare the signatures
        if (
            expected.length !== received.length ||
            !crypto.timingSafeEqual(expected, received)
        ) {
            return res.status(400).json({
                message: "Invalid webhook signature",
            });
        }

        console.log("Webhook signature verified");

        // Parse the body only after signature verification
        const event = JSON.parse(req.body.toString("utf8"));

        
        if (event.event === "payment.captured") {
            const payment = event.payload.payment.entity;

            const razorpay_payment_id = payment.id;
            const razorpay_order_id = payment.order_id;

            console.log({ razorpay_payment_id, razorpay_order_id });

            const orderResponse = await pool.query(`select * from payments where razorpay_order_id=$1`, [razorpay_order_id])
            if (orderResponse.rows.length === 0) {
                return res.status(400).json({
                    message: "Invalid order",
                });
            }
            const order = orderResponse.rows[0]

            // return if the payment is already processed
            if (order.status == 'SUCCESS') {
                return res.status(200).json({
                    received: true,
                    message: "Payment already processed"
                });
            }

            await pool.query(
                `UPDATE payments
         SET status = 'SUCCESS',
             razarpay_payment_id = $1
         WHERE razorpay_order_id = $2`,
                [razorpay_payment_id, razorpay_order_id]
            );
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        res.status(500).json({
            message: "Error while verifying payment"
        })
    }
});

module.exports = router;