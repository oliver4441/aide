"use client";

import UiLoader from "./UiLoader";

/** Back-compat alias for the motion-driven gradient ring loader. */
export default function UiSpinner(props: React.ComponentProps<typeof UiLoader>) {
  return <UiLoader {...props} />;
}
