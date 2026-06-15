# Manual Integral del Sistema ST ENERGY
**Documento Oficial de Traspaso de Conocimientos (Handover) y Resolución de Problemas**

---

## 1. Introducción
Este documento está diseñado para ser la **"Biblia"** del sistema de gestión de ST ENERGY. Su objetivo es asegurar la continuidad operativa de la empresa sin importar los cambios en el personal. Está estructurado en dos niveles:
1. **Nivel Gerencial / Recursos Humanos:** Para entender qué hace el sistema y cómo funciona en términos simples.
2. **Nivel Ingeniería / Desarrollo (TI):** Para entender el código, los servidores, los flujos de despliegue y los errores históricos.

---

## 2. Para No Técnicos (Gerencia y RRHH)

### ¿Qué es este sistema?
Es la plataforma digital principal de ST ENERGY que permite a los asesores y administradores gestionar **Ventas, Estudiantes, Cursos y Certificados**. Funciona como el "cerebro" donde se centraliza toda la información comercial y académica de la empresa.

### ¿Cómo está dividido?
Imagina que el sistema es un restaurante:
*   **El Frontend (La fachada y el salón):** Es lo que los asesores ven y tocan en su navegador (botones, gráficos, formularios). Está diseñado para ser rápido, moderno y amigable (con un diseño llamado *Glassmorphism*).
*   **El Backend (La cocina y el almacén):** Es el motor invisible. Recibe los pedidos de los asesores (ej. "guardar esta venta" o "generar este certificado"), busca los ingredientes en la base de datos, procesa la información y la devuelve a la pantalla.

### ¿Qué pasa cuando hay un problema?
Si la pantalla se pone blanca o los botones no responden, el problema suele estar en **El Frontend**.
Si sale un error de "No se pudo conectar" o los datos no se guardan, el problema suele estar en **El Backend** o en la **Base de Datos**.

---

## 3. Arquitectura Técnica (Para el Equipo de TI)

### Stack Tecnológico
*   **Frontend:** Construido en **React.js 18** (aplicación de una sola página o SPA). Utiliza `react-router` para la navegación y `recharts` para los gráficos. No utiliza frameworks CSS como Tailwind o Bootstrap; todo el diseño se basa en **Vanilla CSS** con variables globales (ubicadas en `index.css`) para mantener el control absoluto del rendimiento y la estética gráfica avanzada.
*   **Backend:** Construido en **FastAPI (Python)**. Se ejecuta sobre el servidor Uvicorn. Es una API RESTful muy veloz.
*   **Base de Datos:** Utiliza **SQLAlchemy** como ORM. En entorno local usa **SQLite** (`stenergy.db`), pero está preparado para escalar a **PostgreSQL** en producción (a través de la variable `DATABASE_URL`).
*   **Control de Versiones:** **Git** alojado en **GitHub**.

---

## 4. El Flujo de Despliegue: ¿Cómo llega el código de GitHub a cPanel?

Una de las grandes ventajas de este proyecto es que está **automatizado**. Cuando el ingeniero de TI escribe código nuevo en su computadora y lo sube a GitHub (hace un `git push` a la rama `main`), ocurre la siguiente magia tecnológica:

1.  **Activación del Disparador:** GitHub detecta que hay código nuevo en la rama `main`.
2.  **Preparación del Entorno (GitHub Actions):** GitHub levanta una computadora virtual temporal (un servidor Ubuntu) en sus instalaciones.
3.  **Compilación (Build):**
    *   Instala **Node.js** (versión 20).
    *   Descarga todas las librerías del proyecto (`npm install`).
    *   Convierte todo el código moderno de React a un paquete comprimido y optimizado que cualquier navegador puede leer (`npm run build`). Este paquete se guarda en la carpeta `/build`.
4.  **Transferencia Segura a cPanel (El Servidor de la Empresa):**
    *   GitHub lee las "Llaves Secretas" de la empresa (configuradas en los *Secrets* del repositorio).
    *   Abre una conexión **SSH (Secure Shell)** a través del **Puerto 22** del servidor de cPanel usando una llave privada encriptada (`FTP_KEY` / RSA Key).
    *   Una vez validada la seguridad (sin necesidad de contraseñas de texto plano), ejecuta el comando `scp` (Secure Copy Protocol).
    *   Transfiere directamente los archivos optimizados desde la carpeta `/build` de GitHub hacia la ruta `public_html/sistema/` dentro del cPanel de ST ENERGY.
5.  **Resultado:** Los usuarios recargan la página web y automáticamente tienen la versión más nueva del sistema.

---

## 5. Historial Clínico: Errores, Síntomas y Soluciones
*Este registro contiene los problemas más complejos que hemos superado durante el desarrollo. Es oro puro para el diagnóstico futuro.*

### 5.1. El "Efecto Fantasma" al Guardar Formularios (Problema Asíncrono)
*   **El Síntoma:** Un usuario entraba a editar la carpeta de un Curso, ponía "Guardar Cambios", la ventana se cerraba, pero la pantalla seguía mostrando la información vieja. El usuario creía que no se había guardado, pero si refrescaba la página (F5), la información correcta aparecía mágicamente. Además, si cambiaba un curso, afectaba a todos los demás al crear uno nuevo.
*   **La Causa:** Ocurrían dos cosas. 
    1. Usábamos `localStorage` de manera global, lo cual arrastraba la memoria de un curso a otro. 
    2. Existía una **Condición de Carrera (Race Condition)**. El botón "Guardar" enviaba la instrucción al servidor, pero no "esperaba" a que el servidor respondiera. El sistema cerraba el modal y recargaba la vista en menos de 1 milisegundo leyendo el caché viejo, mientras el servidor seguía guardando en el fondo.
*   **La Solución:** Se eliminó el `localStorage` para aislar los datos. Se transformó el botón en una función asíncrona (`async / await`). Ahora el código dice: *"Envía el dato -> Pon el botón en Cargando -> Espera (await) a que el backend confirme que ya guardó -> Limpia la memoria caché -> Recién ahí, cierra el modal y recarga la pantalla"*.

### 5.2. El "Colapso del Build" en GitHub Actions por Advertencias (ESLint)
*   **El Síntoma:** El sistema funcionaba perfecto en la computadora del programador. Pero al subir a GitHub, el despliegue automático fallaba y se ponía en rojo. El error decía: `Treating warnings as errors. Line 8: 'Particles' is defined but never used`.
*   **La Causa:** React, al detectar que está siendo compilado dentro de un servidor de integración continua (CI=true), cambia sus reglas de tolerancia a cero. Un pequeño aviso (como importar un ícono y no usarlo) es tratado como un error crítico que destruye la compilación para evitar código basura en producción.
*   **La Solución:** Limpiar el código meticulosamente, borrando las importaciones "muertas". (Ej. Si declaras variables como `GlareHover` o librerías que quedaron obsoletas durante el rediseño, bórralas).

### 5.3. Inconsistencia Financiera: Dashboard vs Panel de Ventas
*   **El Síntoma:** El contador de "Ingresos Totales" en el Dashboard principal mostraba una cifra (Ej: $500.50), pero en el panel detallado de ventas mostraba otra cifra, además con decimales excesivos y extraños.
*   **La Causa:** En diferentes partes del código, la suma de dinero se calculaba distinto. En una se sumaban *todas* las ventas, y en otra se sumaban solo las ventas *filtradas*. Además, JavaScript tiene un problema nativo con la aritmética de punto flotante (0.1 + 0.2 = 0.30000000000000004).
*   **La Solución:** Se centralizó la lógica matemática usando el método `.reduce()` limpiando los valores nulos, y aplicando `Math.round()` y `.toFixed(2)` en todo el ecosistema para asegurar homogeneidad financiera sin decimales fantasmas.

### 5.4. Crash del Servidor al Modificar Modelos de Base de Datos
*   **El Síntoma:** Al entrar a la sección de Cursos, la pantalla se queda cargando y la consola del navegador arroja Error 500 (Internal Server Error). Los logs de Python muestran: `OperationalError: no such column: cpanelFolder`.
*   **La Causa:** Durante las mejoras, decidimos agregar el campo `cpanelFolder` (Carpeta de cPanel) a los Cursos. Escribimos la columna en el código de Python, pero **SQLAlchemy no actualiza bases de datos relacionales ya existentes**. El código buscaba la columna en la tabla de la BD, no la encontraba y se estrellaba.
*   **La Solución Rápida:** En desarrollo local con SQLite, simplemente se borra el archivo `stenergy.db` y el sistema lo recrea desde cero con la nueva columna. En producción (PostgreSQL), se debe entrar mediante consola SQL y ejecutar `ALTER TABLE courses ADD COLUMN cpanelFolder VARCHAR;`.
*   **Recomendación a Futuro:** El nuevo ingeniero debe implementar "Alembic" (herramienta de migraciones de Python) para que las actualizaciones de Base de datos sean automáticas y seguras.

### 5.5. Falla al Descargar Reportes Excel / PDF
*   **El Síntoma:** Al hacer clic en "Exportar a Excel", la aplicación no hace nada o la consola del navegador arroja un error en rojo: `XLSX is not defined` o `jspdf is not a function`.
*   **La Causa:** La lógica de generación de archivos demanda mucha matemática en el navegador y depende de librerías de terceros (`xlsx` o `jspdf`). A veces, por limpiezas de código, estas librerías no se importan en el archivo correcto.
*   **La Solución:** Asegurarse de mantener las dependencias vivas en el `package.json` (`npm install xlsx jspdf jspdf-autotable`) y tener los "imports" explícitos al inicio del archivo `SalesPanel.js`.

---

## 6. Mantenimiento del Servidor y Credenciales

Las credenciales reales y tokens API (como las contraseñas de Base de Datos y accesos FTP) **nunca deben estar en el código**. 
Si el sistema deja de funcionar repentinamente en producción:
1. Revisa que el dominio del servidor backend no haya caducado.
2. Revisa las variables de entorno (`.env.production` en el frontend, y los `Environment Variables` en el host del backend).
3. Asegúrate de que los certificados SSL (https) no estén vencidos, ya que el navegador bloqueará cualquier petición del frontend al backend por seguridad estricta.
