import { createFileRoute } from "@tanstack/react-router";

/**
 * Notification de paiement instantanée (IPN) envoyée par PayTech après un paiement
 * réussi (sale_complete) ou annulé (sale_canceled). Elle doit être joignable en HTTPS :
 * https://<votre-site>/api/public/paytech-ipn
 */
export const Route = createFileRoute("/api/public/paytech-ipn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyPaytechIpn, paytechConfig } = await import("@/lib/paytech.server");

        const raw = await request.text();
        let fields: Record<string, string> = {};
        try {
          const contentType = request.headers.get("content-type") ?? "";
          const parsed: Record<string, unknown> = contentType.includes("application/json")
            ? JSON.parse(raw)
            : Object.fromEntries(new URLSearchParams(raw));
          fields = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, v == null ? "" : String(v)]));
        } catch {
          return new Response("Corps invalide", { status: 400 });
        }

        try {
          if (!verifyPaytechIpn(fields)) return new Response("Signature invalide", { status: 403 });
        } catch {
          return new Response("PayTech non configuré", { status: 503 });
        }

        const reference = fields["ref_command"];
        const event = fields["type_event"];
        if (!reference) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, total, status, paytech_token")
          .eq("reference", reference)
          .maybeSingle();
        if (!order) return new Response("ok");

        // Le token doit correspondre à la dernière demande de paiement de cette commande.
        if (order.paytech_token && fields["token"] && fields["token"] !== order.paytech_token) {
          return new Response("ok");
        }

        if (event === "sale_complete") {
          // En production, le montant payé doit correspondre au total de la commande.
          // (En mode test, PayTech débite un petit montant aléatoire : on ne vérifie pas.)
          if (paytechConfig().env === "prod" && Number(fields["item_price"]) !== order.total) {
            console.error(`PayTech IPN: montant ${fields["item_price"]} ≠ total ${order.total} (${reference})`);
            return new Response("Montant incorrect", { status: 400 });
          }
          const { error } = await supabaseAdmin
            .from("orders")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              paid_with: fields["payment_method"] || null,
            })
            .eq("id", order.id);
          if (error) return new Response("Erreur base de données", { status: 500 });
        } else if (event === "sale_canceled" && order.status === "pending") {
          await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
        }

        return new Response("ok");
      },
    },
  },
});
