const canvas = document.querySelector("#glCanvas");
const fpsEl = document.querySelector("#fpsValue");
const countEl = document.querySelector("#countValue");
const mouseEl = document.querySelector("#mouseValue");
const gl = initializeWebGL();
const program = createProgram(gl, createShaders(gl));
const locations = {
  position: gl.getAttribLocation(program, "a_position"),
  color: gl.getAttribLocation(program, "a_color"),
  offset: gl.getUniformLocation(program, "u_offset"),
  scale: gl.getUniformLocation(program, "u_scale"),
  rotation: gl.getUniformLocation(program, "u_rotation"),
};
const buffer = createBuffers(gl);
setupAttributes(gl, buffer, locations);

const palette = {
  red: [1, 0.19, 0.27],
  green: [0.25, 0.95, 0.57],
  blue: [0.28, 0.52, 1],
  cyan: [0.08, 0.9, 0.92],
};
let selectedPrimitive = "triangle";
let selectedColor = "cyan";
let wireframe = false;
let mouseNdc = [0, 0];
let lastTime = performance.now();
let frames = 0;
let fpsClock = lastTime;
const keys = new Set();
const objects = [
  {
    type: "triangle",
    position: [-0.54, 0.34],
    velocity: [0.19, -0.12],
    scale: 0.26,
    phase: 0.2,
    color: [1, 0.3, 0.42],
  },
  {
    type: "lines",
    position: [0.51, 0.25],
    velocity: [-0.14, -0.22],
    scale: 0.25,
    phase: 1.7,
    color: [0.25, 0.95, 0.57],
  },
  {
    type: "points",
    position: [0.05, -0.42],
    velocity: [0.27, 0.16],
    scale: 0.22,
    phase: 3.1,
    color: [0.25, 0.61, 1],
  },
];

function initializeWebGL() {
  const context = canvas.getContext("webgl2", { antialias: true });
  if (!context) {
    document.body.innerHTML =
      '<p class="error">WebGL2 tidak tersedia di browser ini.</p>';
    throw new Error("WebGL2 tidak tersedia");
  }
  context.enable(context.BLEND);
  context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
  return context;
}
function createShaders(context) {
  const vertex = `#version 300 es
    in vec2 a_position; in vec3 a_color; out vec3 v_color;
    uniform vec2 u_offset; uniform float u_scale; uniform float u_rotation;
    void main(){ float c=cos(u_rotation),s=sin(u_rotation); vec2 p=vec2(a_position.x*c-a_position.y*s,a_position.x*s+a_position.y*c)*u_scale+u_offset; gl_Position=vec4(p,0.,1.); gl_PointSize=7.; v_color=a_color; }`;
  const fragment = `#version 300 es
    precision highp float; in vec3 v_color; out vec4 outColor;
    void main(){ outColor=vec4(v_color, .94); }`;
  return {
    vertex: compile(context, context.VERTEX_SHADER, vertex),
    fragment: compile(context, context.FRAGMENT_SHADER, fragment),
  };
}
function compile(context, kind, source) {
  const shader = context.createShader(kind);
  context.shaderSource(shader, source);
  context.compileShader(shader);
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS))
    throw new Error(context.getShaderInfoLog(shader));
  return shader;
}
function createProgram(context, shaders) {
  const value = context.createProgram();
  context.attachShader(value, shaders.vertex);
  context.attachShader(value, shaders.fragment);
  context.linkProgram(value);
  if (!context.getProgramParameter(value, context.LINK_STATUS))
    throw new Error(context.getProgramInfoLog(value));
  return value;
}
function createBuffers(context) {
  const value = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, value);
  return value;
}
function setupAttributes(context, value, loc) {
  context.bindBuffer(context.ARRAY_BUFFER, value);
  context.enableVertexAttribArray(loc.position);
  context.enableVertexAttribArray(loc.color);
  context.vertexAttribPointer(loc.position, 2, context.FLOAT, false, 20, 0);
  context.vertexAttribPointer(loc.color, 3, context.FLOAT, false, 20, 8);
}

function pattern(type, color, seed) {
  const verts = [];
  const push = (x, y, tint = 1) =>
    verts.push(x, y, color[0] * tint, color[1] * tint, color[2] * tint);
  if (type === "triangle") {
    push(0, 1, 1.1);
    push(-0.9, -0.65, 0.72);
    push(0.9, -0.65, 0.9);
  } else if (type === "lines") {
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + seed;
      push(Math.cos(a) * 0.88, Math.sin(a) * 0.88, 0.7 + i * 0.1);
      push(Math.cos(a + Math.PI) * 0.88, Math.sin(a + Math.PI) * 0.88, 0.95);
    }
  } else {
    for (let i = 0; i < 18; i++) {
      const a = i * 2.399 + seed;
      const r = 0.22 + (i % 5) * 0.16;
      push(Math.cos(a) * r, Math.sin(a) * r, 0.58 + (i % 4) * 0.11);
    }
  }
  return new Float32Array(verts);
}
function update(dt) {
  const speed = 1.05;
  const move = [0, 0];
  if (keys.has("arrowleft") || keys.has("a")) move[0] -= speed * dt;
  if (keys.has("arrowright") || keys.has("d")) move[0] += speed * dt;
  if (keys.has("arrowdown") || keys.has("s")) move[1] -= speed * dt;
  if (keys.has("arrowup") || keys.has("w")) move[1] += speed * dt;
  objects[0].position[0] = Math.max(
    -0.76,
    Math.min(0.76, objects[0].position[0] + move[0]),
  );
  objects[0].position[1] = Math.max(
    -0.72,
    Math.min(0.72, objects[0].position[1] + move[1]),
  );
  objects.forEach((obj, index) => {
    if (index === 0 && move[0] + move[1] !== 0) return;
    obj.position[0] += obj.velocity[0] * dt;
    obj.position[1] += obj.velocity[1] * dt;
    if (obj.position[0] > 0.82 || obj.position[0] < -0.82) {
      obj.velocity[0] *= -1;
      obj.position[0] = Math.max(-0.82, Math.min(0.82, obj.position[0]));
    }
    if (obj.position[1] > 0.82 || obj.position[1] < -0.82) {
      obj.velocity[1] *= -1;
      obj.position[1] = Math.max(-0.82, Math.min(0.82, obj.position[1]));
    }
    obj.phase += dt * (index + 1);
  });
}
function draw() {
  gl.clearColor(0.018, 0.047, 0.09, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  objects.forEach((obj) => {
    const data = pattern(obj.type, obj.color, obj.phase);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    setupAttributes(gl, buffer, locations);
    gl.uniform2fv(locations.offset, obj.position);
    gl.uniform1f(locations.scale, obj.scale);
    gl.uniform1f(locations.rotation, obj.phase * 0.12);
    const mode =
      obj.type === "triangle"
        ? wireframe
          ? gl.LINE_LOOP
          : gl.TRIANGLES
        : obj.type === "lines"
          ? gl.LINES
          : gl.POINTS;
    gl.drawArrays(mode, 0, data.length / 5);
  });
}
function render(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.04);
  lastTime = time;
  update(dt);
  draw();
  frames++;
  if (time - fpsClock > 500) {
    fpsEl.textContent = Math.round((frames * 1000) / (time - fpsClock));
    countEl.textContent = objects.length;
    fpsClock = time;
    frames = 0;
  }
  requestAnimationFrame(render);
}

document.querySelectorAll("[data-primitive]").forEach((button) =>
  button.addEventListener("click", () => {
    selectedPrimitive = button.dataset.primitive;
    document
      .querySelectorAll("[data-primitive]")
      .forEach((item) => item.classList.toggle("active", item === button));
  }),
);
document.querySelectorAll("[data-color]").forEach((button) =>
  button.addEventListener("click", () => {
    selectedColor = button.dataset.color;
    document
      .querySelectorAll("[data-color]")
      .forEach((item) => item.classList.toggle("active", item === button));
  }),
);
const modeToggle = document.querySelector("#modeToggle");
modeToggle.setAttribute("aria-pressed", "false");
modeToggle.addEventListener("click", () => {
  wireframe = !wireframe;
  const label = wireframe ? "Wireframe mode" : "Dynamic colour";
  const modeText = document.querySelector("#modeText");
  const switchIndicator = modeToggle.querySelector(".mode-switch");
  modeText.textContent = label;
  const toolbarMode = document.querySelector("#toolbar-mode");
  if (toolbarMode) toolbarMode.textContent = label;
  modeToggle.setAttribute("aria-pressed", String(wireframe));
  modeToggle.setAttribute("aria-label", `Mode render: ${label}`);
  modeToggle.title = wireframe ? "Kembali ke warna dinamis" : "Aktifkan wireframe";
  if (switchIndicator) {
    switchIndicator.textContent = wireframe ? "◌" : "↔";
    switchIndicator.classList.toggle("is-wireframe", wireframe);
  }
});
canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouseNdc = [
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    1 - ((event.clientY - rect.top) / rect.height) * 2,
  ];
  mouseEl.textContent = `${mouseNdc[0].toFixed(2)} / ${mouseNdc[1].toFixed(2)}`;
});
canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const color =
    selectedColor === "random"
      ? [Math.random(), 0.5 + Math.random() * 0.5, 0.55 + Math.random() * 0.45]
      : palette[selectedColor];
  objects.push({
    type: selectedPrimitive,
    position: [...mouseNdc],
    velocity: [
      (Math.random() * 2 - 1) * (0.12 + Math.random() * 0.2),
      (Math.random() * 2 - 1) * (0.12 + Math.random() * 0.2),
    ],
    scale: 0.12 + Math.random() * 0.1,
    phase: Math.random() * 6,
    color,
  });
  countEl.textContent = objects.length;
});
window.addEventListener("keydown", (event) => {
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)
  )
    event.preventDefault();
  keys.add(event.key.toLowerCase());
});
window.addEventListener("keyup", (event) =>
  keys.delete(event.key.toLowerCase()),
);
window.addEventListener("resize", () => {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = canvas.clientHeight * ratio;
  gl.viewport(0, 0, canvas.width, canvas.height);
});
window.dispatchEvent(new Event("resize"));
requestAnimationFrame(render);
