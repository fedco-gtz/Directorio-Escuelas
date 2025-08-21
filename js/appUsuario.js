import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { firebaseConfig } from './firebaseConfig.js';
import {
    getAuth, onAuthStateChanged, updatePassword, signOut, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
    getFirestore, doc, getDoc, updateDoc, collection, getDocs, setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const perfilDatos = document.getElementById('perfilDatos');

function deleteCookie(name) {
    const d = new Date();
    d.setTime(d.getTime() - 1);
    document.cookie = `${name}=; expires=${d.toUTCString()}; path=/`;
    if (location.hostname) document.cookie = `${name}=; expires=${d.toUTCString()}; path=/; domain=${location.hostname}`;
}

const modales = {
    pass: document.getElementById('modalPass'),
    location: document.getElementById('modalLocation'),
    profile: document.getElementById('modalProfile'),
    ticket: document.getElementById('modalTicket')
};
const botonesAbrir = {
    pass: document.getElementById('btnOpenPass'),
    location: document.getElementById('btnOpenLocation'),
    profile: document.getElementById('btnOpenProfile'),
    ticket: document.getElementById('btnOpenTicket')
};
const botonesCerrar = {
    pass: document.getElementById('closePass'),
    location: document.getElementById('closeLocation'),
    profile: document.getElementById('closeProfile'),
    ticket: document.getElementById('closeTicket')
};
Object.keys(botonesAbrir).forEach(k => botonesAbrir[k].addEventListener('click', () => modales[k].classList.add('active')));
Object.keys(botonesCerrar).forEach(k => botonesCerrar[k].addEventListener('click', () => modales[k].classList.remove('active')));
window.addEventListener('click', e => Object.values(modales).forEach(m => { if (e.target === m) m.classList.remove('active'); }));

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

    } catch (err) { console.error(err); perfilDatos.innerHTML = '<p>Error cargando datos de usuario.</p>'; }

    actualizarResumenTickets();
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
    } catch (err) {
        alert('Error al cambiar contraseña: ' + err.message);
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
    } catch (err) {
        alert('Error al actualizar datos: ' + err.message);
    }
});

document.getElementById('cerrarSesion').addEventListener('click', async () => {
    try {
        await signOut(auth);
        deleteCookie('sesionActiva');
        window.location.href = 'index.html';
    } catch (err) {
        console.error('Error al cerrar sesión:', err);
    }
});

async function generarIDTicket() {
    const snapshot = await getDocs(collection(db, 'tickets'));
    if (snapshot.empty) return 1;
    const ids = snapshot.docs.map(doc => doc.data().id);
    return Math.max(...ids) + 1;
}

const accionTicket = document.getElementById('accionTicket');
const campoDatosColegio = document.getElementById('campoDatosColegio');
const detalleColegio = document.getElementById('detalleColegio');

accionTicket.addEventListener('change', () => {
    if (accionTicket.value === 'datosColegio') {
        campoDatosColegio.style.display = 'block';
    } else {
        campoDatosColegio.style.display = 'none';
        detalleColegio.value = "";
    }
});

document.getElementById('formTicket').addEventListener('submit', async e => {
    e.preventDefault();
    const accion = accionTicket.value;
    if (!accion) return alert('Selecciona una acción');

    let detalle = "";
    if (accion === "datosColegio") {
        detalle = detalleColegio.value.trim();
        if (!detalle) return alert("Por favor escribe qué deseas agregar, eliminar o modificar del colegio.");
    }

    try {
        const ticketID = await generarIDTicket();
        await setDoc(doc(db, 'tickets', ticketID.toString()), {
            id: ticketID,
            usuarioUID: auth.currentUser.uid,
            accion,
            detalle,
            estado: 'PENDIENTE DE RESOLUCION',
            fecha: new Date()
        });

        if (accion === 'recuperarContraseña') {
            await sendPasswordResetEmail(auth, auth.currentUser.email);
            alert('Ticket generado y correo de recuperación enviado.');
        } else {
            alert('Ticket generado correctamente.');
        }

        modales.ticket.classList.remove('active');
        e.target.reset();
        campoDatosColegio.style.display = 'none';

        actualizarResumenTickets();

    } catch (err) {
        console.error('Error generando ticket:', err);
        alert('Error al generar el ticket: ' + err.message);
    }
});

export async function actualizarResumenTickets() {
    if (!auth.currentUser) return;
    try {
        const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
        const ticketsUsuario = ticketsSnapshot.docs
            .map(doc => doc.data())
            .filter(ticket => ticket.usuarioUID === auth.currentUser.uid);

        const total = ticketsUsuario.length;
        const resueltos = ticketsUsuario.filter(t => t.estado.toUpperCase() === 'RESUELTO').length;
        const pendientes = ticketsUsuario.filter(t => t.estado.toUpperCase() === 'PENDIENTE DE RESOLUCION').length;
        const proceso = ticketsUsuario.filter(t => t.estado.toUpperCase() === 'EN PROCESO DE RESOLUCION').length;

        document.getElementById("totalTickets").textContent = total;
        document.getElementById("ticketsResueltos").textContent = resueltos;
        document.getElementById("ticketsEnProceso").textContent = proceso;
        document.getElementById("ticketsPendientes").textContent = pendientes;
    } catch (err) {
        console.error("Error al actualizar resumen de tickets:", err);
    }
}