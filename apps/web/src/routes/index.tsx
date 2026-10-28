import { useAtomValue } from "@effect/atom-react";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@sonar/game";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AsyncResult } from "effect/reactivity";
import { globalStatsAtom, myRecordAtom } from "@/lib/api";
import { loadIdentity } from "@/lib/identity";
import { FAKE_LIVE, FAKE_RECORD, FAKE_STATS } from "@/prototype/fixtures";
import { parseVariant, PrototypeSwitcher } from "@/prototype/switcher";
import { LANDINGS } from "@/prototype/variants";

export const Route = createFileRoute("/")({
  validateSearch: parseVariant,
  component: Landing,
});

const randomRoomCode = () =>
  Array.from(
    { length: ROOM_CODE_LENGTH },
    () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)],
  ).join("");

function Landing() {
  const { variant } = Route.useSearch();
  const navigate = useNavigate();
  const stats = useAtomValue(globalStatsAtom);
  const record = useAtomValue(myRecordAtom);
  const Variant = LANDINGS[variant];

  // Real data when the API has any; fixtures otherwise, so the prototype has realistic density.
  const liveStats = AsyncResult.getOrElse(stats, () => undefined);
  const liveRecord = AsyncResult.getOrElse(record, () => undefined);

  return (
    <>
      <Variant
        callsign={loadIdentity().callsign}
        stats={liveStats && liveStats.matchesAllTime > 0 ? liveStats : FAKE_STATS}
        record={liveRecord && liveRecord.recent.length > 0 ? liveRecord : FAKE_RECORD}
        live={FAKE_LIVE}
        onQuickMatch={() => void navigate({ to: "/play", search: { variant } })}
        onCreateRoom={() => void navigate({ to: "/r/$code", params: { code: randomRoomCode() } })}
        onJoinRoom={(code) =>
          void navigate({ to: "/r/$code", params: { code: code.toUpperCase() } })
        }
      />
      <PrototypeSwitcher current={variant} />
    </>
  );
}
