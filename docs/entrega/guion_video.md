# Guion del Video de Demostración — Biblioteca IUB (TALLER 1 CORTE 2)
Duración sugerida: 3-4 min · Grabar sin exponer credenciales/tokens.

## Prep. previa (checklist 5 min)
- [ ] `docker compose up -d` (MySQL compras + Ollama si aplica) y FastAPI local o Render.
- [ ] Open WebUI activo (`127.0.0.1:3000`), Telegram abierto con `@Biblioteca_IUB_BOT`.
- [ ] Frontend local corriendo (`npm start`) o el publicado en nube.
- [ ] Pestañas de la BD abierta: Neon SQL editor / pgAdmin.

## RECORDATORIO: "IA 30%":
1. Abrir Ollama corriendo en el equipo y Open WebUI con el chat "Biblioteca IUB Asistente" (RAG e5 + guard).
2. Preguntas demo:
   a) "¿cuáles son los requisitos de ingreso a pregrado?" → respuesta Documental con fuentes [1][2].
   b) "¿cuál es el horario de atención de la biblioteca?" → respuesta de abstención correcta (guard).
   c) "¿tienes libros de administración?" → respuesta del catálogo con disponibilidad real.
3. Telegram: REVISIÓN del mismo chat → intentar las mismas preguntas (el bot responde las mismas salidas por el orquestador compartido).
4. Cerrar la parte IA: mostrar la colección de Open WebUI (10 documentos; e5) y el modelo `biblioteca_iub_rag_guarda` (pipe con guard).

## Front / BD (FastAPI 30%; Angular 40%):
5. Login (JWT) con rol Administrador → mostrar el menú con módulos por rol (modulos_X_rol).
6. CRUD de Libros: creación (mostrar `created_at`), actualización (`updated_at`), eliminación con estado. Reflejar cambios en la web y en la BD (pestaña Neon). Repetir con usuarios / préstamos / dispositivos (todo con DataTable).
7. Como rol usuario/Estudiante: catálogo (búsqueda semántica) + "mis préstamos" → mostrar el préstamo creado desde admin.
8. Bulk Access: mostrar el diagrama de relaciones generado (`docs/entrega/diagrama_bd/diagrama_biblioteca_iub.png`) - NOTA: accesible solo vía consultas filmadas (no crear la base de datos en Access).

## Cierre:
9. Enlaces: Front (nube), APIs (Render), Neon, video, doc almacén — captura final.
10. Recordatorio informativo: no cambian production/Neon; la entrega no causó problemas.

## Instrucciones técnicas rápidas (voz en off)
- "Express revalida el rol con FastAPI vía introspección, cada petición consulta la BD ('documentos Activo')." etc. If API va lenta: recordar la reproducción del query y volver a lanzar; el Render free arranca lentamente (cold start).
