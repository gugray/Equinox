vec2 map(vec3 p) {

    // return vec2(0.);
    // opCircRep(q.xy, 2.);

    vec2 res = vec2(1e10, 0.);
    float t = time + 500.;

    p -= vec3(4., 0., 0);

    {
        vec3 q = p;
        q = doRotX(q, PI * 0.5);
        float d = sdTorus(q, vec2(4., 1.2));
        res = opU(res, vec2(d, 10.));
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

    vec2 noise;
    {
        float freq = 7.;
        float nofsX = snoise(vec3(uv * freq, t * 0.0001));
        float nofsY = snoise(vec3(uv * freq, 100. + t * 0.0001));
        noise = vec2(nofsX, nofsY);
    }

    // Move this particle!
    // res.xy += vec2(random(prevState.y) - 0.5, random(prevState.x) - 0.5) * 1.;

    res.zw = vec2(0.);

    //     // SDF scene
    //     vec4 field = texelFetch(txScene, sc, 0);
    //     float lum = field.z;
    //     float id = field.w;

    //     // Got object gradiend and depth
    //     if (id != 0.) {
    //         // vec2 grad = getSurfaceGradient(txScene, trgRes, sc);
    //         // vec2 dir = normalize(grad);
    //         // res.xy = prevState.xy + 2. * dir * pow(lum, 0.5); // Brighter moves faster
    //         res.z = lum;
    //         res.w = id;
    //     }

    // Stay on screen
    res.xy = mod(res.xy, trgRes);

    // Random throw particles elsewhere
    float rndReset = random(length(prevState));
    if (rndReset < 0.05) {

        res.x = trgRes.x * random(prevState.y);
        res.y = trgRes.y * random(prevState.x);

//        ivec2 sc = ivec2(res.xy * resRatio);
//        vec4 field = texelFetch(txScene, sc, 0);
//        if (field.w == 0.) res.zw = vec2(0.);
//        else {
//            res.z = field.z; // Lum
//            res.w = field.w; // ID
//        }
    }

    return res;
}

vec3 renderParticle(vec2 coord, vec2 resolution, vec2 props) {

    vec3 res;
    float lum = props.x;
    float id = props.y;

    res.rgb = hsl2rgb(0.7, 0.4, 0.6);

    if (id != 0.) {
        res.rgb = hsl2rgb(0.1, 0.4, 0.6);
    }

    return res;
}
