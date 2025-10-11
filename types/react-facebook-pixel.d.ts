declare module "react-facebook-pixel" {
    export type ReactPixelOptions = {
        autoConfig?: boolean;
        debug?: boolean;
    };

    export interface ReactPixel {
        init: (
            pixelId: string,
            advancedMatching?: Record<string, unknown>,
            options?: ReactPixelOptions,
        ) => void;
        pageView: () => void;
        track: (eventName: string, data?: Record<string, unknown>) => void;
        trackSingle: (pixelId: string, eventName: string, data?: Record<string, unknown>) => void;
        trackCustom: (eventName: string, data?: Record<string, unknown>) => void;
        trackSingleCustom: (pixelId: string, eventName: string, data?: Record<string, unknown>) => void;
        loadPixel: () => void;
        revokeConsent: () => void;
        grantConsent: () => void;
        clear: () => void;
    }

    const ReactFacebookPixel: ReactPixel;

    export default ReactFacebookPixel;
}
