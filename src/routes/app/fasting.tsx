import { createFileRoute } from "@tanstack/react-router";
import { Locked } from "~/components/app-shell";

export const Route = createFileRoute("/app/fasting")({
  component: () => <Locked title="Fasting" />,
});
