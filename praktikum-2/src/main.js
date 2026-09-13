const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
if (!gl) {
  throw new Error("WebGL2 tidak tersedia");
}

gl.viewport(0, 0, canvas.width, canvas.height);

gl.clearColor(
  0.03,
  0.05,
  0.10,
  1.0
);

gl.clear(
  gl.COLOR_BUFFER_BIT
);