#version 300 es

in vec4 position;

void main() {
    // This is [-1, 1] for both X and Y
    gl_Position = position;
}
