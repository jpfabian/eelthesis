
const DEMO_ACCOUNTS = {
  teacher: {
    id: 'teacher_demo',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@school.edu',
    role: 'teacher',
    isDemo: true,
    avatar: 'SJ'
  },
  student: {
    id: 'student_demo', 
    name: 'Alex Smith',
    email: 'alex.smith@student.edu',
    role: 'student',
    isDemo: true,
    avatar: 'AS'
  }
};

// Sample user accounts for login
const SAMPLE_ACCOUNTS = [
  {
    id: 'teacher_001',
    name: 'Dr. Emily Wilson',
    email: 'emily.wilson@school.edu',
    password: 'teacher123',
    role: 'teacher',
    isDemo: false,
    avatar: 'EW'
  },
  {
    id: 'teacher_002',
    name: 'Michael Davis',
    email: 'michael.davis@school.edu', 
    password: 'teacher456',
    role: 'teacher',
    isDemo: false,
    avatar: 'MD'
  },
  {
    id: 'student_001',
    name: 'Jessica Taylor',
    email: 'jessica.taylor@student.edu',
    password: 'student123',
    role: 'student',
    isDemo: false,
    avatar: 'JT'
  },
  {
    id: 'student_002',
    name: 'Ryan Chen',
    email: 'ryan.chen@student.edu',
    password: 'student456', 
    role: 'student',
    isDemo: false,
    avatar: 'RC'
  },
  {
    id: 'student_003',
    name: 'Maria Rodriguez',
    email: 'maria.rodriguez@student.edu',
    password: 'student789',
    role: 'student', 
    isDemo: false,
    avatar: 'MR'
  }
];


function getAuthData() {
  const token = localStorage.getItem('eel_token');
  const userStr = localStorage.getItem('eel_user');
  
  if (!token || !userStr) {
    return null;
  }
  
  try {
    const user = JSON.parse(userStr);
    return { token, user };
  } catch (error) {
    console.error('Error parsing user data:', error);
    clearAuthData();
    return null;
  }
}

// Store authentication data
function setAuthData(token, user) {
  localStorage.setItem('eel_token', token);
  localStorage.setItem('eel_user', JSON.stringify(user));
}

// Clear authentication data
function clearAuthData() {
  localStorage.removeItem('eel_token');
  localStorage.removeItem('eel_user');
}

function isAuthenticated() {
  const user = localStorage.getItem('eel_user');
  if (!user) return false;
    try {
        const parsed = JSON.parse(user);
        return !!parsed.user_id && !!parsed.role;
    } catch {
        return false;
  }
}

// Get current user
function getCurrentUser() {
  const authData = getAuthData();
  return authData ? authData.user : null;
}

// Get auth token
function getAuthToken() {
  const authData = getAuthData();
  return authData ? authData.token : null;
}

// Demo login function
function loginDemo(role) {
  const demoUser = DEMO_ACCOUNTS[role];
  if (!demoUser) {
    throw new Error('Invalid demo role');
  }

  const token = `demo_token_${role}_${Date.now()}`;
  setAuthData(token, demoUser);
  
  return { success: true, user: demoUser, token };
}

// Login with credentials
function loginWithCredentials(email, password) {
  const user = SAMPLE_ACCOUNTS.find(account => 
    account.email === email && account.password === password
  );

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const token = `token_${user.id}_${Date.now()}`;
  const { password: _, ...userWithoutPassword } = user;
  
  setAuthData(token, userWithoutPassword);
  
  return { success: true, user: userWithoutPassword, token };
}

// Register new user
function registerUser(userData) {
  const { name, email, password, role } = userData;
  
  // Check if email already exists
  const existingUser = SAMPLE_ACCOUNTS.find(account => account.email === email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Create new user
  const newUser = {
    id: `${role}_${Date.now()}`,
    name,
    email,
    password,
    role,
    isDemo: false,
    avatar: name.split(' ').map(n => n[0]).join('').toUpperCase()
  };

  // In a real app, you'd save this to a database
  // For demo purposes, we'll just add to our sample accounts
  SAMPLE_ACCOUNTS.push(newUser);

  const token = `token_${newUser.id}_${Date.now()}`;
  const { password: _, ...userWithoutPassword } = newUser;
  
  setAuthData(token, userWithoutPassword);
  
  return { success: true, user: userWithoutPassword, token };
}

// Get sample accounts for display
function getSampleAccounts() {
  return SAMPLE_ACCOUNTS.map(account => ({
    email: account.email,
    password: account.password,
    role: account.role,
    name: account.name
  }));
}

// Make authenticated API request
async function apiRequest(url, options = {}) {
  const token = getAuthToken();
  const user = getCurrentUser();
  
  // If demo user, return mock responses
  if (user && user.isDemo) {
    return mockApiResponse(url, options);
  }
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    
    // Handle unauthorized responses
    if (response.status === 401) {
      clearAuthData();
      window.location.href = '/';
      return;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Mock API responses for demo accounts
function mockApiResponse(url, options) {
  // Simulate API delay
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ success: true, message: 'Demo mode - data not persisted' });
    }, 300);
  });
}

// Logout user
async function logout() {
  try {
    const user = getCurrentUser();
    if (!user || !user.isDemo) {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearAuthData();
    window.location.href = 'index.html';
  }
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Initialize authentication check on page load
function initAuth() {
  // Only check auth on non-login pages
  const currentPath = window.location.pathname;
  const publicPages = ['/', '/index.html', '/login.html', '/signup.html'];
  const isPublicPage = publicPages.some(page => currentPath.endsWith(page));
  
  if (!isPublicPage) {
    requireAuth();
  }
}