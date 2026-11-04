# Decisiones de diseño

Última actualización: 04/11/2026. Se cambian solo con acuerdo del responsable del proyecto.

## Alcance de la versión 1 (lo más simple)

- Sin pantalla de consentimiento. Se agrega en la versión definitiva (Ley 18.331, texto a validar con el área legal).
- El perfil muestra: tabla de referencia de niveles, radar con los promedios y la lista de valores, una tarjeta por dimensión (nivel, promedio, devolución, recomendación) y el cierre. No muestra "Tu próximo paso". El radar también va en el PDF.
- Sin tablero externo. El equipo analiza las respuestas directamente en la Sheet.

## Formato de la página

- **Celular primero.** Lo más probable es que los docentes entren desde el celular escaneando un QR de una publicación enviada a los centros, en momentos distintos. Todo se diseña y se prueba primero para celular.
- **Formulario simple, muy parecido a Google Forms**, con la paleta de Ceibal. No se busca nada novedoso ni vistoso. Lo que Forms no tiene y se mantiene: validar la cédula, sugerir el correo, buscar el centro y mostrar el perfil.
- Tres páginas: datos, experiencia y afirmaciones (las 15 en una sola página, agrupadas por dimensión). La intro va arriba de la primera página.
- Cada sección es una tarjeta que contiene las tarjetas de sus preguntas. Subsistema, departamento y localidad son desplegables comunes.
- Sin pantalla de revisión antes de enviar: se corrige con "Atrás".
- La carga tarda unos 8 segundos en celular, y la página avisa mientras tanto. No se usa memoria temporal (`CacheService`): dura hasta 6 horas y es compartida, así que con entradas tan espaciadas casi nadie se beneficiaría.
- "Qué observa" va en el formulario, abajo del título de cada dimensión, no en el perfil.
- Ningún nivel se destaca con relleno: los tres se muestran iguales, con sus cuadraditos y su nombre.
- El avance se guarda solo en la pestaña del navegador (incluida la cédula) y se borra al enviar, al cerrarla o si tiene más de 6 horas, para no perder las respuestas si el celular recarga la página.
- El código de la página queda visible para quien abra las herramientas del navegador, y no se ofusca: no protege de verdad y complica arreglar errores. Por eso la página no lleva nada secreto. Se acepta que el catálogo de centros (con los Códigos Ceibal) quede visible.

## Solución

- Web app con Google Apps Script + Google Sheets.
- Dueña del proyecto y de la Sheet: la cuenta de Google dedicada al programa, en la unidad compartida del programa. Se publica desde esa cuenta.
- La web app es un script **vinculado** a la Sheet (creado desde la Sheet con *Extensiones → Apps Script*).
- Devolución inmediata en pantalla. Al final del perfil, dos botones que no se excluyen: descargar en PDF y enviar por mail. El mail no es automático: sale solo si el docente lo pide.
- El PDF se genera en el servidor, con el mismo diseño para la descarga y para el mail.
- El servidor calcula puntajes y niveles. Los textos de devolución se leen de una pestaña de la Sheet, para editarlos sin tocar código.
- Cada respuesta guarda la versión del instrumento y la versión de la app.

## Datos que se piden (nominal)

- Nombre y apellido, cédula (validada con dígito verificador), correo electrónico (validado, con sugerencia ante errores de dominio como "gmial.com"), subsistema, departamento, localidad (salvo Montevideo) y centro educativo.
- El correo sigue siendo obligatorio. Se usa para mandar el perfil en PDF si el docente lo pide.
- No se muestran resultados anteriores por cédula, porque no hay inicio de sesión.
- Cada envío es una fila nueva, salvo un reintento o una cédula que ya llegó a su límite del día (ver "Mails y topes"). Un docente puede repetir el autodiagnóstico.

## Centros educativos

- Fuente: copia de la hoja "Universo 2026" (existe una Sheet maestra; por ahora se usa la copia).
- Rubro = subsistema: DGEIP, DGES, DGETP, CFE.
- Se mantienen todas las dependencias, incluidas inspecciones y administrativas. En las sugerencias van primero escuelas, jardines, liceos, UTU, IFD/CERP; después anexos; después el resto.
- Montevideo: no se pide barrio; el centro se busca en todo el departamento.
- Resto del país: la localidad se elige de la lista del catálogo, filtrada por subsistema y departamento.
- Centro: campo de texto con sugerencias. Escuelas y jardines públicos con nombre propio se muestran con su número ("Escuela Nº 35 · República de…"). Opción "No encuentro mi centro": guarda el texto libre, marcado para revisión.
- Cada respuesta guarda `centro_texto`, `centro_codigo` (Código Ceibal) y `origen_macheo`.
- Macheo de respaldo para los textos libres: normalización, número, similitud de texto, detección de conflicto número/nombre, nivel de confianza; los dudosos van a revisión manual. No corre al enviar: "No encuentro mi centro" se guarda como `pendiente de revisión` y el macheo es una ayuda para revisarlos.
- El docente ve solo los departamentos que tienen centros del subsistema elegido, y nunca los de fuera de Uruguay.

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
- Un color por dimensión: aqua `#7BCDC1`, rosa `#D17EB2`, amarillo `#F2E616`, celeste `#27B2D9`, coral `#E6665D`. En el formulario es una franja fina arriba de la tarjeta de cada dimensión; en el perfil, el encabezado de cada tarjeta.
- Íconos de LEDs 5×5 por dimensión, solo en el perfil. Niveles con 1, 2 o 3 cuadraditos + texto, no solo color.
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
- Confirmar en la cuenta dedicada su cuota real de mails. Es Workspace paga: según Google, 1.500 destinatarios por día.

## Mails y topes

- **Pasado el límite de 3 envíos por cédula por día, el docente ve su perfil y no se guarda nada.** Un rechazo revelaría si esa cédula ya respondió hoy. Quien repita más de 3 veces en un día no se entera de que esa vez no se guardó. Riesgo aceptado: alguien que conozca una cédula puede cargar 3 envíos con ella y la respuesta real de ese día no se guardaría, sin aviso. Al revisar las respuestas, conviene mirar las cédulas con filas de nombres o correos distintos.
- **Un reintento no suma otra fila:** si en los últimos 10 minutos ya hay una fila con la misma cédula y las mismas respuestas, el docente ve su perfil y no se guarda otra. Pasa cuando se guardó, pero con mala señal el aviso no llegó al celular. Solo compara cédula y respuestas: si alguien corrige su centro o su nombre y repite lo mismo en esos 10 minutos, queda la primera fila.
- **Ningún mail puede salir durante las pruebas.** En la fase 4 el código no usa ningún servicio de correo.
- Un mail solo sale si hay una fila guardada hoy con esa cédula y ese correo, y como máximo uno por día a cada dirección. El aviso al docente es siempre el mismo, para que nadie pueda averiguar si una dirección ya recibió algo o si el envío fue descartado.
- Desde la fase 5, una llave `modo_mail` en Config decide: `apagado` (o vacío o cualquier valor no reconocido) no manda nada; `solo_lista` manda solo a `correos_de_prueba`; `activo` manda a los docentes y se usa recién en el piloto.
- Topes mínimos mientras se prueba: 20 envíos por hora, 10 mails por hora y 20 mails por día. Se suben en Config antes del piloto; la referencia para entonces es 300, 200 y 1.200.
