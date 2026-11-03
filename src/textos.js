/**
 * textos.js — Carga inicial de la pestaña Textos de la Sheet.
 *
 * GENERADO desde docs/INSTRUMENTO.md con `node tools/generar-textos.js`. No editar a mano.
 * La app lee los textos de la pestaña Textos de la Sheet, no de este archivo: esto solo se usa
 * para llenar esa pestaña con "Autodiagnóstico → Preparar planilla" (no pisa lo que ya existe).
 */

const TEXTOS_INICIALES_ = {
  intro_1: "Este breve autodiagnóstico busca ayudarte a identificar tus fortalezas y oportunidades de desarrollo en el uso pedagógico de micro:bit. No hay respuestas correctas o incorrectas.",
  intro_2: "Te invitamos a responder pensando en tu experiencia actual. Al finalizar, recibirás una devolución orientativa con algunas recomendaciones para seguir avanzando.",
  ctx_intro: "Estas preguntas nos ayudan a comprender tu trayectoria. No forman parte del puntaje del autodiagnóstico.",
  afirmaciones_intro: "Ahora sí: ¿cómo es tu vínculo actual con la placa micro:bit? Para cada afirmación, indicá cuánto te representa actualmente.",
  d1_nombre: "Autonomía técnica",
  d1_observa: "Tu nivel de confianza y autonomía para utilizar la tecnología, resolver dificultades y explorar nuevas posibilidades.",
  d1_f_texto: "Tu perfil muestra que uno de tus próximos pasos puede estar en ganar mayor confianza en el uso técnico de micro:bit. Explorar MakeCode, modificar programas existentes y familiarizarte con la resolución de pequeños problemas puede ayudarte a trabajar con mayor autonomía.",
  d1_f_rec: "comenzar con actividades simples de la Guía y del Cuaderno de Actividades micro:bit y animarte a modificar pequeñas partes de los programas propuestos.",
  d1_d_texto: "Ya contás con algunas herramientas para trabajar con micro:bit de manera autónoma, aunque todavía pueden surgir situaciones en las que necesites apoyo o mayor confianza.",
  d1_d_rec: "seguir explorando MakeCode, modificar programas existentes y enfrentarte progresivamente a pequeños desafíos técnicos que te permitan ganar seguridad y autonomía.",
  d1_c_texto: "La autonomía técnica aparece como una de tus fortalezas. Contás con herramientas para explorar, modificar y resolver situaciones de manera independiente.",
  d1_c_rec: "poner esa autonomía al servicio del diseño de propuestas pedagógicas más complejas o acompañar a otros docentes que están comenzando.",
  d2_nombre: "Uso pedagógico",
  d2_observa: "En qué medida micro:bit está integrada a tus propuestas de enseñanza y vinculada con intenciones pedagógicas concretas.",
  d2_f_texto: "Tu principal oportunidad puede estar en avanzar desde el conocimiento de la herramienta hacia su integración en propuestas de enseñanza.",
  d2_f_rec: "elegir un contenido u objetivo de aprendizaje de tu planificación y explorar de qué manera micro:bit podría ayudarte a abordarlo.",
  d2_d_texto: "Ya comenzaste a integrar micro:bit en tus propuestas de enseñanza, aunque todavía existe margen para profundizar su vínculo con los objetivos de aprendizaje y darle mayor continuidad en el aula.",
  d2_d_rec: "avanzar desde actividades puntuales hacia secuencias o proyectos en los que micro:bit tenga un propósito pedagógico claro y se vincule de forma más sostenida con tu planificación.",
  d2_c_texto: "micro:bit ya forma parte de tus decisiones pedagógicas y aparece integrada a objetivos de aprendizaje.",
  d2_c_rec: "profundizar propuestas de mayor duración, explorar nuevas metodologías o documentar experiencias que puedan inspirar a otros docentes.",
  d3_nombre: "Apropiación pedagógica y condiciones para el uso",
  d3_observa: "En qué medida lográs incorporar micro:bit a tu práctica con confianza, flexibilidad y capacidad para tomar decisiones pedagógicas propias.",
  d3_f_texto: "Es posible que todavía existan algunas barreras para incorporar micro:bit con mayor autonomía o frecuencia.",
  d3_f_rec: "comenzar con propuestas acotadas, adaptar actividades existentes y avanzar progresivamente hacia diseños propios.",
  d3_d_texto: "Ya contás con experiencias que te permiten incorporar micro:bit en tus propuestas, aunque todavía podés fortalecer tu confianza para adaptar actividades, tomar decisiones propias y responder con mayor flexibilidad a situaciones imprevistas.",
  d3_d_rec: "partir de propuestas conocidas e introducir modificaciones graduales que respondan a tus objetivos y a las características de tu grupo.",
  d3_c_texto: "Mostrás un alto nivel de confianza para tomar decisiones pedagógicas vinculadas con micro:bit y adaptar las propuestas a las necesidades de tus estudiantes.",
  d3_c_rec: "experimentar con nuevos formatos, problemas abiertos o propuestas creadas por vos.",
  d4_nombre: "Cultura tecnológica vinculada a micro:bit en el centro educativo",
  d4_observa: "Las condiciones del centro educativo para facilitar el acceso, la circulación y el uso sostenido de micro:bit.",
  d4_f_texto: "Tu respuesta muestra que puede haber oportunidades para mejorar las condiciones de acceso, circulación o conocimiento de micro:bit dentro de tu centro.",
  d4_f_rec: "conocer qué recursos están disponibles, conversar con otros docentes que utilizan micro:bit e identificar oportunidades para compartir experiencias.",
  d4_d_texto: "En tu centro ya existen algunas condiciones y experiencias que favorecen el uso de micro:bit, aunque todavía pueden fortalecerse su circulación, visibilidad y aprovechamiento entre docentes.",
  d4_d_rec: "identificar qué recursos y experiencias ya existen en el centro y generar oportunidades para compartirlos, organizarlos o hacerlos más accesibles a otros docentes.",
  d4_c_texto: "Tu centro cuenta con condiciones favorables para el uso de micro:bit y existe una cultura que facilita su incorporación.",
  d4_c_rec: "contribuir a que esas experiencias circulen dentro del centro y que nuevos docentes puedan sumarse y participar de las iniciativas que se proponen desde el centro y desde Ceibal.",
  d5_nombre: "Trabajo colaborativo e interdisciplinario",
  d5_observa: "El grado en que el uso de micro:bit se vincula con el intercambio entre colegas y con propuestas que trascienden una única área de conocimiento.",
  d5_f_texto: "Una oportunidad de desarrollo puede estar en conectar tu experiencia con micro:bit con la de otros docentes o áreas de conocimiento.",
  d5_f_rec: "identificar un colega, área o proyecto con el que pueda existir un punto de encuentro y pensar una primera actividad conjunta.",
  d5_d_texto: "Ya existen algunos intercambios o experiencias de colaboración en torno a micro:bit, pero todavía hay oportunidades para ampliar el trabajo conjunto y conectar la tecnología con otras áreas de conocimiento.",
  d5_d_rec: "buscar una oportunidad concreta para planificar o desarrollar una actividad con otro docente, partiendo de un objetivo, contenido o problema compartido.",
  d5_c_texto: "El intercambio y el trabajo con otros docentes aparecen como una fortaleza en tu perfil.",
  d5_c_rec: "impulsar proyectos interdisciplinarios de mayor alcance o compartir tu experiencia con otros equipos docentes.",
  rec_rotulo_f: "Te recomendamos:",
  rec_rotulo_d: "Te recomendamos:",
  rec_rotulo_c: "Tu próximo desafío puede ser:",
  proximo_paso_todas_consolidadas: "Todas tus dimensiones aparecen consolidadas. Un buen próximo paso puede ser compartir tu experiencia y acompañar a otros docentes que están comenzando.",
  cierre_titulo: "No existe un único camino para avanzar con micro:bit.",
  cierre_1: "Tu perfil refleja tu momento actual y puede cambiar a medida que experimentás, aprendés y compartís con otros.",
  cierre_2: "Nuestra sugerencia es que uses estas orientaciones para elegir qué dimensión fortalecer y, a partir de esa reflexión, puedas utilizar la Guía según tus propios intereses y necesidades.",
};

if (typeof module !== 'undefined') {
  module.exports = { TEXTOS_INICIALES_ };
}
