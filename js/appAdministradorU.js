import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { firebaseConfig } from './firebaseConfig.js';
import {
    getAuth, onAuthStateChanged, signOut, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
    getFirestore, collection, getDocs, updateDoc, doc, deleteDoc, getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// --- Inicialización ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ticketsContainer = document.getElementById('ticketsContainer');

// --- Cerrar sesión ---
document.getElementById('cerrarSesion').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (err) {
        console.error("Error al cerrar sesión:", err);
    }
});

onAuthStateChanged(auth, user => {
    if (!user) return window.location.href = 'login.html';
    cargarTicketsPendientes();
});

const formatFecha = fecha =>
    fecha?.toDate ? fecha.toDate().toLocaleString() : new Date(fecha.seconds * 1000).toLocaleString();

const accionesInfo = {
    eliminarCuenta: 'SOLICTUD DE BAJA DE USUARIO',
    recuperarContraseña: 'SOLICITUD DE RECUPERACIÓN DE CLAVE',
    cambioRol: 'SOLICITUD DE CAMBIO DE ROL',
    datosColegio: 'SOLICITUD PARA AGREGAR, ELIMINAR O MODIFICAR COLEGIO'
};

const actualizarTicket = async (ticketId, cambios) => {
    await updateDoc(doc(db, 'tickets', ticketId), cambios);
    document.getElementById(`ticket-${ticketId}`)?.remove();
};

async function renderTicket(ticket) {
    let nombreUsuario = 'Desconocido';
    let emailUsuario = '';

    try {
        const userDoc = await getDoc(doc(db, 'usuarios', ticket.usuarioUID));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            nombreUsuario = (userData.nombre || 'Sin nombre').toUpperCase();
            emailUsuario = userData.email || '';
        }
    } catch (err) {
        console.error('Error obteniendo usuario:', err);
    }

    const ticketHTML = document.createElement('div');
    ticketHTML.className = 'ticketCard';
    ticketHTML.id = `ticket-${ticket.idDoc}`;

    ticketHTML.innerHTML = `
        <p class="fede"><strong>NÚMERO DE SOLICITUD:</strong> ${ticket.id}</p>
        <p><strong>USUARIO:</strong> ${nombreUsuario}</p>
        <p><strong>MOTIVO:</strong> ${accionesInfo[ticket.accion] || 'Desconocido'}</p>
        <p><strong>ESTADO:</strong> ${ticket.estado}</p>
        <p><strong>FECHA:</strong> ${formatFecha(ticket.fecha)}</p>
    `;

    const btnActuar = document.createElement('button');
    btnActuar.textContent = 'TRATAR';
    btnActuar.classList.add('btn-tratar');
    btnActuar.onclick = () => abrirModal(ticket, emailUsuario);
    ticketHTML.appendChild(btnActuar);

    const btnEliminar = document.createElement('button');
    btnEliminar.textContent = 'ELIMINAR TICKET';
    btnEliminar.classList.add('btn-tratar');
    btnEliminar.onclick = async () => {
        await deleteDoc(doc(db, 'tickets', ticket.idDoc));
        ticketHTML.remove();
    };
    ticketHTML.appendChild(btnEliminar);

    ticketsContainer.appendChild(ticketHTML);
}

async function cargarTicketsPendientes() {
    try {
        const snapshot = await getDocs(collection(db, 'tickets'));
        const pendientes = snapshot.docs
            .map(d => ({ idDoc: d.id, ...d.data() }))
            .filter(t => t.estado.toUpperCase() === 'PENDIENTE DE RESOLUCION');

        if (!pendientes.length) {
            ticketsContainer.innerHTML = '<p>No hay tickets pendientes de resolución.</p>';
            return;
        }

        ticketsContainer.innerHTML = '';
        for (let ticket of pendientes) await renderTicket(ticket);

    } catch (err) {
        console.error("Error cargando tickets:", err);
        ticketsContainer.innerHTML = '<p>Error al cargar los tickets.</p>';
    }
}

function abrirModal(ticket, emailUsuario) {
    const modales = {
        eliminarCuenta: 'modalEliminarCuenta',
        recuperarContraseña: 'modalRecuperar',
        cambioRol: 'modalCambioRol'
    };

    const modalId = modales[ticket.accion];
    if (!modalId) return alert('Acción desconocida');

    const modal = document.getElementById(modalId);
    modal.classList.add('active');

    modal.querySelectorAll('.cerrar').forEach(btn =>
        btn.onclick = () => modal.classList.remove('active')
    );

    const acciones = {
        modalEliminarCuenta: async () => {
            await deleteDoc(doc(db, 'usuarios', ticket.usuarioUID));
            await actualizarTicket(ticket.idDoc, { estado: 'RESUELTO' });
            modal.classList.remove('active');
        },
        modalRecuperar: async () => {
            await sendPasswordResetEmail(auth, emailUsuario);
            await actualizarTicket(ticket.idDoc, { estado: 'RESUELTO' });
            modal.classList.remove('active');
        },
        modalCambioRol: async () => {
            const nuevoRol = parseInt(document.getElementById('nuevoRol').value);
            if (!nuevoRol) return alert('Selecciona un rol válido');
            await updateDoc(doc(db, 'usuarios', ticket.usuarioUID), { rol: nuevoRol });
            await actualizarTicket(ticket.idDoc, { estado: 'RESUELTO' });
            modal.classList.remove('active');
        }
    };

    const confirmBtn = modal.querySelector('button[id^="confirm"]');
    if (confirmBtn) confirmBtn.onclick = acciones[modalId];
}
