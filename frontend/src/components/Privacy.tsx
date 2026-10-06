import { Link } from "react-router-dom";
import { ShellHeader } from "./ShellHeader";

const REPO_ISSUES = "https://github.com/albertsp/trip-sync/issues";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "Qué datos guardamos",
    body: [
      "Quien crea un viaje inicia sesión con Google: guardamos su identificador de Google, su nombre y su correo.",
      "Quien se une a un viaje (solo con el enlace, sin cuenta) nos da su nombre, los días en los que puede viajar, su presupuesto y divisa, el tipo de destino que prefiere, su ciudad de origen, sus intereses y, si quiere, una nota de hasta 200 caracteres.",
      "Guardamos también los votos, las tareas de la checklist y las propuestas generadas.",
    ],
  },
  {
    title: "Para qué los usamos",
    body: [
      "Solo para mostrar al grupo cuándo coincidís, generar propuestas de viaje, recoger los votos y montar el itinerario y la lista de tareas. No hay publicidad ni venta de datos.",
    ],
  },
  {
    title: "Inteligencia artificial",
    body: [
      "Para generar las propuestas y el itinerario enviamos a un proveedor de IA (Mistral AI, Francia) los datos del grupo sin nombres ni correos: ciudades de origen, tipo de destino, intereses, presupuestos, fechas, el título del viaje y las notas.",
      "No escribas datos personales sensibles en las notas. Según el plan del proveedor, este puede usar lo que recibe para mejorar sus modelos.",
      "Las propuestas son estimaciones orientativas generadas por IA: pueden contener errores en lugares, precios o fechas. Comprueba siempre los datos antes de reservar.",
    ],
  },
  {
    title: "Quién ve tus datos",
    body: [
      "Cualquiera que tenga el enlace del viaje ve las fechas agregadas, las propuestas, los votos agregados y la checklist, incluido el nombre de quien reclama una tarea. Tu presupuesto individual y tus preferencias no se muestran a otros participantes.",
      "Usamos Vercel para la web, Fly.io para el servidor y la base de datos (región de París) y Google para el inicio de sesión.",
    ],
  },
  {
    title: "Cookies y almacenamiento",
    body: [
      "Usamos la cookie de sesión y la de seguridad (CSRF) necesarias para iniciar sesión, y guardamos en tu navegador un identificador de participante para que puedas votar y marcar tareas. No usamos cookies de seguimiento.",
    ],
  },
  {
    title: "Conservación y tus derechos",
    body: [
      "Conservamos los datos mientras el viaje exista. Puedes pedir que accedamos, corrijamos o borremos tus datos abriendo una incidencia en el repositorio del proyecto.",
    ],
  },
];

export function Privacy() {
  return (
    <div className="app-shell">
      <ShellHeader />
      <article className="panel !max-w-[720px]">
        <span className="panel-eyebrow">Legal</span>
        <h1 className="panel-title">Privacidad</h1>
        <p className="panel-subtitle">
          TripSync es un proyecto personal. Esto es lo que hace con tus datos.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title} className="mb-6">
            <h2 className="mb-2 text-[1.15rem] font-extrabold text-ink">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-0 mb-2 text-[.95rem] leading-relaxed text-ink-2">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <p className="mb-5 text-[.95rem] text-ink-2">
          Contacto:{" "}
          <a href={REPO_ISSUES} className="panel-link" target="_blank" rel="noreferrer">
            incidencias del repositorio
          </a>
          .
        </p>
        <Link to="/" className="panel-link">
          ← Volver al inicio
        </Link>
      </article>
    </div>
  );
}
