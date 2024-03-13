const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const path = require('path');

const app = express();
const port = 3000;

// Set up your MySQL database connection here
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'sevNASTASE2002',
  database: 'chat_app'
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// Serve your HTML files
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/chat.html');
});

app.get('/chatParticular', (req, res) => {
    res.sendFile(path.join(__dirname, 'chatParticular.html'));
});

// Handle registration
app.post('/register', async (req, res) => {
  const { email, psw } = req.body;
  const hashedPassword = await bcrypt.hash(psw, 10);

  pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err, results) => {
    if (err) {
      // Handle errors, e.g. user already exists
      console.error(err);
      res.status(500).send('User already exists.');
      return;
    }
    // Redirect or handle the response as needed
    res.redirect('/login');
  });
});

// Handle login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  pool.query('SELECT email, password FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: 'An error occurred' });
      }
      if (results.length > 0) {
          const match = await bcrypt.compare(password, results[0].password);
          if (match) {
              // Include the user's email in the response
              return res.json({ success: true, email: results[0].email });
          } else {
              return res.status(401).json({ success: false, message: 'Password incorrect' });
          }
      } else {
          return res.status(404).json({ success: false, message: 'User not found' });
      }
  });
});

app.post('/api/add-contact', (req, res) => {
  const { user_email, contact_email } = req.body;

  pool.query('SELECT email FROM users WHERE email = ?', [contact_email], function(error, results) {
      if (error) {
          return res.status(500).json({ success: false, error: 'Error checking contact email.' });
      }
      if (results.length === 0) {
          return res.json({ success: false, error: 'No user found with that email.' });
      }

      // User exists, proceed to add to contacts
      pool.query('INSERT INTO user_contacts (user_email, contact_email) VALUES (?, ?)', [user_email, contact_email], function(error, results) {
          if (error) {
              // Handle duplicate entry here if the contact is already added
              if (error.code === 'ER_DUP_ENTRY') {
                  return res.status(409).json({ success: false, error: 'Contact already added.' });
              }
              return res.status(500).json({ success: false, error: 'Error adding contact.' });
          }
          return res.json({ success: true, message: 'Contact added.' });
      });
  });
});

app.post('/api/check-user', async (req, res) => {
    const emailToCheck = req.body.email;
    
    // Replace this with your actual database query logic.
    const user = await database.findUserByEmail(emailToCheck);
    
    if (user) {
        res.json({ exists: true, email: emailToCheck });
    } else {
        res.json({ exists: false });
    }
});

app.post('/api/send-message', (req, res) => {
    const { senderEmail, receiverEmail, messageContent } = req.body;

    pool.query(
        'INSERT INTO messages (sender_email, receiver_email, message) VALUES (?, ?, ?)',
        [senderEmail, receiverEmail, messageContent],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error sending message');
            }
            res.status(200).json({ success: true, message: 'Message sent successfully' });
        }
    );
});

app.get('/api/get-message-history', (req, res) => {
  const { userEmail, contactEmail } = req.query;
  pool.query(
    'SELECT * FROM messages WHERE (sender_email = ? AND receiver_email = ?) OR (sender_email = ? AND receiver_email = ?) ORDER BY timestamp ASC',
    [userEmail, contactEmail, contactEmail, userEmail],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error retrieving messages');
      }
      res.json(results);
    }
  );
});

app.get('/api/get-contacts', (req, res) => {
  const user_email = req.query.user_email;
  
  pool.query('SELECT contact_email FROM user_contacts WHERE user_email = ?', [user_email], function(error, results) {
      if (error) {
          return res.status(500).json({ success: false, error: 'Error retrieving contacts.' });
      }
      return res.json(results.map(row => row.contact_email));
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});