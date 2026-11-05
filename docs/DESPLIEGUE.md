# Despliegue con clasp

Lo hace **solo una persona** (Santi), nunca Claude Code. Siempre con la **cuenta dedicada del programa**, nunca con la cuenta laboral personal.

Algunos nombres de comandos cambian entre versiones de clasp. Si un comando no existe, `clasp --help` muestra los de tu versión.

## Primera vez (proyecto de prueba)

1. **Instalar clasp** (requiere Node):
   ```
   npm install -g @google/clasp
   ```
2. **Activar la API de Apps Script en la cuenta dedicada:** script.google.com → Configuración → "API de Google Apps Script" → Activado. Hay que estar en la cuenta dedicada.
3. **Crear la Sheet de prueba** en la unidad compartida, por ejemplo "Autodiagnóstico micro:bit — PRUEBA". Desde la Sheet: *Extensiones → Apps Script*. Ponerle nombre al proyecto.
4. **Copiar el ID del script:** en el editor, *Configuración del proyecto* (engranaje) → "ID de la secuencia de comandos".
5. **Configurar el entorno:** copiar `.clasp.prueba.example.json` como `.clasp.prueba.json` y pegar el ID en `scriptId`. Este archivo no se sube al repo.
6. **Iniciar sesión:**
   ```
   clasp login
   ```
   Se abre el navegador: elegí la **cuenta dedicada** y leé los permisos antes de aceptar.
7. **Subir el código:**
   ```
   npm run entorno:prueba
   clasp push
   ```
   Si pregunta si sobrescribir el manifiesto, respondé que sí. `clasp push` reemplaza todo el proyecto con lo que hay en `src/`.
8. **Implementar por primera vez** (en el editor, una sola vez): *Implementar → Nueva implementación* → tipo *Aplicación web* → descripción `v0.1.0` → Ejecutar como: *Yo* → Quién tiene acceso: *Cualquier persona* → *Implementar*.
   - Google pide autorizar. **Revisá que la lista tenga solo** ver y administrar la hoja de cálculo vinculada, enviar correo en tu nombre y mostrar contenido en Google Sheets. Si pide algo más, no aceptes y consultá.
   - Anotá el **ID de implementación** y la **URL** en `.clasp.prueba.json`, en los campos `_deploymentId` y `_url`. Son notas tuyas: clasp las ignora.
9. **Cerrar sesión:**
   ```
   clasp logout
   ```

## Cada versión nueva

1. Traer el código aprobado:
   ```
   git checkout main
   git pull
   npm test
   ```
2. Subir a **prueba** y probar:
   ```
   npm run entorno:prueba
   clasp login
   clasp push
   ```
   Probá con la URL de pruebas del editor (*Implementar → Probar implementaciones*, termina en `/dev`). Solo la ven quienes editan el script.
3. Publicar la versión en prueba, manteniendo la misma URL:
   ```
   clasp deploy -i <ID de implementación> -d "vX.Y.Z"
   ```
   Abrí la URL pública y verificá que el pie diga `vX.Y.Z`.
4. Cuando prueba está bien, repetir los pasos 2 y 3 con `npm run entorno:produccion`. El script muestra un aviso grande al elegir producción.
5. `clasp logout`.

**Si la versión cambia cómo se normalizan los nombres de centros** (siglas, abreviaturas, tildes…): después de subir el código, correr en la Sheet *Autodiagnóstico → Actualizar catálogo*. La columna `nombre_normalizado` de Centros se calcula en ese momento y el buscador la usa tal cual; sin este paso los centros ya cargados siguen con la regla vieja. Hacerlo en prueba y en producción.

## Volver a una versión anterior

En el editor del proyecto: *Implementar → Gestionar implementaciones* → lápiz de editar → en "Versión" elegir la anterior → *Implementar*. La URL no cambia.

## Producción (primera vez)

Igual que la primera vez de prueba, con una Sheet "Autodiagnóstico micro:bit" y el archivo `.clasp.produccion.json`. Antes de abrirla a los docentes: `docs/SEGURIDAD.md` completo.

## Si algo sale mal con el token

Si perdés la computadora o sospechás que el token se filtró: en la cuenta dedicada, *Cuenta de Google → Seguridad → Apps de terceros con acceso* → quitar el acceso de clasp. Después revisá en script.google.com el historial de versiones del proyecto.
