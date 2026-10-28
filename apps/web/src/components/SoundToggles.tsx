import { AudioWaveform, Volume2, VolumeX } from "lucide-react";
import { useSoundSettings } from "@/lib/sound";
import { cn } from "@/lib/utils";

const toggle =
  "grid size-9 place-items-center rounded-full border border-sonar-green/30 bg-black/30 transition-colors hover:border-sonar-green/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export function SoundToggles({ className }: { className?: string }) {
  const { settings, update } = useSoundSettings();
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        aria-pressed={settings.effects}
        aria-label="Sound effects"
        title={settings.effects ? "Mute sound effects" : "Unmute sound effects"}
        onClick={() => update({ effects: !settings.effects })}
        className={cn(toggle, settings.effects ? "text-sonar-green" : "text-sonar-ink/40")}
      >
        {settings.effects ? (
          <Volume2 className="size-4" aria-hidden="true" />
        ) : (
          <VolumeX className="size-4" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        aria-pressed={settings.ambient}
        aria-label="Ambient sound"
        title={settings.ambient ? "Turn off ambient sound" : "Turn on ambient sound"}
        onClick={() => update({ ambient: !settings.ambient })}
        className={cn(toggle, settings.ambient ? "text-sonar-cyan" : "text-sonar-ink/40")}
      >
        <AudioWaveform className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
