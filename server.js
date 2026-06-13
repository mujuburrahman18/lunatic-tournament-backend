const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
const razorpay = new Razorpay({
   key_id: process.env.RAZORPAY_KEY_ID,
   key_secret: process.env.RAZORPAY_KEY_SECRET
});
// Create Order API
app.post('/api/create-order', async (req, res) => {
   try {
       const { amount, currency = 'INR', receipt } = req.body;
       if (!amount || amount < 100) {
           return res.status(400).json({
               success: false,
               error: 'Amount must be at least ₹1 (100 paise)'
           });
       }
       const options = {
           amount: amount,
           currency: currency,
           receipt: receipt || `receipt_${Date.now()}`,
           payment_capture: 1
       };
       const order = await razorpay.orders.create(options);
       res.json({
           success: true,
           order_id: order.id,
           amount: order.amount,
           currency: order.currency
       });
   } catch (error) {
       console.error('Order error:', error);
       res.status(500).json({
           success: false,
           error: error.error?.description || 'Failed to create order'
       });
   }
});
// Verify Payment API
app.post('/api/verify-payment', (req, res) => {
   try {
       const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
       if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
           return res.status(400).json({
               success: false,
               error: 'Missing payment verification data'
           });
       }
       const body = razorpay_order_id + '|' + razorpay_payment_id;
       const expectedSignature = crypto
           .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
           .update(body.toString())
           .digest('hex');
       const isValid = expectedSignature === razorpay_signature;
       if (isValid) {
           res.json({
               success: true,
               message: 'Payment verified successfully',
               payment_id: razorpay_payment_id
           });
       } else {
           res.status(400).json({
               success: false,
               error: 'Invalid payment signature'
           });
       }
   } catch (error) {
       console.error('Verification error:', error);
       res.status(500).json({
           success: false,
           error: 'Payment verification failed'
       });
   }
});
// Serve frontend
app.get('*', (req, res) => {
   res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
   console.log(`✅ Server running on http://localhost:${PORT}`);
   console.log(`📍 Razorpay Test Mode Active`);
});