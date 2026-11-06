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

// --- Test target ---
export const TARGET_W = 64;      // target box width
export const TARGET_H = 66;      // target box height
export const TARGET_X = 640;     // target box centre x, sitting on the ground line
export const HIT_FLASH = 0.22;   // seconds a slash hit or stomp keeps the target lit up
export const STOMP_SQUASH = 0.2; // how flat the target squashes on a stomp, as a fraction of its height

// --- Colours ---
export const COLOR_PAPER = '#F4EBD9';       // warm newsprint page
export const COLOR_INK = '#1E1B1E';         // comic ink outline
export const COLOR_PLAYER = '#E94B35';      // the hero's red body
export const COLOR_EYE = '#FFF4D2';         // the hero's cream eye and hit flash
export const COLOR_TARGET = '#1E1B1E';      // test target at rest
export const COLOR_TARGET_HIT = '#FFF4D2';  // test target when hit
export const COLOR_GROUND = '#1E1B1E';      // ground line ink
