float map(vec3 p) {
    float d = 1e10;
    {
        vec3 q = p;
        q -= vec3(-0.3, 0.5, -0.3);
        q = doRotX(q, PI * 0.13);
        q = doRotY(q, PI * 0.25);
        d = min(d, sdBoxFrame(q, vec3(0.7, 0.9, 1.2), 0.13));
    }
    {
        vec3 q = p;
        q -= vec3(0., 1., -5.);
        q = doRotY(q, PI * 0.1);
        q = doRotX(q, -PI * 0.2);
        d = min(d, sdBox(q, vec3(700.0, 400.0, 0.1)));
    }
    return d;
}
