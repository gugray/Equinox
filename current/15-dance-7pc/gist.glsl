float sdSegment(vec3 p, vec3 a, vec3 b, float r) {
    //float h = min(1.0, max(0.0, dot(p-a, b-a) / dot(b-a, b-a)));
    float h = clamp(dot(p-a, b-a) / dot(b-a, b-a), 0.0, 1.0);
    return length(p-a - (b-a)*h)-r;
}

const float scale = 32.;
const float rodr = 0.4;

vec2 addSeg(vec3 p, vec2 res, vec3 a, vec3 b) {
    float d = sdSegment(p, scale * a, scale * b, rodr);
    return opU(res, vec2(d, 10.));
}


vec2 map(vec3 p) {

    // return vec2(0.);
    // opCircRep(q.xy, 2.);

    vec2 res = vec2(1e10, 0.);
    float t = time + 500.;

    {
        vec3 q = p;
        q -= vec3(8., -4.5, 0.);
        float d = sdBox(q, vec3(5., 0.2, 6.));
        // res = opU(res, vec2(d, 1.));
    }


    // p -= vec3(8., 0, 0);
    p -= vec3(0, scale * 0.6, 0);
    // // p = doRotY(p, t * 0.0005);
    // // p = doRotY(p, PI * -10.);
    p -= vec3(-scale * 0.5, 0, 1.);



    float frameIx = floor(mod(time * 15. / 1000., nDanceFrames));
    // frameIx = 0.;
    vec2 xyFrame;
    xyFrame.y = floor(frameIx / nDanceFramesPerRow);
    xyFrame.x = mod(frameIx, nDanceFramesPerRow) * nDancePtKeys;
    vec3 leftFootIndex = texelFetch(txDance, ivec2(xyFrame) + ivec2(0, 0), 0).xyz;
    vec3 rightFootIndex = texelFetch(txDance, ivec2(xyFrame) + ivec2(0 + 13, 0), 0).xyz;
    vec3 leftAnkle = texelFetch(txDance, ivec2(xyFrame) + ivec2(2, 0), 0).xyz;
    vec3 rightAnkle = texelFetch(txDance, ivec2(xyFrame) + ivec2(2 + 13, 0), 0).xyz;
    vec3 leftKnee = texelFetch(txDance, ivec2(xyFrame) + ivec2(3, 0), 0).xyz;
    vec3 rightKnee = texelFetch(txDance, ivec2(xyFrame) + ivec2(3 + 13, 0), 0).xyz;
    vec3 leftHip = texelFetch(txDance, ivec2(xyFrame) + ivec2(4, 0), 0).xyz;
    vec3 rightHip = texelFetch(txDance, ivec2(xyFrame) + ivec2(4 + 13, 0), 0).xyz;
    vec3 leftShoulder = texelFetch(txDance, ivec2(xyFrame) + ivec2(5, 0), 0).xyz;
    vec3 rightShoulder = texelFetch(txDance, ivec2(xyFrame) + ivec2(5 + 13, 0), 0).xyz;
    vec3 leftElbow = texelFetch(txDance, ivec2(xyFrame) + ivec2(6, 0), 0).xyz;
    vec3 rightElbow = texelFetch(txDance, ivec2(xyFrame) + ivec2(6 + 13, 0), 0).xyz;
    vec3 leftWrist = texelFetch(txDance, ivec2(xyFrame) + ivec2(7, 0), 0).xyz;
    vec3 rightWrist = texelFetch(txDance, ivec2(xyFrame) + ivec2(7 + 13, 0), 0).xyz;
    vec3 leftEar = texelFetch(txDance, ivec2(xyFrame) + ivec2(12, 0), 0).xyz;
    vec3 rightEar = texelFetch(txDance, ivec2(xyFrame) + ivec2(12 + 13, 0), 0).xyz;

    vec3 nose = texelFetch(txDance, ivec2(xyFrame) + ivec2(26, 0), 0).xyz;

    res = addSeg(p, res, leftAnkle, leftKnee);
    res = addSeg(p, res, leftKnee, leftHip);
    res = addSeg(p, res, rightAnkle, rightKnee);
    res = addSeg(p, res, rightKnee, rightHip);
    res = addSeg(p, res, (leftHip + rightHip) * 0.5, leftShoulder);
    res = addSeg(p, res, (leftHip + rightHip) * 0.5, rightShoulder);
    res = addSeg(p, res, leftShoulder, rightShoulder);

    res = addSeg(p, res, leftShoulder, leftElbow);
    res = addSeg(p, res, leftElbow, leftWrist);
    res = addSeg(p, res, rightShoulder, rightElbow);
    res = addSeg(p, res, rightElbow, rightWrist);

    res = addSeg(p, res, rightEar, leftEar);
    res = addSeg(p, res, (rightEar+leftEar) * 0.5, nose);

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
        float tt = 1000.;
        float nofsX = snoise(vec3(uv * freq, tt * 0.0001));
        float nofsY = snoise(vec3(uv * freq, 100. + tt * 0.0001));
        noiseLo = vec2(nofsX, nofsY);
        noiseLo = normalize(noiseLo);
    }
    {
        float freq = 7.;
        float tt = t;
        float nofsX = snoise(vec3(uv * freq, tt * 0.0001));
        float nofsY = snoise(vec3(uv * freq, 100. + tt * 0.0001));
        noiseHi = vec2(nofsX, nofsY);
        noiseHi = normalize(noiseHi);
    }

    // Move this particle!
    // res.xy += vec2(random(prevState.y) - 0.5, random(prevState.x) - 0.5) * 1.;
    res.xy += noiseLo * 0.5;

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

    res.rgb = hsl2rgb(0.7, 0.4, 0.6);

    if (id == 0.) return res;

    if (id == 1.) {
        res.rgb = hsl2rgb(0.6, 0.4, lum);
    }
    else if (id == 10.) {
        res.rgb = hsl2rgb(0.15, 0.6, lum);
    }

    return res;
}
