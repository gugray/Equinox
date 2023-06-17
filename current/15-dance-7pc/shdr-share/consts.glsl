const int MAX_MARCHING_STEPS = 255;
const float MIN_DIST = 0.0;
const float MAX_DIST = 50.0;
const float EPSILON = 0.001;

uniform float time;

uniform sampler2D txDance;
uniform float nDancePtKeys;
uniform float nDanceFrames;
uniform float nDanceFramesPerRow;
