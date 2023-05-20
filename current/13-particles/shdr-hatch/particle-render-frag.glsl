#version 300 es
precision highp float;

#include "utils.glsl"

in vec2 props;
out vec4 outColor;

void main() {
    outColor.a = 1.;
    // No object
    if (props.y == 0.) {
        outColor.rgb = hsl2rgb(vec3(0.7, 0.4, 0.25));
    }
    else {
        float id = props.y;
        float light = props.x;
        if (id == 2.) outColor.rgb = hsl2rgb(vec3(0., pow(props.x, 2.), props.x));
        else if (id == 3.) outColor.rgb = hsl2rgb(vec3(0.3, pow(props.x, 4.), props.x));
    }
}
