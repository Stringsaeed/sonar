import { createFileRoute } from "@tanstack/react-router";
import { useFakeBattle } from "@/prototype/fixtures";
import { parseVariant, PrototypeSwitcher } from "@/prototype/switcher";
import { BATTLES } from "@/prototype/variants";

export const Route = createFileRoute("/play")({
  validateSearch: parseVariant,
  component: QuickMatch,
});

function QuickMatch() {
  const { variant } = Route.useSearch();
  const battle = useFakeBattle();
  const Variant = BATTLES[variant];

  return (
    <>
      <Variant {...battle} />
      <PrototypeSwitcher current={variant} />
    </>
  );
}
