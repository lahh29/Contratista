"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft, CheckCircle2, Loader2, Trash2, ChevronLeft, ChevronRight, FileText,
} from "lucide-react"
import {
  doc, getDoc, setDoc, collection, addDoc, serverTimestamp,
} from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { useAppUser } from "@/hooks/use-app-user"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import SignatureCanvas from "react-signature-canvas"
import type SignatureCanvasType from "react-signature-canvas"

// ── Páginas del reglamento ────────────────────────────────────────────────────
// Agrega o quita páginas según tu documento real.
const PAGINAS = [
  {
    titulo: "Requisitos Documentales",
    contenido: (
      <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
        <ol className="space-y-4 list-none">
          <li className="flex gap-3">
            <span className="shrink-0 font-bold text-foreground">1.</span>
            <p>Todos los contratistas, proveedores y clientes cuyas actividades pudiesen exponer a sus empleados, a sus subcontratistas, o a empleados de Viñoplastic Inyección a un riesgo de seguridad, de higiene, de salud o de medio ambiente, deberán firmar al final del Reglamento.</p>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-bold text-foreground">2.</span>
            <p>Los contratistas, subcontratistas, proveedores y clientes deben contar con empleados registrados y asegurados ante la institución de seguridad social y para comprobar este requisito, deben entregar copia de su Cédula de Determinación de Cuotas y copia del Comprobante de Pago de Cuotas vigente al momento de la entrega de documentos.</p>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-bold text-foreground">3.</span>
            <p>El contratista deberá entregar una copia de las identificaciones oficiales del personal autorizado para el acceso a las instalaciones de Viñoplastic Inyección según sea el caso.</p>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-bold text-foreground">4.</span>
            <p>El contratista debe entregar una lista con los nombres del personal que ingresará a Viñoplastic, así como la copia de sus identificaciones <strong>RG-ADM-016</strong>. Si se requiere ingresar herramientas o equipos deberá llenar el formato <strong>RG-SEG-046</strong>.</p>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-bold text-foreground">5.</span>
            <p>Cuando derivado de las actividades a desarrollar dentro de las instalaciones de Viñoplastic Inyección, el contratista requiera ingresar sustancias químicas, reactivos o cualquier tipo de producto químico, deberá comunicarlo antes de ingresar a la planta y entregar una copia de la Hoja de Datos de Seguridad (HDS) de cada sustancia química, conforme la <strong>NOM-018-STPS</strong> al área de Seguridad e Higiene para su resguardo.</p>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-bold text-foreground">6.</span>
            <p>Todos los contratistas, subcontratistas y proveedores que realicen servicios fuera de las instalaciones de Viñoplastic y que generen residuos peligrosos deben entregar al área de seguridad e higiene su autorización como generador de residuos peligrosos, así como los manifiestos de entrega-recolección de estos.</p>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-bold text-foreground">7.</span>
            <p>Reglamento para contratistas firmado por el contratista, subcontratista, proveedor o cliente, según sea el caso.</p>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-bold text-foreground">8.</span>
            <p>El contratista deberá llenar los registros: Plan de trabajo y determinación de riesgos <strong>RG-SEG-024</strong>, en conjunto con el Responsable de Seguridad e Higiene de manera previa a iniciar algún tipo de trabajo de alto riesgo.</p>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-bold text-foreground">9.</span>
            <p>El Contratista que no cumpla con estos requisitos documentales, podrá establecer un plazo de cumplimiento para regularizarse. Después de vencido este plazo y reincidir en el incumplimiento documental, no podrá realizar trabajos para Viñoplastic Inyección.</p>
          </li>
        </ol>
        <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Nota importante</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
            Antes de que los contratistas inicien labores en las instalaciones de Viñoplastic Inyección, los documentos anteriormente mencionados deben ser enviados con copia al correo de su contacto en Viñoplastic Inyección a:{' '}
            <a href="mailto:segehigqro@vinoplastic.com.mx" className="font-semibold underline underline-offset-2">
              segehigqro@vinoplastic.com.mx
            </a>
          </p>
        </div>
      </div>
    ),
  },
  {
    titulo: "Requisitos de Seguridad",
    contenido: (
      <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
        <ol className="space-y-4 list-none">
          {[
            "El Contratista debe informar a sus empleados acerca de los peligros potenciales, tomar las acciones adecuadas para reducir los peligros potenciales y estar preparado para responder a situaciones de emergencia.",
            "El Contratista debe proporcionar el tratamiento médico de emergencia, incluyendo de primeros auxilios a sus empleados. El Contratista deberá tener a la mano los nombres y números telefónicos de personal médico fuera de la instalación para el manejo de incidentes mayores.",
            "El personal del Contratista debe limitar sus actividades a las áreas de trabajo asignadas.",
            "El Personal del Contratista debe utilizar solamente las instalaciones designadas para actividades fuera de trabajo tales como fumar, comer o usar el sanitario.",
            "Los trabajadores del Contratista, asignados en las instalaciones de Viñoplastic Inyección, deberán portar un distintivo a fin de identificarlos del personal interno (credencial visible, playera con logotipo del contratista, etc.)",
            "Ningún empleado del Contratista puede trabajar si se encuentra incapacitado por el efecto de cualquier substancia, medicamento o alcohol.",
            "No se permitirá la entrada a trabajadores menores de 18 años.",
            "El Contratista debe promover y asegurarse de que sus empleados obedezcan todas las señales de advertencia, de precaución, identificación de sustancias, procesos e instrucciones colocadas a la vista.",
            "El Contratista debe mantener limpio y ordenado el sitio de trabajo en todo momento. Esto incluirá el mantener ordenadas las operaciones, herramientas, equipo, instalaciones de almacenamiento y suministros durante la duración del trabajo.",
            "El personal de Viñoplastic podrá realizar inspecciones de seguridad al área de trabajo y en caso de incumplimiento, podrá suspender la realización de los trabajos hasta que el incumplimiento sea subsanado.",
            "Todo trabajo deberá de contar con un supervisor responsable, quién deberá estar permanentemente en la actividad.",
            "El Contratista deberá otorgar el equipo de protección a su personal asignado, de acuerdo con el tipo de trabajo a realizar.",
            "El Contratista deberá proporcionarles a sus empleados, capacitación en cuanto al uso, ajuste, mantenimiento y disposición segura de cualquier equipo de protección personal que requiera utilizar.",
            "Todo accidente ocurrido a los contratistas, dentro de las instalaciones de la planta de Viñoplastic Inyección, será reportado al departamento de seguridad por escrito.",
          ].map((text, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 font-bold text-foreground">{i + 1}.</span>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    titulo: "Trabajo en Alturas, Uso de Escaleras y Seguridad Eléctrica",
    contenido: (
      <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">

        {/* Trabajo en alturas */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground uppercase tracking-wide text-xs">Trabajo en Alturas</h3>
          <ol className="space-y-3 list-none">
            {[
              "Debe proporcionarse protección adecuada contra las posibles caídas del personal, mientras trabaja en una posición elevada por arriba de 1.8 metros sobre el nivel del suelo, en caso de resbalar u otra situación inesperada que ocasione que ocurra la caída.",
              "Cuando se utilicen andamios metálicos, el andamio debe estar bien estabilizado y en alturas mayores a 3 secciones del andamio, éste se debe sujetar firmemente a una estructura fija.",
              "Los andamios móviles deben tener sus ruedas bloqueadas al estar en uso. Ningún andamio deberá moverse mientras se encuentre ocupado o mientras existan herramientas o equipo encima.",
            ].map((text, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 font-bold text-foreground">{i + 1}.</span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-border/50" />

        {/* Uso de escaleras */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground uppercase tracking-wide text-xs">Uso de Escaleras</h3>
          <ol className="space-y-3 list-none">
            {[
              "Está prohibido utilizar escaleras metálicas en lugares alrededor, cerca de, o que puedan entrar en contacto con instalaciones o equipo eléctrico.",
              "La altura máxima de una escalera de tijera no excederá de 6 metros.",
              "Las escaleras no deben ser utilizadas como plataformas o en las plataformas de los andamios.",
              "Los peldaños y escalones de la escalera deberán mantenerse libres de grasa y aceite.",
              "Las herramientas u otros objetos deberán ser elevados conforme sea necesario o cargados en un estuche para herramientas y no llevados a mano hacia arriba o hacia abajo en la escalera.",
              "Cuando el personal deba realizar trabajo con sus manos desde una escalera, deberá utilizar un cinturón de seguridad u otro dispositivo de sujeción asegurado a un objeto.",
              "Al utilizar escaleras frente a las puertas, se deberá colocar una barricada o señalización en la entrada.",
            ].map((text, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 font-bold text-foreground">{i + 1}.</span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-border/50" />

        {/* Seguridad eléctrica */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground uppercase tracking-wide text-xs">Seguridad Eléctrica</h3>
          <ol className="space-y-3 list-none">
            {[
              "Las herramientas eléctricas portátiles de mano deben estar protegidas con tierra física. Los equipos con carcaza metálica deben contar con clavija con tierra física y deben conectarse a contactos con el voltaje adecuado y con tierra física.",
              "Las extensiones eléctricas deben estar fabricadas con cable de uso rudo, libre de empalmes inseguros y deben contar con contactos aterrizados en una caja cuadrada con tapa.",
              "Los cables que pasen a través del área de trabajo deberán elevarse o cubrirse por protección y acomodarse de forma tal que se elimine cualquier peligro de tropiezo.",
              "El equipo eléctrico debe inspeccionarse y repararse conforme sea necesario.",
              "Antes de iniciar cualquier trabajo en equipo eléctrico, el personal contratista requiere des-energizar, aislar, bloquear y realizar pruebas para verificar las condiciones de des-energizado, como, por ejemplo, utilizando un voltímetro.",
              "El trabajo en áreas cercanas (4 metros) a sistemas de energía eléctrica en donde exista el potencial de contacto accidental o arcos de partes expuestas o vivas, debe ser realizado solo después de que se hayan obtenido las libranzas adecuadas y se hayan tomado las precauciones necesarias.",
              "Se debe dar capacitación en los procedimientos de trabajo seguro a todo el personal del Contratista autorizado para trabajar en o alrededor de sistemas eléctricos vivos. El personal no-autorizado no deberá entrar a los espacios que contengan o que podrían estar sujetos a contacto accidental con equipo eléctrico de alto voltaje como dispositivos de distribución, transformadores o subestaciones.",
            ].map((text, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 font-bold text-foreground">{i + 1}.</span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>

      </div>
    ),
  },
  {
    titulo: "Bloqueo, Aislamiento y Etiquetado / Soldadura y Corte",
    contenido: (
      <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">

        {/* Bloqueo */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground uppercase tracking-wide text-xs">Bloqueo, Aislamiento y Etiquetado de Equipo</h3>
          <ol className="space-y-3 list-none">
            {[
              "El equipo que podría presentar un peligro para el personal si accidentalmente se activara durante el desempeño del trabajo de instalación, reparación, alteración, limpieza o inspección debe ponerse fuera de operación y libre de energía almacenada y/o materiales previos al inicio del trabajo.",
              "En donde el equipo esté sujeto a movimiento físico externo inesperado, como rotación, girar, tirar, caer, rodar, deslizar, etc., deben aplicarse restricciones estructurales y/o mecánicas para evitar dicho movimiento.",
              "El equipo que ha sido bloqueado, inmovilizado o sacado de servicio para reparación o debido a una condición de peligro potencial debe ser etiquetado adecuadamente indicando la razón por la que ha sido aislado y/o sacado de servicio. Las etiquetas deben ser muy visibles y estar sujetas en forma segura.",
            ].map((text, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 font-bold text-foreground">{i + 1}.</span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-border/50" />

        {/* Soldadura y corte */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground uppercase tracking-wide text-xs">Soldadura y Corte</h3>
          <ol className="space-y-3 list-none">
            {[
              "El Contratista debe tomar las precauciones necesarias para prevenir incendios en las áreas en donde se lleven a cabo trabajos de soldadura, corte u otros trabajos en caliente.",
              "El personal contratista debe verificar que exista una ventilación adecuada en el área en donde se realiza soldadura, para mantener su exposición por debajo del Límite Permisible de Exposición a los humos y gases de soldadura.",
              "Cuando no se pueda mantener una ventilación adecuada, el personal contratista debe utilizar respiradores o mascarillas.",
              "Las máquinas (plantas) de soldar deben estar desconectadas cuando se mueven y deben estar apagadas cuando dejen de utilizarse. Deben estar desconectadas en la fuente primaria de suministro al final de la jornada de trabajo. Las soldadoras impulsadas por motor de combustión interna deben instalarse en el exterior, alejadas de cualquier fuente de ventilación artificial.",
              "Las máquinas de soldar y equipos de corte que usen los contratistas deben cumplir con las normas de seguridad que se establecen en este reglamento y con la norma oficial mexicana respectiva; no se permitirá modificar herramienta o equipo.",
              "Los cables de soldar deben ser colocados en forma tal que no se dañen o representen un peligro de tropiezo.",
              "Queda prohibido el uso de tanques de gas doméstico en trabajos de corte y soldadura. Para otros usos, deberán obtener la autorización del departamento de seguridad y salud en el trabajo, por conducto del supervisor del proyecto.",
            ].map((text, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 font-bold text-foreground">{i + 1}.</span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>

      </div>
    ),
  },
  {
    titulo: "Generación y Separación de Residuos",
    contenido: (
      <div className="space-y-5 text-sm text-foreground/80 leading-relaxed">

        <p>Los residuos que sean generados durante las actividades deberán ser separados de acuerdo con la siguiente clasificación general:</p>

        {/* Clasificación */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">a) Residuos No Peligrosos</p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
              {["Papel","Cartón","PET","Inorgánicos","Plástico","Maderas","Latas de aluminio"].map(r => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 space-y-1">
            <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">b) Residuos Peligrosos</p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70">Requieren recipientes específicos identificados con el nombre del residuo. Notificar al contacto en Viñoplastic para autorización de ingreso al almacén de residuos peligrosos.</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Para residuos no peligrosos, colocarlos en los contenedores asignados en los diferentes puntos de la planta. Para residuos peligrosos, notificar al contacto en Viñoplastic quien solicitará la autorización al área de Seguridad e Higiene y realizará el registro en la bitácora correspondiente.
        </p>

        <div className="border-t border-border/50" />

        {/* Derrames */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground uppercase tracking-wide text-xs">Derrames de Aceite o Químicos</h3>
          <ol className="space-y-3 list-none">
            {[
              "El contratista deberá seguir las medidas para prevenir derrame de aceite o sustancias durante la ejecución de los trabajos que realice.",
              "En caso de derrames, el contratista deberá informar a su contacto en Viñoplastic quien a su vez dará aviso al responsable de seguridad e higiene y al personal de mantenimiento para poner en marcha el plan de contingencia para casos de derrames.",
              "El contratista no podrá ingresar a nuestras instalaciones ningún tipo de unidad que presente fugas de aceite, líquidos de frenos, fluidos de transmisión, anticongelante/refrigerante o combustible (gasolina o diésel); esto para evitar la contaminación del suelo y la adopción de medidas de remediación.",
            ].map((text, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 font-bold text-foreground">{i + 1}.</span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>

      </div>
    ),
  },
]

// ── Componente principal ──────────────────────────────────────────────────────
export default function ContratoPage() {
  const db               = useFirestore()
  const { appUser }      = useAppUser()
  const sigRef           = useRef<SignatureCanvasType>(null)
  const canvasWrapRef    = useRef<HTMLDivElement>(null)

  const [status, setStatus]             = useState<'loading' | 'pendiente' | 'firmado' | 'error'>('loading')
  const [fechaFirma, setFechaFirma]     = useState<Date | null>(null)
  const [pagina, setPagina]             = useState(0)
  const [firmando, setFirmando]         = useState(false)
  const [companyName, setCompanyName]     = useState('')
  const [contactName, setContactName]     = useState('')
  const [signatureImg, setSignatureImg] = useState<string | null>(null)
  const [canvasKey, setCanvasKey]       = useState(0)

  const companyId    = appUser?.companyId
  const totalPaginas = PAGINAS.length + 1 // +1 = página de firma
  const enUltimaPagina = pagina === totalPaginas - 1
  const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

  // ── Cargar empresa y verificar contrato ────────────────────────────────────
  useEffect(() => {
    if (!db || !companyId) return
    // Nombre de empresa
    getDoc(doc(db, 'companies', companyId))
      .then(s => {
        if (s.exists()) {
          setCompanyName(s.data().name ?? '')
          setContactName(s.data().contact ?? '')
        }
      })
      .catch(() => {})
    // Estado del contrato + firma guardada
    getDoc(doc(db, 'contratos', companyId))
      .then(async snap => {
        if (snap.exists()) {
          const data = snap.data()
          const isFirmado = data.status === 'firmado'
          setStatus(isFirmado ? 'firmado' : 'pendiente')
          if (data.fechaFirma?.toDate) setFechaFirma(data.fechaFirma.toDate())
          // Cargar primera firma guardada para la vista de impresión
          if (isFirmado) {
            const { getDocs, collection: col, query, limit } = await import('firebase/firestore')
            const q = query(col(db, 'contratos', companyId, 'firmas'), limit(1))
            const firmasSnap = await getDocs(q)
            if (!firmasSnap.empty) setSignatureImg(firmasSnap.docs[0].data().canvasData ?? null)
          }
        } else {
          setStatus('pendiente')
        }
      })
      .catch(() => setStatus('error'))
  }, [db, companyId])

  // ── Guardar firma ───────────────────────────────────────────────────────────
  const guardarFirma = useCallback(async () => {
    if (!db || !companyId || !appUser) return
    if (sigRef.current?.isEmpty()) return

    setFirmando(true)
    try {
      const dataURL = sigRef.current!.getCanvas().toDataURL('image/png')
      const now     = serverTimestamp()

      // Actualizar / crear documento principal del contrato
      await setDoc(doc(db, 'contratos', companyId), {
        status:         'firmado',
        fechaFirma:     now,
        firmadoPor:     appUser.uid,
        nombreFirmante: appUser.name ?? appUser.email ?? '',
      }, { merge: true })

      // Añadir firma a la subcollección
      await addDoc(collection(db, 'contratos', companyId, 'firmas'), {
        canvasData: dataURL,
        fecha:      now,
        firmadoPor: appUser.uid,
      })

      setStatus('firmado')
      setFechaFirma(new Date())
    } catch (err) {
      console.error('Error guardando firma:', err)
    } finally {
      setFirmando(false)
    }
  }, [db, companyId, appUser])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // ── Ya firmado ──────────────────────────────────────────────────────────────
  if (status === 'firmado') {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Controles — se ocultan al imprimir */}
        <div className="flex items-center gap-3 print:hidden">
          <BackButton />
          <div className="flex-1" />
          <Button size="sm" onClick={() => window.print()} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Imprimir / Guardar PDF
          </Button>
        </div>

        {/* Documento imprimible */}
        <div id="contrato-print" className="rounded-2xl border border-border bg-card shadow-sm p-8 space-y-6 print:shadow-none print:border-none print:rounded-none print:p-6">

          {/* Encabezado */}
          <div className="text-center space-y-1 border-b border-border pb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">ViñoPlastic Inyección</p>
            <h1 className="text-base font-black uppercase tracking-wide">Reglamento para Contratistas, Subcontratistas, Proveedores y Clientes</h1>
            <p className="text-xs text-muted-foreground">Acuse de recibo y aceptación</p>
          </div>

          {/* Confirmación */}
          <div className="flex items-start gap-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
              Acepto y me comprometo a cumplir con lo estipulado en el presente reglamento.
            </p>
          </div>

          {/* Datos */}
          <div className="space-y-4">
            <Row label="Nombre de la compañía contratista" value={companyName || '—'} />
            <Row label="Nombre del representante legal" value={contactName || appUser?.email || '—'} />

            {/* Firma */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Firma del representante legal</p>
              <div className="rounded-xl border border-border bg-muted/20 flex items-center justify-center" style={{ height: 120 }}>
                {signatureImg
                  ? <img src={signatureImg} alt="Firma" className="max-h-full max-w-full object-contain" />
                  : <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                }
              </div>
              <div className="h-px bg-border/60" />
            </div>

            <Row
              label="Fecha de firma"
              value={fechaFirma
                ? fechaFirma.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
                  + ' · '
                  + fechaFirma.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                : '—'
              }
            />
          </div>

          {/* Pie */}
          <p className="text-[11px] text-muted-foreground text-center border-t border-border/60 pt-4">
            Este documento es un comprobante digital generado por ViñoPlastic Inyección.
          </p>
        </div>
      </div>
    )
  }

  // ── Reglamento + firma ──────────────────────────────────────────────────────
  const paginaActual = PAGINAS[pagina]

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight truncate">REGLAMENTO PARA CONTRATISTAS, SUBCONTRATISTAS, PROVEEDORES Y CLIENTES</h1>
          <p className="text-xs text-muted-foreground">
            Página {pagina + 1} de {totalPaginas}
          </p>
        </div>
        <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((pagina + 1) / totalPaginas) * 100}%` }}
        />
      </div>

      {/* Contenido */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

        {/* Páginas del reglamento */}
        {!enUltimaPagina && paginaActual && (
          <div className="p-6 md:p-8 space-y-4 min-h-[420px]">
            <h2 className="text-base font-bold text-foreground">{paginaActual.titulo}</h2>
            <div className="border-t border-border/60 pt-4">
              {paginaActual.contenido}
            </div>
          </div>
        )}

        {/* Última página: aceptación y firma */}
        {enUltimaPagina && (
          <div className="p-6 md:p-8 space-y-6 min-h-[420px]">
            <div className="space-y-1">
              <h2 className="text-base font-bold">Aceptación y Firma</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Acepto y me comprometo a cumplir con lo estipulado en el presente reglamento.
              </p>
            </div>

            {/* Campos formales */}
            <div className="space-y-4 border border-border/60 rounded-xl p-4 bg-muted/20">
              {/* Empresa */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Nombre de la compañía
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {companyName || '—'}
                </p>
                <div className="h-px bg-border/60" />
              </div>

              {/* Representante + canvas */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Nombre y firma del representante legal
                </p>
                <p className="text-sm font-medium text-foreground mb-2">
                  {contactName || appUser?.email || '—'}
                </p>

                {/* Canvas — tamaño real fijado en píxeles para móvil/HiDPI */}
                <CanvasWrapper key={canvasKey} sigRef={sigRef} />
                <div className="h-px bg-border/60" />
              </div>

              {/* Fecha */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Fecha de firma del reglamento
                </p>
                <p className="text-sm font-medium text-foreground capitalize">{today}</p>
                <div className="h-px bg-border/60" />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5 text-xs"
                onClick={() => setCanvasKey(k => k + 1)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpiar firma
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={firmando}
                onClick={guardarFirma}
              >
                {firmando
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…</>
                  : 'Firmar y aceptar'
                }
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina === 0}
          onClick={() => setPagina(p => p - 1)}
          className="gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        {/* Dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalPaginas }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPagina(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-200',
                i === pagina ? 'w-5 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50',
              )}
            />
          ))}
        </div>

        <Button
          variant={enUltimaPagina ? 'ghost' : 'outline'}
          size="sm"
          disabled={enUltimaPagina}
          onClick={() => setPagina(p => p + 1)}
          className="gap-1.5"
        >
          Siguiente
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Canvas con dimensiones reales para móvil/HiDPI ───────────────────────────
function CanvasWrapper({ sigRef }: { sigRef: React.RefObject<SignatureCanvasType | null> }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Solo mostrar en cliente (react-signature-canvas necesita el DOM)
  useEffect(() => { setMounted(true) }, [])

  // Sincronizar dimensiones del canvas UNA vez al montar
  useEffect(() => {
    if (!mounted) return
    const el = wrapRef.current
    if (!el) return
    const t = setTimeout(() => {
      const canvas = el.querySelector('canvas')
      if (!canvas) return
      const { width, height } = el.getBoundingClientRect()
      canvas.width  = Math.round(width)
      canvas.height = Math.round(height)
    }, 80)
    return () => clearTimeout(t)
  }, [mounted])

  return (
    <div ref={wrapRef} className="relative rounded-xl border-2 border-dashed border-border bg-background overflow-hidden touch-none" style={{ height: 160 }}>
      {mounted && (
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{ style: { width: '100%', height: '100%', display: 'block' } }}
          backgroundColor="transparent"
          penColor="hsl(var(--foreground))"
        />
      )}
      <p className="absolute inset-x-0 bottom-2 text-center text-[11px] text-muted-foreground/40 pointer-events-none select-none">
        Dibuja tu firma aquí
      </p>
    </div>
  )
}

// ── Row helper para datos del comprobante ────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-foreground capitalize">{value}</p>
      <div className="h-px bg-border/60" />
    </div>
  )
}

// ── Back button reutilizable ──────────────────────────────────────────────────
function BackButton() {
  return (
    <Link
      href="/portal"
      aria-label="Volver al portal"
      className="
        inline-flex items-center justify-center
        w-10 h-10 shrink-0 rounded-2xl
        bg-white/20 dark:bg-white/10
        backdrop-blur-xl
        border border-white/40 dark:border-white/20
        shadow-[0_4px_24px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]
        dark:shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
        text-foreground/70 hover:text-foreground
        hover:bg-white/35 dark:hover:bg-white/20
        transition-all duration-200 active:scale-95
      "
    >
      <ArrowLeft className="w-4 h-4" />
    </Link>
  )
}
