# Seguridad — lista de verificación

La web app no se publica para docentes hasta que todos los puntos estén tildados. Al programar, cada sección es un requisito; antes de cada publicación, alguien distinto de quien programó recorre la lista y hace las pruebas de la sección 9. El agente `auditor-seguridad` usa esta lista como criterio.

## 1. Cuenta, permisos y acceso

- [ ] El proyecto de Apps Script y la Sheet están en la unidad compartida del programa.
- [ ] La cuenta dueña y la que publica es la cuenta dedicada del programa, con acceso solo a la carpeta del autodiagnóstico.
- [ ] `src/appsscript.json` declara solo los scopes de `docs/ARQUITECTURA.md`: `spreadsheets.currentonly`, `script.send_mail`, `script.container.ui`.
- [ ] Web app: ejecutar como quien implementa, acceso para cualquier persona.
- [ ] Hay una lista de quiénes editan el script y la Sheet (2 o 3 personas como máximo).
- [ ] El resto del equipo accede con permiso de lectura.
- [ ] La cuenta dedicada tiene verificación en dos pasos.
- [ ] clasp: lo ejecuta solo una persona; `clasp logout` al terminar cada despliegue; Claude Code tiene clasp bloqueado.

## 2. Funciones expuestas

- [ ] Solo `doGet`, `obtenerDatosIniciales`, `guardarRespuesta` y `onOpen` (que solo arma el menú) son públicas; todas las demás terminan en guion bajo. Lo controla `test/reglas.test.js`.
- [ ] Las funciones de mantenimiento solo se ejecutan desde el menú de la Sheet o el editor.
- [ ] `obtenerDatosIniciales` devuelve solo las columnas que el buscador necesita.
- [ ] Ninguna función pública devuelve filas de Respuestas ni confirma si una cédula ya respondió.

## 3. Validación en el servidor

Si algo falla, se rechaza el envío completo con un mensaje genérico.

| Campo | Regla |
| --- | --- |
| Nombre | 3 a 120 caracteres, al menos dos palabras |
| Cédula | 7 u 8 dígitos, dígito verificador correcto |
| Correo | Formato válido, máximo 254 caracteres |
| Subsistema | DGEIP, DGES, DGETP o CFE |
| Departamento y localidad | Existen en Centros para ese subsistema (localidad vacía en Montevideo) |
| Centro | Código existente en Centros con ese subsistema y departamento; o `null` con texto libre de 3 a 150 caracteres |
| Contexto | Enteros dentro de las opciones de cada pregunta |
| Afirmaciones | Exactamente 15 enteros de 1 a 5 |
| Otros campos | Se ignoran |

- [ ] Todas las reglas implementadas y con tests.
- [ ] Puntajes y niveles calculados en el servidor.
- [ ] Mensaje de error genérico, sin detalles internos.

## 4. Escritura segura en la planilla

- [ ] Columnas de texto libre con formato "Texto sin formato".
- [ ] Apóstrofo delante de cualquier valor que empiece con `=`, `+`, `-` o `@`.
- [ ] Escritura con `LockService`.
- [ ] La web app escribe solo en Respuestas.

## 5. Abuso y envíos masivos

Los valores salen de la pestaña Config y se ajustan después del piloto.

- [ ] Máximo 3 envíos por cédula por día.
- [ ] Máximo 1 mail por día a la misma dirección; los siguientes envíos se guardan sin mail.
- [ ] Tope general de envíos por hora; al superarlo, mensaje de "intentá más tarde" y aviso al equipo.
- [ ] Campo trampa invisible: si viene completo, se descarta sin aviso.
- [ ] Se descartan envíos hechos en menos de 60 segundos desde que se abrió la página. La hora de apertura sale del servidor, para no perjudicar a un celular con el reloj mal; un atacante puede falsificarla, así que este filtro solo frena a robots simples.
- [ ] Tope global de mails por hora y por día, además del límite por dirección.
- [ ] Llave `modo_mail` en Config: con `apagado`, vacío o cualquier valor no reconocido no sale ningún mail; con `solo_lista` salen solo a `correos_de_prueba`; `activo` se usa recién en el piloto.
- [ ] Un solo lugar del código manda mails, y un test lo controla.
- [ ] Cuota diaria de mails confirmada; si se alcanza, el docente igual ve su perfil.
- [ ] Plan B documentado: captcha si aparece abuso.

## 6. Lo que se muestra y se envía

- [ ] La página escapa el texto ingresado antes de mostrarlo.
- [ ] El PDF y el mail escapan nombre y centro.
- [ ] El mail no incluye la cédula.
- [ ] Asunto y remitente fijos.
- [ ] La respuesta de `guardarRespuesta` contiene solo el perfil de ese envío.
- [ ] El avance guardado en el navegador queda solo en esa pestaña, se borra al enviar y se descarta si tiene más de 6 horas.
- [ ] Los textos de la pestaña Textos los edita el equipo, pero se tratan como no confiables: en la página se muestran solo con `textContent` o `createTextNode` (nunca `innerHTML` ni `<?!=`); en el PDF y el mail se escapan `& < > " '`. Test con `<img src=x onerror=alert(1)>` en un texto.
- [ ] La página pública no muestra el nombre de la planilla ("Planilla vinculada…" de la fase 1): sacarlo antes de publicar.

## 7. Datos personales

- [ ] Versión definitiva (la versión 1 no lleva consentimiento): texto de consentimiento validado por legal, con qué datos, para qué, quién accede y por cuánto tiempo.
- [ ] La Sheet no está compartida con "cualquier persona con el enlace".
- [ ] Plazo de conservación definido y quién anonimiza o borra.
- [ ] Copias o exportaciones con datos personales no van a carpetas personales ni por mail.
- [ ] Datos de prueba borrados antes de publicar para docentes.
- Pregunta abierta: ¿hay que registrar la base ante la URCDP? Consultar con legal.

## 8. Publicación y operación

- [ ] Proyecto de prueba separado del de producción; todo se prueba primero ahí.
- [ ] Cada publicación es una versión nueva con descripción; se puede volver a la anterior.
- [ ] El link oficial se difunde solo por canales de Ceibal.
- [ ] Los errores se revisan cada semana durante el primer mes (*Ejecuciones* del proyecto).
- [ ] Definido quién responde ante un incidente: pausar la web app, revisar filas sospechosas, avisar a legal si hubo exposición de datos.

## 9. Pruebas antes de publicar (en el proyecto de prueba)

| Prueba | Cómo | Resultado esperado |
| --- | --- | --- |
| Funciones internas | `google.script.run.limpiarCatalogo_()` desde la consola | Error: no existe para el navegador |
| Fórmula en el nombre | Nombre `=IMAGE("https://example.com/x.png")` | Se ve como texto en la Sheet |
| Fuera de escala | Afirmación con valor 7 o -1 desde la consola | Rechazado, nada se guarda |
| Centro inventado | Código inexistente | Rechazado |
| Texto enorme | Nombre de 50.000 caracteres | Rechazado |
| HTML en el nombre | `<b>Hola</b><img src=x onerror=alert(1)>` | Texto plano en pantalla, PDF y mail |
| Envíos repetidos | 5 envíos con la misma cédula | Desde el 4.º, rechazado |
| Mails cerrados | Con `modo_mail` en `apagado`, un envío con un correo propio | No llega ningún mail; `mail_enviado` queda en `no` |
| Solo la lista | Con `modo_mail` en `solo_lista`, un envío con un correo propio que no está en `correos_de_prueba` | No llega ningún mail |
| Mail a terceros | Con `modo_mail` en `solo_lista`, 3 envíos con el mismo correo de `correos_de_prueba` | Llega 1 mail |
| Robot rápido | Envío a los 10 segundos | Descartado |
| Campo trampa | Completar el campo oculto | Descartado |
| Acceso a la Sheet | Abrir su link con una cuenta ajena al equipo | Acceso denegado |
| Envíos simultáneos | Varios envíos a la vez con la misma cédula | No se pasa del tope de 3 |
| Fórmula con signo de ancho completo | Nombre que empieza con `＝1+1` | Se ve como texto en la Sheet y al exportar |
| Fórmula al exportar | Exportar a CSV una fila con `=1+1` en el nombre y abrirla en Excel | No se ejecuta como fórmula |
| HTML en un texto de la Sheet | Poner `<img src=x onerror=alert(1)>` en un texto de la pestaña Textos | Se ve como texto |

- [ ] Todas las pruebas dieron el resultado esperado.
