import "dotenv/config";
import express from "express";
import morgan from "morgan";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import loginRoutes from "./routes/login.route.js";
import { requiereSesion } from "./middleware/auth.js";
import healthRoutes from "./routes/health.routes.js";
import noticiasRoutes from "./routes/noticias.routes.js";
import perfilRoutes from "./routes/perfil.routes.js";
import asistenciaRoutes from "./routes/asistencia.routes.js";
import vacacionesRoutes from "./routes/vacaciones.routes.js";
import solicitudesVacacionesRoutes from "./routes/solicitudes-vacaciones.routes.js";
import prestacionesExtraRoutes from "./routes/prestaciones-extra.routes.js";
import nominaAtlasRoutes from "./routes/nomina-atlas.routes.js";
import documentosAtlasRoutes from "./routes/documentos-atlas.routes.js";
import felicitacionesAtlasRoutes from "./routes/felicitaciones-atlas.routes.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { maxAge: 5 * 60 * 1000, httpOnly: true, sameSite: "lax" }
}));


// RUTAS DE API
app.use("/api", loginRoutes);
app.use("/api/noticias", requiereSesion, noticiasRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/perfil", perfilRoutes);
app.use("/api/asistencia", asistenciaRoutes);
app.use("/api/vacaciones", vacacionesRoutes);
app.use("/api/vacaciones", solicitudesVacacionesRoutes);
app.use("/api/prestaciones", prestacionesExtraRoutes);
app.use("/api/nomina", nominaAtlasRoutes);
app.use("/api/documentos", documentosAtlasRoutes);
app.use("/api/felicitaciones", felicitacionesAtlasRoutes);


app.get("/paginas/index.html", (req, res, next) => {
  if (req.session.usuario) return res.redirect("/paginas/Dashboard.html");
  next();
});

app.use(
  "/paginas",
  (req, res, next) => (req.path === "/index.html" ? next() : requiereSesion(req, res, next)),
  express.static(path.join(__dirname, "paginas"))
);
// Unity WebGL: los archivos del videojuego requieren una sesion valida.
// .unityweb conserva la compresion de Unity y se sirve como octet-stream
// para permitir el mecanismo de descompresion del propio loader.
app.use("/Game", requiereSesion, express.static(path.join(__dirname, "Game"), {
  setHeaders(res, filePath) {
    if (filePath.endsWith(".unityweb")) {
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
    }
  }
}));

app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.get("/style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "style.css"));
});

app.get("/", (req, res) => res.redirect("/paginas/index.html"));

app.listen(3000, () => console.log("Servidor en http://localhost:3000"));
