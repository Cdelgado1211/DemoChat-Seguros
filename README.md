# Example Chat Web · Prerregistro de Reembolso

Aplicación web en React 18 + TypeScript + Vite + TailwindCSS que implementa un flujo de prerregistro de reembolso en formato de chat guiado por un asistente. La app está preparada para desplegarse en **AWS Amplify Hosting**.

## Características principales

- Chat dinámico entre cliente y asistente (bot) que guía el proceso.
- Flujo por pasos configurable para requisitos de reembolso.
- Subida de documentos con validación en backend (AWS Lambda vía API Gateway).
- Dos estrategias de subida de archivo:
  - `inlineBase64` (por defecto).
  - `s3Presigned` (carga mediante URL prefirmada).
- Estado global con React Context + `useReducer`.
- UI accesible, responsiva y con transiciones sutiles usando TailwindCSS.

## Requisitos previos

- Node.js 18+ recomendado.
- npm 9+ (o equivalente).

## Instalación y uso local

```bash
npm install
npm run dev
```

La app se ejecutará típicamente en `http://localhost:5173`.

### Scripts principales

- `npm run dev` – servidor de desarrollo.
- `npm run build` – build de producción (output en `dist/`).
- `npm run preview` – previsualizar build.
- `npm run test` – ejecutar pruebas con Vitest.

## Variables de entorno

Crear un archivo `.env` (o utilizar `.env.local`) a partir de `.env.example`:

```bash
cp .env.example .env
```

Variables disponibles:

- `VITE_VALIDATION_API_URL` – base URL del API Gateway de validación, por ejemplo:
  `https://example.execute-api.region.amazonaws.com/prod`.
- `VITE_UPLOAD_MODE` – estrategia de subida de archivo:
  - `inlineBase64` (default): convierte el archivo a base64 y lo envía en el cuerpo del POST `/validate`.
  - `s3Presigned`: usa un flujo de URL prefirmada (`/presign` + `PUT` + `/validate`).
- `VITE_MAX_FILE_MB` – tamaño máximo permitido (MB) para archivos (se complementa con `maxSizeMB` del step).

## Configuración de endpoints en AWS Amplify / API Gateway

En el backend (no incluido en este repo) se espera:

- Endpoint de validación de documento:

  - **Método**: `POST`
  - **Ruta**: `${VITE_VALIDATION_API_URL}/validate`
  - **Body JSON**:

    ```json
    {
      "stepId": "identificacion",
      "file": {
        "name": "...",
        "mimeType": "...",
        "sizeBytes": 123,
        "base64": "....",
        "s3Key": "..." // opcional, según modo
      },
      "conversationId": "uuid",
      "userMessage": "texto opcional"
    }
    ```

  - **Respuesta JSON**:

    ```json
    {
      "ok": true,
      "stepId": "identificacion",
      "confidence": 0.97,
      "issues": [
        { "code": "MISSING_FIELD", "message": "Falta el RFC" }
      ],
      "extracted": {
        "name": "...",
        "date": "...",
        "amount": "..."
      }
    }
    ```

- Endpoint para URL prefirmada (solo modo `s3Presigned`):

  - **Método**: `POST`
  - **Ruta**: `${VITE_VALIDATION_API_URL}/presign`
  - **Body JSON**:

    ```json
    {
      "stepId": "identificacion",
      "mimeType": "application/pdf",
      "sizeBytes": 12345
    }
    ```

  - **Respuesta JSON**:

    ```json
    {
      "uploadUrl": "https://s3-presigned-url",
      "s3Key": "some/key/in/s3"
    }
    ```

La Lambda de validación deberá implementar la lógica de IA que verifique:

1. Que el documento corresponde al paso actual.
2. Que es legible.
3. Que contiene la información mínima requerida.

## Diagrama textual del flujo

1. Usuario abre `/`:
   - Se genera (o recupera) `conversationId` desde `localStorage`.
   - El bot envía mensaje de bienvenida (`getBotIntro`).
   - El bot explica el **Paso 1** usando `getBotPromptForStep`.
2. Usuario escribe mensaje y/o adjunta documento:
   - Front valida tipo y tamaño del archivo según config del paso.
   - Se actualiza estado global con acción `ATTACH_FILE`.
3. Comienza la validación:
   - Acciones `UPLOAD_STARTED` y `VALIDATION_STARTED` actualizan el estado de subida.
   - El bot muestra mensaje "Validando documento…".
   - `services/validationApi.validateDocument`:
     - Modo `inlineBase64`: convierte a base64 y envía `POST /validate`.
     - Modo `s3Presigned`: llama `POST /presign`, hace `PUT` del archivo y luego `POST /validate` con `s3Key`.
4. Respuesta de Lambda:
   - Si `ok = true`:
     - Acción `VALIDATION_OK` actualiza `steps[stepId].status = "done"`.
     - El bot envía mensaje `getBotMessageOnValidationOk`.
     - Acción `NEXT_STEP` busca el siguiente paso pendiente y lo activa.
     - El bot envía `getBotPromptForStep` del nuevo paso.
   - Si `ok = false`:
     - Acción `VALIDATION_FAIL` marca el paso en `error` y conserva el paso activo.
     - El bot envía mensaje `getBotMessageOnValidationFail` con las razones (`issues`).
     - El UI muestra el estado de error en la tarjeta del archivo.
5. Repetir pasos 2–4 por cada requisito:
   - El panel lateral / mobile muestra el progreso (pendiente / en progreso / completo / error).
6. Cuando todos los pasos tienen estado `done`:
   - La app redirige a `/success`.
   - Se muestra un resumen de pasos completados y un botón placeholder de “Descargar comprobante”.
7. Botón “Reiniciar trámite”:
   - Limpia `conversationId` de `localStorage`.
   - Refresca la app para iniciar un nuevo flujo.

## Estructura del proyecto

```text
src/
  components/
    ChatWindow.tsx        # Ventana principal de chat
    FileCard.tsx          # Tarjeta para archivo adjunto y su estado
    Header.tsx            # Header con título y logo
    MessageBubble.tsx     # Burbujas de mensajes (bot/usuario)
    ProgressMobile.tsx    # Progreso en modo mobile (accordion)
    StepSidebar.tsx       # Sidebar de pasos (desktop)
  lib/
    bot.ts                # Lógica determinística de mensajes del bot
    bot.test.ts           # Pruebas de generación de mensajes
    stepsConfig.ts        # Configuración de pasos (requisitos)
    storage.ts            # Persistencia de conversationId en localStorage
  pages/
    ChatFlowPage.tsx      # Página principal de chat
    SuccessPage.tsx       # Página final de resumen
  services/
    validationApi.ts      # Encapsula llamadas a API Gateway y flujo de subida
  state/
    ChatContext.tsx       # Contexto global + provider
    chatReducer.ts        # Reducer con acciones INIT, SEND_MESSAGE, etc.
    chatReducer.test.ts   # Prueba de acción NEXT_STEP
  types/
    chat.ts               # Tipos de mensajes, uploads y estado
    steps.ts              # Tipos de pasos y estados de paso
  App.tsx                 # Definición de rutas (`/` y `/success`)
  index.css               # Estilos base + Tailwind
  main.tsx                # Punto de entrada React
```

## Deploy en AWS Amplify Hosting

Este repositorio ya está listo para Amplify Hosting:

- Build está definido en `amplify.yml`:

  - `preBuild`: `npm ci`
  - `build`: `npm run build`
  - Artifacts: `dist/`
  - Cache: `node_modules/**`

- Pasos típicos:
  1. Subir este repo a un proveedor Git (GitHub, CodeCommit, etc.).
  2. Crear una app en AWS Amplify y conectar el repo.
  3. Configurar variables de entorno en la consola de Amplify:
     - `VITE_VALIDATION_API_URL`
     - `VITE_UPLOAD_MODE`
     - `VITE_MAX_FILE_MB`
  4. Guardar y desplegar; Amplify detectará automáticamente Vite y el directorio `dist/`.

## Notas de calidad

- La lógica crítica de subida/validación está encapsulada en `services/validationApi.ts` y el flujo de estado en `state/chatReducer.ts`.
- El bot no es un LLM en frontend: solo utiliza configuración de pasos y respuesta de Lambda para generar mensajes.
- La UI usa roles ARIA básicos y manejo de focus en elementos interactivos.

