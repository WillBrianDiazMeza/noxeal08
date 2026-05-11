import Static from "@/pages/Static";

export const ABOUT_BODY = [
  "Noxeal es una revista digital editorial en español dedicada al periodismo lento sobre la cultura digital, las tendencias virales y los temas complejos que el ruido del algoritmo distorsiona.",
  "Nuestro trabajo no es ser los primeros: es ser los más claros. Antes del veredicto, contamos el mapa: de dónde viene una historia, qué cambia y por qué importa.",
  "Combinamos investigación humana con asistencia editorial automatizada (IA generativa supervisada). Toda publicación lleva atribución explícita y, cuando aplica, fuente original enlazada.",
  "Si tienes una propuesta editorial o quieres reportar un error, escríbenos a hola@noxeal.com.",
];

export const PRIVACY_BODY = [
  "En Noxeal solo guardamos los datos estrictamente necesarios para que el servicio funcione: tu correo si te suscribes a la newsletter, tu cuenta si te registras, y datos de uso agregados (no personales) para mejorar el sitio.",
  "Usamos cookies técnicas (sesión, preferencias) y cookies analíticas (Google Analytics 4 con IP anonimizada) para entender el tráfico de forma agregada. Puedes desactivarlas en la configuración de tu navegador.",
  "No vendemos datos a terceros. No usamos cookies de seguimiento publicitario invasivas. Si Noxeal integra anuncios contextuales (Google AdSense u otros), seguirán las políticas de cada proveedor.",
  "Para ejercer tus derechos de acceso, rectificación, oposición o eliminación, escríbenos a privacidad@noxeal.com. Respondemos en máximo 30 días.",
  "Responsable del tratamiento: Noxeal Editorial · hola@noxeal.com.",
];

export const TERMS_BODY = [
  "Al usar Noxeal aceptas leer críticamente. El contenido publicado es trabajo editorial original o debidamente citado y se ofrece con fines informativos, de análisis u opinión.",
  "Categorías editoriales: Noxeal puede etiquetar artículos como Noticia, Análisis, Opinión, Investigación, Crítica o Teoría/Especulación. Antes de citarnos, identifica el tipo de contenido.",
  "Está prohibido reproducir artículos completos sin permiso por escrito. Citar fragmentos con atribución y enlace está expresamente permitido.",
  "Comentarios: los comentarios son responsabilidad de cada usuario. Nos reservamos el derecho de moderar o eliminar contenido que viole la ley, incite al odio, contenga spam o publique datos personales de terceros sin consentimiento.",
  "Limitación: Noxeal no se hace responsable de decisiones tomadas únicamente con base en su contenido. Verifica siempre con fuentes primarias.",
];

export const COOKIES_BODY = [
  "Noxeal usa cookies de tres tipos:",
  "Cookies estrictamente necesarias: gestionan la sesión (login) y preferencias básicas. No se pueden desactivar.",
  "Cookies analíticas: Google Analytics 4 con anonimización de IP activada. Nos permiten saber qué artículos funcionan y dónde mejorar. No identifican usuarios individuales.",
  "Cookies de terceros / publicidad (cuando esté activo): si integramos Google AdSense u otra red contextual, seguirán las políticas de privacidad y consentimiento del proveedor. Puedes gestionar tu consentimiento en cualquier momento desde la configuración del navegador.",
  "Puedes bloquear todas las cookies desde tu navegador. Si lo haces, algunas funciones (login, suscripciones, comentarios) pueden no funcionar.",
];

export const DISCLAIMER_BODY = [
  "Noxeal publica contenido editorial sobre tendencias virales, cultura digital, política, tecnología, salud y temas sociales. Una parte de nuestro contenido es análisis, opinión, ensayo o especulación razonada.",
  "Importante: no todo lo que publica Noxeal es una noticia confirmada. Algunos artículos contienen teorías, hipótesis, debates o lecturas críticas explícitamente identificadas como tales en el encabezado y en las etiquetas.",
  "Verificamos fuentes cuando existen. Cuando un tema circula sin fuentes primarias verificables, lo decimos. Cuando es opinión editorial, lo decimos. Cuando es análisis, lo decimos.",
  "Noxeal NO es una fuente oficial gubernamental, médica, legal ni financiera. Antes de tomar decisiones críticas (salud, dinero, legales), consulta a un profesional cualificado.",
  "Si detectas un error, un dato mal atribuido o información que requiera corrección, escríbenos a hola@noxeal.com. Las correcciones se publican con fecha y motivo.",
];

export const CONTACT_BODY = [
  "Para colaboraciones editoriales, prensa o sugerencias de temas: hola@noxeal.com.",
  "Para reportar errores o solicitar correcciones: correcciones@noxeal.com.",
  "Para temas de privacidad o datos personales: privacidad@noxeal.com.",
  "Respondemos en menos de 48 horas hábiles. Si tu mensaje es sobre un artículo específico, incluye el enlace y el motivo.",
];

export const About = () => <Static title="Sobre Noxeal" body={ABOUT_BODY} path="/about" />;
export const Privacy = () => <Static title="Política de privacidad" body={PRIVACY_BODY} path="/privacy" />;
export const Terms = () => <Static title="Términos de uso" body={TERMS_BODY} path="/terms" />;
export const Cookies = () => <Static title="Política de cookies" body={COOKIES_BODY} path="/cookies" />;
export const Disclaimer = () => <Static title="Aviso editorial" body={DISCLAIMER_BODY} path="/disclaimer" />;
export const Contact = () => <Static title="Contacto" body={CONTACT_BODY} path="/contact" />;
