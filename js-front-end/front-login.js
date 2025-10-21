function isAuthenticated() {
            const token = localStorage.getItem("eel_token");
            const user = localStorage.getItem("eel_user");
            return token && user;
        }

        document.addEventListener('DOMContentLoaded', function() {
            lucide.createIcons();
            setupLoginForm();
            populateSampleAccounts();
        });

        function logout() {
            localStorage.removeItem("eel_token");
            localStorage.removeItem("eel_user");
            window.location.href = "login.html";
        }


        function populateSampleAccounts() {
            // Sample student at teacher accounts
            const sampleAccounts = {
                teacher: { email: "teacher@example.com", password: "123456" },
                student: { email: "student@example.com", password: "123456" }
            };

            console.log("📌 Sample accounts ready:", sampleAccounts);

            // Optional: pwede mo i-autofill agad para i-demo
            document.getElementById('demo-teacher').addEventListener('click', () => {
                document.getElementById('email').value = sampleAccounts.teacher.email;
                document.getElementById('password').value = sampleAccounts.teacher.password;
            });

            document.getElementById('demo-student').addEventListener('click', () => {
                document.getElementById('email').value = sampleAccounts.student.email;
                document.getElementById('password').value = sampleAccounts.student.password;
            });
        }


        function setupLoginForm() {
            // Login form submission
            document.getElementById('login-form').addEventListener('submit', handleLogin);

            // Demo buttons
            document.getElementById('demo-teacher').addEventListener('click', () => handleDemo('teacher'));
            document.getElementById('demo-student').addEventListener('click', () => handleDemo('student'));
        }

        function fillLoginForm(email, password) {
            document.getElementById('email').value = email;
            document.getElementById('password').value = password;
        }

        async function handleLogin(e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                showLoading();

                const response = await fetch("http://localhost:3000/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();

                hideLoading();

                if (result.success) {
                    // Save session data
                    localStorage.setItem("eel_token", "real_token");
                    localStorage.setItem("eel_user", JSON.stringify({
                        user_id: result.user.user_id,  // ✅ important
                        fname: result.user.fname,
                        lname: result.user.lname,
                        role: result.user.role
                    }));

                    // Role-based SweetAlert
                    if (result.user.role === "teacher") {
                        Swal.fire({
                            icon: "success",
                            title: "Welcome Teacher!",
                            text: `Hello, Teacher ${result.user.lname}!`,
                            confirmButtonColor: "#3085d6"
                        }).then(() => {
                            window.location.href = "classes.html";
                        });
                    } else if (result.user.role === "student") {
                        Swal.fire({
                            icon: "success",
                            title: "Welcome Student!",
                            text: `Hello, ${result.user.lname}!`,
                            confirmButtonColor: "#3085d6"
                        }).then(() => {
                            window.location.href = "classes.html";
                        });
                    }
                }
                else {
                    Swal.fire({
                        icon: "error",
                        title: "Login Failed",
                        text: result.error || "Invalid email or password",
                        confirmButtonColor: "#d33"
                    });
                }
            } catch (error) {
                hideLoading();
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Something went wrong. Try again.",
                    confirmButtonColor: "#d33"
                });
            }
        }

        async function handleDemo(role) {
            try {
                showLoading();
                const result = loginDemo(role);
                
                setTimeout(() => {
                    hideLoading();
                    showNotification(`Welcome to the demo, ${result.user.name}!`, 'success');
                    window.location.href = 'classes.html';
                }, 800);
                
            } catch (error) {
                hideLoading();
                showNotification(error.message, 'error');
            }
        }

        function showLoading() {
            document.getElementById('loading-screen').classList.remove('hidden');
        }

        function hideLoading() {
            document.getElementById('loading-screen').classList.add('hidden');
        }

        // Reusable SweetAlert notification
        function showNotification(message, type = "info") {
            Swal.fire({
                icon: type,
                title: type === "success" ? "Success" : type === "error" ? "Error" : "Notice",
                text: message,
                confirmButtonColor: "#3085d6"
            });
        }

        async function handleLogin(e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                showLoading();

                const response = await fetch("http://localhost:3000/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();
                hideLoading();

                if (result.success) {
                    // ✅ Save full user data including ID
                    localStorage.setItem("eel_token", "real_token");
                    localStorage.setItem("eel_user", JSON.stringify({
                        user_id: result.user.user_id, 
                        fname: result.user.fname,
                        lname: result.user.lname,
                        role: result.user.role
                    }));

                    // Role-based SweetAlert
                    if (result.user.role === "teacher") {
                        Swal.fire({
                            icon: "success",
                            title: "Welcome Teacher!",
                            text: `Hello, Teacher ${result.user.lname}!`,
                            confirmButtonColor: "#3085d6"
                        }).then(() => {
                            window.location.href = "classes.html";
                        });
                    } else if (result.user.role === "student") {
                        Swal.fire({
                            icon: "success",
                            title: "Welcome Student!",
                            text: `Hello, ${result.user.lname}!`,
                            confirmButtonColor: "#3085d6"
                        }).then(() => {
                            window.location.href = "classes.html";
                        });
                    }
                }
                else {
                    Swal.fire({
                        icon: "error",
                        title: "Login Failed",
                        text: result.error || "Invalid email or password",
                        confirmButtonColor: "#d33"
                    });
                }
            } catch (error) {
                hideLoading();
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Something went wrong. Try again.",
                    confirmButtonColor: "#d33"
                });
            }
        }

        function togglePassword() {
            const passwordInput = document.getElementById('password');
            const passwordIcon = document.getElementById('password-icon');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordIcon.setAttribute('data-lucide', 'eye');
            } else {
                passwordInput.type = 'password';
                passwordIcon.setAttribute('data-lucide', 'eye-off');
            }

            // Re-render single icon only
            passwordIcon.innerHTML = "";
            lucide.createIcons();
        }