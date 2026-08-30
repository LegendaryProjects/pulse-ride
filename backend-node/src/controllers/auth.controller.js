const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hackathon_key';
const signup = async (req, res) => {
  try {
    // Extract both passwords from the frontend request
    const { name, email, iris_password, system_password, role, roll_number } = req.body;

    // 1. Enforce NITK domain
    if (!email || !email.endsWith('@nitk.edu.in')) {
      return res.status(400).json({ error: 'Must use an @nitk.edu.in email' });
    }

    // 2. Verify identity against the IRIS database
    const irisRes = await db.query('SELECT * FROM iris_credentials WHERE email = $1', [email]);
    if (irisRes.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found in IRIS system' });
    }
    
    // Compare the provided IRIS password with the IRIS database hash
    const isIrisValid = await bcrypt.compare(iris_password, irisRes.rows[0].password_hash);
    if (!isIrisValid) {
      return res.status(401).json({ error: 'Invalid IRIS password verification' });
    }

    // 3. Check if they already have an account in your mobility app
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) return res.status(400).json({ error: 'Already registered in the system' });

    // 4. Hash their NEW custom system password
    const salt = await bcrypt.genSalt(10);
    const systemPasswordHash = await bcrypt.hash(system_password, salt);

    // 5. Store the user with the NEW system password hash
    const newUser = await db.query(
      'INSERT INTO users (name, email, password_hash, role, roll_number) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, roll_number',
      [name, email, systemPasswordHash, role || 'STUDENT', roll_number]
    );

    const user = newUser.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });

    res.status(201).json({ success: true, token, user });
  } catch (error) {
    console.error('Signup Error:', error.message);
    res.status(500).json({ error: 'Signup failed' });
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    
    const user = userRes.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '12h' }
    );

    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role, 
        roll_number: user.roll_number 
      } 
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
};

module.exports = { signup, login };