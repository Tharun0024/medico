"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

export default function MapWithNoSSR(props: any) {
    const Map = useMemo(
        () =>
            dynamic(() => import("@/components/LeafletMap"), {
                loading: () => <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center">Loading Map...</div>,
                ssr: false,
            }),
        []
    );

    return <Map {...props} />;
}