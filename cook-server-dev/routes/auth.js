import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from "crypto";
import { sendVerifyEmail } from "../utils/mailer.js";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}


const router = express.Router();

// ============================================
// Send Verification (BEFORE signup)
// ============================================
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingUser = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expires = new Date(Date.now() + 1000 * 60 * 5); // 5분

    await query(
      `INSERT INTO email_verifications (email, token, expires_at, verified)
       VALUES (?, ?, ?, false)
       ON CONFLICT (email) DO UPDATE SET
         token = EXCLUDED.token,
         expires_at = EXCLUDED.expires_at,
         verified = false,
         verified_at = NULL`,
      [email, otpHash, expires]
    );

    await sendVerifyEmail(email, otp);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});



router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code required" });
    }

    const rows = await query(
      `SELECT token, expires_at FROM email_verifications WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "OTP not found" });
    }

    const { token, expires_at } = rows[0];

    if (new Date(expires_at) < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const codeHash = hashOTP(code);

    if (codeHash !== token) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await query(
      `UPDATE email_verifications
       SET verified = true,
           verified_at = NOW()
       WHERE email = ?`,
      [email]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "OTP verification failed" });
  }
});



// ============================================
// Check Verification Status
// ============================================
router.get('/verification-status', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Validation error', message: 'Email is required' });
    }

    const rows = await query(
      `SELECT verified, expires_at
       FROM email_verifications
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.json({ verified: false });
    }

    // 만료면 false 처리
    const row = rows[0];
    const expired = new Date(row.expires_at) <= new Date();

    return res.json({
      verified: !!row.verified && !expired,
      expired,
    });
  } catch (e) {
    console.error('verification-status error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// ============================================
// Sign Up
// ============================================
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation (기존 그대로)
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email, password, and name are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid email format'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check existing user
    const existingUser = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'Email is already registered'
      });
    }

    
// ✅ 이메일이 인증되었는지 확인 (email_verifications 테이블)
const v = await query(
  `SELECT verified, expires_at FROM email_verifications WHERE email = ?`,
  [email]
);

if (v.length === 0) {
  return res.status(400).json({
    error: 'Email not verified',
    message: '이메일 인증이 필요합니다. 인증하기 버튼을 눌러주세요.'
  });
}

const expired = new Date(v[0].expires_at) <= new Date();
if (expired || !v[0].verified) {
  return res.status(400).json({
    error: 'Email not verified',
    message: '이메일 인증이 완료되지 않았습니다. 메일을 확인해주세요.'
  });
}

/* =================================================
   ✅ 여기까지
   ================================================= */

// Hash password
const passwordHash = await bcrypt.hash(password, 10);
const userId = uuidv4();

// ✅ 인증 완료된 상태로 유저 생성
await query(
  `INSERT INTO users (id, email, password_hash, name, is_verified)
   VALUES (?, ?, ?, ?, true)`,
  [userId, email, passwordHash, name]
);

// (선택) 인증 기록 정리
await query(`DELETE FROM email_verifications WHERE email = ?`, [email]);

return res.status(201).json({
  success: true,
  message: 'Signup successful'
});

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create user'
    });
  }
});

// ============================================
// Login
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Find user
    const users = await query(
      'SELECT id, email, password_hash, name, is_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // ✅ 이메일 인증 여부 체크
    if (!user.is_verified) {
      return res.status(403).json({
        error: 'Email not verified',
        message: '이메일 인증이 필요합니다'
      });
    }


    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to login'
    });
  }
});

// ============================================
// Get Current User (Protected)
// ============================================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, email, name, allergies, preferences, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = users[0];
    
    // Parse JSON fields
    if (user.allergies) {
      user.allergies = JSON.parse(user.allergies);
    }
    if (user.preferences) {
      user.preferences = JSON.parse(user.preferences);
    }

    res.json({
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user'
    });
  }
});

// ============================================
// Verify Token (for debugging)
// ============================================
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});



export default router;
