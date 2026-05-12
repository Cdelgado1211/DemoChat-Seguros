import type { StepState } from "../types/steps";
import type { ValidationIssue } from "../services/validationApi";

// Utilidad: divide un texto del bot en “burbujas” separadas para que
// se vea como varias intervenciones cortas de chat y no como un párrafo largo.
export const splitBotTextIntoBubbles = (text: string): string[] =>
  text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean);

export const getBotIntro = (): string =>
  "Hola, soy el asistente virtual de Example 👋 ¿En qué te puedo ayudar hoy? Puedes elegir una opción abajo para empezar.";

export const getBotPromptForStep = (step: StepState): string => {
  return [
    `Ahora necesito revisar **"${step.title}"**.`,
    `- ${step.validationHint}`,
    '- Cuando tengas el archivo listo, súbelo con el botón "Adjuntar" y yo reviso que todo esté bien.'
  ].join("\n");
};

export const getBotReplyToUserMessage = (step: StepState): string => {
  return `Gracias por tu mensaje 😊. En este momento estamos revisando "${step.title}", así que para avanzar necesito que adjuntes el documento correspondiente con el botón "Adjuntar".`;
};

export const getBotMessageOnValidationOk = (step: StepState): string => {
  return `Perfecto, el documento de "${step.title}" se ve bien y pasó la validación ✅. Con esto ya quedamos listos con este documento; a continuación te pediré otro archivo.`;
};

export const getBotMessageOnValidationFail = (step: StepState, issues: ValidationIssue[]): string => {
  if (!issues.length) {
    return [
      `Mmm, tuve problemas para validar el documento de "${step.title}".`,
      "Revisa que sea el archivo correcto, que se vea claro y que corresponda a este documento.",
      "Cuando lo tengas listo, vuelve a subirlo y lo intentamos otra vez."
    ].join("\n\n");
  }

  const details = issues.map((i) => `• ${i.message}`).join("\n");
  return [
    `Acabo de revisar tu documento de "${step.title}" y vi algunos detalles:`,
    details,
    "Por favor corrige estos puntos y vuelve a subir el archivo. Si algo no te queda claro, escríbeme y lo revisamos."
  ].join("\n\n");
};
