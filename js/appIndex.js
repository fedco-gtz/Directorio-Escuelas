import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { firebaseConfig } from './firebaseConfig.js';
import {
  initializeFirestore,
  enableIndexedDbPersistence,
  getDocs,
  getDoc,
  collection,
  doc,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {});

enableIndexedDbPersistence(db).catch(err => {
  console.warn("Cache local no disponible:", err.code);
});

const qInput = document.getElementById('q');
const filtroNivel = document.getElementById('filtroNivel');
const btnBuscar = document.getElementById('btnBuscar');

const mapa = L.map('map').setView([-34.762, -58.395], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(mapa);
let markers = L.layerGroup().addTo(mapa);

function renderizar(datos) {
  markers.clearLayers();
  const lista = document.getElementById('lista');
  lista.innerHTML = '';

  if (!datos.length) {
    lista.innerHTML = '<div class="meta">No se encontraron escuelas.</div>';
    return;
  }

  datos.forEach(e => {
    const card = document.createElement('div');
    card.className = 'school';

    const desfavHTML = (e.desfavorabilidad?.toUpperCase() === 'SI')
      ? `<strong style="background-color: red; color: white; padding: 3px; border-radius: 5px;">D</strong>` : '';
    const jornacHTML = (e.jornadaCompleta?.toUpperCase() === 'SI')
      ? `<strong style="background-color: green; color: white; padding: 3px; border-radius: 5px;">JC</strong>` : '';
    const jornaeHTML = (e.jornadaCompleta?.toUpperCase() === 'NI')
      ? `<strong style="background-color: grey; color: white; padding: 3px; border-radius: 5px;">JE</strong>` : '';
    const jornamHTML = (e.jornadaCompleta?.toUpperCase() === 'NE')
      ? `<strong style="background-color: orange; color: white; padding: 3px; border-radius: 5px;">M</strong>` : '';

    card.innerHTML = `
      <strong>${e.nombre}</strong> ${desfavHTML} ${jornacHTML} ${jornaeHTML} ${jornamHTML}
      <div class="meta">${e.nivel} · ${e.barrio || e.direccion || ''}</div>
      <button class="btn-descripcion">+</button>
      <div class="descripcion" style="display:none">
        <h1 style="font-size:16px">INFORMACIÓN</h1>
        <strong>Dirección:</strong> ${e.direccion} <br>
        <div class="extra-info">Cargando...</div>
      </div>
    `;

    const btnDescripcion = card.querySelector('.btn-descripcion');
    const descripcionDiv = card.querySelector('.descripcion');
    const extraInfoDiv = descripcionDiv.querySelector('.extra-info');

    btnDescripcion.addEventListener('click', async () => {
      if (descripcionDiv.style.display === 'none') {
        if (!descripcionDiv.dataset.cargado) {
          try {
            const docRef = doc(db, 'escuelas_descripciones', e.id);
            const docSnap = await getDoc(docRef);
            const desc = docSnap.exists() ? docSnap.data() : {};

            extraInfoDiv.innerHTML = `
              <strong>Teléfono:</strong> ${desc.telefono || 'Sin datos'} <br>
              <strong>E-mail:</strong> ${desc.email || 'Sin datos'} <br>
              <strong>Líneas de colectivos:</strong> ${desc.colectivos || 'Sin datos'} <br><br>
              ${e.desfavorabilidad === 'SI' ? `<strong style="background-color: red; color: white; padding: 3px; border-radius: 5px; display: block; text-align: center; margin-bottom: 2px;">DESFAVORABILIDAD</strong>` : ''}
              ${e.jornadaCompleta === 'SI' ? `<strong style="background-color: green; color: white; padding: 3px; border-radius: 5px; display: block; text-align: center;">JORNADA COMPLETA</strong>` : ''}
              ${e.jornadaCompleta === 'NI' ? `<strong style="background-color: grey; color: white; padding: 3px; border-radius: 5px; display: block; text-align: center;">JORNADA EXTENDIDA</strong>` : ''}
              ${e.jornadaCompleta === 'NE' ? `<strong style="background-color: orange; color: white; padding: 3px; border-radius: 5px; display: block; text-align: center;">GESTIÓN MUNICIPAL</strong>` : ''}
            `;
            descripcionDiv.dataset.cargado = 'true';
          } catch (err) {
            extraInfoDiv.innerHTML = 'Error al cargar información';
            console.error(err);
          }
        }

        descripcionDiv.style.display = 'block';
        btnDescripcion.textContent = '-';
      } else {
        descripcionDiv.style.display = 'none';
        btnDescripcion.textContent = '+';
      }
    });

    lista.appendChild(card);

    if (e.lat && e.lng) {
      const marker = L.marker([e.lat, e.lng])
        .bindPopup(`<strong>${e.nombre}</strong><br>${e.direccion || ''}`);
      markers.addLayer(marker);
    }
  });
}

async function obtenerEscuelas(texto, nivel) {
  let ref = collection(db, 'escuelas');
  let q = ref;
  if (nivel) q = query(ref, where("nivel", "==", nivel));

  const snapshot = await getDocs(q);
  let datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (texto) {
    const t = texto.toLowerCase();
    datos = datos.filter(e =>
      (e.nombre && e.nombre.toLowerCase().includes(t)) ||
      (e.barrio && e.barrio.toLowerCase().includes(t)) ||
      (e.direccion && e.direccion.toLowerCase().includes(t))
    );
  }
  return datos;
}

async function buscarEscuelas() {
  const texto = qInput.value.trim().toLowerCase();
  const nivel = filtroNivel.value;
  const datos = await obtenerEscuelas(texto, nivel);
  renderizar(datos);
}

btnBuscar.addEventListener('click', buscarEscuelas);

(async () => {
  const datos = await obtenerEscuelas('', '');
  renderizar(datos);
})();

function getCookie(name) {
  const cname = name + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let c of ca) {
    while (c.charAt(0) === ' ') c = c.substring(1);
    if (c.indexOf(cname) === 0) {
      return c.substring(cname.length, c.length);
    }
  }
  return "";
}

async function verificarSesion() {
  const uid = getCookie("sesionActiva");
  const btnLogin = document.getElementById("btnLogin");
  const btnCuenta = document.getElementById("btnCuenta");

  if (uid) {
    try {
      const userDoc = await getDoc(doc(db, "usuarios", uid));
      if (userDoc.exists()) {
        const rol = Number(userDoc.data().rol);
        const rutas = { 1: "usuario.html", 2: "perfil.html", 3: "super.html" };

        if (btnLogin) btnLogin.style.display = "none";
        if (btnCuenta) {
          btnCuenta.style.display = "block";
          btnCuenta.onclick = () => window.location.href = rutas[rol] || "usuario.html";
        }
      }
    } catch (error) {
      console.error("Error al verificar sesión:", error);
    }
  } else {
    if (btnLogin) {
      btnLogin.style.display = "block";
      btnLogin.textContent = "INICIAR SESIÓN";
      btnLogin.onclick = () => window.location.href = "login.html";
    }
    if (btnCuenta) btnCuenta.style.display = "none";
  }

  const pagina = location.pathname.split("/").pop();
  if (["usuario.html", "perfil.html", "super.html"].includes(pagina) && !uid) {
    window.location.href = "login.html";
  }
}

verificarSesion();
