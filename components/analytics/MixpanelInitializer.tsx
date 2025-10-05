"use client";

import { useEffect } from "react";

import { useOptionalAuth } from "@/context/AuthContext";
import { identifyMixpanelUser, initMixpanel } from "@/lib/mixpanelClient";

const MixpanelInitializer = () => {
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;

  useEffect(() => {
    initMixpanel();
  }, []);

  useEffect(() => {
    const distinctId = user?.id;

    if (distinctId === undefined || distinctId === null) {
      return;
    }

    if (!user) {
      return;
    }

    const traits: Record<string, unknown> = {};

    if (user.email) {
      traits.email = user.email;
    }

    if (user.username) {
      traits.username = user.username;
    }

    if (user.first_name) {
      traits.first_name = user.first_name;
    }

    if (user.last_name) {
      traits.last_name = user.last_name;
    }

    const mixpanelTraits = Object.keys(traits).length > 0 ? traits : undefined;

    identifyMixpanelUser(String(distinctId), mixpanelTraits);
  }, [user]);

  return null;
};

export default MixpanelInitializer;
