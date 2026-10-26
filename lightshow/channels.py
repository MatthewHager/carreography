"""Tesla light show channel map (0-based indexes into a 200-channel FSEQ frame).

Source: teslamotors/light-show xlights/tesla_xlights_show_folder (xlights_rgbeffects.xml),
where channels are 1-based. Values per channel are 0-255.
"""

N_CHANNELS = 200
STEP_MS = 20

# --- Lights (1-based xLights channel minus 1) ---
L_OUTER_MAIN, R_OUTER_MAIN = 0, 1
L_INNER_MAIN, R_INNER_MAIN = 2, 3
L_SIGNATURE, R_SIGNATURE = 4, 5
L_CH4, R_CH4 = 6, 7
L_CH5, R_CH5 = 8, 9
L_CH6, R_CH6 = 10, 11
L_FRONT_TURN, R_FRONT_TURN = 12, 13
L_FRONT_FOG, R_FRONT_FOG = 14, 15
L_AUX_PARK, R_AUX_PARK = 16, 17          # Cybertruck: frunk light
L_SIDE_MARKER, R_SIDE_MARKER = 18, 19
L_SIDE_REPEATER, R_SIDE_REPEATER = 20, 21  # Cybertruck: rear side markers
L_REAR_TURN, R_REAR_TURN = 22, 23          # disabled on Cybertruck
BRAKE = 24
L_TAIL, R_TAIL = 25, 26                    # Cybertruck: reverse lights
REVERSE = 27                               # Cybertruck: bed lights (always 500 ms ramp)
REAR_FOG = 28
LICENSE_PLATE = 29

# --- Closures ---
L_FALCON, R_FALCON = 30, 31
L_FRONT_DOOR, R_FRONT_DOOR = 32, 33
L_MIRROR, R_MIRROR = 34, 35
L_FRONT_WINDOW, L_REAR_WINDOW = 36, 37
R_FRONT_WINDOW, R_REAR_WINDOW = 38, 39
LIFTGATE = 40                              # Cybertruck: powered frunk
CHARGE_PORT = 45

# --- Cybertruck light bars (full brightness control, one channel per LED) ---
FRONT_BAR = range(46, 106)    # 60 LEDs, left to right
REAR_BAR = range(110, 162)    # 52 LEDs on the tailgate
OFFROAD_BAR = range(166, 172)

# --- Interior RGB (3 channels each: R, G, B) ---
CENTER_DISPLAY = 175
RIGHT_REAR_RGB = 178
RIGHT_FRONT_RGB = 181
CENTER_FRONT_RGB = 184
LEFT_FRONT_RGB = 187
LEFT_REAR_RGB = 190
ALL_RGB = (CENTER_DISPLAY, RIGHT_REAR_RGB, RIGHT_FRONT_RGB,
           CENTER_FRONT_RGB, LEFT_FRONT_RGB, LEFT_REAR_RGB)

WINDOWS = (L_FRONT_WINDOW, L_REAR_WINDOW, R_FRONT_WINDOW, R_REAR_WINDOW)
MIRRORS = (L_MIRROR, R_MIRROR)

# --- Light values (xLights effect brightness -> byte) ---
OFF = 0
OFF_500, OFF_1000, OFF_2000 = 25, 51, 76
ON_500, ON_1000, ON_2000 = 178, 204, 229
ON = 255

# --- Closure commands ---
CLOSURE_OPEN = 63
CLOSURE_DANCE = 127
CLOSURE_CLOSE = 191
CLOSURE_STOP = 255

# Per-closure command limits per show (Open, Close and Dance count).
CLOSURE_LIMITS = {
    LIFTGATE: 6, L_MIRROR: 20, R_MIRROR: 20, CHARGE_PORT: 3,
    L_FRONT_WINDOW: 6, L_REAR_WINDOW: 6, R_FRONT_WINDOW: 6, R_REAR_WINDOW: 6,
}
