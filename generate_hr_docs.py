import os
import time

try:
    import win32com.client
    has_word = True
except ImportError:
    has_word = False
    print("Aviso: No se detectó 'pywin32'. Se generará el archivo HTML en su lugar.")

style = """
<style>
  body { background-color: #111111; margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #FFFFFF; }
  .doc-container { background-color: #151515; padding: 40px; border: 1px solid #333; max-width: 900px; margin: auto; }
  .logo-st { color: #FFC107; font-size: 48pt; font-weight: 900; font-family: 'Arial Black', sans-serif; line-height: 0.8; margin-bottom: 0; }
  .logo-energy { color: #FFFFFF; font-size: 14pt; font-weight: bold; letter-spacing: 6px; font-family: Arial, sans-serif; margin-bottom: 20px; margin-top: 5px; }
  .header-line { height: 3px; background: linear-gradient(to right, #D32F2F 20%, #FFC107 20% 70%, #1976D2 70%); margin-bottom: 40px; }
  h1 { color: #FFFFFF; font-size: 24pt; margin-bottom: 10px; font-weight: bold; text-transform: uppercase; }
  h2 { color: #FFC107; font-size: 18pt; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #333333; padding-bottom: 5px; text-transform: uppercase; }
  h3 { color: #FFC107; font-size: 14pt; margin-top: 20px; margin-bottom: 10px; }
  p { font-size: 11pt; line-height: 1.6; margin-bottom: 15px; color: #D1D5DB; }
  li { font-size: 11pt; line-height: 1.6; margin-bottom: 8px; color: #D1D5DB; }
  strong { color: #FFC107; font-weight: bold; }
  .blockquote { background-color: #1A1A1A; border-left: 4px solid #FFC107; padding: 15px; margin-bottom: 20px; font-style: italic; color: #9CA3AF; }
</style>
"""

html_creacion = style + """
<div class="doc-container">
  <div class="logo-st">ST</div>
  <div class="logo-energy">ENERGY</div>
  <div class="header-line"></div>

  <h1>Manual de Creación y Estructura del Sistema de Ventas</h1>
  
  <div class="blockquote">
    <p><strong>Objetivo de este documento:</strong> Este manual ha sido redactado con un lenguaje claro y no técnico para el área de Recursos Humanos y Gerencia. Su propósito es que cualquier persona dentro de la empresa entienda qué es el sistema, por qué partes está compuesto y cómo funciona "por detrás", garantizando que el conocimiento no dependa exclusivamente de un programador o equipo técnico.</p>
  </div>

  <h2>1. ¿Por qué y para qué se creó el sistema?</h2>
  <p>Antes de este sistema, el control de las ventas, los ingresos por cursos y la emisión de certificados requerían mucho trabajo manual (como el uso intensivo de hojas de Excel).</p>
  <p>El <strong>Sistema de Gestión de Ventas de ST ENERGY</strong> se construyó para:</p>
  <ul>
    <li><strong>Centralizar</strong> la información de todos los asesores de ventas en un solo lugar.</li>
    <li><strong>Automatizar</strong> tareas repetitivas (como generar PDFs de certificados o sumar deudas).</li>
    <li><strong>Sincronizar</strong> automáticamente a los alumnos con el aula virtual de la página web oficial.</li>
    <li><strong>Proteger</strong> la base de datos de los clientes y hacer reportes financieros instantáneos.</li>
  </ul>

  <h2>2. Las Tres Piezas Clave del Sistema (Arquitectura)</h2>
  <p>Para que el sistema sea seguro, rápido y funcione en cualquier computadora o celular de la empresa, se dividió su construcción en tres "piezas" que conversan entre sí.</p>

  <h3>A. La Fachada (El "Frontend" o Panel Visual)</h3>
  <ul>
    <li><strong>¿Qué es?</strong> Es todo lo que el vendedor o administrador ve en su pantalla: los botones azules, las tablas, los gráficos de colores y los menús laterales.</li>
    <li><strong>¿Cómo se construyó?</strong> Utilizando una tecnología muy moderna llamada <strong>React</strong> (la misma que usan empresas como Facebook).</li>
    <li><strong>¿Dónde vive?</strong> Está alojado en el servidor principal de la empresa: <strong>HostGator (cPanel)</strong>. Es la página a la que acceden los asesores desde sus navegadores web.</li>
  </ul>

  <h3>B. El Cerebro (El "Backend" o Motor de Procesamiento)</h3>
  <ul>
    <li><strong>¿Qué es?</strong> Es el trabajador invisible. Cuando el asesor hace clic en "Guardar Venta", la fachada no sabe cómo guardarlo; se lo envía al cerebro. El cerebro valida que los datos sean correctos, genera los certificados y se encarga de matricular al alumno.</li>
    <li><strong>¿Cómo se construyó?</strong> Usando <strong>Python</strong>, un lenguaje de programación muy potente para manejar cálculos y conexiones de bases de datos.</li>
    <li><strong>¿Dónde vive?</strong> Vive en un servidor en la nube llamado <strong>Render</strong>. Se puso aquí porque este servidor está preparado para soportar el tráfico pesado de información sin que la página web principal se vuelva lenta.</li>
  </ul>

  <h3>C. La Bóveda (La Base de Datos)</h3>
  <ul>
    <li><strong>¿Qué es?</strong> El gran archivero digital seguro donde se guardan permanentemente los nombres, DNIs, teléfonos y pagos de cada venta.</li>
    <li><strong>¿Cómo se construyó?</strong> Utilizando <strong>SQLite</strong>, un motor de base de datos ligero pero altamente seguro.</li>
    <li><strong>¿Dónde vive?</strong> Está conectado directamente al "Cerebro" (Render). La ventaja es que la bóveda está centralizada: si un vendedor en su casa guarda una venta, otro vendedor en la oficina la verá reflejada en un segundo.</li>
  </ul>

  <h2>3. ¿Cómo está conectado con la Página Web Principal?</h2>
  <p>ST ENERGY tiene su página web oficial en <strong>WordPress</strong> (donde los alumnos ven sus clases, usando el sistema TutorLMS).</p>
  <p>Nuestro sistema de ventas está <strong>integrado</strong> con esta página web. Esto significa que:</p>
  <ul>
    <li><strong>Al crear un curso:</strong> El sistema "jala" o descarga el catálogo de cursos directo desde WordPress para que el vendedor no tenga que escribirlos a mano.</li>
    <li><strong>Al registrar un alumno:</strong> El sistema le envía una orden secreta a WordPress diciendo: <em>"Matricula a este DNI en este curso y mándale su contraseña"</em>.</li>
  </ul>

  <h2>4. ¿Cómo se actualiza o arregla el sistema? (El Robot GitHub)</h2>
  <p>Si el día de mañana se necesita agregar un botón nuevo, el programador no entra a "romper" el sistema en vivo.</p>
  <ul>
    <li>El sistema fue diseñado con un mecanismo de seguridad llamado <strong>GitHub Actions</strong>.</li>
    <li>El programador hace el cambio en su computadora y lo envía al robot de GitHub.</li>
    <li>Este robot revisa que el código no tenga errores y, si todo está bien, actualiza el sistema en <strong>HostGator</strong> de forma automática y silenciosa, generalmente en menos de 2 minutos.</li>
  </ul>

  <h2>5. Resumen Visual para Recursos Humanos</h2>
  <p>Si tuvieras que explicar el sistema a un nuevo empleado, la explicación sencilla es:</p>
  <ol>
    <li>El asesor usa el <strong>Panel Visual</strong> (alojado en HostGator) para registrar la venta.</li>
    <li>El Panel envía la venta al <strong>Cerebro en la nube</strong> (alojado en Render).</li>
    <li>El Cerebro guarda la venta en su <strong>Bóveda</strong> y, si es necesario, le avisa a la <strong>Página Web</strong> (WordPress) para que le dé acceso al alumno.</li>
  </ol>
</div>
"""

html_emergencia = style + """
<div class="doc-container">
  <div class="logo-st">ST</div>
  <div class="logo-energy">ENERGY</div>
  <div class="header-line"></div>

  <h1>Plan de Acción de Emergencia: Sistema de Ventas</h1>
  
  <div class="blockquote">
    <p><strong>Propósito de este manual:</strong> Establecer los protocolos de acción ante problemas técnicos o "caídas" del sistema, garantizando que el personal de Recursos Humanos, gerentes y asesores sepan cómo reaccionar paso a paso sin requerir conocimientos profundos de programación.</p>
  </div>

  <h2>INTRODUCCIÓN AL PLAN DE CONTINGENCIA</h2>
  <p>El sistema de ventas es el corazón operativo. Si deja de funcionar, es vital <strong>mantener la calma</strong> y seguir estos protocolos. La mayoría de los problemas tienen solución rápida o existen "Planes B" para que la empresa no deje de vender.</p>
  <p>Los incidentes se dividen en 4 niveles de severidad. Por favor, identifique cuál es su caso y aplique la solución.</p>

  <h2>NIVEL 1: Problema Local o de Pantalla</h2>
  <p><strong>(Severidad: Leve | Solución: Inmediata)</strong></p>
  <h3>¿Cómo saber si es Nivel 1?</h3>
  <ul>
    <li>El asesor de ventas reporta que "no le carga el sistema" o "se quedó pegado el botón", pero <strong>sus otros compañeros SÍ pueden entrar y vender normalmente</strong>.</li>
  </ul>
  <h3>Plan de Acción (Paso a paso)</h3>
  <ol>
    <li><strong>Revisar el Internet:</strong> Confirme que la computadora del asesor tiene internet entrando a otra página (ej. YouTube o Google).</li>
    <li><strong>Refrescar:</strong> Pídale al asesor que presione la tecla <strong>F5</strong> o la flecha circular de recargar en su navegador.</li>
    <li><strong>Limpiar Caché (Borrar historial):</strong> Muchas veces el navegador guarda archivos viejos. Presione <code>Ctrl + Shift + Suprimir</code> (en Google Chrome), seleccione "Borrar datos de navegación" y vuelva a intentar.</li>
    <li><strong>Prueba cruzada:</strong> Si no funciona, pídale que intente abrir el sistema desde una ventana en <strong>Modo Incógnito</strong> o usando su teléfono celular. Si ahí funciona, el problema es la computadora del asesor, no el sistema.</li>
  </ol>

  <h2>NIVEL 2: Caída de la Bóveda de Datos (Error en "Render")</h2>
  <p><strong>(Severidad: Media | Solución: 5 a 10 minutos)</strong></p>
  <h3>¿Cómo saber si es Nivel 2?</h3>
  <ul>
    <li>Los asesores <strong>pueden ver el panel azul y la página carga</strong>, pero <strong>las tablas de ventas están vacías</strong>, sale un aviso rojo de "Error de Red", o cuando le dan a "Guardar Venta" la pantalla se queda cargando eternamente.</li>
  </ul>
  <h3>Plan de Acción (Paso a paso)</h3>
  <p>Esto significa que el "Cerebro" (el servidor en la nube de Render) se ha quedado dormido o saturado.</p>
  <ol>
    <li>Ingrese a la plataforma <strong>Render.com</strong>.</li>
    <li>Inicie sesión con el usuario y contraseña del área de TI o gerencia.</li>
    <li>En el panel principal, busque el servicio llamado <strong>stenergy-certs-api</strong> (o similar) y haga clic sobre él.</li>
    <li>En la parte superior derecha, busque un botón que dice <strong>"Manual Deploy"</strong> (Despliegue Manual) o <strong>"Restart Service"</strong> (Reiniciar Servicio) y presiónelo.</li>
    <li>Espere <strong>3 minutos</strong>. El servidor de datos se estará reiniciando. Luego pida a los asesores que recarguen su página. El sistema debería volver a mostrar las ventas.</li>
  </ol>

  <h2>NIVEL 3: Caída Total de la Página Web (Error en HostGator)</h2>
  <p><strong>(Severidad: Alta | Solución: Depende del proveedor)</strong></p>
  <h3>¿Cómo saber si es Nivel 3?</h3>
  <ul>
    <li>Nadie en la empresa puede entrar. Al poner la dirección del sistema en el navegador web aparece una pantalla blanca con letras grandes que dicen <strong>"Error 404"</strong>, <strong>"Error 500 Internal Server Error"</strong>, o <strong>"No se puede conectar al sitio"</strong>.</li>
  </ul>
  <h3>Plan de Acción (Paso a paso)</h3>
  <p>Esto significa que el servidor físico donde está instalada toda nuestra infraestructura (HostGator) está apagado, en mantenimiento, o hubo un problema con los pagos del dominio.</p>
  <p><strong>Paso 1: Diagnóstico Administrativo</strong></p>
  <ul>
    <li>El encargado deberá entrar a su cuenta de <strong>HostGator</strong> o cPanel para verificar:</li>
    <li>¿Están pagados los recibos de Hosting (alojamiento) y Dominio?</li>
    <li>¿Hay algún aviso de mantenimiento programado por parte de HostGator?</li>
  </ul>
  <p><strong>Paso 2: Activación del Plan B (Protocolo Manual temporal)</strong></p>
  <p>Si HostGator informa que la caída tardará más de 1 hora en solucionarse, la empresa no debe detener sus ventas. Se activa el <strong>Protocolo Manual</strong>:</p>
  <ol>
    <li>Se ordena a los asesores abrir la plantilla de Excel oficial llamada <em>"Matriz_Emergencia_Ventas.xlsx"</em>.</li>
    <li>Las ventas del día, depósitos y datos de alumnos se registrarán en esa tabla temporalmente.</li>
    <li>Se les avisará a los clientes que su certificado o acceso al campus virtual demorará un par de horas por "mantenimiento del servidor principal".</li>
  </ol>
  <p><strong>Paso 3: Recuperación de Datos</strong></p>
  <p>Una vez que el sistema vuelva a encender, un encargado pasará las ventas del Excel temporal al sistema oficial usando el botón "+ Añadir Venta" para regularizar y generar los certificados pendientes.</p>

  <h2>NIVEL 4: Problemas de Sincronización con WordPress (Campus Virtual)</h2>
  <p><strong>(Severidad: Leve-Media | Solución: Revisión web)</strong></p>
  <h3>¿Cómo saber si es Nivel 4?</h3>
  <ul>
    <li>El panel de ventas funciona perfecto, pero al presionar "Sincronizar Cursos" o al darle a "Matricular en la Web", el sistema arroja un error que dice <em>"No se pudo conectar con WordPress"</em>.</li>
  </ul>
  <h3>Plan de Acción (Paso a paso)</h3>
  <ol>
    <li><strong>Comprobar el Campus:</strong> Entre manualmente a su página web. ¿La página carga bien?</li>
    <li>Si la página web está caída o lenta, es un problema exclusivo del Campus Virtual (quizás estén instalando un plugin o WordPress esté colgado). El sistema de ventas funcionará a la perfección tan pronto la página web principal regrese a la normalidad.</li>
    <li>Si la página sí funciona pero la integración sigue fallando, contactar al desarrollador encargado de revisar las "Claves de Integración API" de WordPress.</li>
  </ol>
</div>
"""

def generate_doc(html, docx_name, temp_name):
    html_filename = os.path.abspath(temp_name)
    docx_filename = os.path.abspath(docx_name)

    with open(html_filename, "w", encoding="utf-8") as file:
        file.write(html)

    if has_word:
        print(f"Generando {docx_name}...")
        try:
            word = win32com.client.Dispatch("Word.Application")
            word.Visible = False
            doc = word.Documents.Open(html_filename)
            doc.SaveAs(docx_filename, FileFormat=16)
            doc.Close()
            word.Quit()
            print(f"¡Éxito! Generado en: {docx_filename}")
            if os.path.exists(html_filename):
                os.remove(html_filename)
        except Exception as e:
            print(f"Error automatizando Word: {e}")
    else:
        print(f"Archivo guardado como HTML: {html_filename}")

generate_doc(html_creacion, "Manual_Creacion_Sistema.docx", "temp_creacion.html")
generate_doc(html_emergencia, "Plan_Emergencias_Sistema.docx", "temp_emergencias.html")
