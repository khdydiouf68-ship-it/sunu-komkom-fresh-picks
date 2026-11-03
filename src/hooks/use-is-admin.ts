import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Indique si l'utilisateur connecté a le rôle 'admin' (table user_roles).
 * Se met à jour à la connexion / déconnexion.
 * Sert uniquement à afficher ou masquer des éléments : l'accès réel à /admin
 * est vérifié côté serveur.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check(userId: string | undefined) {
      if (!userId) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!cancelled) setIsAdmin(!error && data === true);
    }

    void supabase.auth.getSession().then(({ data }) => check(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void check(session?.user.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}
