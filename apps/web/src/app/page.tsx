const architectureBlocks = [
  {
    title: "RAG documental",
    detail:
      "Corpus SEP estructurado en Supabase con chunks, tags y embeddings para consultas semanticas trazables.",
  },
  {
    title: "Curriculo y calendarizacion",
    detail:
      "Distribucion de proyectos, dependencias, trimestres y reajustes sobre el calendario real del docente.",
  },
  {
    title: "Contexto docente vivo",
    detail:
      "Bitacora, asistencia, evaluacion e intereses del grupo como senales para re-priorizar decisiones.",
  },
];

const apiModules = [
  "/curriculum",
  "/calendar",
  "/context",
  "/rag",
  "/ai-decision",
];

const milestones = [
  "Definir modelo de datos en Supabase y relaciones clave.",
  "Cerrar el contrato de API unico antes de escribir servicios productivos.",
  "Disenar el pipeline de ingestion PDF a conocimiento estructurado.",
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 sm:px-8 lg:px-12">
      <section className="panel relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10 sm:py-12">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,rgba(23,89,74,0.24),transparent_58%)] lg:block" />
        <div className="relative grid gap-10 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-line bg-surface-strong px-4 py-2 text-xs uppercase tracking-[0.28em] text-muted">
              <span className="h-2 w-2 rounded-full bg-warm" />
              ProfeIA · Fase 0
            </div>
            <div className="space-y-5">
              <p className="max-w-2xl text-sm uppercase tracking-[0.24em] text-accent">
                Arquitectura tecnica antes de codigo productivo
              </p>
              <h1 className="max-w-4xl text-5xl leading-none font-semibold tracking-[-0.06em] text-balance sm:text-6xl lg:text-7xl">
                La base operativa para planear, reajustar y justificar el trabajo docente con IA.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted sm:text-xl">
                El trabajo actual no es construir features finales, sino cerrar
                el lenguaje comun del sistema: datos, contratos de API y flujo
                de ingestion documental.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="#arquitectura"
                className="rounded-full bg-accent px-6 py-3 text-center text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                Ver bloques de arquitectura
              </a>
              <a
                href="#modulos"
                className="rounded-full border border-line bg-surface-strong px-6 py-3 text-center text-sm font-medium text-foreground transition-colors duration-200 hover:bg-accent-soft"
              >
                Revisar modulos API
              </a>
            </div>
          </div>

          <div className="panel rounded-[1.75rem] border border-white/50 bg-surface-strong p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">
                Estado del frente
              </p>
              <span className="rounded-full bg-accent-soft px-3 py-1 font-mono text-xs text-accent">
                en definicion
              </span>
            </div>
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl border border-line bg-background/70 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                  siguiente entrega
                </p>
                <p className="mt-3 text-2xl leading-tight font-semibold">
                  Formalizar el sistema antes de conectar Supabase, FastAPI y RAG.
                </p>
              </div>
              <div className="grid gap-3">
                {milestones.map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-2xl border border-line bg-white/55 p-4"
                  >
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-warm" />
                    <p className="text-sm leading-6 text-muted">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="arquitectura" className="mt-8 grid gap-4 lg:grid-cols-3">
        {architectureBlocks.map((block) => (
          <article key={block.title} className="panel rounded-[1.5rem] p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              dominio interno
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
              {block.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-muted">
              {block.detail}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article id="modulos" className="panel rounded-[1.75rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-muted">
            contrato unificado
          </p>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.05em]">
            Una API modular para curriculum, calendario, contexto y decisiones IA.
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {apiModules.map((moduleName) => (
              <div
                key={moduleName}
                className="rounded-3xl border border-line bg-surface-strong p-5"
              >
                <p className="font-mono text-sm text-accent">{moduleName}</p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Modulo documentado en Fase 0 para definir payloads, errores y
                  responsabilidades antes de implementar.
                </p>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel rounded-[1.75rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-muted">
            decision operativa
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
            No construir por reflejo.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">
            El documento actual pide cerrar primero el modelo de datos, el
            contrato de API y el pipeline de ingestion. Esta app funciona como
            base visual y recordatorio de ese alcance.
          </p>
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-accent/30 bg-accent-soft/70 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
              ruta sugerida
            </p>
            <p className="mt-3 text-sm leading-6 text-foreground">
              El siguiente paso natural es transformar el plan de arquitectura
              en artefactos ejecutables: esquema SQL, contratos OpenAPI y
              especificacion del pipeline.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
