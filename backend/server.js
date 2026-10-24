const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/production', require('./routes/productionRoutes'));
app.use('/api/downtime', require('./routes/downtimeRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Paper Dona/Pattal Machine Monitoring System API',
    timestamp: new Date().toISOString(),
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Machine Monitor Backend] Server running on port ${PORT}`);
  console.log(`[Machine Monitor Backend] Health Check: http://localhost:${PORT}/api/health`);
});
