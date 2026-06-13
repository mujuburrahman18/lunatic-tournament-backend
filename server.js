const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();
const app = express();
// Middleware
app.use(cors());
app.use(express.json());
// Initialize Razorpay
const razorpay = new Razorpay({
   key_id: process.env.RAZORPAY_KEY_ID,
   key_secret: process.env.RAZORPAY_KEY_SECRET
});
// ==================== API ROUTES ====================
// Test route
app.get('/', (req, res) => {
   res.json({
       message: 'Lunatic Tournament API is running!',
       status: 'active',
       endpoints: {
           create_order: '/api/create-order (POST)',
           verify_payment: '/api/verify-payment (POST)'
       }
   });
});
// 1. Create Order Endpoint
app.post('/api/create-order', async (req, res) => {
   try {
       console.log('Create order request received:', req.body);
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
       console.log('Order created:', order.id);
       res.json({
           success: true,
           order_id: order.id,
           amount: order.amount,
           currency: order.currency
       });
   } catch (error) {
       console.error('Order creation error:', error);
       res.status(500).json({
           success: false,
           error: error.error?.description || 'Failed to create order'
       });
   }
});
// 2. Verify Payment Endpoint
app.post('/api/verify-payment', (req, res) => {
   try {
       console.log('Verification request received:', req.body);
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
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
   console.log(`✅ Server running on http://localhost:${PORT}`);
   console.log(`📍 Razorpay Key ID: ${process.env.RAZORPAY_KEY_ID}`);
   console.log(`📍 Create order: POST /api/create-order`);
   console.log(`📍 Verify payment: POST /api/verify-payment`);
});
