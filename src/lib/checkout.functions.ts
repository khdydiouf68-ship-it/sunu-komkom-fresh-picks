import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { readCatalog } from "./catalog.functions";
import { mergeCatalog } from "./catalog-shared";
import { LIVRAISON_FCFA, buildOrderLines, makeReference } from "./checkout-shared";

const checkoutInput = z.object({
  lines: z
    .array(z.object({ id: z.string().min(1).max(60), qty: z.number().int().min(1).max(50) }))
    .min(1)
    .max(40),
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().min(6).max(25),
  address: z.string().trim().min(4).max(200),
  quartier: z.string().trim().max(80).optional(),
  note: z.string().trim().max(400).optional(),
  paymentMethod: z.enum(["paytech", "wave", "cash"]),
  origin: z.string().url().max(200),
});

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => checkoutInput.parse(input))
  .handler(async ({ data }) => {
    const { items, subtotal } = buildOrderLines(data.lines, mergeCatalog((await readCatalog()) as never));
    if (items.length === 0) throw new Error("Panier vide ou produits inconnus.");

    const deliveryFee = LIVRAISON_FCFA;
    const total = subtotal + deliveryFee;
    const reference = makeReference();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const bearer = getRequestHeader("authorization")?.replace(/^Bearer\s+/i, "");
    let userId: string | null = null;
    if (bearer) {
      const { data: who } = await supabaseAdmin.auth.getUser(bearer);
      userId = who.user?.id ?? null;
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        reference,
        user_id: userId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        address: data.address,
        quartier: data.quartier ?? null,
        note: data.note ?? null,
        items,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        payment_method: data.paymentMethod,
        status: data.paymentMethod === "cash" ? "confirmed" : "pending",
      })
      .select("id, reference")
      .single();

    if (error || !order) throw new Error(`Impossible d'enregistrer la commande: ${error?.message}`);

    if (data.paymentMethod === "cash") {
      return { reference, launchUrl: null as string | null };
    }

    if (data.paymentMethod === "paytech") {
      try {
        const launchUrl = await startPaytechPayment(
          { id: order.id, reference, total, itemCount: items.length },
          data.origin,
        );
        return { reference, launchUrl };
      } catch (err) {
        await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
        throw err;
      }
    }

    const apiKey = process.env["WAVE_API_KEY"];
    if (!apiKey) throw new Error("Le paiement Wave n'est pas encore configuré (clé API manquante).");

    const response = await fetch("https://api.wave.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "idempotency-key": reference,
      },
      body: JSON.stringify({
        amount: String(total),
        currency: "XOF",
        client_reference: reference,
        success_url: `${data.origin}/commande/${reference}`,
        error_url: `${data.origin}/commande/${reference}?echec=1`,
      }),
    });

    const body = await response.text();
    if (!response.ok) {
      console.error(`Wave checkout failed [${response.status}]: ${body}`);
      await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
      throw new Error(`Wave a refusé la demande de paiement [${response.status}]: ${body}`);
    }

    const session = JSON.parse(body) as { id?: string; wave_launch_url?: string };
    if (!session.wave_launch_url) throw new Error("Réponse Wave invalide : lien de paiement absent.");

    await supabaseAdmin
      .from("orders")
      .update({ wave_session_id: session.id ?? null, wave_launch_url: session.wave_launch_url })
      .eq("id", order.id);

    return { reference, launchUrl: session.wave_launch_url };
  });

/** Crée la demande de paiement PayTech pour une commande et mémorise son token. */
async function startPaytechPayment(
  order: { id: string; reference: string; total: number; itemCount: number },
  origin: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { requestPaytechPayment } = await import("./paytech.server");
  const { token, redirectUrl } = await requestPaytechPayment({
    reference: order.reference,
    amount: order.total,
    itemName: `Commande ${order.reference}`,
    commandName: `Sunu KomKom — ${order.itemCount} article${order.itemCount > 1 ? "s" : ""}`,
    origin,
  });
  await supabaseAdmin
    .from("orders")
    .update({ paytech_token: token, status: "pending" })
    .eq("id", order.id);
  return redirectUrl;
}

/** Relance le paiement en ligne d'une commande non payée (paiement annulé ou abandonné). */
export const retryPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ reference: z.string().min(4).max(40), origin: z.string().url().max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, reference, total, items, status, payment_method")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!order) throw new Error("Commande introuvable.");
    if (order.status === "paid" || order.status === "confirmed") throw new Error("Cette commande est déjà réglée.");
    if (order.payment_method !== "paytech") throw new Error("Cette commande ne se règle pas en ligne.");
    const itemCount = Array.isArray(order.items) ? order.items.length : 1;
    const launchUrl = await startPaytechPayment(
      { id: order.id, reference: order.reference, total: order.total, itemCount },
      data.origin,
    );
    return { launchUrl };
  });

export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ reference: z.string().min(4).max(40) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("orders")
      .select(
        "id, reference, status, total, delivery_fee, payment_method, paid_with, paid_at, paytech_token, customer_name, items, created_at",
      )
      .eq("reference", data.reference)
      .maybeSingle();

    if (!row) return null;
    const { id, paytech_token: token, ...order } = row;

    // Secours si la notification IPN n'est pas arrivée (toujours le cas en local) :
    // on demande directement à PayTech où en est le paiement.
    if (order.payment_method === "paytech" && order.status === "pending" && token) {
      try {
        const { getPaytechStatus } = await import("./paytech.server");
        const { result } = await getPaytechStatus(token);
        if (result !== "pending") {
          const update =
            result === "paid"
              ? { status: "paid", paid_at: new Date().toISOString() }
              : { status: "failed" };
          await supabaseAdmin.from("orders").update(update).eq("id", id).eq("status", "pending");
          return { ...order, ...update };
        }
      } catch (err) {
        console.error("PayTech get-status failed:", err);
      }
    }
    return order;
  });
