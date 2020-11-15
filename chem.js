const Chem = (function() {
    var canvas = null;
    var gl = null;

    const setCanvas = function(newCanvas) {
        canvas = newCanvas;
    };

    const setContext = function() {
        gl = canvas.getContext("webgl");
    };


    const shader = (function() {
        var program = null;
        const vsSource = `void main() {
gl_Position = vec4(1.0);
}`;
        const fsSource = `void main() {

}`;


        const loadShader = function(type,source) {
            const iShader = gl.createShader(type);
            gl.shaderSource(iShader,source);
            gl.compileShader(iShader);
            if (!gl.getShaderParameter(iShader, gl.COMPILE_STATUS)) {
                alert("[Shader] Compilation error: "+gl.getShaderInfoLog(iShader));
                gl.deleteShader(iShader);
                return null;
            }
            return iShader;
        };

        return {
            init: function() {
                const vShader = loadShader(gl.VERTEX_SHADER,vsSource);
                const fShader = loadShader(gl.FRAGMENT_SHADER,fsSource);

                const iProgram = gl.createProgram();
                gl.attachShader(iProgram,vShader);
                gl.attachShader(iProgram,fShader);
                gl.linkProgram(iProgram);

                if (!gl.getProgramParameter(iProgram, gl.LINK_STATUS)) {
                    alert("[Shader] Unable to initialize the shader iProgram: "+gl.getProgramInfoLog(iProgram));
                    program = null;
                }
                else
                    program = iProgram;
                return program;
            }
        };
        
    })();


    return function(canvas) {
        setCanvas(canvas);
        setContext();
        shader.init();
    }


    //return _Chem;
})();
