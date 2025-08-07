// Add this at the top of your app.js file
process.on('warning', e => console.warn(e.stack));

// Suppress specific deprecation warnings
process.env.NODE_NO_WARNINGS = '1';

const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cookie parser
app.use(cookieParser());

// Express session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
  })
);

// Custom flash middleware
app.use((req, res, next) => {
  // Add flash methods to req
  req.flash = function(type, message) {
    if (!req.session.flash) {
      req.session.flash = {};
    }
    if (!req.session.flash[type]) {
      req.session.flash[type] = [];
    }
    req.session.flash[type].push(message);
  };

  // Add flash messages to res.locals
  res.locals.success_msg = req.session.flash?.success_msg || [];
  res.locals.error_msg = req.session.flash?.error_msg || [];
  res.locals.error = req.session.flash?.error || [];

  next();
});

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/', require('./routes/viewRoutes'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});