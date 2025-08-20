import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { firebaseConfig } from './firebaseConfig.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const datosDiv = document.getElementById('datosUsuario');
const form = document.getElementById('formAgregarColegio');
const contenedorEstadisticas = document.getElementById('estadisticasColegios');
const btnUsuario = document.getElementById('btnUsuario');
const popup = document.getElementById('popup');

let cacheEscuelas = null;

function deleteCookie(name) {
    const d = new Date();
    d.setTime(d.getTime() - 1);
    const expires = "expires=" + d.toUTCString();
    document.cookie = `${name}=; ${expires}; path=/`;
    if (location.hostname) {
        document.cookie = `${name}=; ${expires}; path=/; domain=${location.hostname}`;
    }
}

btnUsuario.addEventListener('click', () => {
  window.location.href = 'usuario.html';
});

async function mostrarEstadisticas() {
  contenedorEstadisticas.innerHTML = 'Cargando estadísticas...';

  const niveles = [
    'Inicial', 'Primaria', 'Secundaria', 'Técnica', 'Especial',
    'Primaria Adultos', 'Secundaria Adultos', 'Centro Profesional', 'Educación Superior', 'Centros Complementarios', 'Otros'
  ];

  if (!cacheEscuelas) {
    const snapshot = await getDocs(collection(db, 'escuelas'));
    cacheEscuelas = snapshot.docs.map(doc => doc.data());
  }

  const cards = niveles.map(nivel => {
    const count = cacheEscuelas.filter(e => e.nivel === nivel).length;
    return `
      <div class="card-nivel" style="border:1px solid #ccc; padding:10px; width:130px; text-align:center;">
        <h3>${nivel}</h3>
        <p><strong>${count}</strong> colegios</p>
      </div>
    `;
  });

  contenedorEstadisticas.innerHTML = cards.join('');
}

form.addEventListener('submit', async e => {
  e.preventDefault();

  const nombre = form.nombre.value.trim();
  const nivel = form.nivel.value;
  const direccion = form.direccion.value.trim();
  const barrio = form.barrio.value.trim();
  const desfavorabilidad = form.desfavorabilidad.value;
  const lat = parseFloat(form.lat.value);
  const lng = parseFloat(form.lng.value);

  if (!nombre || !nivel || !direccion || !barrio || isNaN(lat) || isNaN(lng) || !desfavorabilidad) {
    return mostrarPopup('Completa todos los campos correctamente');
  }

  try {
    const nuevoColegio = { nombre, nivel, direccion, barrio, lat, lng, desfavorabilidad, creadoPor: auth.currentUser.uid, creadoEn: new Date() };
    await addDoc(collection(db, 'escuelas'), nuevoColegio);

    if (cacheEscuelas) cacheEscuelas.push(nuevoColegio);

    mostrarPopup('COLEGIO AGREGADO CON ÉXITO');
    form.reset();
    mostrarEstadisticas();
  } catch (error) {
    console.error(error);
    mostrarPopup('ERROR AL AGREGAR COLEGIO');
  }
});

function mostrarPopup(mensaje, duracion = 3000) {
  popup.textContent = mensaje;
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), duracion);
}

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = 'login.html';

  const docRef = doc(db, 'usuarios', user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    datosDiv.textContent = 'No se encontraron datos del usuario.';
    return;
  }

  const data = docSnap.data();
  datosDiv.innerHTML = `<p><strong>${data.nombre || ''}</strong></p>`;

  await mostrarEstadisticas();
});

document.addEventListener("DOMContentLoaded", () => {
    const btnCerrar = document.getElementById("cerrarSesion");
    if (btnCerrar) {
        btnCerrar.addEventListener("click", async () => {
            try {
                await signOut(auth);
                deleteCookie("sesionActiva");
                window.location.href = "index.html";
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
            }
        });
    }
});
