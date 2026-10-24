const express = require("express");
const razorpay = require("../config/razarpay");
const pool = require("../config/db");
const crypto = require('crypto')
const router = express.Router();



router.post("/orders", async (req, res) => {
    try {
        const { amount } = req.body;

        if (!Number.isInteger(amount) || amount <= 0) {
            return res.status(400).json({
                message: "Amount must be a positive integer in paise",
            });
        }

        const order = await razorpay.orders.create({
            amount,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        });

        const result = await pool.query(
            `INSERT INTO payments
        (razorpay_order_id, amount, currency, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [order.id, order.amount, order.currency, "PENDING"]
        );

        // 3. Return both our record and Razorpay's order
        res.status(201).json({
            message: "Payment order created successfully",
            payment: result.rows[0],
            razorpayOrder: order,
        });
    } catch (error) {
        console.error("Razorpay order creation failed:", error.message);

        res.status(500).json({
            message: "Could not create payment order",
        });
    }
});

router.post('/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                message: "All fields are required"
            })
        }
        // 1. Get the order ID saved by your backend.
        // Example: retrieve it from your database.
        const orderResponse = await pool.query(`select * from payments where razorpay_order_id=$1`, [razorpay_order_id])
        if (orderResponse.rows.length === 0) {
            return res.status(400).json({
                message: "Invalid order",
            });
        }
        const order = orderResponse.rows[0]

        if (order.status == 'SUCCESS') {
            return res.json({
                message: 'Payment already verified'
            })
        }

        // console.log(order)


        // 2. Calculate the expected signature.
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZARPAY_SECRET_KEY)
            .update(`${order.razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        // 3. Compare signatures safely.
        const expected = Buffer.from(expectedSignature, "hex");
        const received = Buffer.from(
            razorpay_signature ?? "",
            "hex"
        );

        if (
            expected.length !== received.length ||
            !crypto.timingSafeEqual(expected, received)
        ) {
            return res.status(400).json({
                message: "Payment verification failed",
            });
        }


        const payment = await razorpay.payments.fetch(
            razorpay_payment_id
        );

        if (
            payment.order_id !== order.razorpay_order_id ||
            payment.amount !== Number(order.amount) ||
            payment.currency !== order.currency
        ) {
            return res.status(400).json({
                message: "Payment details do not match the order"
            });
        }

        if (payment.status !== "captured") {
            return res.status(409).json({
                message: "Payment is not captured yet",
                status: payment.status
            });
        }

        await pool.query(
            `UPDATE payments
     SET status = 'SUCCESS',
         razarpay_payment_id = $1
     WHERE razorpay_order_id = $2`,
            [razorpay_payment_id, razorpay_order_id]
        );

        return res.status(200).json({
            message: "Payment verified successfully",
            status: "SUCCESS"
        });


    } catch (error) {
        console.log("Error while verifying payment", error)
        return res.status(400).json({
            message: "Error while verifying payment"
        })
    }
})

router.post('/webhooks/razorpay', async (req, res) => {
    console.log("Razorpay webhook received");
    res.status(200).json({ received: true });
})

module.exports = router;