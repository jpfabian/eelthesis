function isAuthenticated() {
            const token = localStorage.getItem("eel_token");
            const user = localStorage.getItem("eel_user");
            return token && user;
        }

        document.addEventListener('DOMContentLoaded', function() {
            lucide.createIcons({ icons: lucide.icons });
            setupLoginForm();
        });

        function logout() {
            localStorage.removeItem("eel_token");
            localStorage.removeItem("eel_user");
            window.location.href = "login.html";
        }

        function setupLoginForm() {
            // Login form submission
            document.getElementById('login-form').addEventListener('submit', handleLogin);
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

                const response = await fetch((window.API_BASE || "") + "/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();
                hideLoading();

                if (result.success) {
                    localStorage.setItem("eel_token", "real_token");
                    localStorage.setItem("eel_user", JSON.stringify({
                        user_id: result.user.user_id,
                        fname: result.user.fname,
                        lname: result.user.lname,
                        role: result.user.role
                    }));
                    if (result.adminToken) {
                        try { localStorage.setItem("eel_admin_token", result.adminToken); } catch (_) {}
                    }

                    var role = result.user.role;
                    if (role === "admin") {
                        Swal.fire({
                            icon: "success",
                            title: "Welcome Admin!",
                            text: "Signed in successfully.",
                            confirmButtonColor: "#3085d6"
                        }).then(() => {
                            window.location.href = "admin-dashboard.html";
                        });
                    } else if (role === "teacher") {
                        Swal.fire({
                            icon: "success",
                            title: "Welcome Teacher!",
                            text: "Hello, " + result.user.fname + "!",
                            confirmButtonColor: "#3085d6"
                        }).then(() => {
                            window.location.href = "classes.html";
                        });
                    } else if (role === "student") {
                        Swal.fire({
                            icon: "success",
                            title: "Welcome Student!",
                            text: "Hello, " + result.user.fname + "!",
                            confirmButtonColor: "#3085d6"
                        }).then(() => {
                            window.location.href = "classes.html";
                        });
                    } else {
                        window.location.href = "classes.html";
                    }
                } else {
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
            lucide.createIcons({ icons: lucide.icons });
        }