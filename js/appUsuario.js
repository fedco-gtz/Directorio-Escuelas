import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { firebaseConfig } from './firebaseConfig.js';
import { getAuth, onAuthStateChanged, updatePassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const perfilDatos = document.getElementById('perfilDatos');

function deleteCookie(name) {
    const d = new Date();
    d.setTime(d.getTime() - 1);
    const expires = "expires=" + d.toUTCString();
    document.cookie = `${name}=; ${expires}; path=/`;
    if (location.hostname) {
        document.cookie = `${name}=; ${expires}; path=/; domain=${location.hostname}`;
    }
}

const modales = {
    pass: document.getElementById('modalPass'),
    location: document.getElementById('modalLocation'),
    profile: document.getElementById('modalProfile')
};

const botonesAbrir = {
    pass: document.getElementById('btnOpenPass'),
    location: document.getElementById('btnOpenLocation'),
    profile: document.getElementById('btnOpenProfile')
};

const botonesCerrar = {
    pass: document.getElementById('closePass'),
    location: document.getElementById('closeLocation'),
    profile: document.getElementById('closeProfile')
};

Object.keys(botonesAbrir).forEach(key =>
    botonesAbrir[key].addEventListener('click', () => modales[key].classList.add('active'))
);
Object.keys(botonesCerrar).forEach(key =>
    botonesCerrar[key].addEventListener('click', () => modales[key].classList.remove('active'))
);
window.addEventListener('click', e => {
    Object.values(modales).forEach(modal => {
        if (e.target === modal) modal.classList.remove('active');
    });
});

const calcularDistanciaKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

async function obtenerEscuelasCercanas(latUser, lngUser, radioKm = 2) {
    const snapshot = await getDocs(collection(db, 'escuelas'));
    return snapshot.docs
        .map(doc => {
            const d = doc.data();
            if (d.lat != null && d.lng != null) {
                const distancia = calcularDistanciaKm(latUser, lngUser, d.lat, d.lng);
                if (distancia <= radioKm) return { id: doc.id, nombre: d.nombre || 'Sin nombre', direccion: d.direccion || 'Sin dirección', distancia: distancia.toFixed(2) };
            }
        })
        .filter(Boolean);
}

onAuthStateChanged(auth, async user => {
    if (!user) return window.location.href = 'login.html';
    try {
        const docSnap = await getDoc(doc(db, 'usuarios', user.uid));
        if (!docSnap.exists()) return perfilDatos.innerHTML = '<p>No se encontraron datos de usuario.</p>';

        const data = docSnap.data();
        const rolTexto = data.rol === 1 ? 'Usuario' : data.rol === 2 ? 'Administrador' : 'Superadministrador';

        perfilDatos.innerHTML = `
            <p><strong>Nombre:</strong> ${data.nombre}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Rol:</strong> ${rolTexto}</p>
            <p><strong>Dirección:</strong> ${data.direccion || 'No registrada'}</p>
        `;

        ['nombre', 'genero', 'direccion'].forEach(id => { if (data[id]) document.getElementById(id).value = data[id]; });
        if (data.coordenadas) {
            document.getElementById('latitud').value = data.coordenadas.lat;
            document.getElementById('longitud').value = data.coordenadas.lng;

            const escuelas = await obtenerEscuelasCercanas(data.coordenadas.lat, data.coordenadas.lng);
            const html = escuelas.length
                ? `<h3>Escuelas cercanas en un radio de 2 km:</h3><ul>${escuelas.map(e => `<li><strong>${e.nombre}</strong> - ${e.direccion} (${e.distancia} km)</li>`).join('')}</ul>`
                : '<p>No hay escuelas cercanas en un radio de 2 km.</p>';
            perfilDatos.insertAdjacentHTML('beforeend', html);
        }

    } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        perfilDatos.innerHTML = '<p>Error cargando datos de usuario.</p>';
    }
});

document.getElementById('formPassword').addEventListener('submit', async e => {
    e.preventDefault();
    const newPass = document.getElementById('newPassword').value;
    if (!newPass) return alert('Ingresa una nueva contraseña');
    try {
        await updatePassword(auth.currentUser, newPass);
        alert('Contraseña actualizada correctamente');
        e.target.reset();
        modales.pass.classList.remove('active');
    } catch (error) {
        alert('Error al cambiar contraseña: ' + error.message);
    }
});

document.getElementById('formLocation').addEventListener('submit', async e => {
    e.preventDefault();
    const direccion = document.getElementById('direccion').value.trim();
    const lat = parseFloat(document.getElementById('latitud').value);
    const lng = parseFloat(document.getElementById('longitud').value);
    if (!direccion || isNaN(lat) || isNaN(lng)) return alert('Por favor completa todos los campos correctamente.');

    try {
        await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { direccion, coordenadas: { lat, lng } });
        alert('Ubicación actualizada correctamente');
        modales.location.classList.remove('active');
        perfilDatos.querySelector('p:nth-child(4)').textContent = `Dirección: ${direccion}`;
        if (data.coordenadas) {
            const escuelas = await obtenerEscuelasCercanas(lat, lng);
            perfilDatos.querySelector('ul')?.remove();
            const html = escuelas.length
                ? `<h3>Escuelas cercanas en un radio de 2 km:</h3><ul>${escuelas.map(e => `<li><strong>${e.nombre}</strong> - ${e.direccion} (${e.distancia} km)</li>`).join('')}</ul>`
                : '<p>No hay escuelas cercanas en un radio de 2 km.</p>';
            perfilDatos.insertAdjacentHTML('beforeend', html);
        }
    } catch (error) {
        alert('Error al actualizar ubicación: ' + error.message);
    }
});

document.getElementById('formProfile').addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const genero = document.getElementById('genero').value;
    if (!nombre || !genero) return alert('Por favor completa todos los campos.');

    try {
        await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { nombre, genero });
        alert('Datos actualizados correctamente');
        modales.profile.classList.remove('active');
        perfilDatos.querySelector('p:nth-child(1)').innerHTML = `<strong>Nombre:</strong> ${nombre}`;
    } catch (error) {
        alert('Error al actualizar datos: ' + error.message);
    }
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