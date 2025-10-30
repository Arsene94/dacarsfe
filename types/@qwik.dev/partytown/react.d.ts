import type { FunctionComponent, ReactNode } from "react";

declare module "@qwik.dev/partytown/react" {
    type ForwardProperty = string | readonly string[];

    interface PartytownProps {
        debug?: boolean;
        forward?: ForwardProperty[] | ForwardProperty;
        config?: Record<string, unknown>;
        children?: ReactNode;
    }

    export const Partytown: FunctionComponent<PartytownProps>;
}
