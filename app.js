const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const fs = require('fs');
const app = express();
const port = 3000;

const USERS_FILE = './users.json';

// Mongoose setup: Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/employeems', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Define Employee Schema and Model for MongoDB
const employeeSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Custom _id field
  name: { type: String, required: true },
  salary: { type: Number, required: true }
}, { _id: false }); // Disable automatic _id field creation

const Employee = mongoose.model('Employee', employeeSchema);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Root route should redirect to the login-signup page
app.get('/', (req, res) => {
  res.redirect('/login-signup');
});

// Helper function to read users from users.json
const getUsersFromFile = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users.json:', error);
    return [];
  }
};

// Helper function to save users to users.json
const saveUsersToFile = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing to users.json:', error);
  }
};

// Login and Signup page
app.get('/login-signup', (req, res) => {
  res.render('login-signup', { successMessage: req.query.successMessage });
});

// Handle login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = getUsersFromFile();

  // Check if the user exists and password matches
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    req.session.user = user; // Set user session
    res.redirect('/employees');
  } else {
    res.send('Invalid email or password. Please try again.');
  }
});

// Handle signup
app.post('/signup', (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  let users = getUsersFromFile();

  // Check if the email already exists
  if (users.find(u => u.email === email)) {
    return res.send('User already exists. Please log in.');
  }

  // Add new user to users.json
  const newUser = { firstName, lastName, email, password };
  users.push(newUser);
  saveUsersToFile(users);

  req.session.user = newUser; // Set user session
  res.redirect('/login-signup?successMessage=Signup successful!');
});

// Middleware to check if the user is logged in
const ensureAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login-signup');
  }
};

// Display employees stored in MongoDB
app.get('/employees', ensureAuthenticated, async (req, res) => {
  try {
    const employees = await Employee.find();
    res.render('employees', { employees });
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).send('Server error');
  }
});

// Add employee form
app.get('/add-employee', ensureAuthenticated, (req, res) => {
  res.render('add-employee');
});

// Handle adding employee (stored in MongoDB)
app.post('/add-employee', ensureAuthenticated, async (req, res) => {
  try {
    const newEmployee = new Employee({
      _id: req.body.id, // Make sure to include this
      name: req.body.name,
      salary: req.body.salary
    });
    await newEmployee.save();
    res.redirect('/employees');
  } catch (err) {
    console.error('Error adding employee:', err);
    res.status(500).send('Server error');
  }
});

// Edit employee form
app.get('/edit-employee/:id', ensureAuthenticated, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    res.render('edit-employee', { employee });
  } catch (err) {
    console.error('Error fetching employee:', err);
    res.status(500).send('Server error');
  }
});

// Handle editing employee (stored in MongoDB)
app.post('/edit-employee/:id', ensureAuthenticated, async (req, res) => {
  try {
    await Employee.findByIdAndUpdate(req.params.id, {
      name: req.body.name,
      salary: req.body.salary
    });
    res.redirect('/employees');
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).send('Server error');
  }
});

// Handle deleting employee (stored in MongoDB)
// Handle deleting employee (stored in MongoDB)
app.get('/delete-employee/:id', ensureAuthenticated, async (req, res) => {
  try {
    const result = await Employee.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).send('Employee not found');
    }
    res.redirect('/employees');
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).send('Server error');
  }
});


// Handle logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login-signup');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
}); 