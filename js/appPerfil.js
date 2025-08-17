import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { firebaseConfig } from './firebaseConfig.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const datosDiv = document.getElementById('datosUsuario');
const form = document.getElementById('formAgregarColegio');
const contenedorEstadisticas = document.getElementById('estadisticasColegios');
const btnUsuario = document.getElementById('btnUsuario');

btnUsuario.addEventListener('click', () => window.location.href = 'usuario.html');

async function mostrarEstadisticas() {
  contenedorEstadisticas.innerHTML = 'Cargando estadísticas...';

  try {
    const snapshot = await getDocs(collection(db, 'escuelas'));

    const nivelesCount = snapshot.docs.reduce((acc, docu) => {
      const nivel = docu.data().nivel || 'Otro';
      acc[nivel] = (acc[nivel] || 0) + 1;
      return acc;
    }, {});

    const niveles = ['Inicial', 'Primaria', 'Secundaria', 'Técnica', 'Especial',
                     'Primaria Adultos', 'Secundaria Adultos', 'Centro Profesional', 'Educación Superior'];

    contenedorEstadisticas.innerHTML = niveles.map(nivel => `
      <div class="card-nivel" style="border:1px solid #ccc; padding:10px; width:130px; text-align:center;">
        <h3>${nivel}</h3>
        <p><strong>${nivelesCount[nivel] || 0}</strong> colegios</p>
      </div>
    `).join('');

  } catch (error) {
    contenedorEstadisticas.innerHTML = '<p>Error cargando estadísticas</p>';
    console.error('Error al cargar estadísticas:', error);
  }
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const docSnap = await getDoc(doc(db, 'usuarios', user.uid));
    if (!docSnap.exists()) {
      datosDiv.textContent = 'No se encontraron datos del usuario.';
      return;
    }

    const data = docSnap.data();
    datosDiv.innerHTML = `<p><strong>${data.nombre || ''}</strong></p>`;
    await mostrarEstadisticas();

  } catch (error) {
    console.error('Error al cargar datos del usuario:', error);
    datosDiv.textContent = 'Error al cargar datos del usuario.';
  }
});

form.addEventListener('submit', async e => {
  e.preventDefault();

  const nombre = form.nombre.value.trim();
  const nivel = form.nivel.value;
  const direccion = form.direccion.value.trim();
  const barrio = form.barrio.value.trim();
  const lat = parseFloat(form.lat.value);
  const lng = parseFloat(form.lng.value);

  if (!nombre || !nivel || !direccion || !barrio || isNaN(lat) || isNaN(lng)) {
    mostrarPopup('Completa todos los campos correctamente');
    return;
  }

  try {
    await addDoc(collection(db, 'escuelas'), {
      nombre, nivel, direccion, barrio, lat, lng,
      creadoPor: auth.currentUser.uid,
      creadoEn: new Date()
    });
    mostrarPopup('Colegio agregado con éxito');
    form.reset();
    mostrarEstadisticas();
  } catch (error) {
    console.error('Error al agregar colegio:', error);
    mostrarPopup('Error al agregar colegio');
  }
});

function mostrarPopup(mensaje, duracion = 3000) {
  const popup = document.getElementById('popup');
  popup.textContent = mensaje;
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), duracion);
}