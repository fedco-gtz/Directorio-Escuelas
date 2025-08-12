import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { firebaseConfig } from './firebaseConfig.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    card.innerHTML = `<strong>${e.nombre}</strong><div class="meta">${e.nivel} · ${e.barrio || e.direccion || ''}</div>`;
    lista.appendChild(card);

    if (e.lat && e.lng) {
      const marker = L.marker([e.lat, e.lng]).bindPopup(`<strong>${e.nombre}</strong><br>${e.direccion || ''}`);
      markers.addLayer(marker);
    }
  });
}

async function obtenerEscuelas() {
  const col = collection(db, 'escuelas');
  const snapshot = await getDocs(col);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function buscarEscuelas() {
  const texto = qInput.value.trim().toLowerCase();
  const nivel = filtroNivel.value;

  let datos = await obtenerEscuelas();

  let resultados = datos.filter(e => {
    let coincideTexto = true;
    if (texto) {
      coincideTexto =
        (e.nombre && e.nombre.toLowerCase().includes(texto)) ||
        (e.barrio && e.barrio.toLowerCase().includes(texto)) ||
        (e.direccion && e.direccion.toLowerCase().includes(texto));
    }
    let coincideNivel = !nivel || e.nivel === nivel;
    return coincideTexto && coincideNivel;
  });

  renderizar(resultados);
}

btnBuscar.addEventListener('click', buscarEscuelas);

(async () => {
  const datos = await obtenerEscuelas();
  renderizar(datos);
})();

async function cargarColegios() {
  const colegiosCol = collection(db, 'colegios');
  const snapshot = await getDocs(colegiosCol);

  let contador = 1;
  snapshot.forEach(doc => {
    const data = doc.data();
    const iconoNumero = L.divIcon({
      className: 'numero-colegio',
      html: `<div style="background: #007bff; color: white; border-radius: 50%; width: 25px; height: 25px; display:flex; align-items:center; justify-content:center; font-weight: bold;">${contador}</div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 12],
    });

    if (data.lat && data.lng) {
      L.marker([data.lat, data.lng], { icon: iconoNumero }).addTo(mapa);
      contador++;
    }
  });
}

cargarColegios();