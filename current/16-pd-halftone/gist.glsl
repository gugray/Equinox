
void view() {
    eyeFOV = 45.0 * PI / 180.0;
    eyeAzimuth = 0.0001 * PI / 180.0;
    eyeAltitude = 0.0 * PI / 180.0;
    eyeDistance = 32.0;
    light1Vec = angleToVec(-75.0, 20.0);
    light1Strength = 0.3;
    light2Vec = angleToVec(30.0, 70.0);
    light2Strength = 0.2;
    ambientLightStrength = 0.05;

}

vec2 map(vec3 p) {

    // opMod1(q.y, 4.0);
    // opCircRep(q.xz, 2.);
    // float d = sdBox(q, vec3(8., 0.2, 12.));
    // res = opU(res, vec2(d, 1.));
    // vec2 ix = opModInterval2(q.xz, vec2(sz * 2.0 + 0.5), vec2(-2.0), vec2(2.0));
    // float clr = (snoise(vec3(ix.xy, mod(t * 0.0005, 20.0))) + 1.0) * 0.5;

    vec2 res = vec2(1e10, 0.);
    float t = time + 500.;

    {
        vec3 q = p;
        q -= vec3(8., 0., 0.);
        q = doRotX(q, t * 0.005);
        float d = sdTorus(q, vec2(5.0, 1.));
        res = opU(res, vec2(d, 1.0));
    }

    return res;
}

vec2 getSurfaceGradient(sampler2D txScene, vec2 trgRes, ivec2 sc) {

    int delta = 2;

    ivec2 scAbove = ivec2(sc.x, min(int(trgRes.y - 1.), sc.y + delta));
    ivec2 scBelow = ivec2(sc.x, max(0, sc.y - delta));
    ivec2 scRight = ivec2(min(int(trgRes.x - 1.), sc.x + delta), sc.y);
    ivec2 scLeft = ivec2(max(0, sc.x - delta), sc.y);

    vec4 fieldAbove = texelFetch(txScene, scAbove, 0);
    vec4 fieldBelow = texelFetch(txScene, scBelow, 0);
    vec4 fieldRight = texelFetch(txScene, scRight, 0);
    vec4 fieldLeft = texelFetch(txScene, scLeft, 0);

    float gradX = fieldRight.x - fieldLeft.x;
    float gradY = fieldAbove.x - fieldBelow.x;
    return vec2(gradX, gradY);
}

vec4 renderScene(vec2 trgCoord, vec2 trgRes, sampler2D txScene, vec2 sceneRes) {

    float rad = 15.0;
    float dia = rad * 2.0;
    vec2 cellXY = mod(trgCoord, dia) - vec2(rad);
    vec2 cellCenter = floor(trgCoord / dia) * dia + vec2(rad);

    vec2 uv = cellCenter / trgRes;
    vec4 clrScene = texture(txScene, uv);
    float li = clrScene[2];


    if (length(cellXY) < rad * 1.1 * li)
    return vec4(0.7, 0.2, 0.2, 1.);
    return vec4(0.1, 0.1, 0.1, 1.);

}
