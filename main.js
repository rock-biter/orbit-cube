import './style.css'
import {
	Scene,
	WebGLRenderer,
	Mesh,
	BoxGeometry,
	MeshNormalMaterial,
	PerspectiveCamera,
	AmbientLight,
	Vector3,
	SpotLight,
	MeshStandardMaterial,
	SpotLightHelper,
	IcosahedronGeometry,
	SphereGeometry,
	Spherical,
	Clock,
	PlaneGeometry,
	DoubleSide,
} from 'three'
import { createNoise2D } from 'simplex-noise'
const noise = createNoise2D()
console.log(noise)

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const GLSL_SIMPLEX_NOISE = `
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`

const scene = new Scene()

const icoGeometry = new IcosahedronGeometry(1, 1)
const nMaterial = new MeshNormalMaterial({
	flatShading: true,
	side: DoubleSide,
})
const ico = new Mesh(icoGeometry, nMaterial)

scene.add(ico)

const geometry = new BoxGeometry(14, 3, 0.1, 50, 10, 2)
const material = new MeshStandardMaterial({
	color: 0x8997bb,
	wireframe: true,
	opacity: 0.3,
	transparent: true,
	// flatShading: true,
})

const uniforms = {
	uTime: { value: 0 },
}

material.onBeforeCompile = (shader) => {
	console.log(shader.uniforms)
	console.log(shader.vertexShader)

	shader.uniforms.uTime = uniforms.uTime
	shader.uniforms.uNoise = { value: noise }

	shader.vertexShader = shader.vertexShader.replace(
		'#include <common>',
		`
	  #include <common>
		${GLSL_SIMPLEX_NOISE}
	  uniform float uTime;
	  `
	)

	shader.vertexShader = shader.vertexShader.replace(
		'#include <project_vertex>',
		`
		vec4 mvPosition = vec4( transformed, 1.0 );

		#ifdef USE_INSTANCING

			mvPosition = instanceMatrix * mvPosition;

		#endif

		float noise = snoise( mvPosition.xy + vec2(uTime * 0.0005) ) * 0.5 + 0.5;

		mvPosition.xyz *= 1.2 + noise * 0.3;

		mvPosition = modelViewMatrix * mvPosition;

		

		gl_Position = projectionMatrix * mvPosition;
    `
	)

	// console.log(vertexShader)
}

// const flag = new Mesh(geometry, material)
// flag.position.x = 0
const icoGrid = new Mesh(icoGeometry, material)

// scene.add(flag)
scene.add(icoGrid)

const camera = new PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	200
)

camera.position.copy(new Vector3(0, 8, 0))

const light = new AmbientLight(0xffffff, 1)
const spot = new SpotLight(0xffffff, 10, 50, Math.PI * 0.15, 1, 0.01)
spot.position.set(6, 4, 4)
spot.rotateX(Math.PI * -0.5)
spot.rotateY(Math.PI * 0.5)

const spotHelper = new SpotLightHelper(spot)
spotHelper.scale.set(0.01, 0.01, 0.01)

scene.add(light, spot)

const renderer = new WebGLRenderer()
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target = new Vector3(0, 0, 0)

const satGeom = new IcosahedronGeometry(0.1)
const sat = new Mesh(satGeom, nMaterial)

const sats = []
const d = 3.5

const planeGeom = new PlaneGeometry(0.5, 0.5)
const plane = new Mesh(planeGeom, nMaterial)

for (let i = 0; i < 50; i++) {
	const s = sat.clone()

	const dd = Math.random()
	const point = new Vector3().setFromSphericalCoords(
		d + dd,
		2 * Math.PI * Math.random(),
		2 * Math.PI * Math.random()
	)

	s.position.set(...point)
	plane.position.set(...point)
	plane.lookAt(0, 0, 0)

	console.log(s)

	s.userData.velocity = new Vector3()
		.randomDirection()
		.multiplyScalar(5)
		.projectOnPlane(s.position.clone().normalize())

	scene.add(s)
	sats.push(s)
}

function onResize() {
	camera.aspect = window.innerWidth / window.innerHeight
	renderer.setSize(window.innerWidth, window.innerHeight)
	camera.updateProjectionMatrix()
}

window.addEventListener('resize', onResize)

onResize()

const clock = new Clock()

function tic(t) {
	renderer.render(scene, camera)
	controls.update()

	const dt = clock.getDelta() || 0

	// console.log(dt)

	// console.log(t)
	uniforms.uTime.value = t
	ico.rotation.y += 0.01

	sats.forEach((s) => {
		const { velocity } = s.userData

		s.rotation.x += 0.05
		s.rotation.z += 0.05

		const teta = Math.atan(velocity.clone().length() / s.position.length())

		const F = s.position
			.clone()
			.normalize()
			.multiplyScalar(-1.05 * dt)
		console.log(F)

		velocity.add(F)

		s.position.add(velocity.clone().multiplyScalar(dt))
	})

	requestAnimationFrame(tic)
}

requestAnimationFrame(tic)
