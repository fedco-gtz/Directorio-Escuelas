import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { firebaseConfig } from './firebaseConfig.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
    getFirestore, doc, getDoc, collection, getDocs,
    updateDoc, setDoc, query, where, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const datosDiv = document.getElementById('datosUsuario');
const tablaBody = document.getElementById('tablaColegios');
const filtroNivel = document.getElementById('filtroNivel');

const modal = document.getElementById('descripcionModal');
const telefonoInput = document.getElementById('telefonoInput');
const emailInput = document.getElementById('emailInput');
const colectivosInput = document.getElementById('colectivosInput');
const guardarDescripcionBtn = document.getElementById('guardarDescripcionBtn');
const cancelarDescripcionBtn = document.getElementById('cancelarDescripcionBtn');
const popup = document.getElementById('popup');

let colegioIdActual = null;

let cacheDescripciones = new Map();
let cacheColegios = [];

document.getElementById('btnUsuario').addEventListener('click', () => {
    window.location.href = 'usuario.html';
});

filtroNivel.addEventListener('change', () => cargarColegios(filtroNivel.value));

async function abrirModalDescripcion(id) {
    colegioIdActual = id;
    const datos = cacheDescripciones.get(id) || {};
    telefonoInput.value = datos.telefono || '';
    emailInput.value = datos.email || '';
    colectivosInput.value = datos.colectivos || '';
    modal.style.display = 'flex';
}

cancelarDescripcionBtn.addEventListener('click', () => modal.style.display = 'none');

guardarDescripcionBtn.addEventListener('click', async () => {
    if (!colegioIdActual) return;

    const descripcion = {
        telefono: telefonoInput.value.trim() || 'SIN DATOS',
        email: emailInput.value.trim() || 'SIN DATOS',
        colectivos: colectivosInput.value.trim() || 'SIN DATOS'
    };

    try {
        await setDoc(doc(db, 'escuelas_descripciones', colegioIdActual), descripcion);
        cacheDescripciones.set(colegioIdActual, descripcion);
        mostrarPopup('DESCRIPCIÓN GUARDADA CORRECTAMENTE');
    } catch (error) {
        console.error(error);
        mostrarPopup('ERROR AL GUARDAR LA DESCRIPCIÓN');
    }

    modal.style.display = 'none';
    cargarColegios(filtroNivel.value);
});

async function cargarColegios(nivelFiltro = '') {
    tablaBody.innerHTML = '';

    try {
        if (cacheColegios.length === 0) {
            const q = query(collection(db, 'escuelas'), orderBy('nombre'));
            const snapshot = await getDocs(q);
            cacheColegios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (cacheDescripciones.size === 0) {
            const descSnapshot = await getDocs(collection(db, 'escuelas_descripciones'));
            descSnapshot.docs.forEach(d => cacheDescripciones.set(d.id, d.data()));
        }

        const colegiosFiltrados = nivelFiltro
            ? cacheColegios.filter(c => c.nivel === nivelFiltro)
            : cacheColegios;

        colegiosFiltrados.forEach(c => {
            const tr = document.createElement('tr');
            const tieneDesc = cacheDescripciones.has(c.id);

            tr.innerHTML = `
                <td><input value="${c.nombre || ''}" /></td>
                <td><input value="${c.nivel || ''}" /></td>
                <td><input value="${c.direccion || ''}" /></td>
                <td><input value="${c.barrio || ''}" /></td>
                <td>
                  <select>
                    <option value="" disabled ${!c.desfavorabilidad ? 'selected' : ''}>Seleccionar desfavorabilidad</option>
                    <option value="SI" ${c.desfavorabilidad === "SI" ? "selected" : ""}>SI</option>
                    <option value="NO" ${c.desfavorabilidad === "NO" ? "selected" : ""}>NO</option>
                  </select>
                </td>
                <td>
                  <select>
                    <option value="" disabled ${!c.jornadaCompleta ? 'selected' : ''}>Seleccionar jornada</option>
                    <option value="SI" ${c.jornadaCompleta === "SI" ? "selected" : ""}>COMPLETA</option>
                    <option value="NI" ${c.jornadaCompleta === "NI" ? "selected" : ""}>EXTENDIDA</option>
                    <option value="NO" ${c.jornadaCompleta === "NO" ? "selected" : ""}>NINGUNA</option>
                    <option value="NE" ${c.jornadaCompleta === "NE" ? "selected" : ""}>MUNICIPAL</option>
                  </select>
                </td>
                <td><input value="${c.lat || ''}" type="number" step="any" /></td>
                <td><input value="${c.lng || ''}" type="number" step="any" /></td>
                <td>
                    <button data-id="${c.id}" class="guardarBtn">Guardar</button>
                    <button data-id="${c.id}" class="descripcionBtn">
                        Descripción ${tieneDesc ? '✅' : '❌'}
                    </button>
                </td>
            `;

            tr.querySelector('.guardarBtn').addEventListener('click', async () => {
                const inputs = tr.querySelectorAll('input, select');
                await updateDoc(doc(db, 'escuelas', c.id), {
                    nombre: inputs[0].value,
                    nivel: inputs[1].value,
                    direccion: inputs[2].value,
                    barrio: inputs[3].value,
                    desfavorabilidad: inputs[4].value,
                    jornadaCompleta: inputs[5].value,
                    lat: parseFloat(inputs[6].value),
                    lng: parseFloat(inputs[7].value),
                });

                const index = cacheColegios.findIndex(item => item.id === c.id);
                if (index >= 0) cacheColegios[index] = { id: c.id, ...cacheColegios[index], nombre: inputs[0].value, nivel: inputs[1].value, direccion: inputs[2].value, barrio: inputs[3].value, desfavorabilidad: inputs[4].value, jornadaCompleta: inputs[5].value, lat: parseFloat(inputs[6].value), lng: parseFloat(inputs[7].value) };
                
                mostrarPopup('COLEGIO ACTUALIZADO CORRECTAMENTE');
            });

            tr.querySelector('.descripcionBtn').addEventListener('click', () => abrirModalDescripcion(c.id));

            tablaBody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
    }
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
    cargarColegios();
});

function mostrarPopup(mensaje, duracion = 3000) {
  popup.textContent = mensaje;
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), duracion);
}