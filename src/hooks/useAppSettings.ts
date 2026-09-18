import { useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import { generateId } from "../utils/id";

export interface AppSettings {
  signupEnabled: boolean;
  maintenanceMode: boolean;
  feedbackEnabled: boolean;
}

const DEFAULTS: AppSettings = { signupEnabled: true, maintenanceMode: false, feedbackEnabled: true };

// Single-row table — readable by any authenticated user (see
// 20260918121602_admin_panel.sql) so the whole app can react to these
// toggles, not just the admin panel that writes them.
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  // This hook mounts from several components at once (App, AuthScreen,
  // FeedbackModal) — supabase-js dedupes `.channel()` by topic name, so a
  // shared static name would hand the second caller an already-subscribed
  // channel and throw on `.on()`. A unique id per mount avoids that collision.
  const channelIdRef = useRef(generateId());

  useEffect(() => {
    let cancelled = false;

    async function refetch() {
      const { data, error } = await supabase
        .from("app_settings")
        .select("signup_enabled, maintenance_mode, feedback_enabled")
        .single();
      if (cancelled) return;
      if (!error && data) {
        setSettings({
          signupEnabled: data.signup_enabled,
          maintenanceMode: data.maintenance_mode,
          feedbackEnabled: data.feedback_enabled,
        });
      }
      setLoading(false);
    }

    refetch();

    const channel = supabase
      .channel(`app_settings:${channelIdRef.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => refetch())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading };
}
