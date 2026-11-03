import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const myOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string }).email ?? "";

    // Récupération des commandes — on avale les erreurs (colonne user_id absente, RLS, etc.)
    let orders: { reference: string; total: number; status: string; payment_method: string; created_at: string }[] = [];
    try {
      const { data } = await context.supabase
        .from("orders")
        .select("reference,total,status,payment_method,created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false });
      orders = data ?? [];
    } catch {
      // Table inexistante ou colonne user_id non migrée : on renvoie un tableau vide.
      orders = [];
    }

    // Vérification du rôle admin — on avale aussi les erreurs (fonction SQL absente)
    let isAdmin = false;
    try {
      const { data } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      isAdmin = data === true;
    } catch {
      isAdmin = false;
    }

    return { orders, isAdmin, email };
  });

export const profileInput = z.object({
  fullName: z.string().trim().max(80),
  phone: z.string().trim().max(25),
  address: z.string().trim().max(200),
  quartier: z.string().trim().max(80),
});
export type CustomerProfile = z.infer<typeof profileInput>;

export const myProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomerProfile> => {
    // On utilise maybeSingle() pour ne pas planter si la ligne n'existe pas encore.
    // On avale aussi les erreurs Supabase (ex: table absente, RLS) plutôt que
    // de faire planter toute la page /compte.
    try {
      const { data } = await context.supabase
        .from("customer_profiles")
        .select("full_name,phone,address,quartier")
        .eq("user_id", context.userId)
        .maybeSingle();
      return {
        fullName: data?.full_name ?? "",
        phone: data?.phone ?? "",
        address: data?.address ?? "",
        quartier: data?.quartier ?? "",
      };
    } catch {
      // Profil absent ou erreur non bloquante : on renvoie un profil vide.
      return { fullName: "", phone: "", address: "", quartier: "" };
    }
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileInput.parse(input))
  .handler(async ({ context, data }): Promise<CustomerProfile> => {
    const { error } = await context.supabase.from("customer_profiles").upsert(
      {
        user_id: context.userId,
        full_name: data.fullName,
        phone: data.phone,
        address: data.address,
        quartier: data.quartier,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("Impossible d’enregistrer vos informations.");
    return data;
  });
