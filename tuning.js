// Every tunable number for Comic Runner, in one place.

// --- Playfield / panel ---
export const PLAYFIELD_W = 960;      // logical panel width in game units
export const PLAYFIELD_H = 540;      // logical panel height in game units
export const PANEL_MARGIN = 22;      // inset of the comic panel border from the playfield edge
export const GROUND_Y = 460;         // y of the ground line, measured from the top of the playfield
export const GROUND_THICKNESS = 6;   // thickness of the ink ground line
export const OUTLINE_WIDTH = 4;      // chunky ink outline weight for every shape
export const MAX_DT = 1 / 30;        // longest step we simulate, so a stalled tab can't teleport the player

// --- Player ---
export const GRAVITY = 2200;         // downward acceleration in units per second squared
export const MAX_FALL_SPEED = 1400;  // terminal falling speed, keeps the fall readable
export const JUMP_VELOCITY = -820;   // upward launch speed on jump (negative is up)
export const MAX_JUMPS = 2;          // jumps allowed before the player must touch ground again
export const DOUBLE_JUMP_VELOCITY = -560; // upward speed of the second, weaker mid-air jump
export const MOVE_SPEED = 260;       // horizontal run speed in units per second
export const PLAYER_W = 46;          // player width
export const PLAYER_H = 56;          // player height
export const PLAYER_START_X = 220;   // player centre x at the start of a run
export const SHAPE_ROUND = 0.34;     // corner rounding of the wedge, as a fraction of the player's short side
export const EYE_OFFSET_X = -0.05;   // eye centre x, as a fraction of player width
export const EYE_OFFSET_Y = -0.52;   // eye centre y, as a fraction of player height above the feet
export const EYE_RADIUS_X = 0.16;    // eye radius x, as a fraction of player width
export const EYE_RADIUS_Y = 0.14;    // eye radius y, as a fraction of player height

// --- Slash ---
export const SLASH_DURATION = 0.18;    // seconds the swing arc stays on screen and can hit
export const SLASH_REACH = 78;         // arc radius, how far in front of the shoulder the swing reaches
export const SLASH_THICKNESS = 12;     // stroke weight of the arc, and half of it is the hit tolerance
export const SLASH_ARC_SPREAD = 2.6;   // total angular sweep of the arc in radians, centred on facing
export const SLASH_SAMPLES = 64;       // points sampled along the arc for hit detection
export const SHOULDER_HEIGHT = 0.55;   // arc pivot height above the feet, as a fraction of player height

// --- Monsters ---
export const MONSTER_W = 48;           // ground-crawling ink rectangle width
export const MONSTER_H = 44;           // ground-crawling ink rectangle height
export const MONSTER_SPEED = 110;      // crawling speed in units per second, moving left
export const BASE_MONSTERS_PER_PANEL = 2; // quota base added to the current panel number
export const SPAWN_INTERVAL = 2.0;     // seconds between monster spawns at panel 1
export const SPAWN_PANEL_MULTIPLIER = 0.25; // per-panel factor that raises spawn rate (interval / multiplier)
export const HIT_FLASH = 0.22;         // seconds a killed monster stays bright before disappearing
export const STOMP_SQUASH = 0.2;       // how flat the monster squashes on a stomp, as a fraction of its height
export const STOMP_BOUNCE_VELOCITY = -520; // small upward bounce after a successful stomp

// --- Panels / scoring ---
export const PANEL_CLEAR_DELAY = 1.4;  // seconds "PANEL N CLEARED!" stays on screen
export const PANEL_CLEAR_SCORE = 100;  // points awarded for clearing a panel
export const MONSTER_KILL_SCORE = 50;  // points awarded for each stomp or slash kill
export const SCORE_FONT_SIZE = 24;     // score counter text size in playfield units
export const PANEL_COUNTER_FONT_SIZE = 20; // panel X/8 counter text size
export const PANEL_CLEAR_FONT_SIZE = 56;   // "PANEL N CLEARED!" text size
export const VICTORY_FONT_SIZE = 72;   // victory banner text size
export const VICTORY_TEXT = 'VICTORY!'; // banner shown after clearing panel 8
export const VICTORY_HINT = 'Press R or Space to play again'; // prompt under victory banner
export const PANEL_FLASH_COLOR = '#FFF4D2'; // bright ink flash behind the panel during a clear

// --- Game over ---
export const GAME_OVER_TEXT = 'GAME OVER!';        // banner shown when a run ends
export const RESTART_HINT = 'Press R or Space to retry'; // prompt printed under the banner
export const GAME_OVER_BANNER_Y = 230;             // banner centre y in playfield units
export const GAME_OVER_FONT_SIZE = 72;             // banner text size in playfield units
export const GAME_OVER_HINT_SIZE = 24;             // restart hint text size in playfield units
export const GAME_OVER_HINT_GAP = 58;              // vertical gap between banner centre and hint centre
export const FONT_STACK = '"Ka Blam", monospace'; // canvas font stack for panel text

// --- Controls hint (temporary, bottom-left of the panel) ---
export const CONTROLS_HINT = '← → MOVE   SPACE/UP/W JUMP   / SLASH'; // temporary controls line
export const CONTROLS_HINT_SIZE = 16;   // hint text size in playfield units
export const CONTROLS_HINT_DURATION = 8; // seconds the hint stays if the player never slashes
export const CONTROLS_HINT_MARGIN = 14; // gap between the hint and the panel edge

// --- Colours ---
export const COLOR_DEATH = '#C4342A';       // hero's body and banner ink once the run has ended
export const COLOR_PAPER = '#F4EBD9';       // warm newsprint page
export const COLOR_INK = '#1E1B1E';         // comic ink outline
export const COLOR_PLAYER = '#E94B35';      // the hero's red body
export const COLOR_EYE = '#FFF4D2';         // the hero's cream eye and monster hit flash
export const COLOR_MONSTER = '#1E1B1E';     // ground-crawling ink rectangle
export const COLOR_GROUND = '#1E1B1E';      // ground line ink
