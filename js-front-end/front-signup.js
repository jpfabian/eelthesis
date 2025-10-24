let selectedRole = null;

        document.addEventListener('DOMContentLoaded', function() {
            const roleCards = document.querySelectorAll('.role-card-small');
            const roleContinueBtn = document.getElementById('role-continue-btn');
            const signupForm = document.getElementById('signup-form');
            const passwordInput = document.getElementById('password');

            // Handle role selection
            roleCards.forEach(card => {
                card.addEventListener('click', function() {
                    roleCards.forEach(c => c.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedRole = this.dataset.role;
                    roleContinueBtn.disabled = false;
                });
            });

            // Handle continue
            roleContinueBtn.addEventListener('click', function() {
                if (selectedRole) {
                    showRegistrationStep();
                }
            });

            // Submit form
            signupForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = new FormData(this);
                const fname = formData.get('fname');
                const lname = formData.get('lname');
                const email = formData.get('email');
                const password = formData.get('password');
                const confirmPassword = formData.get('confirm-password');

                if (!validateSignupForm(fname, lname, email, password, confirmPassword)) return;

                await registerUser(fname, lname, email, password, selectedRole);
            });

            // Password strength
            passwordInput.addEventListener('input', function() {
                checkPasswordStrength(this.value);
            });

            lucide.createIcons({ icons: lucide.icons });
        });

        function showRegistrationStep() {
            document.getElementById('role-step').classList.add('hidden');
            document.getElementById('registration-step').classList.remove('hidden');
        }

        function showRoleStep() {
            document.getElementById('registration-step').classList.add('hidden');
            document.getElementById('role-step').classList.remove('hidden');
        }

        async function registerUser(fname, lname, email, password, role) {
            try {
                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fname, lname, email, password, role }) // send both separately
                });

                const data = await response.json();
                if (response.ok) {
                    Swal.fire({
                        title: "Success!",
                        text: "Account created successfully",
                        icon: "success",
                        confirmButtonColor: "#3085d6"
                    }).then(() => {
                        window.location.href = "login.html";
                    });
                } else {
                    showNotification(data.error || "Signup failed", "error");
                }
            } catch (err) {
                console.error(err);
                showNotification("❌ Connection error.", "error");
            }
        }


        function showNotification(message, type = "info") {
            Swal.fire({
                text: message,
                icon: type, // "success" | "error" | "warning" | "info" | "question"
                confirmButtonColor: "#3085d6",
                confirmButtonText: "OK"
            });
        }

            // Email validator
        function isValidEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        function validateSignupForm(fname, lname, email, password, confirmPassword) {
            if (!fname || fname.trim().length < 1) {
                showNotification('Please enter a valid first name', 'error');
                return false;
            }

            if (!lname || lname.trim().length < 1) {
                showNotification('Please enter a valid last name', 'error');
                return false;
            }

            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return false;
            }

            if (password.length < 6) {
                showNotification('Password must be at least 6 characters long', 'error');
                return false;
            }

            if (password !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return false;
            }

            return true;
        }


        function checkPasswordStrength(password) {
            const strengthContainer = document.getElementById('password-strength');
            let score = 0;
            let feedback = [];

            if (password.length >= 8) score++;
            else feedback.push('At least 8 characters');

            if (/[a-z]/.test(password)) score++;
            else feedback.push('Lowercase letter');

            if (/[A-Z]/.test(password)) score++;
            else feedback.push('Uppercase letter');

            if (/[0-9]/.test(password)) score++;
            else feedback.push('Number');

            if (/[^A-Za-z0-9]/.test(password)) score++;
            else feedback.push('Special character');

            let strength = '';
            let color = '';

            if (score <= 2) {
                strength = 'Weak';
                color = 'var(--destructive)';
            } else if (score <= 3) {
                strength = 'Medium';
                color = '#f59e0b';
            } else {
                strength = 'Strong';
                color = 'var(--secondary)';
            }

            strengthContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                    <div style="flex: 1; height: 0.25rem; background: var(--border); border-radius: 0.125rem;">
                        <div style="width: ${(score / 5) * 100}%; height: 100%; background: ${color}; border-radius: 0.125rem; transition: all 0.3s;"></div>
                    </div>
                    <span style="font-size: 0.75rem; color: ${color};">${strength}</span>
                </div>
                ${feedback.length > 0 ? `<p style="font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.25rem;">Add: ${feedback.join(', ')}</p>` : ''}
            `;
        }

        function togglePassword(inputId) {
            const passwordInput = document.getElementById(inputId);
            const passwordIcon = document.getElementById(inputId + '-icon');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordIcon.setAttribute('data-lucide', 'eye');
            } else {
                passwordInput.type = 'password';
                passwordIcon.setAttribute('data-lucide', 'eye-off');
            }
            
            lucide.createIcons({ icons: lucide.icons });
        }

        function showLoading() {
            document.getElementById('loading-screen').classList.remove('hidden');
        }

        function hideLoading() {
            document.getElementById('loading-screen').classList.add('hidden');
        }