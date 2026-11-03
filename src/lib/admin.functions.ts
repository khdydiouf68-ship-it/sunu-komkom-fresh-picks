import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "./catalog-shared";

export type DashboardOrder = {
  reference: string;
  customer_name: string;
  total: number;
  status: string;
  payment_method: string;
  paid_with: string | null;
  items: Array<{ id: string; name: string; qty: number; total: number }>;
  created_at: string;
};

/** Données du tableau de bord : commandes et nombre de clients. Réservé aux administrateurs. */
export const adminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    assertAdminRole(allowed);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: orders, error }, { count: customers }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("reference, customer_name, total, status, payment_method, paid_with, items, created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabaseAdmin.from("customer_profiles").select("user_id", { count: "exact", head: true }),
    ]);
    if (error) throw new Error("Impossible de charger les statistiques.");

    return {
      orders: (orders ?? []).map((o) => ({
        ...o,
        items: (Array.isArray(o.items) ? o.items : []) as DashboardOrder["items"],
      })) as DashboardOrder[],
      customers: customers ?? 0,
    };
  });
