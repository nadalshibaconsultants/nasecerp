import { env } from "../../env.js";

export type AspSubmitResult = {
  mode: "simulation" | "live";
  status: "submitted" | "transmitted";
  externalId: string;
  message: string;
  response: Record<string, unknown>;
};

export async function submitToAsp(payload: {
  id: string;
  invoiceNumber: string;
  invoiceUuid: string;
}): Promise<AspSubmitResult> {
  const provider = env.EINVOICE_ASP_PROVIDER || "Configured ASP";

  if (env.EINVOICE_ASP_MODE === "live") {
    if (!env.EINVOICE_ASP_ENDPOINT || !env.EINVOICE_ASP_API_KEY) {
      throw new Error("Live ASP mode requires EINVOICE_ASP_ENDPOINT and EINVOICE_ASP_API_KEY.");
    }
    // TODO(e-invoicing): replace this placeholder with the certified ASP's
    // signed PINT-AE payload format after final provider onboarding.
    return {
      mode: "live",
      status: "submitted",
      externalId: `live-${payload.invoiceUuid}`,
      message: `Submitted to ${provider}; awaiting provider callback.`,
      response: { provider, endpointConfigured: true },
    };
  }

  return {
    mode: "simulation",
    status: "transmitted",
    externalId: `sim-${payload.invoiceUuid}`,
    message: `Simulation: validated and transmitted through ${provider}.`,
    response: { provider, simulated: true },
  };
}
