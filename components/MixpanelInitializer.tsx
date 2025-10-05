"use client";

import { useEffect } from "react";
import { initMixpanel } from "@/lib/mixpanelClient";

const MixpanelInitializer = () => {
    useEffect(() => {
        initMixpanel();
    }, []);

    return null;
};

export default MixpanelInitializer;
