// ===========================
//    Hello TOPLAP
//
//  Enjoy the solstice O o . _
//
//              \o/  ~ gabor ~
// ===========================

void preRender() {
    pointSize = 1.0;
}

vec2 map(vec3 p) {

    // float d = sdBoxFrame(q, sz, th);
    // res = opU(res, vec2(d, 1.));

    vec2 res = vec2(1e10, 0.);
    float t = time + 500.;

    {
        vec3 p = p;
        p -= vec3(4., 0., 0);

        {
            vec3 q = p;

        }
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

    vec2 noiseHi;
    vec2 noiseLo;
    vec2 nNova;
    {
        float freq = 21.;
        float nofsX = snoise(vec3(uv * freq, t * 0.0001));
        float nofsY = snoise(vec3(uv * freq, 100. + t * 0.0001));
        noiseHi = vec2(nofsX, nofsY);
    }
    {
        float freq = 3.;
        float nofsX = snoise(vec3(uv * freq, t * 0.0001));
        float nofsY = snoise(vec3(uv * freq, 100. + t * 0.0001));
        noiseLo = vec2(nofsX, nofsY);
        noiseLo = normalize(noiseLo);
    }

    {
        float freq = 5.;
        float nofsX = snoise(vec3(uv * freq, 10. + t * 0.0001));
        float nofsY = snoise(vec3(uv * freq, 110. + t * 0.0001));
        nNova = vec2(nofsX, nofsY);
    }


    // Move this particle!
    // res.xy += noiseHi * 0.3;
    // Small good white noise needed to keep from losing them
    res.xy += vec2(random(prevState.y+ 7.0 * xrnd) - 0.5, random(prevState.x + 13.0 * xrnd) - 0.5) * 1.;
    res.xy += noiseLo * 0.;

    res.xy = mod(res.xy, trgRes);
    res.zw = vec2(0.);

    // Novas
    if (false)
    {
        res.zw = vec2(0.);
        float lim = 0.75 + 0.1 * sin(t * 0.00005);
        float len = length(nNova);
        if (len > lim) {
            float lum = map(len, lim, 1.0, 0.0, 1.0);
            res.z = pow(lum, 0.5) *  0.6; // Lum
            res.w = 100.; // ID
            return res;
        }
    }


    // SDF scene
    vec4 field = texelFetch(txScene, sc, 0);
    float lum = field.z;
    float id = field.w;

    // Got object gradiend and depth
    if (id != 0.) {
        vec2 grad = getSurfaceGradient(txScene, trgRes, sc);
        vec2 dir = normalize(grad);
        dir = vec2(-dir.y, dir.x) * 0.5;
        res.xy = prevState.xy + 2. * dir * pow(lum, 0.5); // Brighter moves faster
        res.xy += noiseLo * 0.3;
        res.z = lum;
        res.w = id;
    }

    // Stay on screen
    res.xy = mod(res.xy, trgRes);

    // Random throw particles elsewhere
    float rndReset = random(length(res.xy) + time);
    if (rndReset < 0.01) {

        res.x = trgRes.x * random(prevState.y + 11.0 * xrnd);
        res.y = trgRes.y * random(prevState.x + 17.0 * xrnd);
        res.xy = mod(res.xy, trgRes);

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
    float fsat = 1.0;
    float flum = 1.0;

    res.rgb = hsl2rgb(0.7, 0.4 * fsat, 0.6 * flum);

    // Metal red
    if (id == 1.) {
        res.rgb = hsl2rgb(0.02, 0.3 * fsat, lum * flum);
    }
    // Leafy green
    else if (id == 4.) {
        res.rgb = hsl2rgb(0.4, 0.1 * fsat, lum * 0.8 * flum);
    }
    // Nova yellow
    else if (id == 100.) {
        res.rgb = hsl2rgb(0.1, 0.4 * fsat, lum * flum);
    }

    return res;
}
