
/*
 * Identidad del usuario autenticado en Project ATLAS.
 * Obtiene los datos desde la sesión de Express.
 */

(async function cargarIdentidadAtlas() {
    try {
        const respuesta = await fetch("/api/sesion", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo consultar la sesión");
        }

        const datos = await respuesta.json();

        if (!datos.ok || !datos.usuario) {
            window.location.href = "/paginas/index.html";
            return;
        }

        const usuario = datos.usuario;
        const nombre = usuario.nombre || "Usuario";
        const rol = usuario.rol || "colaborador";

        const nombresRoles = {
            gerencia: "Gerencia",
            rh: "Recursos Humanos",
            colaborador: "Colaborador"
        };

        const rolTexto = nombresRoles[rol] || "Usuario";

        // Actualizar identidad del menú lateral.
        const tarjeta = document.querySelector(
            ".sidebar .mt-4.pt-3.border-top"
        );

        if (tarjeta) {
            const nombreElemento = tarjeta.querySelector(
                ".fw-semibold.small"
            );

            const subtitulo = tarjeta.querySelector(
                ".text-secondary.small"
            );

            const avatar = tarjeta.querySelector(".avatar-circle");

            if (nombreElemento) {
                nombreElemento.textContent = nombre;
            }

            if (subtitulo) {
                subtitulo.textContent = rolTexto;
            }

            if (avatar) {
                avatar.textContent = nombre
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map(palabra => palabra.charAt(0))
                    .join("")
                    .toUpperCase();
            }
        }

        // Actualizar la cabecera del perfil, si existe.
        if (window.location.pathname.endsWith("/perfil.html")) {
            const campos = document.querySelectorAll(
                ".panel.mb-3 .row.g-3 .col-md-3"
            );

            if (campos.length >= 4) {
                const valores = [
                    nombre,
                    "Sin vincular",
                    "Sin datos laborales",
                    rolTexto
                ];

                campos.forEach((campo, indice) => {
                    if (indice >= valores.length) return;

                    const valor = campo.querySelector("span");

                    if (valor) {
                        valor.textContent = valores[indice];
                    }
                });
            }

            const avatarPerfil = document.querySelector(
                ".avatar-circle.avatar-xxl"
            );

            if (avatarPerfil) {
                avatarPerfil.textContent = nombre
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map(palabra => palabra.charAt(0))
                    .join("")
                    .toUpperCase();
            }
        }

        console.log("Identidad ATLAS cargada correctamente");

    } catch (error) {
        console.error(
            "No fue posible cargar la identidad:",
            error.message
        );
    }
})();
