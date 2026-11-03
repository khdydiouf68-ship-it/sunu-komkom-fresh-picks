// Intégration PayTech (https://paytech.sn) — code serveur uniquement.
// Les clés ne doivent jamais être envoyées au navigateur.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const API = "https://paytech.sn/api";

export type PaytechEnv = "test" | "prod";

export function paytechConfig() {
  const apiKey = process.env["PAYTECH_API_KEY"];
  const apiSecret = process.env["PAYTECH_API_SECRET"];
  if (!apiKey || !apiSecret) {
    throw new Error("Le paiement en ligne n'est pas encore configuré (clés PayTech manquantes).");
  }
  const env: PaytechEnv = process.env["PAYTECH_ENV"] === "prod" ? "prod" : "test";
  return { apiKey, apiSecret, env };
}

/**
 * URL publique du site. En production, SITE_URL doit être défini (ex : https://sunukomkom.sn) :
 * l'adresse de notification IPN n'est jamais déduite d'une valeur envoyée par le navigateur.
 */
export function siteUrls(requestOrigin: string) {
  // Sur Vercel, VERCEL_PROJECT_PRODUCTION_URL (ex : sunu-komkom.vercel.app) est fourni automatiquement.
  const vercel = process.env["VERCEL_PROJECT_PRODUCTION_URL"];
  const site = (process.env["SITE_URL"] || (vercel ? `https://${vercel}` : undefined))?.replace(/\/+$/, "");
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin);
  const base = site ?? (isLocal ? requestOrigin : null);
  if (!base) throw new Error("SITE_URL n'est pas configuré sur le serveur.");

  // PayTech exige une IPN en HTTPS. En local (http://localhost), elle ne peut pas nous joindre :
  // le statut est alors récupéré par vérification directe (voir syncPaytechStatus).
  const ipn =
    process.env["PAYTECH_IPN_URL"] ??
    `${base.replace(/^http:/, "https:")}/api/public/paytech-ipn`;
  return { base, ipn };
}

function headers(apiKey: string, apiSecret: string) {
  return {
    API_KEY: apiKey,
    API_SECRET: apiSecret,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function requestPaytechPayment(input: {
  reference: string;
  amount: number;
  itemName: string;
  commandName: string;
  origin: string;
}) {
  const { apiKey, apiSecret, env } = paytechConfig();
  const { base, ipn } = siteUrls(input.origin);

  const response = await fetch(`${API}/payment/request-payment`, {
    method: "POST",
    headers: headers(apiKey, apiSecret),
    body: JSON.stringify({
      item_name: input.itemName,
      item_price: input.amount,
      currency: "XOF",
      ref_command: input.reference,
      command_name: input.commandName,
      env,
      ipn_url: ipn,
      success_url: `${base}/commande/${input.reference}`,
      cancel_url: `${base}/commande/${input.reference}?echec=1`,
      custom_field: JSON.stringify({ reference: input.reference }),
    }),
  });

  const text = await response.text();
  let body: { success?: number; token?: string; redirect_url?: string; message?: string } = {};
  try {
    body = JSON.parse(text);
  } catch {
    /* réponse non JSON */
  }
  if (!response.ok || body.success !== 1 || !body.token || !body.redirect_url) {
    console.error(`PayTech request-payment failed [${response.status}]: ${text}`);
    throw new Error(body.message ? `PayTech : ${body.message}` : "PayTech a refusé la demande de paiement.");
  }
  return { token: body.token, redirectUrl: body.redirect_url };
}

const PAID_STATES = new Set(["completed", "complete", "success", "succeeded", "paid", "sale_complete", "done"]);
const FAILED_STATES = new Set(["canceled", "cancelled", "failed", "expired", "refused", "sale_canceled"]);

/** Interroge PayTech sur l'état d'un paiement. Renvoie "paid", "failed" ou "pending". */
export async function getPaytechStatus(token: string): Promise<{
  result: "paid" | "failed" | "pending";
  state: string | null;
}> {
  const { apiKey, apiSecret } = paytechConfig();
  const response = await fetch(`${API}/payment/get-status?token_payment=${encodeURIComponent(token)}`, {
    headers: headers(apiKey, apiSecret),
  });
  if (!response.ok) return { result: "pending", state: null };
  const body = (await response.json().catch(() => ({}))) as { payment?: { state?: string } };
  const state = body.payment?.state?.toLowerCase() ?? null;
  if (state && PAID_STATES.has(state)) return { result: "paid", state };
  if (state && FAILED_STATES.has(state)) return { result: "failed", state };
  if (state && state !== "running" && state !== "pending") {
    console.warn(`PayTech: état de paiement non reconnu "${state}" (token ${token})`);
  }
  return { result: "pending", state };
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Vérifie qu'une notification IPN vient bien de PayTech (HMAC si présent, sinon SHA256 des clés). */
export function verifyPaytechIpn(fields: Record<string, string>) {
  const { apiKey, apiSecret } = paytechConfig();
  const hmac = fields["hmac_compute"];
  if (hmac) {
    const amount = fields["final_item_price"] || fields["item_price"] || "";
    const expected = createHmac("sha256", apiSecret)
      .update(`${amount}|${fields["ref_command"] ?? ""}|${apiKey}`)
      .digest("hex");
    return safeEqual(hmac, expected);
  }
  return (
    safeEqual(fields["api_key_sha256"] ?? "", sha256(apiKey)) &&
    safeEqual(fields["api_secret_sha256"] ?? "", sha256(apiSecret))
  );
}
