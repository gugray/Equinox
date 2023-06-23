const int MAX_MARCHING_STEPS = 255;
const float MIN_DIST = 0.0;
const float MAX_DIST = 100.0;
const float EPSILON = 0.001;

uniform float time;

uniform sampler2D txDnc1;
uniform float nDncPtKeys1;
uniform float nDncFrames1;
uniform float nDncFramesPerRow1;

float pointSize = 1.0;

bool shadows = true;

float eyeFOV;
float eyeAzimuth;
float eyeAltitude;
float eyeDistance;
vec3 light1Vec;
float light1Strength;
vec3 light2Vec;
float light2Strength;
float ambientLightStrength;

//uniform sampler2D txDnc2;
//uniform float nDncPtKeys2;
//uniform float nDncFrames2;
//uniform float nDncFramesPerRow2;

