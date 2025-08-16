const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    console.log('회원가입 요청 받음:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation 에러:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, companyName, industry, companySize, address, phone } = req.body;
    const role = 'admin'; // Only admins can register

    console.log('회원가입 데이터 처리 중:', { email, name, companyName, industry, companySize });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.error('이미 존재하는 사용자:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create admin user with company information
    const user = await prisma.user.create({
      data: {
        email,
        name, // name 필드 추가
        password, // Plain text password
        role: 'admin', // Only admins can register
        company: {
          create: {
            companyName,
            industry: industry || 'healthcare',
            companySize: companySize || 'small',
            address,
            phone
          }
        }
      },
      include: {
        company: true
      }
    });

    console.log('회원가입 성공:', { userId: user.id, email: user.email, name: user.name });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Admin account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        company: user.company,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('회원가입 서버 에러:', error);
    console.error('에러 상세:', error.message);
    if (error.code === 'P2002') {
      console.error('중복 키 에러:', error.meta);
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    console.log('로그인 요청:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('로그인 Validation 에러:', errors.array());
      // Return specific validation errors
      const errorMessages = errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }));
      return res.status(400).json({ 
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: '입력값을 확인해주세요',
        errors: errorMessages 
      });
    }

    const { email, password } = req.body;

    // Check if email is provided
    if (!email) {
      return res.status(400).json({ 
        success: false,
        errorCode: 'EMAIL_REQUIRED',
        message: '이메일을 입력해주세요',
        field: 'email'
      });
    }

    // Check if password is provided
    if (!password) {
      return res.status(400).json({ 
        success: false,
        errorCode: 'PASSWORD_REQUIRED',
        message: '비밀번호를 입력해주세요',
        field: 'password'
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        employee: true,
        company: true
      }
    });

    if (!user) {
      console.error('사용자를 찾을 수 없음:', email);
      return res.status(401).json({ 
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: '등록되지 않은 이메일입니다. 이메일을 확인해주세요.',
        field: 'email'
      });
    }

    // Check password (plain text comparison)
    if (user.password !== password) {
      console.error('비밀번호 불일치:', email);
      return res.status(401).json({ 
        success: false,
        errorCode: 'INVALID_PASSWORD',
        message: '비밀번호가 일치하지 않습니다. 다시 입력해주세요.',
        field: 'password'
      });
    }

    console.log('로그인 성공:', { userId: user.id, email: user.email });

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: user.employee,
        company: user.company,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('로그인 서버 에러:', error);
    console.error('에러 상세:', error.message);
    res.status(500).json({ 
      success: false,
      errorCode: 'SERVER_ERROR',
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        employee: true,
        company: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error getting profile' });
  }
};

module.exports = {
  register,
  login,
  getProfile
};