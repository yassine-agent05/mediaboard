import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    setDoc,
    doc,
    query, 
    where, 
    onSnapshot, 
    serverTimestamp,
    getDocs,
    orderBy 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbswHQg6ZGGf3eiug4FqaykQITgjgB4Nw",
  authDomain: "mediaboard-1a38c.firebaseapp.com",
  projectId: "mediaboard-1a38c",
  storageBucket: "mediaboard-1a38c.firebasestorage.app",
  messagingSenderId: "850745280366",
  appId: "1:850745280366:web:fe616b876e5735ae43237f"
};

const DEV_MODE = true; 
const ADMIN_EMAIL = 'admin@mediaboard.com';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authForm = document.getElementById('auth-form');
const contentForm = document.getElementById('content-form');
const itemsContainer = document.getElementById('items-container');
const toggleAuth = document.getElementById('toggle-auth');
const logoutBtn = document.getElementById('logout-btn');
const authMessage = document.getElementById('auth-message');
const contentMessage = document.getElementById('content-message');
const forgotPasswordLink = document.getElementById('forgot-password');
const resendVerificationLink = document.getElementById('resend-verification');

const usersTableBody = document.getElementById('users-table-body');
const adminMessage = document.getElementById('admin-message');
const adminEmptyState = document.getElementById('admin-empty-state');

let isLoginMode = true;

const showMessage = (element, text, type = 'error') => {
    if (!element) return;
    element.textContent = text;
    element.className = `message ${type}`;
    element.classList.remove('hidden');
    setTimeout(() => element.classList.add('hidden'), 5000);
};

const updateAuthUI = () => {
    if (!authForm) return;
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const button = document.getElementById('auth-button');
    const switchLink = document.getElementById('switch-text');

    if (isLoginMode) {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Login to manage your media board.';
        button.textContent = 'Login';
        switchLink.textContent = "Don't have an account? ";
        toggleAuth.textContent = 'Register';
        if (forgotPasswordLink) forgotPasswordLink.classList.remove('hidden');
        if (resendVerificationLink) resendVerificationLink.classList.add('hidden');
    } else {
        title.textContent = 'Create Account';
        subtitle.textContent = 'Start your own media board today.';
        button.textContent = 'Register';
        switchLink.textContent = "Already have an account? ";
        toggleAuth.textContent = 'Login';
        if (forgotPasswordLink) forgotPasswordLink.classList.add('hidden');
        if (resendVerificationLink) resendVerificationLink.classList.add('hidden');
    }
};

if (toggleAuth) {
    toggleAuth.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        updateAuthUI();
    });
}

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            if (isLoginMode) {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                if (!DEV_MODE && !user.emailVerified) {
                    await signOut(auth);
                    showMessage(authMessage, "Please verify your email before logging in.", "error");
                    if (resendVerificationLink) {
                        resendVerificationLink.dataset.email = email;
                        resendVerificationLink.dataset.password = password;
                        resendVerificationLink.classList.remove('hidden');
                    }
                    return;
                }

                if (user.email === ADMIN_EMAIL) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }

            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await sendEmailVerification(user);
                showMessage(authMessage, "✅ Verification email sent! Please check your inbox.", "success");
                await signOut(auth);

                isLoginMode = true;
                updateAuthUI();
            }
        } catch (error) {
            console.error("Auth Error:", error);
            let message = error.message;
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = "Invalid email or password.";
            }
            showMessage(authMessage, message);
        }
    });
}

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        const email = emailInput ? emailInput.value.trim() : '';

        if (!email) {
            showMessage(authMessage, "Please enter your email address first.", "error");
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            showMessage(authMessage, `✅ Reset link sent to ${email}.`, "success");
        } catch (error) {
            console.error("Password Reset Error:", error);
            showMessage(authMessage, "Failed to send reset email.");
        }
    });
}

if (resendVerificationLink) {
    resendVerificationLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = resendVerificationLink.dataset.email;
        const password = resendVerificationLink.dataset.password;

        if (!email || !password) {
            showMessage(authMessage, "Please login again to resend.", "error");
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user);
            await signOut(auth);
            showMessage(authMessage, "✅ Verification email resent!", "success");
        } catch (error) {
            console.error("Resend Verification Error:", error);
            showMessage(authMessage, "Failed to resend.");
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Logout Error:", error);
        }
    });
}

onAuthStateChanged(auth, async (user) => {
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const isAdmin = window.location.pathname.includes('admin.html');
    const isIndex = window.location.pathname.includes('index.html') || window.location.pathname === '/';

    if (user && (DEV_MODE || user.emailVerified)) {
        try {
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                uid: user.uid,
                lastLogin: serverTimestamp(),
                createdAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error("User tracking failed. Did you deploy firestore.rules?", e);
        }

        if (user.email === ADMIN_EMAIL) {
            if (!isAdmin) window.location.href = 'admin.html';
            document.getElementById('admin-body')?.classList.remove('hidden');
            loadAllUsers();
        } else {
            if (isIndex || isAdmin) window.location.href = 'dashboard.html';
            if (isDashboard) {
                document.getElementById('dashboard-body')?.classList.remove('hidden');
                document.getElementById('user-email').textContent = user.email;
                loadUserContent(user.uid);
            }
        }
    } else {
        if (isDashboard || isAdmin) {
            window.location.href = 'index.html';
        }
    }
});

const loadUserContent = (uid) => {
    if (!itemsContainer) return;

    const contentQuery = query(
        collection(db, "content"), 
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
    );

    onSnapshot(contentQuery, (snapshot) => {
        itemsContainer.innerHTML = '';
        if (snapshot.empty) {
            itemsContainer.innerHTML = '<div class="empty-state">No content found. Add your first item above!</div>';
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'content-item';
            item.innerHTML = `
                <h3>${escapeHtml(data.title)}</h3>
                <p>${escapeHtml(data.description)}</p>
            `;
            itemsContainer.appendChild(item);
        });
    }, (error) => {
        console.error("Firestore Read Error:", error);
        if (error.code === "failed-precondition") {
            showMessage(contentMessage, "Firestore is still building the required index.", "error");
        } else {
            showMessage(contentMessage, "Error loading content.", "error");
        }
    });
};

if (contentForm) {
    contentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;

        try {
            await addDoc(collection(db, "content"), {
                title: title,
                description: description,
                userId: user.uid,
                createdAt: serverTimestamp()
            });
            contentForm.reset();
            showMessage(contentMessage, "Content added successfully!", "success");
        } catch (error) {
            console.error("Firestore Write Error:", error);
            showMessage(contentMessage, "Error adding content: " + error.message);
        }
    });
}

const loadAllUsers = async () => {
    if (!usersTableBody) return;

    try {
        const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
        onSnapshot(usersQuery, (snapshot) => {
            usersTableBody.innerHTML = '';
            
            if (snapshot.empty) {
                adminEmptyState?.classList.remove('hidden');
                return;
            } else {
                adminEmptyState?.classList.add('hidden');
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                const row = document.createElement('tr');
                const date = data.createdAt?.toDate() ? data.createdAt.toDate().toLocaleString() : 'Just now';
                
                row.innerHTML = `
                    <td>${escapeHtml(data.email)}</td>
                    <td>${escapeHtml(data.uid)}</td>
                    <td>${date}</td>
                `;
                usersTableBody.appendChild(row);
            });
        });
    } catch (error) {
        console.error("Admin Fetch Error:", error);
        showMessage(adminMessage, "Error fetching user list. " + error.message);
    }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}