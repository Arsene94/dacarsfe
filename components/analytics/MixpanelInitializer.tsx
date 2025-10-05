"use client";

import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import { identifyMixpanelUser, initMixpanel } from "@/lib/mixpanelClient";

const MixpanelInitializer = () => {
  const { user } = useAuth();

  useEffect(() => {
    initMixpanel();
  }, []);

  useEffect(() => {
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

    identifyMixpanelUser(String(user.id), mixpanelTraits);
  }, [user]);

  return null;
};

export default MixpanelInitializer;
