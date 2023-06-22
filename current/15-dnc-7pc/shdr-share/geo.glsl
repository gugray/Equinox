#define PI 3.1415926535897932384626433832795

vec3 angleToVec(float azimuth, float altitude) {
    return vec3(
        cos(PI * altitude / 180.0) * sin(PI * azimuth / 180.0),
        sin(PI * altitude / 180.0),
        cos(PI * altitude / 180.0) * cos(PI * altitude / 180.0));
}

float dot2( in vec2 v ) { return dot(v,v); }
float dot2( in vec3 v ) { return dot(v,v); }
float ndot( in vec2 a, in vec2 b ) { return a.x*b.x - a.y*b.y; }

// Rotation matrix around the X axis
mat4 rotateX(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat4(
    vec4(1, 0, 0, 0),
    vec4(0, c, -s, 0),
    vec4(0, s, c, 0),
    vec4(0, 0, 0, 1)
    );
}

vec3 doRotX(vec3 p, float theta) {
    mat4 trans = rotateX(theta);
    return (trans * vec4(p, 1.)).xyz;
}

// Rotation matrix around the Y axis.
mat4 rotateY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat4(
    vec4(c, 0, s, 0),
    vec4(0, 1, 0, 0),
    vec4(-s, 0, c, 0),
    vec4(0, 0, 0, 1)
    );
}

vec3 doRotY(vec3 p, float theta) {
    mat4 trans = rotateY(theta);
    return (trans * vec4(p, 1.)).xyz;
}

// Rotation matrix around the Z axis.
mat4 rotateZ(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat4(
    vec4(c, -s, 0, 0),
    vec4(s, c, 0, 0),
    vec4(0, 0, 1, 0),
    vec4(0, 0, 0, 1)
    );
}

vec3 doRotZ(vec3 p, float theta) {
    mat4 trans = rotateZ(theta);
    return (trans * vec4(p, 1.)).xyz;
}

// Identity matrix.
mat3 identity() {
    return mat3(
    vec3(1, 0, 0),
    vec3(0, 1, 0),
    vec3(0, 0, 1)
    );
}

/**
 * Return a transformation matrix that will transform a ray from view space
 * to world coordinates, given the eye point, the camera target, and an up vector.
 *
 * This assumes that the center of the camera is aligned with the negative z axis in
 * view space when calculating the ray marching direction.
 */
mat4 viewMatrix(vec3 eye, vec3 center, vec3 up) {
    vec3 f = normalize(center - eye);
    vec3 s = normalize(cross(f, up));
    vec3 u = cross(s, f);
    return mat4(
    vec4(s, 0.0),
    vec4(u, 0.0),
    vec4(-f, 0.0),
    vec4(0.0, 0.0, 0.0, 1)
    );
}

/**
 * Return the normalized direction to march in from the eye point for a single pixel.
 *
 * fieldOfView: vertical field of view in degrees
 * size: resolution of the output image
 * fragCoord: the x,y coordinate of the pixel in the output image
 */
vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(fieldOfView / 2.0) / 2.;
    return normalize(vec3(xy, -z));
}
