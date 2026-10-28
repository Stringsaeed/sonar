import { quickRoomName } from "@sonar/game";
import { createFileRoute } from "@tanstack/react-router";
import { RoomScreen } from "@/components/room/RoomScreen";

export const Route = createFileRoute("/q/$id")({ component: QuickRoom });

function QuickRoom() {
  const { id } = Route.useParams();
  return <RoomScreen key={id} room={quickRoomName(id)} />;
}
