# 🚀 EEL Platform - Quick Setup Guide

## 📋 **How to Run the HTML/CSS/JS Version**

### **Option 1: Simple File Opening (Easiest)**
1. **Navigate** to the `/public` folder in your file explorer
2. **Double-click** on `test-demo.html` to open in your browser
3. **Click "Demo Teacher"** or **"Demo Student"** for instant access
4. **Or use sample accounts** from the buttons provided

### **Option 2: Direct Access**
1. **Open** `/public/index.html` in your browser
2. **Choose your login method**:
   - Click **"Demo Teacher"** or **"Demo Student"** (no registration needed)
   - Use **sample accounts** (auto-filled when clicked)
   - **Create new account** with the signup form

### **Option 3: Local Server (Best)**
If you want to run it properly:
```bash
# Option A: Python
cd /public
python -m http.server 8000

# Option B: Node.js
cd /public  
npx serve .

# Option C: VS Code Live Server
# Install Live Server extension, right-click index.html → "Open with Live Server"
```

## 🎯 **Demo Accounts Ready to Use**

### **🔥 INSTANT DEMO ACCESS (No Registration)**
- **Demo Teacher**: Sarah Johnson
- **Demo Student**: Alex Smith

### **📝 SAMPLE ACCOUNTS (Pre-created)**
**Teachers:**
- 📧 `emily.wilson@school.edu` | 🔑 `teacher123`
- 📧 `michael.davis@school.edu` | 🔑 `teacher456`

**Students:**
- 📧 `jessica.taylor@student.edu` | 🔑 `student123`
- 📧 `ryan.chen@student.edu` | 🔑 `student456`
- 📧 `maria.rodriguez@student.edu` | 🔑 `student789`

## 📁 **Key Files Structure**

```
/public/
├── test-demo.html          ⭐ START HERE - Quick demo access
├── index.html              🏠 Login/Signup page  
├── dashboard.html          📊 Role-aware dashboard
├── reading-lessons.html    📚 Teacher: Create lessons
├── reading-practice.html   📖 Student: Practice reading
├── pronunciation-*.html    🗣️ Pronunciation features
├── quiz-*.html            📝 Quiz system
├── spelling-*.html        ✏️ Spelling practice
├── recitation.html        🎭 Interactive sessions
├── my-progress.html       📈 Student progress
├── student-progress.html  👥 Teacher analytics
├── settings.html          ⚙️ Settings
├── css/styles.css         🎨 Complete styling
└── js/
    ├── auth.js            🔐 Authentication + Demo accounts
    └── navigation.js      🧭 Page navigation
```

## ⚡ **Quick Test Steps**

1. **Open** `/public/test-demo.html`
2. **Click** "Demo Teacher" 
3. **Should redirect** to dashboard with teacher interface
4. **Navigate** through different pages using sidebar
5. **Try** "Demo Student" for student experience

## 🔧 **Troubleshooting**

### **"Demo buttons not working"**
- ✅ Check if `js/auth.js` is loaded correctly
- ✅ Open browser console (F12) to see any errors
- ✅ Make sure all files are in `/public` folder

### **"Pages not loading"**
- ✅ Ensure you're opening from `/public` folder
- ✅ Use a local server instead of file:// protocol
- ✅ Check that all HTML files exist

### **"Styling broken"**
- ✅ Verify `css/styles.css` exists and loads
- ✅ Check `<link>` tags in HTML files
- ✅ Clear browser cache (Ctrl+F5)

## 🎨 **Features Included**

### **🏫 Teacher Features:**
- ✅ Dashboard with analytics
- ✅ Create reading lessons
- ✅ Generate AI quizzes  
- ✅ Pronunciation lesson builder
- ✅ Interactive recitation sessions
- ✅ Student progress tracking
- ✅ Spelling quiz creator

### **🎓 Student Features:**
- ✅ Practice reading comprehension
- ✅ Pronunciation exercises
- ✅ Take quizzes and tests
- ✅ Spelling practice
- ✅ Personal progress tracking
- ✅ Learning streak display

### **🔧 System Features:**
- ✅ Demo mode (no backend needed)
- ✅ Sample account system
- ✅ Role-based navigation
- ✅ Responsive design
- ✅ Purple/blue-green theme
- ✅ localStorage persistence

## 💡 **Pro Tips**

1. **Start with `test-demo.html`** - easiest way to test
2. **Demo accounts work offline** - perfect for presentation
3. **All data is mock** - demo mode simulates real functionality
4. **Sample accounts persist** - data saved in localStorage
5. **Fully responsive** - works on mobile and desktop

## 🌟 **Ready to Use!**

The HTML/CSS/JS version is **completely self-contained** and works without any backend setup. Perfect for:

- 🎯 **Demonstrations**
- 🖥️ **Client presentations** 
- 📱 **Mobile testing**
- 🚀 **Quick prototyping**
- 💼 **Portfolio showcase**

**Just open `test-demo.html` and you're ready to go!** 🎉