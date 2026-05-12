const DEFAULT_TIMEOUT_MS = 15000;

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationResponse {
  ok: boolean;
  stepId: string;
  confidence: number;
  issues: ValidationIssue[];
  extracted?: Record<string, string>;
}

export interface ValidationRequestPayload {
  stepId: string;
  file: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    base64?: string;
    s3Key?: string;
  };
  conversationId: string;
  userMessage?: string;
}

interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
}

// URL base de la Lambda de validación.
// En este proyecto la fijamos directamente a la URL que nos proporcionaste.
const apiBase =
  "https://4a4gvz47qa7brr3h5zewdoafja0eyzbl.lambda-url.us-east-1.on.aws";

const uploadMode = (import.meta.env.VITE_UPLOAD_MODE ?? "inlineBase64") as
  | "inlineBase64"
  | "s3Presigned";

const fetchWithTimeout = async (input: RequestInfo, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return response;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result.split(",")[1] ?? "");
      } else {
        reject(new Error("No se pudo leer el archivo."));
      }
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
    reader.readAsDataURL(file);
  });
};

const getPresignedUrl = async (stepId: string, file: File): Promise<PresignResponse> => {
  const response = await fetchWithTimeout(`${apiBase}/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stepId,
      mimeType: file.type,
      sizeBytes: file.size
    })
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener la URL de carga. Intenta más tarde.");
  }

  return (await response.json()) as PresignResponse;
};

const uploadToS3 = async (uploadUrl: string, file: File): Promise<void> => {
  const response = await fetchWithTimeout(uploadUrl, {
    method: "PUT",
    body: file
  });

  if (!response.ok) {
    throw new Error("Error al subir el archivo al almacenamiento. Intenta de nuevo.");
  }
};

// Mapea el identificador de paso del frontend a la categoría esperada por la Lambda.
// Como ahora usamos exactamente los mismos ids que el portal (notice, medical_report, etc.),
// el mapeo es directo. Si cambias los ids de los pasos, ajusta esta función.
const mapStepIdToCategory = (stepId: string): string => {
  return stepId;
};

export const validateDocument = async (
  stepId: string,
  file: File,
  conversationId: string,
  userMessage?: string
): Promise<ValidationResponse> => {
  if (!apiBase) {
    throw new Error("La API de validación no está configurada. Contacta al soporte.");
  }

  // Modo A: inlineBase64 → se integra con la Lambda existente que espera:
  // { "file_base64": "...", "filename": "...", "category": "..." }
  if (uploadMode === "inlineBase64") {
    const base64 = await fileToBase64(file);
    const category = mapStepIdToCategory(stepId);

    const lambdaPayload = {
      file_base64: base64,
      filename: file.name,
      category,
      // Campos extra que la Lambda puede ignorar, útiles para trazabilidad futura
      stepId,
      conversationId,
      userMessage
    };

    const response = await fetchWithTimeout(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lambdaPayload)
    });

    if (!response.ok) {
      throw new Error("La validación del documento falló. Inténtalo de nuevo.");
    }

    const lambdaData = (await response.json()) as { valid?: boolean; message?: string };

    const ok = Boolean(lambdaData.valid);
    const message =
      lambdaData.message ??
      (ok
        ? "Documento validado correctamente."
        : "El documento no cumple con los requisitos para este apartado.");

    const mapped: ValidationResponse = {
      ok,
      stepId,
      confidence: ok ? 1 : 0,
      issues: ok
        ? []
        : [
            {
              code: "LAMBDA_VALIDATION",
              message
            }
          ],
      extracted: undefined
    };

    return mapped;
  }

  // Modo B: s3Presigned → pensado para integrarse con un API Gateway que exponga /presign y /validate
  const { uploadUrl, s3Key } = await getPresignedUrl(stepId, file);
  await uploadToS3(uploadUrl, file);

  const payload: ValidationRequestPayload = {
    stepId,
    conversationId,
    userMessage,
    file: {
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      s3Key
    }
  };

  const response = await fetchWithTimeout(`${apiBase}/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("La validación del documento falló. Inténtalo de nuevo.");
  }

  const data = (await response.json()) as ValidationResponse;
  return data;
};
