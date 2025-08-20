import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { firebaseConfig } from './firebaseConfig.js';
import { getFirestore, collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function deleteCookie(name) {
    const d = new Date();
    d.setTime(d.getTime() - 1);
    const expires = "expires=" + d.toUTCString();
    document.cookie = `${name}=; ${expires}; path=/`;
    if (location.hostname) {
        document.cookie = `${name}=; ${expires}; path=/; domain=${location.hostname}`;
    }
}

async function cargarEstadisticas() {
    try {
        const colegiosSnapshot = await getDocs(collection(db, "escuelas"));
        const colegiosCount = colegiosSnapshot.size;
        document.getElementById("colegiosCount").textContent = colegiosCount;

        const localidadesCount = new Map();
        colegiosSnapshot.docs.forEach(docu => {
            const localidad = docu.data().barrio || "Sin localidad";
            localidadesCount.set(localidad, (localidadesCount.get(localidad) || 0) + 1);
        });

        const localidadesLista = document.getElementById("localidades-lista");
        localidadesLista.innerHTML = "";
        Array.from(localidadesCount.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([loc, count]) => {
                const li = document.createElement("li");
                li.textContent = loc;
                const spanCount = document.createElement("span");
                spanCount.textContent = count;
                li.appendChild(spanCount);
                localidadesLista.appendChild(li);
            });

        const visitasDoc = await getDoc(doc(db, "estadisticas", "visitas"));
        document.getElementById("visitasCount").textContent = visitasDoc.exists() ? visitasDoc.data().cantidad || 0 : 0;

        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        const usuarios = usuariosSnapshot.docs.map(doc => doc.data());

        const conteos = {
            total: usuarios.length,
            genero: { M: 0, F: 0, X: 0 },
            rol: { 1: 0, 2: 0, 3: 0 }
        };

        usuarios.forEach(u => {
            if (conteos.genero[u.genero] !== undefined) conteos.genero[u.genero]++;
            if (conteos.rol[u.rol] !== undefined) conteos.rol[u.rol]++;
        });

        document.getElementById("usuariosCount").textContent = conteos.total;
        document.getElementById("usuariosHombres").textContent = conteos.genero.M;
        document.getElementById("usuariosMujeres").textContent = conteos.genero.F;
        document.getElementById("usuariosNoBinario").textContent = conteos.genero.X;
        document.getElementById("usuariosRol1").textContent = conteos.rol[1];
        document.getElementById("usuariosRol2").textContent = conteos.rol[2];
        document.getElementById("usuariosRol3").textContent = conteos.rol[3];

    } catch (error) {
        console.error("Error cargando estadísticas:", error);
        const campos = [
            "colegiosCount", "visitasCount", "usuariosCount",
            "usuariosHombres", "usuariosMujeres", "usuariosNoBinario",
            "usuariosRol1", "usuariosRol2", "usuariosRol3"
        ];
        campos.forEach(id => document.getElementById(id).textContent = "Error");
        document.getElementById("localidades-lista").innerHTML = "<li>Error cargando datos</li>";
    }
}

cargarEstadisticas();

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
