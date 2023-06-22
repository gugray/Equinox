
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

const float scale = 40.;

vec2 dnc(vec3 p, vec2 res,
sampler2D tx, float nDncFramesPerRow, float nDncPtKeys,
float frameIx) {

    vec2 xyFrame;
    xyFrame.y = floor(frameIx / nDncFramesPerRow);
    xyFrame.x = mod(frameIx, nDncFramesPerRow) * nDncPtKeys;

    vec3 lfi = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(0, 0), 0).xyz;
    vec3 rfi = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(0 + 13, 0), 0).xyz;
    vec3 lank = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(2, 0), 0).xyz;
    vec3 rank = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(2 + 13, 0), 0).xyz;
    vec3 lkn = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(3, 0), 0).xyz;
    vec3 rkn = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(3 + 13, 0), 0).xyz;
    vec3 lh = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(4, 0), 0).xyz;
    vec3 rh = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(4 + 13, 0), 0).xyz;
    vec3 lsh = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(5, 0), 0).xyz;
    vec3 rsh = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(5 + 13, 0), 0).xyz;
    vec3 lelb = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(6, 0), 0).xyz;
    vec3 relb = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(6 + 13, 0), 0).xyz;
    vec3 lwr = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(7, 0), 0).xyz;
    vec3 rwr = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(7 + 13, 0), 0).xyz;
    vec3 lind = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(9, 0), 0).xyz;
    vec3 rind = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(9 + 13, 0), 0).xyz;
    vec3 lea = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(12, 0), 0).xyz;
    vec3 rea = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(12 + 13, 0), 0).xyz;
    vec3 nz = scale * texelFetch(tx, ivec2(xyFrame) + ivec2(26, 0), 0).xyz;

    const float thck = 0.6;
    // res = opU(res, vec2(sdSegment(p, lank, lkn, thck), 10.0));

    return res;
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
        q -= vec3(8.0, 0.0, 0.0);
        q -= vec3(-scale * 0.5, scale * 0.67, 0.0);
        float frameIx = floor(mod(time * 15. / 1000., nDncFrames1));
        res = dnc(q, res, txDnc1, nDncFramesPerRow1, nDncPtKeys1, frameIx);
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

vec4 updateParticle(vec4 prevState, sampler2D txScene, vec2 sceneRes, vec2 trgRes) {

    vec4 res = prevState;

    vec2 resRatio = sceneRes / trgRes;
    // SDF scene coordinates corresponding to particle
    ivec2 sc = ivec2(prevState.xy * resRatio);
    // Particle's normalized coordinates - y goes [0, 1]; x depends on AR
    vec2 uv = prevState.xy / trgRes;
    uv.x *= trgRes.x / trgRes.y;

    float t = time;

    vec2 noiseLo, noiseHi;
    {
        float freq = 0.5;
        float tt = 10.;
        float nofsX = snoise(vec3(uv * freq, tt * 0.0001));
        float nofsY = snoise(vec3(uv * freq, 100. + tt * 0.0001));
        noiseLo = vec2(nofsX, nofsY);
        noiseLo = normalize(noiseLo);
    }
    {
        float freq = 12.;
        float tt = t;
        float nofsX = snoise(vec3(uv * freq, tt * 0.0009));
        float nofsY = snoise(vec3(uv * freq, 100. + tt * 0.0009));
        noiseHi = vec2(nofsX, nofsY);
        noiseHi = normalize(noiseHi);
    }

    // Move this particle!
    // res.xy += vec2(random(prevState.y) - 0.5, random(prevState.x) - 0.5) * 1.;
    res.xy += noiseLo * 0.5;
    // res.xy += noiseLo * pow(sin(t * 0.0007), 3.0) * 300.0;
    // res.xy += noiseLo * cos(t * 0.0003) * 300.0;
    // res.xy += noiseHi * 0.7;

    res.zw = vec2(0.);

    // SDF scene
    vec4 field = texelFetch(txScene, sc, 0);
    float lum = field.z;
    float id = field.w;

    // Got object gradiend and depth
    if (id != 0.) {
        vec2 grad = getSurfaceGradient(txScene, trgRes, sc);
        vec2 dir = normalize(grad);
        dir = vec2(-dir.y, dir.x);
        res.xy = prevState.xy
        + 0.1 * noiseHi
        + 2. * dir * pow(lum, 0.1); // Brighter moves faster
        res.z = lum;
        res.w = id;
    }

    // Stay on screen
    res.xy = mod(res.xy, trgRes);

    // Random throw particles elsewhere
    float rndReset = random(length(prevState));
    if (rndReset < 0.05) {

        res.x = trgRes.x * random(prevState.y);
        res.y = trgRes.y * random(prevState.x);

        ivec2 sc = ivec2(res.xy * resRatio);
        vec4 field = texelFetch(txScene, sc, 0);
        if (field.w == 0.) res.zw = vec2(0.);
        else {
            res.z = field.z; // Lum
            res.w = field.w; // ID
        }
    }

    return res;
}

vec3 renderParticle(vec2 coord, vec2 resolution, vec2 props) {

    vec3 res;
    float lum = props.x;
    float id = props.y;

    res.rgb = hsl2rgb(0.7, 0.6, 0.7);

    if (id == 0.) return res;

    if (id >= 1. && id < 2.) {
        res.rgb = hsl2rgb(id - 1.0, 0.4, lum);
    }
    if (id == 2.) {
        res.rgb = hsl2rgb(0.0, 0.7, lum * 0.2 + 0.3);
    }
    else if (id == 10.) {
        res.rgb = hsl2rgb(0.15, 0.6, lum);
    }

    return res;
}
