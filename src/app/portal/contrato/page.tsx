"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft, CheckCircle2, Loader2, Trash2, ChevronLeft, ChevronRight,
  FileText, Download,
} from "lucide-react"
import {
  doc, getDoc, setDoc, collection, addDoc, serverTimestamp,
} from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { useAppUser } from "@/hooks/use-app-user"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import SignatureCanvas from "react-signature-canvas"
import type SignatureCanvasType from "react-signature-canvas"
import { Button } from "@/components/ui/button"

// ─────────────────────────────────────────────────────────────
// Páginas del reglamento
// ─────────────────────────────────────────────────────────────

const PAGINAS = [
  {
    titulo: "Requisitos Documentales",
    contenido: (
      <div className="space-y-4">
        <ol className="space-y-3 list-none">
          {[
            "Todos los contratistas, proveedores y clientes cuyas actividades pudiesen exponer a sus empleados, a sus subcontratistas, o a empleados de Viñoplastic Inyección a un riesgo de seguridad, de higiene, de salud o de medio ambiente, deberán firmar al final del Reglamento.",
            "Los contratistas, subcontratistas, proveedores y clientes deben contar con empleados registrados y asegurados ante la institución de seguridad social y para comprobar este requisito, deben entregar copia de su Cédula de Determinación de Cuotas y copia del Comprobante de Pago de Cuotas vigente al momento de la entrega de documentos.",
            "El contratista deberá entregar una copia de las identificaciones oficiales del personal autorizado para el acceso a las instalaciones de Viñoplastic Inyección según sea el caso.",
            "El contratista debe entregar una lista con los nombres del personal que ingresará a Viñoplastic, así como la copia de sus identificaciones RG-ADM-016. Si se requiere ingresar herramientas o equipos deberá llenar el formato RG-SEG-046.",
            "Cuando derivado de las actividades a desarrollar dentro de las instalaciones de Viñoplastic Inyección, el contratista requiera ingresar sustancias químicas, reactivos o cualquier tipo de producto químico, deberá comunicarlo antes de ingresar a la planta y entregar una copia de la Hoja de Datos de Seguridad (HDS) de cada sustancia química, conforme la NOM-018-STPS al área de Seguridad e Higiene para su resguardo.",
            "Todos los contratistas, subcontratistas y proveedores que realicen servicios fuera de las instalaciones de Viñoplastic y que generen residuos peligrosos deben entregar al área de seguridad e higiene su autorización como generador de residuos peligrosos, así como los manifiestos de entrega-recolección de estos.",
            "Reglamento para contratistas firmado por el contratista, subcontratista, proveedor o cliente, según sea el caso.",
            "El contratista deberá llenar los registros: Plan de trabajo y determinación de riesgos RG-SEG-024, en conjunto con el Responsable de Seguridad e Higiene de manera previa a iniciar algún tipo de trabajo de alto riesgo.",
            "El Contratista que no cumpla con estos requisitos documentales, podrá establecer un plazo de cumplimiento para regularizarse. Después de vencido este plazo y reincidir en el incumplimiento documental, no podrá realizar trabajos para Viñoplastic Inyección.",
          ].map((text, i) => (
            <NumberedItem key={i} n={i + 1}>{text}</NumberedItem>
          ))}
        </ol>
        <div className="rounded-lg border border-amber-100 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/40 px-4 py-3">
          <p className="text-[10px] font-medium tracking-[0.08em] uppercase text-amber-700 dark:text-amber-400">Nota importante</p>
          <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">
            Antes de que los contratistas inicien labores en las instalaciones de Viñoplastic Inyección, los documentos anteriormente mencionados deben ser enviados con copia al correo de su contacto en Viñoplastic Inyección a:{" "}
            <a href="mailto:segehigqro@vinoplastic.com.mx" className="font-medium text-foreground underline underline-offset-2">
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
      <ol className="space-y-3 list-none">
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
          <NumberedItem key={i} n={i + 1}>{text}</NumberedItem>
        ))}
      </ol>
    ),
  },
  {
    titulo: "Trabajo en Alturas, Uso de Escaleras y Seguridad Eléctrica",
    contenido: (
      <div className="space-y-6">
        <Subsection title="Trabajo en Alturas">
          {[
            "Debe proporcionarse protección adecuada contra las posibles caídas del personal, mientras trabaja en una posición elevada por arriba de 1.8 metros sobre el nivel del suelo, en caso de resbalar u otra situación inesperada que ocasione que ocurra la caída.",
            "Cuando se utilicen andamios metálicos, el andamio debe estar bien estabilizado y en alturas mayores a 3 secciones del andamio, éste se debe sujetar firmemente a una estructura fija.",
            "Los andamios móviles deben tener sus ruedas bloqueadas al estar en uso. Ningún andamio deberá moverse mientras se encuentre ocupado o mientras existan herramientas o equipo encima.",
          ]}
        </Subsection>
        <Divider />
        <Subsection title="Uso de Escaleras">
          {[
            "Está prohibido utilizar escaleras metálicas en lugares alrededor, cerca de, o que puedan entrar en contacto con instalaciones o equipo eléctrico.",
            "La altura máxima de una escalera de tijera no excederá de 6 metros.",
            "Las escaleras no deben ser utilizadas como plataformas o en las plataformas de los andamios.",
            "Los peldaños y escalones de la escalera deberán mantenerse libres de grasa y aceite.",
            "Las herramientas u otros objetos deberán ser elevados conforme sea necesario o cargados en un estuche para herramientas y no llevados a mano hacia arriba o hacia abajo en la escalera.",
            "Cuando el personal deba realizar trabajo con sus manos desde una escalera, deberá utilizar un cinturón de seguridad u otro dispositivo de sujeción asegurado a un objeto.",
            "Al utilizar escaleras frente a las puertas, se deberá colocar una barricada o señalización en la entrada.",
          ]}
        </Subsection>
        <Divider />
        <Subsection title="Seguridad Eléctrica">
          {[
            "Las herramientas eléctricas portátiles de mano deben estar protegidas con tierra física. Los equipos con carcaza metálica deben contar con clavija con tierra física y deben conectarse a contactos con el voltaje adecuado y con tierra física.",
            "Las extensiones eléctricas deben estar fabricadas con cable de uso rudo, libre de empalmes inseguros y deben contar con contactos aterrizados en una caja cuadrada con tapa.",
            "Los cables que pasen a través del área de trabajo deberán elevarse o cubrirse por protección y acomodarse de forma tal que se elimine cualquier peligro de tropiezo.",
            "El equipo eléctrico debe inspeccionarse y repararse conforme sea necesario.",
            "Antes de iniciar cualquier trabajo en equipo eléctrico, el personal contratista requiere des-energizar, aislar, bloquear y realizar pruebas para verificar las condiciones de des-energizado, como, por ejemplo, utilizando un voltímetro.",
            "El trabajo en áreas cercanas (4 metros) a sistemas de energía eléctrica en donde exista el potencial de contacto accidental o arcos de partes expuestas o vivas, debe ser realizado solo después de que se hayan obtenido las libranzas adecuadas y se hayan tomado las precauciones necesarias.",
            "Se debe dar capacitación en los procedimientos de trabajo seguro a todo el personal del Contratista autorizado para trabajar en o alrededor de sistemas eléctricos vivos. El personal no-autorizado no deberá entrar a los espacios que contengan o que podrían estar sujetos a contacto accidental con equipo eléctrico de alto voltaje como dispositivos de distribución, transformadores o subestaciones.",
          ]}
        </Subsection>
      </div>
    ),
  },
  {
    titulo: "Bloqueo, Aislamiento y Etiquetado / Soldadura y Corte",
    contenido: (
      <div className="space-y-6">
        <Subsection title="Bloqueo, Aislamiento y Etiquetado de Equipo">
          {[
            "El equipo que podría presentar un peligro para el personal si accidentalmente se activara durante el desempeño del trabajo de instalación, reparación, alteración, limpieza o inspección debe ponerse fuera de operación y libre de energía almacenada y/o materiales previos al inicio del trabajo.",
            "En donde el equipo esté sujeto a movimiento físico externo inesperado, como rotación, girar, tirar, caer, rodar, deslizar, etc., deben aplicarse restricciones estructurales y/o mecánicas para evitar dicho movimiento.",
            "El equipo que ha sido bloqueado, inmovilizado o sacado de servicio para reparación o debido a una condición de peligro potencial debe ser etiquetado adecuadamente indicando la razón por la que ha sido aislado y/o sacado de servicio. Las etiquetas deben ser muy visibles y estar sujetas en forma segura.",
          ]}
        </Subsection>
        <Divider />
        <Subsection title="Soldadura y Corte">
          {[
            "El Contratista debe tomar las precauciones necesarias para prevenir incendios en las áreas en donde se lleven a cabo trabajos de soldadura, corte u otros trabajos en caliente.",
            "El personal contratista debe verificar que exista una ventilación adecuada en el área en donde se realiza soldadura, para mantener su exposición por debajo del Límite Permisible de Exposición a los humos y gases de soldadura.",
            "Cuando no se pueda mantener una ventilación adecuada, el personal contratista debe utilizar respiradores o mascarillas.",
            "Las máquinas (plantas) de soldar deben estar desconectadas cuando se mueven y deben estar apagadas cuando dejen de utilizarse. Deben estar desconectadas en la fuente primaria de suministro al final de la jornada de trabajo. Las soldadoras impulsadas por motor de combustión interna deben instalarse en el exterior, alejadas de cualquier fuente de ventilación artificial.",
            "Las máquinas de soldar y equipos de corte que usen los contratistas deben cumplir con las normas de seguridad que se establecen en este reglamento y con la norma oficial mexicana respectiva; no se permitirá modificar herramienta o equipo.",
            "Los cables de soldar deben ser colocados en forma tal que no se dañen o representen un peligro de tropiezo.",
            "Queda prohibido el uso de tanques de gas doméstico en trabajos de corte y soldadura. Para otros usos, deberán obtener la autorización del departamento de seguridad y salud en el trabajo, por conducto del supervisor del proyecto.",
          ]}
        </Subsection>
      </div>
    ),
  },
  {
    titulo: "Generación y Separación de Residuos",
    contenido: (
      <div className="space-y-5">
        <p className="text-sm text-foreground/80 leading-relaxed">
          Los residuos que sean generados durante las actividades deberán ser separados de acuerdo con la siguiente clasificación general:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* No Peligrosos */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
            <p className="text-[10px] font-medium tracking-[0.08em] uppercase text-foreground">
              a) Residuos No Peligrosos
            </p>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 leading-relaxed">
              {["Papel", "Cartón", "PET", "Inorgánicos", "Plástico", "Maderas", "Latas de aluminio"].map(r => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>

          {/* Peligrosos */}
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
            <p className="text-[10px] font-medium tracking-[0.08em] uppercase text-destructive">
              b) Residuos Peligrosos
            </p>
            <p className="text-xs text-foreground/80 leading-relaxed">
              Requieren recipientes específicos identificados con el nombre del residuo. Notificar al contacto en Viñoplastic para autorización de ingreso al almacén de residuos peligrosos.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Para residuos no peligrosos, colocarlos en los contenedores asignados en los diferentes puntos de la planta. Para residuos peligrosos, notificar al contacto en Viñoplastic quien solicitará la autorización al área de Seguridad e Higiene y realizará el registro en la bitácora correspondiente.
        </p>

        <Divider />

        <Subsection title="Derrames de Aceite o Químicos">
          {[
            "El contratista deberá seguir las medidas para prevenir derrame de aceite o sustancias durante la ejecución de los trabajos que realice.",
            "En caso de derrames, el contratista deberá informar a su contacto en Viñoplastic quien a su vez dará aviso al responsable de seguridad e higiene y al personal de mantenimiento para poner en marcha el plan de contingencia para casos de derrames.",
            "El contratista no podrá ingresar a nuestras instalaciones ningún tipo de unidad que presente fugas de aceite, líquidos de frenos, fluidos de transmisión, anticongelante/refrigerante o combustible (gasolina o diésel); esto para evitar la contaminación del suelo y la adopción de medidas de remediación.",
          ]}
        </Subsection>
      </div>
    ),
  },
]

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

export default function ContratoPage() {
  const db = useFirestore()
  const { appUser } = useAppUser()
  const sigRef = useRef<SignatureCanvasType>(null)

  const [status, setStatus] = useState<'loading' | 'pendiente' | 'firmado' | 'error'>('loading')
  const [fechaFirma, setFechaFirma] = useState<Date | null>(null)
  const [pagina, setPagina] = useState(0)
  const [firmando, setFirmando] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [signatureImg, setSignatureImg] = useState<string | null>(null)
  const [canvasKey, setCanvasKey] = useState(0)

  const companyId = appUser?.companyId
  const totalPaginas = PAGINAS.length + 1
  const enUltimaPagina = pagina === totalPaginas - 1
  const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

  useEffect(() => {
    if (!db || !companyId) return
    getDoc(doc(db, 'companies', companyId))
      .then(s => {
        if (s.exists()) {
          setCompanyName(s.data().name ?? '')
          setContactName(s.data().contact ?? '')
        }
      })
      .catch(() => { })
    getDoc(doc(db, 'contratos', companyId))
      .then(async snap => {
        if (snap.exists()) {
          const data = snap.data()
          const isFirmado = data.status === 'firmado'
          setStatus(isFirmado ? 'firmado' : 'pendiente')
          if (data.fechaFirma?.toDate) setFechaFirma(data.fechaFirma.toDate())
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

  const guardarFirma = useCallback(async () => {
    if (!db || !companyId || !appUser) return
    if (sigRef.current?.isEmpty()) return

    setFirmando(true)
    try {
      const dataURL = sigRef.current!.getCanvas().toDataURL('image/png')
      const now = serverTimestamp()

      await setDoc(doc(db, 'contratos', companyId), {
        status: 'firmado',
        fechaFirma: now,
        firmadoPor: appUser.uid,
        nombreFirmante: appUser.name ?? appUser.email ?? '',
      }, { merge: true })

      await addDoc(collection(db, 'contratos', companyId, 'firmas'), {
        canvasData: dataURL,
        fecha: now,
        firmadoPor: appUser.uid,
      })

      setSignatureImg(dataURL)
      setStatus('firmado')
      setFechaFirma(new Date())
    } catch (err) {
      console.error('Error guardando firma:', err)
    } finally {
      setFirmando(false)
    }
  }, [db, companyId, appUser])

  // ── Loading ───────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ── Ya firmado: comprobante imprimible ────────────────────
  if (status === 'firmado') {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        {/* Controles */}
        <div className="flex items-center gap-3 print:hidden">
          <BackButton />
          <div className="flex-1" />
          <Button
            size="sm"
            onClick={async () => {
              const el = document.getElementById('contrato-print')
              if (!el) return
              const html2canvas = (await import('html2canvas')).default
              const { jsPDF } = await import('jspdf')
              const canvas = await html2canvas(el, { scale: 2, useCORS: true })
              const imgData = canvas.toDataURL('image/png')
              const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] })
              pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
              pdf.save(`reglamento-${(companyName || 'contratista').replace(/\s+/g, '_')}.pdf`)
            }}
            className="h-9 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Guardar PDF
          </Button>
        </div>

        {/* Documento */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          id="contrato-print"
          className="rounded-xl border border-border bg-background shadow-sm p-8 sm:p-10 space-y-6 print:shadow-none print:border-none print:rounded-none"
        >
          {/* Encabezado */}
          <div className="text-center space-y-1.5 pb-5 border-b border-border">
            <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-foreground">
              ViñoPlastic Inyección
            </p>
            <p className="text-sm font-medium text-foreground">
              Reglamento para Contratistas, Subcontratistas, Proveedores y Clientes
            </p>
            <p className="text-xs text-muted-foreground">Acuse de recibo y aceptación</p>
          </div>

          {/* Confirmación — chip success del login */}
          <div className="flex items-start gap-3 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Acepto y me comprometo a cumplir con lo estipulado en el presente reglamento.
            </p>
          </div>

          {/* Datos */}
          <div className="space-y-4">
            <Row label="Nombre de la compañía contratista" value={companyName || '—'} />
            <Row label="Nombre del representante legal" value={contactName || appUser?.email || '—'} />

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                Firma del representante legal
              </p>
              <div className="flex items-center justify-center h-32 rounded-lg border border-border bg-muted/40">
                {signatureImg
                  ? <img src={signatureImg} alt="Firma" className="max-h-full max-w-full object-contain" />
                  : <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                }
              </div>
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

          <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
            Este documento es un comprobante digital generado por ViñoPlastic Inyección.
          </p>
        </motion.div>
      </div>
    )
  }

  // ── Reglamento + firma ────────────────────────────────────
  const paginaActual = PAGINAS[pagina]

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            Reglamento para contratistas
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Página {pagina + 1} de {totalPaginas}
          </p>
        </div>
        <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
      </div>

      {/* Progress */}
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-foreground rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((pagina + 1) / totalPaginas) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      {/* Card */}
      <motion.div
        key={pagina}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="rounded-xl border border-border bg-background shadow-sm overflow-hidden"
      >
        {!enUltimaPagina && paginaActual && (
          <div className="px-6 sm:px-10 py-8 min-h-[420px] space-y-4">
            <div>
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                Sección {pagina + 1}
              </p>
              <p className="text-sm font-medium text-foreground mt-1">
                {paginaActual.titulo}
              </p>
            </div>
            <div className="border-t border-border pt-4 text-sm text-foreground/80 leading-relaxed">
              {paginaActual.contenido}
            </div>
          </div>
        )}

        {enUltimaPagina && (
          <div className="px-6 sm:px-10 py-8 min-h-[420px] space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground">Aceptación y firma</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Acepto y me comprometo a cumplir con lo estipulado en el presente reglamento.
              </p>
            </div>

            {/* Campos formales */}
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-4">
              <Field label="Nombre de la compañía">
                <p className="text-sm font-medium text-foreground">{companyName || '—'}</p>
              </Field>

              <Field label="Nombre del representante">
                <p className="text-sm font-medium text-foreground mb-2">
                  {contactName || appUser?.email || '—'}
                </p>
                <CanvasWrapper key={canvasKey} sigRef={sigRef} />
              </Field>

              <Field label="Fecha de firma">
                <p className="text-sm font-medium text-foreground capitalize">{today}</p>
              </Field>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCanvasKey(k => k + 1)}
                className="h-9 text-xs text-muted-foreground"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpiar firma
              </Button>
              <Button
                onClick={guardarFirma}
                disabled={firmando}
                className="h-10 text-sm"
              >
                {firmando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
                  : 'Firmar y aceptar'
                }
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <button
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors",
            pagina === 0 && "opacity-40 pointer-events-none",
          )}
          onClick={() => setPagina(p => p - 1)}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Anterior
        </button>

        {/* Dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalPaginas }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPagina(i)}
              aria-label={`Ir a página ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === pagina ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60",
              )}
            />
          ))}
        </div>

        <button
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-3 text-xs text-foreground hover:bg-muted/40 rounded-md transition-colors",
            enUltimaPagina && "opacity-40 pointer-events-none",
          )}
          onClick={() => setPagina(p => p + 1)}
        >
          Siguiente
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function NumberedItem({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-foreground/80 leading-relaxed">
      <span className="shrink-0 w-6 text-xs font-mono font-medium text-muted-foreground tabular-nums">
        {String(n).padStart(2, "0")}
      </span>
      <p>{children}</p>
    </li>
  )
}

function Subsection({ title, children }: { title: string; children: string[] }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-foreground">
        {title}
      </p>
      <ol className="space-y-3 list-none">
        {children.map((text, i) => (
          <NumberedItem key={i} n={i + 1}>{text}</NumberedItem>
        ))}
      </ol>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-border" />
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground capitalize">{value}</p>
    </div>
  )
}

function CanvasWrapper({ sigRef }: { sigRef: React.RefObject<SignatureCanvasType | null> }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const el = wrapRef.current
    if (!el) return
    const t = setTimeout(() => {
      const canvas = el.querySelector('canvas')
      if (!canvas) return
      const { width, height } = el.getBoundingClientRect()
      canvas.width = Math.round(width)
      canvas.height = Math.round(height)
    }, 80)
    return () => clearTimeout(t)
  }, [mounted])

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden touch-none rounded-lg border-2 border-dashed border-border bg-white"
      style={{ height: 160 }}
    >
      <SignatureCanvas
        ref={sigRef}
        canvasProps={{ style: { width: '100%', height: '100%', display: 'block' } }}
        backgroundColor="white"
        penColor="#0a1317"
      />
      <p className="absolute inset-x-0 bottom-2 text-center pointer-events-none select-none text-xs text-muted-foreground">
        Dibuja tu firma aquí
      </p>
    </div>
  )
}

function BackButton() {
  return (
    <Link
      href="/portal"
      aria-label="Volver al portal"
      className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
    </Link>
  )
}
