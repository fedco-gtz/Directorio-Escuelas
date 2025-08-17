import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { firebaseConfig } from './firebaseConfig.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const errorDiv = document.getElementById('errorMsg');
const modalRegistro = document.getElementById('modalRegistro');
const abrirRegistro = document.getElementById('abrirRegistro');
const cerrarRegistro = document.getElementById('cerrarRegistro');

abrirRegistro.addEventListener('click', () => modalRegistro.style.display = 'flex');
cerrarRegistro.addEventListener('click', () => modalRegistro.style.display = 'none');
window.addEventListener('click', e => { if (e.target === modalRegistro) modalRegistro.style.display = 'none'; });

async function iniciarSesion(email, password) {
  errorDiv.textContent = '';
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    const userDoc = await getDoc(doc(db, 'usuarios', user.uid));

    if (!userDoc.exists()) {
      errorDiv.textContent = 'Usuario no autorizado para ingresar.';
      await signOut(auth);
      return;
    }

    const rol = Number(userDoc.data().rol);
    const rutas = { 1: 'usuario.html', 2: 'perfil.html', 3: 'super.html' };

    if (rutas[rol]) {
      window.location.href = rutas[rol];
    } else {
      errorDiv.textContent = 'Rol de usuario no reconocido.';
      await signOut(auth);
    }
  } catch (error) {
    errorDiv.textContent = 'Error al iniciar sesión: ' + error.message;
  }
}

async function registrarUsuario(nombre, email, password) {
  errorDiv.textContent = '';
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "usuarios", user.uid), {
      nombre,
      email,
      uidAuth: user.uid,
      rol: 1
    });

    alert('Usuario registrado con éxito');
    modalRegistro.style.display = 'none';
  } catch (error) {
    errorDiv.textContent = 'Error al registrarse: ' + error.message;
  }
}

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const { email, password } = e.target;
  iniciarSesion(email.value, password.value);
});

document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const { nombre, regEmail, regPassword } = e.target;
  registrarUsuario(nombre.value, regEmail.value, regPassword.value);
});
