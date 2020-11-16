const Chem = (function() {
    var renderer, container, scene, camera, clock;
    var animFrameID;
    var material, geometry;
    //var bufTarget, bufFeedback;
    var baseColor, glowColor;

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
            value: new THREE.Vector3(245, 164, 231)
        },

        u_colorRampB: {
            type: "vec3",
            value: new THREE.Vector3(107, 221, 250)
        },

        u_colorRampC: {
            type: "vec3",
            value: new THREE.Vector3(142, 250, 221)
        },

        u_randomColor: {
            type: "vec3",
            value: new THREE.Vector3(255,255,255)
        },

        u_globalTime: {
            type: "float",
            value: "0.0"
        },

        t_glowColor: {
            type: "sampler2d",
        },

        t_coordOffet: {
            type: "vec2",
            value: "0.2,0.2"
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

uniform vec3 u_randomColor;

uniform sampler2D t_glowColor;
uniform vec2 t_coordOffset;



/*-------------------------------------------------------------------*/
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise

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
vec3 color = mix(u_colorRampA,u_colorRampB, smoothstep(0.,0.5,clamp(0.,0.5,t)));
color = mix(color ,u_colorRampC, smoothstep(0.5,1.,t));
// color = mix(u_colorRampA,u_colorRampB, smoothstep(0,0.5,t));
return color;
}


vec4 j2hue(float c) {
  return .5+.5*cos(6.28*c+vec4(0,-2.1,2.1,0));
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
  m = m*m*u_distort;

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
/*-------------------------------------------------------------------*/


float gridspacing = 0.1;


  float cropDist = 0.01;
  float cropXOffset = 0.2;
  float cropYOffset = 0.2;

void main() {
float max_res = max(u_resolution.x,u_resolution.y);
vec2 uv = gl_FragCoord.xy/max_res;
float noise = snoise((uv+u_offset)*u_scale);    //First noise fxn
noise = snoise(uv*noise);                       //Second noise fxn

vec2 uvBig = (uv - 0.5)*0.996 + 0.5;

vec4 glowColor = texture2D(t_glowColor,uv);

vec2 t_coordOffset2 = vec2(glowColor.g - 0.2, glowColor.r*0.7);

float timeFrac = mod(u_globalTime, 6.5);
float colorChangeSpeed = 0.75 + 0.05 * sin(u_globalTime) * 1.5;
float rainbowInput = timeFrac * colorChangeSpeed;



vec3 mixedColor = glowColor.rgb;
vec2 offset = uv + vec2((mixedColor.g - cropXOffset) * cropDist, (mixedColor.r - cropYOffset) * cropDist);

  float spinDist = 0.001;
float spinSpeed = 0.2 + 0.15 * cos(u_globalTime * 0.5);
vec2 offset2 = uvBig + vec2(cos(timeFrac * spinSpeed) * spinDist, sin(timeFrac * spinSpeed) * spinDist);
 
float brightness = 0.7;
vec4 rainbow = sqrt(j2hue(cos(rainbowInput))) + brightness;

mixedColor = texture2D(t_glowColor,offset).rgb * 0.4 + texture2D(t_glowColor,offset2).rgb * 0.6;


//mixedColor += u_randomColor*0.0001;

float fadeAmt = 0.0015;
mixedColor = (mixedColor - fadeAmt)*.995;

mixedColor = clamp(mixedColor+rainbow.rgb, 0., 1.);

mixedColor = clamp(mixedColor*2.,0.,1.);

//glowColor = mix(glowColor, texture2D(t_glowColor,uv+t_coordOffset), 0.5);
//glowColor = mix(glowColor, texture2D(t_glowColor,uv+t_coordOffset2), 0.5);

vec4 thisColor = vec4(blendColor(noise)/255.,1.0);


gl_FragColor = mix(vec4(mixedColor,1.0),thisColor,0.5);//vec4(mix(u_colorRampA,u_colorRampB,noise),1.0);
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
        renderer.setClearColor(0xEEEEEE);

        // bufTarget = new THREE.WebGLRenderTarget(ww,hh,pars);
        // bufFeedback = new THREE.WebGLRenderTarget(ww,hh,pars);

        baseColor = new THREE.WebGLRenderTarget(ww,hh,pars);
        glowColor = new THREE.WebGLRenderTarget(ww,hh,pars);

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

    const swap = function(a,b) {
        let temp = a;
        a = b;
        b = temp;
    }

    //https://gist.github.com/mjackson/5311256
function hsvToRgb(h, s, v) {
  var r, g, b;

  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return [ r * 255, g * 255, b * 255 ];
}

    const render = function() {
        // renderer.setRenderTarget(baseColor);
        // renderer.render(scene,camera);
        // renderer.setRenderTarget(glowColor);
        // renderer.render(scene,camera);
        // renderer.setRenderTarget(null);
        
        renderer.render(scene,camera);
    };

    const animate = function() {
        uniforms.t_glowColor.value = glowColor.texture;

        renderer.setRenderTarget(baseColor);
        render();
        renderer.setRenderTarget(null);
        render();
        //renderer.clear();
        
        //renderer.clear();

        let temp = baseColor;
        baseColor = glowColor;
        glowColor = temp;

        //swap(baseColor,glowColor);

        //FEEDBACK CODE
        // uniforms.u_feedbackBuf.value = bufTarget.texture;


        // let temp = bufTarget;
        // bufTarget = bufFeedback;
        // bufFeedback = temp;

        uniforms.u_globalTime = clock.getElapsedTime()/1000;
        uniforms.u_offset.value.add(new THREE.Vector2(
            0.003,
            Math.sin(clock.getElapsedTime()/100)*0.02 + 0.006)
                                   );
        //uniforms.u_scale.value += 0.01;
        let newColor = hsvToRgb(Math.random(), 1, 1);
        uniforms.u_randomColor.value = new THREE.Vector3(newColor[0],newColor[1],newColor[2]);
        uniforms.u_distort.value = (Math.sin(clock.getElapsedTime()/25)*0.75);
        animFrameID = requestAnimationFrame(animate);
    };

    const start = function() {
        animate();
    };

    const stop = function() {
        if (animFrameID)
            cancelAnimationFrame(animFrameID);
    };

    const _Chem = function(element, stopped) {
        init(element);
        if (typeof stopped !== 'undefined') {
            if (stopped)
                start();
        }
        else
            start();
       // animate();
    };

    //Add methods to returned inner function
    _Chem.hello = function() {console.log("hello!");};
    _Chem.start = start;
    _Chem.stop = stop;

    return _Chem;//function(element) {

        //this.hello = function() {console.log("hello!")};

})();
