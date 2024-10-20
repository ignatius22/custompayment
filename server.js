const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const functions = require('firebase-functions')

const app = express();

app.use(bodyParser.json());
app.use(cors());

// Middleware for error handling
const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: true,
    message: 'Internal Server Error',
  });
};

// Load config.json
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initiate Payment Route
app.post('/filter_custom_gateway_pay', async (req, res, next) => {
  const { cart, paymethod_data } = req.body.data;

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: paymethod_data.email,
        amount: cart.total * 100, // Convert to kobo
        reference: `custom_ref_${Date.now()}`
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    // Respond with Paystack reference
    res.status(200).json({
      error: false,
      result: {
        status: 1, // Payment initiated
        pay_reference: response.data.data.reference, // Paystack reference
        data: response.data.data // Paystack data
      }
    });
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
});

// Confirm Payment Route
app.post('/filter_custom_gateway_confirm', async (req, res, next) => {
  const { pay_reference } = req.body.data;

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${pay_reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    // Check payment status
    switch (response.data.data.status) {
      case 'success':
        res.status(200).json({
          error: false,
          result: {
            status: 1,
            pay_data: response.data.data // Payment data
          }
        });
        break;

      case 'abandoned':
        res.status(400).json({
          error: true,
          result: ['Payment was abandoned. Please try again.']
        });
        break;

      default:
        res.status(400).json({
          error: true,
          result: ['Payment verification failed']
        });
        break;
    }
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
});

// Order Create Action Route
app.post('/action_order_create', async (req, res, next) => {
  const { order } = req.body;

  try {
    // Perform any additional actions you want on order creation
    console.log('Order Created:', order);
    
    // Respond with success
    res.status(200).json({
      error: false,
      message: 'Order creation handled successfully.'
    });
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
});

// Order Confirmed Filter
app.post('/filter_order_confirmed', async (req, res, next) => {
  const { orderId } = req.body;

  try {
    // Perform any additional logic needed for confirmed orders
    console.log('Order Confirmed:', orderId);
    
    // Respond with the modified order data or confirmation
    res.status(200).json({
      error: false,
      message: 'Order confirmed successfully.'
    });
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
});

// Use the error handler middleware
app.use(errorHandler);

// Endpoint to serve the config.json
app.get('/config', (req, res) => {
  res.json(config); // Serve the config as JSON
});

// Start Server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


exports.api = functions.https.onRequest(app)