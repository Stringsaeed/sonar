CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('quick', 'private')),
  end_reason TEXT NOT NULL CHECK (end_reason IN ('sunk', 'forfeit', 'disconnect')),
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL
);

CREATE INDEX matches_ended_at ON matches (ended_at);

CREATE TABLE match_players (
  match_id TEXT NOT NULL REFERENCES matches (id),
  seat INTEGER NOT NULL CHECK (seat IN (0, 1)),
  token TEXT NOT NULL,
  callsign TEXT NOT NULL,
  won INTEGER NOT NULL CHECK (won IN (0, 1)),
  shots_fired INTEGER NOT NULL,
  ships_sunk INTEGER NOT NULL,
  PRIMARY KEY (match_id, seat)
);

CREATE INDEX match_players_token ON match_players (token);
