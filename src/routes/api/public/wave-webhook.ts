import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const Route = createFileRoute("/api/public/wave-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["WAVE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook non configuré", { status: 503 });

        const raw = await request.text();
        const header = request.headers.get("wave-signature") ?? "";
        const parts = Object.fromEntries(
          header
            .split(",")
            .map((chunk) => chunk.trim().split("="))
            .filter((pair): pair is [string, string] => pair.length === 2),
        );
        const timestamp = parts["t"];
        const signature = parts["v1"];
        if (!timestamp || !signature) return new Response("Signature manquante", { status: 401 });

        const candidates = [`${timestamp}${raw}`, `${timestamp}.${raw}`].map((message) =>
          createHmac("sha256", secret).update(message).digest("hex"),
        );
        if (!candidates.some((expected) => safeEqual(signature, expected))) {
          return new Response("Signature invalide", { status: 401 });
        }

        let event: { type?: string; data?: Record<string, unknown> };
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("Corps invalide", { status: 400 });
        }

        const payload = event.data ?? {};
        const reference = typeof payload["client_reference"] === "string" ? payload["client_reference"] : null;
        const sessionId = typeof payload["id"] === "string" ? payload["id"] : null;
        if (!reference && !sessionId) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const query = supabaseAdmin.from("orders");

        const paid = event.type === "checkout.session.completed" && payload["payment_status"] === "succeeded";
        const failed = event.type === "checkout.session.payment_failed";
        if (!paid && !failed) return new Response("ok");

        const update = paid
          ? { status: "paid", paid_at: new Date().toISOString(), wave_session_id: sessionId }
          : { status: "failed", wave_session_id: sessionId };

        const builder = query.update(update);
        const { error } = reference
          ? await builder.eq("reference", reference)
          : await builder.eq("wave_session_id", sessionId!);

        if (error) {
          console.error("Wave webhook update failed:", error.message);
          return new Response("Erreur base de données", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
