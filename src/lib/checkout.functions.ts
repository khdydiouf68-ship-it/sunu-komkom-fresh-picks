import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  paymentMethod: z.enum(["wave", "cash"]),
  origin: z.string().url().max(200),
});

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => checkoutInput.parse(input))
  .handler(async ({ data }) => {
    const { items, subtotal } = buildOrderLines(data.lines);
    if (items.length === 0) throw new Error("Panier vide ou produits inconnus.");

    const deliveryFee = LIVRAISON_FCFA;
    const total = subtotal + deliveryFee;
    const reference = makeReference();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        reference,
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

export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ reference: z.string().min(4).max(40) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("reference, status, total, delivery_fee, payment_method, customer_name, items, created_at")
      .eq("reference", data.reference)
      .maybeSingle();

    if (!order) return null;
    return order;
  });
