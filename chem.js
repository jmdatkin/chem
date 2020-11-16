const Chem = (function() {
    var renderer, container, scene, camera, clock;
    var material, geometry;
    var bufTarget, bufFeedback;

    const pars = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBFormat
    };

    var uniforms = {
        u_resolution: {
            type: "v2",
            value: new THREE.Vector2(window.innerWidth, window.innerHeight).multiplyScalar(window.devicePixelRatio)
        },

        u_offset: {
            type: "v2",
            value: new THREE.Vector2(0.0,0.0)
        },

        u_scale: {
            type: "float",
            value: 1.0
        },

        u_distort: {
            type: "float",
            value: 1.0
        },

        u_colorRampA: {
            type: "vec3",
            value: new THREE.Vector3(242, 194, 221)
        },

        u_colorRampB: {
            type: "vec3",
            value: new THREE.Vector3(255, 212, 176)
        },

        u_colorRampC: {
            type: "vec3",
            value: new THREE.Vector3(142, 250, 221)
        },

        u_feedbackBuf: {},

        u_globalTime: {
            type: "float",
            value: "0.0"
        }

    };

    const vsSource = `void main() {
gl_Position = vec4(position,1.0);
}`;
    const fsSource = `uniform vec2 u_resolution;
uniform vec2 u_offset;
uniform float u_scale;
uniform float u_distort;

uniform float u_globalTime;

uniform vec3 u_colorRampA;
uniform vec3 u_colorRampB;
uniform vec3 u_colorRampC;

uniform sampler2D u_feedbackBuf;

//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec3 blendColor(float t) {
/*if (t < 0.2) {
return mix(u_colorRampA,u_colorRampB,t);//,clamp(t,0.,1.));
}
else {
    return mix(u_colorRampB,u_colorRampC,t);//,clamp(t,0.,1.));
}*/

vec3 color = mix(u_colorRampA,u_colorRampB, smoothstep(0.,0.25,clamp(0.,0.5,t)));
color = mix(color ,u_colorRampC, smoothstep(0.25,1.,t));
// color = mix(u_colorRampA,u_colorRampB, smoothstep(0,0.5,t));
return color;
}

float snoise(vec2 v)
  {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
// First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

// Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

// Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
		+ i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m*u_distort ;

// Gradients: 41 points uniformly over a line, mapped onto a diamond.
// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

// Normalise gradients implicitly by scaling m
// Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

// Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
float max_res = max(u_resolution.x,u_resolution.y);
vec2 uv = gl_FragCoord.xy/max_res;
float noise = snoise((uv+u_offset)*u_scale);    //First noise fxn
noise = snoise(uv*noise*u_distort);                       //Second noise fxn
gl_FragColor = vec4(blendColor(noise)/255.,1.0);//vec4(mix(u_colorRampA,u_colorRampB,noise),1.0);
}`;

    const init = function(element) {
        var ww = window.innerWidth;
        var hh = window.innerHeight;

        window.onresize = () => {
            ww = window.innerWidth;
            hh = window.innerHeight;
            renderer.setSize(ww,hh);
        };

        container = element;
        renderer = new THREE.WebGLRenderer();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(ww, hh);

        bufTarget = new THREE.WebGLRenderTarget(ww,hh,pars);
        bufFeedback = new THREE.WebGLRenderTarget(ww,hh,pars);

        container.appendChild(renderer.domElement);

        scene = new THREE.Scene();

        clock = new THREE.Clock();

        camera = new THREE.OrthographicCamera(
            -1, 1, 1,
            -1, 0, 1
        );

        geometry = new THREE.PlaneBufferGeometry(2,2);

        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vsSource,
            fragmentShader: fsSource
        });

        var mesh = new THREE.Mesh(geometry,material);
        scene.add(mesh);
    };

    const render = function() {
        renderer.render(scene,camera);
    };

    const animate = function() {
        //renderer.setRenderTarget(bufTarget);
        render();
        //renderer.setRenderTarget(null);
        //renderer.clear();

        uniforms.u_feedbackBuf.value = bufTarget.texture;


        let temp = bufTarget;
        bufTarget = bufFeedback;
        bufFeedback = temp;

        uniforms.u_globalTime = clock.getElapsedTime()/1000;
        uniforms.u_offset.value.add(new THREE.Vector2(0.003,Math.sin(clock.getElapsedTime()/100)*0.02+clock.getElapsedTime()/10000));
        //uniforms.u_scale.value += 0.01;
        uniforms.u_distort.value = Math.sin( ((Math.sin(clock.getElapsedTime())*3)-clock.getElapsedTime())/3 );
        requestAnimationFrame(animate);
    };



    return function(element) {
        init(element);
        animate();
    };

})();
