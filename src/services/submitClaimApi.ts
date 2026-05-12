const SUBMIT_CLAIM_URL =
  "https://4a4gvz47qa7brr3h5zewdoafja0eyzbl.lambda-url.us-east-1.on.aws/";

export interface SubmitClaimDocuments {
  [categoryKey: string]: {
    filename: string;
    base64: string;
  };
}

export interface SubmitClaimRequest {
  email: string;
  claimType?: string;
  registrationDate?: string;
  documents: SubmitClaimDocuments;
}

export interface SubmitClaimResponse {
  success: boolean;
  claimNumber?: string;
  message?: string;
}

export const submitClaim = async (
  req: SubmitClaimRequest
): Promise<SubmitClaimResponse> => {
  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10); // YYYY-MM-DD

  const payload = {
    email: req.email,
    claimType: req.claimType ?? "",
    registrationDate: req.registrationDate ?? defaultDate,
    documents: req.documents
  };

  const response = await fetch(SUBMIT_CLAIM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return {
      success: false,
      message: "No se pudo enviar la solicitud de reembolso. Inténtalo más tarde."
    };
  }

  try {
    const data = (await response.json()) as {
      success?: boolean;
      claimNumber?: string;
      message?: string;
    };

    return {
      success: Boolean(data.success),
      claimNumber: data.claimNumber,
      message: data.message
    };
  } catch {
    return {
      success: false,
      message: "Respuesta inesperada del servicio de envío de documentos."
    };
  }
};

