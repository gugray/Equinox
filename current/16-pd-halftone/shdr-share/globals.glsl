#define PI 3.1415926535897932384626433832795

const int MAX_MARCHING_STEPS = 255;
const float MIN_DIST = 0.0;
const float MAX_DIST = 100.0;
const float EPSILON = 0.001;

uniform float time;

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

