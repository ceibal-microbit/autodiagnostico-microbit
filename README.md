# Autodiagnóstico docente micro:bit

Web app del programa micro:bit de Ceibal para que los docentes completen un autodiagnóstico de su vínculo con la placa, reciban una devolución por dimensiones al terminar, y el programa guarde las respuestas en una Google Sheet.

- **Tecnología:** Google Apps Script (web app) + Google Sheets.
- **Dueña del proyecto:** la cuenta de Google dedicada al programa, en la unidad compartida del programa.
- **Del repo a Google:** clasp, ejecutado solo por una persona (nunca por Claude Code).

## Dónde está cada cosa

| Carpeta / archivo | Qué hay |
| --- | --- |
| `CLAUDE.md` | Reglas del proyecto para Claude Code |
| `docs/DECISIONES.md` | Qué se decidió y por qué |
| `docs/INSTRUMENTO.md` | Preguntas, afirmaciones, niveles y textos de devolución |
| `docs/ARQUITECTURA.md` | Piezas del sistema, flujo de datos, pestañas de la Sheet, funciones públicas |
| `docs/SEGURIDAD.md` | Lista de verificación de seguridad |
| `docs/PLAN.md` | Fases y tareas |
| `docs/DESPLIEGUE.md` | Cómo subir el código a Apps Script con clasp |
| `docs/prototipo/prototipo.html` | Prototipo navegable de referencia (catálogo sintético) |
| `src/` | Lo que se sube a Apps Script |
| `test/` | Tests con `node:test` y datos sintéticos |
| `.claude/` | Permisos de Claude Code y agentes revisor y auditor de seguridad |

## Regla de datos

Este repo **no lleva datos de Ceibal**: ni el catálogo real de centros ni respuestas de docentes. Los tests usan `test/fixtures/universo-sintetico.json`, con centros inventados. Los datos reales viven solo en la Sheet de la unidad compartida.

## Correr los tests

Requiere Node 20 o superior.

```
npm test
```
