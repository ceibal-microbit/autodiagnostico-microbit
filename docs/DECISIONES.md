# Decisiones de diseño

Última actualización: 03/11/2026. Se cambian solo con acuerdo del responsable del proyecto.

## Alcance de la versión 1 (lo más simple)

- Sin pantalla de consentimiento. Se agrega en la versión definitiva (Ley 18.331, texto a validar con el área legal).
- Sin radar en el perfil. El perfil muestra: referencia de niveles, "Tu próximo paso" (dimensión con menor puntaje), una tarjeta por dimensión (nivel, barra de promedio, qué observa, devolución, recomendación) y el cierre.
- Sin tablero externo. El equipo analiza las respuestas directamente en la Sheet.

## Solución

- Web app con Google Apps Script + Google Sheets.
- Dueña del proyecto y de la Sheet: la cuenta de Google dedicada al programa, en la unidad compartida del programa. Se publica desde esa cuenta.
- La web app es un script **vinculado** a la Sheet (creado desde la Sheet con *Extensiones → Apps Script*).
- Devolución inmediata en pantalla, más el perfil en PDF por correo.
- El servidor calcula puntajes y niveles. Los textos de devolución se leen de una pestaña de la Sheet, para editarlos sin tocar código.
- Cada respuesta guarda la versión del instrumento y la versión de la app.

## Datos que se piden (nominal)

- Nombre y apellido, cédula (validada con dígito verificador), correo electrónico (validado, con sugerencia ante errores de dominio como "gmial.com"), subsistema, departamento, localidad (salvo Montevideo) y centro educativo.
- El correo se usa para mandar el perfil en PDF.
- No se muestran resultados anteriores por cédula, porque no hay inicio de sesión.
- Cada envío es una fila nueva; un docente puede repetir el autodiagnóstico.

## Centros educativos

- Fuente: copia de la hoja "Universo 2026" (existe una Sheet maestra; por ahora se usa la copia).
- Rubro = subsistema: DGEIP, DGES, DGETP, CFE.
- Se mantienen todas las dependencias, incluidas inspecciones y administrativas. En las sugerencias van primero escuelas, jardines, liceos, UTU, IFD/CERP; después anexos; después el resto.
- Montevideo: no se pide barrio; el centro se busca en todo el departamento.
- Resto del país: la localidad se elige de la lista del catálogo, filtrada por subsistema y departamento.
- Centro: campo de texto con sugerencias. Escuelas y jardines públicos con nombre propio se muestran con su número ("Escuela Nº 35 · República de…"). Opción "No encuentro mi centro": guarda el texto libre, marcado para revisión.
- Cada respuesta guarda `centro_texto`, `centro_codigo` (Código Ceibal) y `origen_macheo`.
- Macheo de respaldo para los textos libres: normalización, número, similitud de texto, detección de conflicto número/nombre, nivel de confianza; los dudosos van a revisión manual.

## Limpieza del catálogo

- Una fila por Código Ceibal (la hoja real trae repetidos).
- Corregir localidades que Excel convirtió en fecha: "18 de Mayo", "25 de Mayo", "19 de Abril".
- Excluir filas sin departamento; marcar para revisión las de departamentos fuera de Uruguay (Asunción, Rio Grande do Sul).
- No usar "Tipo dependencia" como filtro estricto: hay inconsistencias (una escuela marcada como jardín).
- En escuelas y jardines públicos de DGEIP el código es `11` + departamento (2 dígitos) + número (3 dígitos): de ahí sale el número cuando no está en el nombre.

## Identidad visual

- Referencia: sitio micro:bit de Ceibal.
- Tipografía Ceibal Mozaic (pedir archivos a Comunicación; en el prototipo, Figtree como reemplazo).
- Colores: verde Ceibal `#00635D`, turquesa `#00A096`, verde micro:bit `#026902`, violeta `#5A2382`, fondo `#F9FAFB`, texto `#111111`.
- Un color por dimensión (tarjetas "Formación y recursos"): aqua `#7BCDC1`, rosa `#D17EB2`, amarillo `#F2E616`, celeste `#27B2D9`, coral `#E6665D`.
- Íconos de LEDs 5×5 por dimensión. Niveles con 1, 2 o 3 cuadraditos + texto, no solo color.
- Falta el logo oficial.

## Desarrollo

- Repo privado en la organización `ceibal-microbit`.
- El repo no lleva datos de Ceibal; los tests usan un catálogo sintético.
- Del repo a Apps Script: clasp, con `clasp login` de la cuenta dedicada del programa. Claude Code nunca ejecuta clasp.
- Dos proyectos de Apps Script: prueba y producción, cada uno con su Sheet en la unidad compartida.
- Circuito: especificar, delegar, revisar y documentar; agentes revisor y auditor de seguridad; tests con `node:test` y CI.

## Pendientes fuera del código

- Legal (versión definitiva): texto de consentimiento, plazo de conservación, registro ante la URCDP.
- Comunicación: logo oficial y archivos de la tipografía Ceibal Mozaic.
- Links definitivos de la Guía y del Cuaderno de Actividades.
- Cuota diaria de mails de la cuenta dedicada.
